"""
Pass 1 of the date/event extractor (design: Workbench "2026-11-22 Timelines extractor design"): one streaming pass over
the multistream dump that builds lookup tables in extract-<dump>.sqlite next to index.sqlite. Never unpacks the dump:
workers seek to the streams index.sqlite lists, decompress each in memory and parse its 100 pages.

    pipelines/extract/.venv/bin/python -I pipelines/extract/build_index.py [--workers 8] [--sample 0.01] [--data DIR] [--dump NAME]

--sample F reads every (1/F)th batch of streams and writes extract-<dump>-sample.sqlite (a quick check of rate, size
and table shapes). Pages carrying an AI-generated-text template are listed in `page` with ai_flag=1 and nothing else.

Tables (deterministic content: batches are written in stream order):
  page(page_id, ns, title, rev_id, redirect_to, ai_flag, infobox_type, len)
  category(page_id, name)                      articles (ns 0) and category pages (ns 14, the category tree)
  infobox_field(page_id, box_no, box_type, field, raw)   date-like fields of each infobox, raw wikitext
  nav_member(template, target)                 links on campaignbox/navbox template pages (ns 10)
  campaignbox_use(page_id, template)           campaignboxes an article transcludes
  inlink(title, n)                             articles linking to a title (each article once), folded through redirects
  meta(key, value)                             dump, code version, streams read, sample
"""
import bz2
import hashlib
import multiprocessing as mp
import os
import re
import sqlite3
import sys
import time
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])


def flag(name, default, cast=str):
    return cast(ARGS[ARGS.index(name) + 1]) if name in ARGS else default


WORKERS = flag('--workers', 8, int)
SAMPLE = flag('--sample', None, float)
BATCH = 100  # streams per task (about 10,000 pages)
CODE_VERSION = hashlib.sha1(open(__file__, 'rb').read()).hexdigest()[:12]

PAGE = re.compile(r'<page>\s*<title>([^<]*)</title>\s*<ns>(\d+)</ns>\s*<id>(\d+)</id>(.*?)</page>', re.S)
REV = re.compile(r'<revision>\s*<id>(\d+)</id>')
REDIRECT = re.compile(r'<redirect title="([^"]*)"')
TEXT = re.compile(r'<text[^>]*>(.*?)</text>', re.S)
AI_FLAG = re.compile(r'\{\{\s*(?:AI[- ]generated|LLM[- ]generated|AI[- ]written)\b', re.I)  # as wp_dump.ai_flagged
CAT = re.compile(r'\[\[\s*Category\s*:\s*([^\]|\n]+)', re.I)
INFOBOX = re.compile(r'\{\{\s*infobox[ _]+([^|}\n<]+)', re.I)
DATE_FIELD = re.compile(r'^(date|dates|start_?date|end_?date|date_?start|date_?end|year_?start|year_?end|signed|effective|'
                        r'established|founded|formation|dissolved|abolished|date_?event\d*|event\d*|date_?pre\d*|date_?post\d*|'
                        r'life_?span|era|period|begin|end|start|finish|time|year)$', re.I)
CAMPAIGNBOX = re.compile(r'\{\{\s*(?:Template\s*:\s*)?(Campaignbox[^|}\n]*)', re.I)
NAVBOX_PAGE = re.compile(r'\{\{\s*(?:Navbox|Campaignbox|Military navigation)\b', re.I)
LINK = re.compile(r'\[\[([^\]\[|#\n]+)(?:#[^\]|\n]*)?(?:\|[^\]\[]*)?\]\]')
SKIP_NS = re.compile(r'^\s*:?\s*(file|image|category|wikipedia|wp|template|help|portal|draft|module|special|user|talk|mediawiki|'
                     r'media|wikt|wiktionary|w|s|q|b|n|v|commons|meta|species|d|[a-z]{2,3}(?:-[a-z]+)?)\s*:', re.I)


def unesc(s):
    return s.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#039;', "'").replace('&amp;', '&')


def norm_title(t):
    t = re.sub(r'[\s_]+', ' ', t).strip()
    return t[:1].upper() + t[1:] if t else t


def braces_end(text, start):
    """Index just past the template that opens at `start` ("{{"), matching nested braces; len(text) if unclosed."""
    depth, i, n = 0, start, len(text)
    while i < n - 1:
        two = text[i:i + 2]
        if two == '{{':
            depth += 1; i += 2; continue
        if two == '}}':
            depth -= 1; i += 2
            if depth == 0:
                return i
            continue
        i += 1
    return n


def infobox_fields(text):
    """[(box_no, box_type, field, raw)] for date-like fields of each infobox (top-level parameters only)."""
    import mwparserfromhell
    out = []
    for no, m in enumerate(INFOBOX.finditer(text)):
        if no >= 4:
            break
        end = braces_end(text, m.start())
        try:
            tpl = mwparserfromhell.parse(text[m.start():end]).filter_templates(recursive=False)
        except Exception:  # malformed wikitext: skip this box
            continue
        if not tpl:
            continue
        box = m.group(1).strip().lower()
        for p in tpl[0].params:
            name = str(p.name).strip()
            if DATE_FIELD.match(name):
                raw = str(p.value).strip()
                if raw:
                    out.append((no, box, name.lower(), raw[:2000]))
    return out


def parse_stream(blob):
    xml = bz2.decompress(blob).decode('utf-8')
    pages, cats, fields, nav, cbox = [], [], [], [], []
    links = Counter()
    for m in PAGE.finditer(xml):
        title, ns, pid, body = unesc(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
        rev = REV.search(body)
        red = REDIRECT.search(body)
        t = TEXT.search(body)
        text = unesc(t.group(1)) if t else ''
        rev_id = int(rev.group(1)) if rev else None
        if red:
            pages.append((pid, ns, title, rev_id, norm_title(unesc(red.group(1)).split('#')[0]), 0, None, len(text)))
            continue
        if AI_FLAG.search(text):
            pages.append((pid, ns, title, rev_id, None, 1, None, len(text)))
            continue
        box = INFOBOX.search(text) if ns == 0 else None
        pages.append((pid, ns, title, rev_id, None, 0, box.group(1).strip().lower() if box else None, len(text)))
        if ns in (0, 14):
            for c in dict.fromkeys(norm_title(c) for c in CAT.findall(text)):
                cats.append((pid, c))
        if ns == 0:
            if box:
                fields += [(pid,) + f for f in infobox_fields(text)]
            for c in dict.fromkeys(norm_title(c) for c in CAMPAIGNBOX.findall(text)):
                cbox.append((pid, c))
            targets = {norm_title(l) for l in LINK.findall(text) if not SKIP_NS.match(l)}
            links.update(t for t in targets if t)
        elif ns == 10 and NAVBOX_PAGE.search(text):
            name = norm_title(title.split(':', 1)[1])
            for tgt in dict.fromkeys(norm_title(l) for l in LINK.findall(text) if not SKIP_NS.match(l)):
                if tgt:
                    nav.append((name, tgt))
    return pages, cats, fields, nav, cbox, links


def work(task):
    path, spans = task
    out = [[], [], [], [], [], Counter()]
    with open(path, 'rb') as f:
        for off, length in spans:
            f.seek(off)
            res = parse_stream(f.read(length) if length else f.read())
            for i in range(5):
                out[i] += res[i]
            out[5].update(res[5])
    return out


def main():
    W, DUMP = settings.WIKIPEDIA, settings.DUMP
    idx = sqlite3.connect(f'file:{W}/index.sqlite?mode=ro', uri=True)
    offs = [r[0] for r in idx.execute('SELECT DISTINCT offset FROM page ORDER BY offset')]
    size = os.path.getsize(DUMP)
    spans = [(o, (offs[i + 1] if i + 1 < len(offs) else size) - o) for i, o in enumerate(offs)]
    tasks = [spans[i:i + BATCH] for i in range(0, len(spans), BATCH)]
    if SAMPLE:
        step = max(1, round(1 / SAMPLE))
        tasks = tasks[::step]
    name = f'extract-{settings.DUMP_NAME}{"-sample" if SAMPLE else ""}.sqlite'
    path = os.path.join(W, name)
    tmp = path + '.building'
    if os.path.exists(tmp):
        os.remove(tmp)
    db = sqlite3.connect(tmp)
    db.execute('PRAGMA journal_mode=OFF'); db.execute('PRAGMA synchronous=OFF')
    db.executescript('''
        CREATE TABLE page(page_id INTEGER, ns INTEGER, title TEXT, rev_id INTEGER, redirect_to TEXT, ai_flag INTEGER,
                          infobox_type TEXT, len INTEGER);
        CREATE TABLE category(page_id INTEGER, name TEXT);
        CREATE TABLE infobox_field(page_id INTEGER, box_no INTEGER, box_type TEXT, field TEXT, raw TEXT);
        CREATE TABLE nav_member(template TEXT, target TEXT);
        CREATE TABLE campaignbox_use(page_id INTEGER, template TEXT);
        CREATE TABLE inlink_raw(title TEXT PRIMARY KEY, n INTEGER) WITHOUT ROWID;
        CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    ''')
    links = Counter()
    t0, done, nstreams = time.time(), 0, sum(len(t) for t in tasks)
    with mp.Pool(WORKERS) as pool:
        for res in pool.imap(work, [(DUMP, t) for t in tasks]):
            db.executemany('INSERT INTO page VALUES (?,?,?,?,?,?,?,?)', res[0])
            db.executemany('INSERT INTO category VALUES (?,?)', res[1])
            db.executemany('INSERT INTO infobox_field VALUES (?,?,?,?,?)', res[2])
            db.executemany('INSERT INTO nav_member VALUES (?,?)', res[3])
            db.executemany('INSERT INTO campaignbox_use VALUES (?,?)', res[4])
            links.update(res[5])
            done += 1
            if done % 50 == 0 or done == len(tasks):
                el = time.time() - t0
                print(f'{done}/{len(tasks)} batches, {el / 60:.1f} min, eta {el / done * (len(tasks) - done) / 60:.1f} min', flush=True)
    db.executemany('INSERT INTO inlink_raw VALUES (?,?)', sorted(links.items()))
    del links
    print('indexing', flush=True)
    db.executescript('''
        CREATE INDEX page_id ON page(page_id);
        CREATE INDEX page_title ON page(title);
        CREATE INDEX category_page ON category(page_id);
        CREATE INDEX category_name ON category(name);
        CREATE INDEX infobox_page ON infobox_field(page_id);
        CREATE INDEX nav_template ON nav_member(template);
        CREATE INDEX nav_target ON nav_member(target);
        CREATE INDEX cbox_page ON campaignbox_use(page_id);
        CREATE INDEX cbox_template ON campaignbox_use(template);
        -- inbound links, with links to a redirect counted for its target (namespace 0 redirects)
        CREATE TABLE inlink AS
          SELECT COALESCE(p.redirect_to, r.title) AS title, SUM(r.n) AS n
          FROM inlink_raw r LEFT JOIN page p ON p.ns = 0 AND p.title = r.title AND p.redirect_to IS NOT NULL
          GROUP BY 1;
        CREATE INDEX inlink_title ON inlink(title);
        DROP TABLE inlink_raw;
    ''')
    meta = {'dump': settings.DUMP_NAME, 'code_version': CODE_VERSION, 'streams': str(nstreams), 'sample': str(SAMPLE or ''),
            'workers': str(WORKERS), 'seconds': str(round(time.time() - t0))}
    db.executemany('INSERT INTO meta VALUES (?,?)', sorted(meta.items()))
    db.commit()
    for tname in ('page', 'category', 'infobox_field', 'nav_member', 'campaignbox_use', 'inlink'):
        print(tname, db.execute(f'SELECT count(*) FROM {tname}').fetchone()[0])
    db.close()
    os.replace(tmp, path)
    print(f'wrote {path}: {os.path.getsize(path) / 1e9:.2f} GB, {nstreams} streams in {(time.time() - t0) / 60:.1f} min')


if __name__ == '__main__':
    main()
