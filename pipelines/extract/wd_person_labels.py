"""
Items for the persons the shared store leaves out: every human with an English article, plus the pages a ruler list page links. wikidata.py's wd_item keeps an item only when it has an
English Wikipedia sitelink and a time claim or a non-P31 link, so a list-linked ruler without such a claim (Paullu Inca, Túpac Amaru; the
presidents of Panama; Ternate's sultans) has no item, and the rulers pass drops the link without a flag (it was found by comparing a run
with and without rulers.py --no-item: +171 reigns on Modern States, +182 on Medieval). Same method as wd_office_labels.py (one streaming
read-only pass over the same dump into a separate file, wd_item untouched), keyed by title because the wanted persons are the pages a
list page links, not ids the store already holds:

    pipelines/extract/.venv/bin/python -I pipelines/extract/rulers.py --timeline medieval --rows all --noitem-titles FILE.json   # the wanted titles
    nice -n 19 pipelines/extract/.venv/bin/python -I pipelines/extract/wd_person_labels.py --titles A.json,B.json [--threads 2] [--workers 2] [--restart]

Writes wikidata-<dump>-persons.sqlite beside the dump:
  wd_person(qid, label, description, enwiki, p31, p39, born, died)
                                                         p31: instance-of ids, p39: [[office, start, end]], born/died: P569/P570 time strings,
                                                         all as Wikidata gives them; kept: an enwiki sitelink and (instance of human, fictional
                                                         human or human who may be fictional, or a title of the --titles files)
  meta(key, value)                                       dump, schema, offset reached, lines, items kept, done
Pausing and resuming as in wikidata.py (PAUSE file or SIGTERM; --restart starts over).
"""
import json
import os
import signal
import sqlite3
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wikidata as W  # noqa: E402

OUT = os.path.join(W.W, f'{W.DUMP_NAME}-persons.sqlite')
SCHEMA = '1'
NEEDLE = b'"enwiki":{"site":"enwiki","title":"'
HUMAN = {'Q5', 'Q15632617', 'Q21070568'}  # human, fictional human, human who may be fictional
HUMAN_NEEDLES = tuple(f'"{q}"'.encode() for q in HUMAN)
TITLES = set()  # the wanted titles, plain (inherited by the workers through fork)
WANT = set()  # a title as it may stand in the dump's JSON: raw UTF-8 bytes and the \uXXXX-escaped form


def wanted(paths):
    titles = set()
    for p in paths:
        titles |= set(json.load(open(p)))
    out = set()
    for t in titles:
        out.add(t.encode())
        esc = json.dumps(t)[1:-1]  # ASCII-escaped (the dump writes \u00e1), as a JSON string body
        out.add(esc.encode())
        out.add(esc.replace('/', '\\/').encode())  # and PHP's escaped slash
    return titles, out


def title_of(line):
    a = line.find(NEEDLE)
    if a < 0:
        return None
    a += len(NEEDLE)
    b = a
    while True:
        b = line.find(b'"', b)
        if b < 0:
            return None
        k, i = 0, b - 1
        while line[i:i + 1] == b'\\':  # an escaped quote
            k, i = k + 1, i - 1
        if k % 2 == 0:
            return line[a:b]
        b += 1


def parse(line):
    e = json.loads(line)
    g = lambda lst: [x['mainsnak']['datavalue']['value']['id'] for x in lst if x.get('mainsnak', {}).get('datavalue', {}).get('value', {}).get('id')]  # noqa: E731
    cl = e.get('claims', {})
    p39 = []
    for st in cl.get('P39', []):
        v = st.get('mainsnak', {}).get('datavalue', {}).get('value')
        if not isinstance(v, dict) or 'id' not in v:
            continue
        q = st.get('qualifiers', {})
        t = lambda p: (q.get(p, [{}])[0].get('datavalue', {}).get('value', {}) or {}).get('time')  # noqa: E731
        p39.append([v['id'], t('P580'), t('P582')])
    lab = e.get('labels', {}).get('en', {}).get('value')
    title = (e.get('sitelinks', {}).get('enwiki') or {}).get('title')
    p31 = g(cl.get('P31', []))
    if not title or not (title in TITLES or HUMAN & set(p31)):
        return None  # a line the cheap filter let through (the human id as some other claim's value)
    tm = lambda p: ((cl.get(p) or [{}])[0].get('mainsnak', {}).get('datavalue', {}).get('value') or {}).get('time')  # noqa: E731
    return (e['id'], lab, e.get('descriptions', {}).get('en', {}).get('value'), title, json.dumps(p31), json.dumps(p39), tm('P569'), tm('P570'))


def parse_batch(task):
    lines, off, nl = task
    return [r for r in (parse(l.rstrip(b',\r')) for l in lines) if r], off, nl


def chunks(f, box):
    buf = b''
    while True:
        if W.stop or os.path.exists(W.PAUSE):
            return
        chunk = f.read(1 << 24)
        if not chunk:
            box[1] = True
            return
        buf += chunk
        *whole, buf = buf.split(b'\n')
        box[2] += len(whole)
        box[0] = f.tell() - len(buf)
        keep = []
        for l in whole:
            if l[:2] == b'{"' and b'"enwiki"' in l:
                t = title_of(l)
                if t is not None and (t in WANT or any(n in l for n in HUMAN_NEEDLES)):
                    keep.append(l)
        yield keep, box[0], box[2]


def main():
    import indexed_bzip2 as ibz2
    import multiprocessing as mp
    signal.signal(signal.SIGTERM, W._stop)
    signal.signal(signal.SIGINT, W._stop)
    paths = [x for x in W.flag('--titles', '').split(',') if x]
    titles, forms = wanted(paths)
    WANT.update(forms)
    TITLES.update(titles)
    print(f'{len(titles):,} person titles wanted', flush=True)
    if '--restart' in W.ARGS:
        for p in (OUT, OUT + '-wal', OUT + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(OUT)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('CREATE TABLE IF NOT EXISTS wd_person(qid TEXT PRIMARY KEY, label TEXT, description TEXT, enwiki TEXT, p31 TEXT, p39 TEXT, born TEXT, died TEXT) WITHOUT ROWID;'
                     'CREATE INDEX IF NOT EXISTS wd_person_enwiki ON wd_person(enwiki);'
                     'CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);')
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('done') == '1':
        print(f'{OUT} is complete; --restart to rebuild')
        return
    offset, lines, kept = int(meta.get('offset', 0)), int(meta.get('lines', 0)), int(meta.get('kept', 0))
    f = ibz2.open(W.SRC, parallelization=W.flag('--threads', 2, int))
    if offset:
        left = offset
        while left:
            left -= len(f.read(min(left, 1 << 26)))
        print(f'resuming at {offset / 2**30:.1f} GiB of JSON', flush=True)
    t0, last_cp, start_off = time.time(), offset, offset

    def checkpoint(done=False):
        db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)', [('dump', W.DUMP_NAME), ('schema', SCHEMA), ('offset', str(offset)), ('lines', str(lines)),
                                                                     ('kept', str(kept)), ('wanted', str(len(titles))), ('done', '1' if done else '0')])
        db.commit()

    box = [offset, False, lines]
    with mp.Pool(W.flag('--workers', 2, int)) as pool:
        for found, off, nl in pool.imap(parse_batch, chunks(f, box)):
            db.executemany('INSERT OR REPLACE INTO wd_person VALUES (?,?,?,?,?,?,?,?)', found)
            kept, offset, lines = kept + len(found), off, nl
            if offset - last_cp >= W.CHECKPOINT:
                checkpoint()
                last_cp = offset
                print(f'{offset / 2**30:.0f} GiB JSON, {lines:,} lines, {kept:,} kept, {(offset - start_off) / 2**20 / (time.time() - t0):.0f} MiB/s', flush=True)
    finished = box[1]
    checkpoint(done=finished)
    print('reached the end' if finished else f'paused at {offset / 2**30:.1f} GiB; run again to resume', flush=True)
    f.close()
    print(f'{lines:,} lines, {kept:,} items kept, {(time.time() - t0) / 60:.1f} min this run')


if __name__ == '__main__':
    main()
