"""
English labels (and descriptions, and the Wikipedia title when there is one) of the office items that wikidata.py's wd_item leaves out, for the
rulers pass's title lookups. wd_item keeps an item only when it has an English Wikipedia sitelink and a time claim or a non-P31 link; 287 of the
517 "office held by head of state" (P1906) offices, and 38,585 of the 44,403 "position held" (P39) targets, are missing, so
rulers.qid('King of Italy') is None and "offices_of by the row's words" cannot match them. One streaming pass over the same dump, read-only,
into a separate file (the shared wikidata-<dump>.sqlite is not touched, so the old table stays for a before/after diff):

    nice -n 19 pipelines/extract/.venv/bin/python -I pipelines/extract/wd_office_labels.py [--threads 2] [--workers 2] [--restart]

Writes wikidata-<dump>-offices.sqlite beside the dump:
  wd_office(qid, label, description, enwiki)   every item that a P1906, P35 or P39 link of the shared store points to and that wd_item lacks
  meta(key, value)                             dump, schema, offset reached, lines, items kept, done
Pausing and resuming work as in wikidata.py (PAUSE file or SIGTERM; --restart starts over).
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

OUT = os.path.join(W.W, f'{W.DUMP_NAME}-offices.sqlite')
SCHEMA = '1'
WANT = set()  # b'Q123' ids, filled in main (and inherited by the workers through fork)


def wanted_ids():
    db = sqlite3.connect(f'file:{os.path.join(W.W, W.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    rows = db.execute("""SELECT DISTINCT l.target FROM wd_link l LEFT JOIN wd_item i ON i.qid = l.target
                         WHERE l.prop IN ('P1906', 'P35', 'P39') AND i.qid IS NULL""").fetchall()
    return {r[0].encode() for r in rows}


def item_id(line):
    a = line.find(b'"id":"') + 6
    return line[a:line.find(b'"', a)]


def parse(line):
    e = json.loads(line)
    lab = e.get('labels', {}).get('en', {}).get('value')
    return e['id'], lab, e.get('descriptions', {}).get('en', {}).get('value'), (e.get('sitelinks', {}).get('enwiki') or {}).get('title')


def parse_batch(task):
    lines, off, nl = task
    return [parse(l.rstrip(b',\r')) for l in lines], off, nl


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
        yield [l for l in whole if l[:2] == b'{"' and item_id(l) in WANT], box[0], box[2]


def main():
    import indexed_bzip2 as ibz2
    import multiprocessing as mp
    signal.signal(signal.SIGTERM, W._stop)
    signal.signal(signal.SIGINT, W._stop)
    WANT.update(wanted_ids())
    print(f'{len(WANT):,} office items wanted', flush=True)
    if '--restart' in W.ARGS:
        for p in (OUT, OUT + '-wal', OUT + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(OUT)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('CREATE TABLE IF NOT EXISTS wd_office(qid TEXT PRIMARY KEY, label TEXT, description TEXT, enwiki TEXT) WITHOUT ROWID;'
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
                                                                     ('kept', str(kept)), ('done', '1' if done else '0')])
        db.commit()

    box = [offset, False, lines]
    with mp.Pool(W.flag('--workers', 2, int)) as pool:
        for found, off, nl in pool.imap(parse_batch, chunks(f, box)):
            db.executemany('INSERT OR REPLACE INTO wd_office VALUES (?,?,?,?)', found)
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
