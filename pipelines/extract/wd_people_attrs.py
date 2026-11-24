"""
The people pass (report only): occupation, citizenship and birthplace for every human with an English article, plus the labels and
the P17/P279/P31 of every other item with an English article (the occupations, countries and places those claims point to). One
streaming read-only pass over the Wikidata dump into a separate file; wd_item and the persons store are untouched.

    nice -n 19 pipelines/extract/.venv/bin/python -I pipelines/extract/wd_people_attrs.py [--threads 2] [--workers 3] [--restart]

Writes wikidata-<dump>-people.sqlite beside the dump:
  person(qid, label, enwiki, p106, p27, p19, born, died)   human (P31 Q5) with an enwiki sitelink; p106/p27/p19: JSON lists of item ids;
                                                           born/died: the P569/P570 time strings as Wikidata gives them
  ref(qid, label, enwiki, p31, p279, p17, p30)             any other item with an enwiki sitelink; p31/p279: JSON lists, p17: first country id, p30: continent ids (JSON list)
  meta(key, value)
Pause with the file ~/data/wikidata/PAUSE-people or SIGTERM; run again to resume (--restart starts over).
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

OUT = os.path.join(W.W, f'{W.DUMP_NAME}-people.sqlite')
PAUSE = os.path.join(W.W, 'PAUSE-people')
SCHEMA = '1'
NEEDLE = b'"enwiki":{"site":"enwiki"'


def parse(line):
    e = json.loads(line)
    cl = e.get('claims', {})

    def ids(p):
        out = []
        for x in cl.get(p, []):
            v = x.get('mainsnak', {}).get('datavalue', {}).get('value')
            if isinstance(v, dict) and v.get('id'):
                out.append(v['id'])
        return out

    title = (e.get('sitelinks', {}).get('enwiki') or {}).get('title')
    if not title:
        return None
    lab = e.get('labels', {}).get('en', {}).get('value')
    p31 = ids('P31')
    if 'Q5' in p31:
        tm = lambda p: ((cl.get(p) or [{}])[0].get('mainsnak', {}).get('datavalue', {}).get('value') or {}).get('time')  # noqa: E731
        return ('p', (e['id'], lab, title, json.dumps(ids('P106')), json.dumps(ids('P27')), json.dumps(ids('P19')), tm('P569'), tm('P570')))
    p17 = ids('P17')
    return ('r', (e['id'], lab, title, json.dumps(p31), json.dumps(ids('P279')), p17[0] if p17 else None, json.dumps(ids('P30'))))


def parse_batch(task):
    lines, off, nl = task
    ps, rs = [], []
    for l in lines:
        r = parse(l.rstrip(b',\r'))
        if r:
            (ps if r[0] == 'p' else rs).append(r[1])
    return ps, rs, off, nl


def chunks(f, box):
    buf = b''
    while True:
        if W.stop or os.path.exists(PAUSE):
            return
        chunk = f.read(1 << 24)
        if not chunk:
            box[1] = True
            return
        buf += chunk
        *whole, buf = buf.split(b'\n')
        box[2] += len(whole)
        box[0] = f.tell() - len(buf)
        yield [l for l in whole if l[:2] == b'{"' and NEEDLE in l], box[0], box[2]


def main():
    import indexed_bzip2 as ibz2
    import multiprocessing as mp
    signal.signal(signal.SIGTERM, W._stop)
    signal.signal(signal.SIGINT, W._stop)
    if '--restart' in W.ARGS:
        for p in (OUT, OUT + '-wal', OUT + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(OUT)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('CREATE TABLE IF NOT EXISTS person(qid TEXT PRIMARY KEY, label TEXT, enwiki TEXT, p106 TEXT, p27 TEXT, p19 TEXT, born TEXT, died TEXT) WITHOUT ROWID;'
                     'CREATE TABLE IF NOT EXISTS ref(qid TEXT PRIMARY KEY, label TEXT, enwiki TEXT, p31 TEXT, p279 TEXT, p17 TEXT, p30 TEXT) WITHOUT ROWID;'
                     'CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);')
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('done') == '1':
        print(f'{OUT} is complete; --restart to rebuild')
        return
    offset, lines, kp, kr = (int(meta.get(k, 0)) for k in ('offset', 'lines', 'persons', 'refs'))
    f = ibz2.open(W.SRC, parallelization=W.flag('--threads', 2, int))
    if offset:
        left = offset
        while left:
            left -= len(f.read(min(left, 1 << 26)))
        print(f'resuming at {offset / 2**30:.1f} GiB of JSON', flush=True)
    t0, last_cp, start_off = time.time(), offset, offset

    def checkpoint(done=False):
        db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)', [('dump', W.DUMP_NAME), ('schema', SCHEMA), ('offset', str(offset)), ('lines', str(lines)),
                                                                     ('persons', str(kp)), ('refs', str(kr)), ('done', '1' if done else '0')])
        db.commit()

    box = [offset, False, lines]
    with mp.Pool(W.flag('--workers', 3, int)) as pool:
        for ps, rs, off, nl in pool.imap(parse_batch, chunks(f, box)):
            db.executemany('INSERT OR REPLACE INTO person VALUES (?,?,?,?,?,?,?,?)', ps)
            db.executemany('INSERT OR REPLACE INTO ref VALUES (?,?,?,?,?,?,?)', rs)
            kp, kr, offset, lines = kp + len(ps), kr + len(rs), off, nl
            if offset - last_cp >= W.CHECKPOINT:
                checkpoint()
                last_cp = offset
                print(f'{offset / 2**30:.0f} GiB JSON, {lines:,} lines, {kp:,} persons, {kr:,} refs, {(offset - start_off) / 2**20 / (time.time() - t0):.0f} MiB/s', flush=True)
    finished = box[1]
    checkpoint(done=finished)
    print('reached the end' if finished else f'paused at {offset / 2**30:.1f} GiB; run again to resume', flush=True)
    f.close()
    print(f'{lines:,} lines, {kp:,} persons, {kr:,} refs, {(time.time() - t0) / 60:.1f} min this run')


if __name__ == '__main__':
    main()
