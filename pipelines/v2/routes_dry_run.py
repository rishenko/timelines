"""
Dry run of three routes to pre-1500 disasters (harvest only; nothing is emitted). For each: candidates per region x era,
how many are already in the infobox pool (disaster-bulk.jsonl), how many pages are AI-flagged and skipped, and where a date is
quoted.

    pipelines/extract/.venv/bin/python -I pipelines/v2/routes_dry_run.py OUT.md

(a) category pages: articles in "<n>th-century earthquakes", "<year> natural disasters"... and their "X in <country>" categories;
(b) list pages: the rows of the death-toll, historical-earthquake, famine, epidemic, flood, tsunami, eruption and country
    earthquake lists (the row's date cell is the quote);
(c) Wikidata: items whose instance-of is a disaster class and that have a dated claim and an English article. The dump has
    no country, toll or magnitude for them: a wide Wikidata pass would add those, so region is unknown here.
"""
import collections
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'extract'), HERE]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import mwparserfromhell as mw  # noqa: E402
import regions  # noqa: E402
import wp_dump  # noqa: E402
from dates import spans  # noqa: E402

ERAS = ['Ancient (< 650)', 'Medieval (650–1499)']
REGIONS = ['Africa', 'South Asia', 'East Asia', 'SE Asia / Oceania', 'West / Central Asia', 'Americas', 'Europe / Mediterranean', 'unplaced']
KINDS = r'(earthquakes?|natural disasters|volcanic eruptions|eruptions|floods?|famines?|epidemics|pandemics|plagues?|tsunamis?|storms|tropical cyclones|droughts?)'


def era(y):
    return 0 if y < 650 else 1 if y < 1500 else None


def cell(counter, reg, y):
    e = era(y)
    if e is not None:
        counter[(reg or 'unplaced', e)] += 1


def table(c):
    lines = ['| region | ' + ' | '.join(ERAS) + ' | total |', '|---|---|---|---|']
    for reg in REGIONS:
        a, b = c[(reg, 0)], c[(reg, 1)]
        lines.append(f'| {reg} | {a or "·"} | {b or "·"} | {a + b} |')
    return lines


def place_in(text):
    for n in regions.NAMES:
        if re.search(r'(?<![\w])' + re.escape(n) + r'(?![\w])', text):
            return regions.LOOKUP[n]
    return None


def century_year(n, bc):
    y = (n - 1) * 100 + 50
    return -y if bc else y


def route_a(db, pool):
    cats = db.execute("SELECT DISTINCT name FROM category WHERE name GLOB '[0-9]*' OR name LIKE '%-century %'").fetchall()
    ycat = {}
    for (n,) in cats:
        m = re.match(r'^(\d{1,4})( BC| BCE)?\s+' + KINDS + r'$', n, re.I)
        if m:
            ycat[n] = -int(m.group(1)) if m.group(2) else int(m.group(1)); continue
        m = re.match(r'^(\d{1,2})(?:st|nd|rd|th)-century( BC| BCE)?\s+' + KINDS + r'$', n, re.I)
        if m:
            ycat[n] = century_year(int(m.group(1)), bool(m.group(2)))
    pages = {}
    ai = redirect = 0
    for n, y in ycat.items():
        if era(y) is None:
            continue
        for pid, title, ai_flag, red, itype in db.execute(
                'SELECT p.page_id, p.title, p.ai_flag, p.redirect_to, p.infobox_type FROM category c JOIN page p ON p.page_id=c.page_id WHERE c.name=? AND p.ns=0', (n,)):
            if red:
                continue
            if ai_flag:
                ai += 1
                continue
            pages.setdefault(pid, (title, y, itype, n))
    c, new, inpool, quoted = collections.Counter(), 0, 0, 0
    for pid, (title, y, itype, n) in pages.items():
        regcats = [r[0] for r in db.execute('SELECT name FROM category WHERE page_id=?', (pid,))]
        reg = None
        for cn in regcats:
            m = re.match(r'(?:.*?\b(?:in|of|on)\b )(.+)$', cn)
            if m and not re.search(r'\d', cn):
                reg = regions.region_of(m.group(1))
                if reg:
                    break
        cell(c, reg, y)
        if title in pool:
            inpool += 1
        else:
            new += 1
    return {'categories': len(ycat), 'articles': len(pages), 'in_pool': inpool, 'new': new, 'ai_skipped': ai, 'cells': c,
            'note': 'the year is the category\'s (a century category gives its midpoint); no date is quoted from the article yet'}


LISTS = ['List of natural disasters by death toll', 'List of historical earthquakes', 'List of famines', 'List of epidemics and pandemics',
         'List of floods', 'List of tsunamis', 'List of volcanic eruptions by death toll', 'List of largest volcanic eruptions',
         'List of earthquakes in China', 'List of earthquakes in Egypt', 'List of earthquakes in Greece', 'List of earthquakes in India',
         'List of earthquakes in Iran', 'List of earthquakes in Italy', 'List of earthquakes in Japan', 'List of earthquakes in Turkey']


def route_b(db, pool):
    c, rows, linked_new, linked_pool, ai, quoted = collections.Counter(), 0, set(), set(), 0, 0
    per = {}
    for title in LISTS:
        pg = wp_dump.page(title)
        if not pg:
            per[title] = 'missing'; continue
        if wp_dump.ai_flagged(pg['text']):
            per[title] = 'AI-flagged, skipped'; ai += 1; continue
        code = mw.parse(pg['text'])
        n_rows = pre = 0
        for tbl in code.filter_tags(matches=lambda t: str(t.tag) == 'table') if False else []:
            pass
        text = pg['text']
        for tm in re.finditer(r'\{\|.*?\n\|\}', text, re.S):
            for row in re.split(r'\n\|-', tm.group(0))[1:]:
                cells = [x.strip() for x in re.split(r'\n[|!]', '\n' + row.strip()) if x.strip()]
                y = None
                for ce in cells[:4]:
                    sp = spans(re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', ce))[:1]
                    if sp and sp[0]['start'][0] is not None and abs(sp[0]['start'][0]) < 3000:
                        y = sp[0]['start'][0]; break
                if y is None or era(y) is None:
                    continue
                n_rows += 1
                pre += 1
                rowtext = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', ' '.join(cells))
                reg = place_in(rowtext) or (place_in(title))
                cell(c, reg, y)
                quoted += 1
                m = re.search(r'\[\[([^|\]#]+)', ' '.join(cells))
                if m:
                    t = m.group(1).strip()
                    (linked_pool if t in pool else linked_new).add(t)
        per[title] = pre
        rows += pre
    linked_new = {t for t in linked_new if db.execute('SELECT 1 FROM page WHERE title=? AND ns=0', (t,)).fetchone()}
    return {'lists': per, 'rows': rows, 'quoted_dates': quoted, 'linked_in_pool': len(linked_pool), 'linked_new': len(linked_new), 'ai_lists_skipped': ai, 'cells': c,
            'note': 'a row\'s date cell is its quote; region from the row text or the list\'s country'}


CLASSES = {'Q7944': 'earthquake', 'Q8070': 'tsunami', 'Q7692360': 'eruption', 'Q168247': 'famine', 'Q44512': 'epidemic', 'Q8068': 'flood',
           'Q81054': 'storm', 'Q3839081': 'disaster', 'Q8065': 'natural disaster'}


def route_c(db, pool):
    wd = sqlite3.connect(f'file:{os.path.join(settings.DATA, "wikidata", "wikidata-20261116.sqlite")}?mode=ro', uri=True)
    ph = ','.join('?' * len(CLASSES))
    items = {}
    for qid, tgt in wd.execute(f"SELECT DISTINCT qid, target FROM wd_link WHERE prop='P31' AND target IN ({ph})", tuple(CLASSES)):
        items.setdefault(qid, set()).add(CLASSES[tgt])
    c, byclass, inpool, new, ai, nodate, noart = collections.Counter(), collections.Counter(), 0, 0, 0, 0, 0
    for qid, kinds in items.items():
        it = wd.execute('SELECT enwiki FROM wd_item WHERE qid=?', (qid,)).fetchone()
        if not it or not it[0]:
            noart += 1; continue
        d = wd.execute("SELECT time, precision FROM wd_claim WHERE qid=? AND prop IN ('P585','P580','P571') AND precision>=9 AND rank!='deprecated' LIMIT 1", (qid,)).fetchone()
        if not d:
            nodate += 1; continue
        y = int(d[0].lstrip('+-').split('-')[0]) * (-1 if d[0].startswith('-') else 1)
        if era(y) is None:
            continue
        pg = db.execute('SELECT ai_flag FROM page WHERE title=? AND ns=0', (it[0],)).fetchone()
        if pg and pg[0]:
            ai += 1; continue
        cell(c, None, y)
        for k in kinds:
            byclass[k] += 1
        if it[0] in pool:
            inpool += 1
        else:
            new += 1
    return {'items_with_class': len(items), 'no_article': noart, 'no_year_date': nodate, 'pre_1500': inpool + new, 'in_pool': inpool, 'new': new,
            'ai_skipped': ai, 'by_class': byclass, 'cells': c,
            'note': 'region, toll and magnitude are not in the Wikidata tables (no P17/P131/P1120/P2528): a wide pass adds them (about 2 h, once); no date is quoted'}


def main(out):
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    pool = {json.loads(l)['title'] for l in open(os.path.join(settings.DATA, 'v2', 'candidates', 'disaster-bulk.jsonl'))}
    a, b, c = route_a(db, pool), route_b(db, pool), route_c(db, pool)
    md = ['## Routes to pre-1500 disasters (dry runs, nothing emitted)', '',
          f'The infobox pool holds {sum(1 for _ in pool)} articles; the 18 + 23 that pass the thresholds before 1500 are in the plan above. Each route below was run on the dumps (`pipelines/v2/routes_dry_run.py`); counts are candidates before any threshold, before 1500, AI-flagged pages left out.', '',
          '### (a) Category pages', '',
          f"{a['categories']} year and century disaster categories; **{a['articles']}** articles before 1500, of which {a['in_pool']} are already in the infobox pool and **{a['new']} are new**; {a['ai_skipped']} AI-flagged skipped. {a['note']}.", ''] + table(a['cells']) + [
          '', '### (b) List pages', '',
          f"{len(LISTS)} lists read; **{b['rows']}** rows dated before 1500 (each date quoted from the row); {b['linked_in_pool']} link to an article already in the pool and **{b['linked_new']} to a new article**; {b['ai_lists_skipped']} list pages AI-flagged and skipped. {b['note']}.", '', '| list | rows before 1500 |', '|---|---|'] + [f'| {k} | {v} |' for k, v in b['lists'].items()] + [''] + table(b['cells']) + [
          '', '### (c) Wide Wikidata pass', '',
          f"{c['items_with_class']} items are instances of a disaster class; {c['no_article']} have no English article, {c['no_year_date']} no dated claim; **{c['pre_1500']}** are dated before 1500 ({c['in_pool']} already in the pool, **{c['new']} new**), {c['ai_skipped']} AI-flagged skipped. By class: " + ', '.join(f'{k} {v}' for k, v in c['by_class'].most_common()) + f". {c['note']}.", '',
          '| era | candidates |', '|---|---|', f"| Ancient (< 650) | {sum(v for (r, e), v in c['cells'].items() if e == 0)} |", f"| Medieval (650–1499) | {sum(v for (r, e), v in c['cells'].items() if e == 1)} |", '']
    open(out, 'w').write('\n'.join(md) + '\n')
    print('\n'.join(md))


if __name__ == '__main__':
    main(sys.argv[1])
