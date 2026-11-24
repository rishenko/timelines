"""
Item-valued qualifiers on the rulers' statements, which wikidata.py's tables don't keep (they keep time qualifiers
only). One streaming pass over the same Wikidata JSON dump, read-only, into a separate file so the shared
wikidata-<dump>.sqlite that every session reads is never rewritten:

    nice -n 19 pipelines/extract/.venv/bin/python -I pipelines/extract/wd_item_quals.py [--threads 2] [--workers 2] [--restart]

Writes wikidata-<dump>-quals2.sqlite beside the dump ($TIMELINES_DATA/wikidata):
  wd_iqual(qid, prop, target, sid, qprop, qtarget)   for P39 position held, P35 head of state, P6 head of government
                                                     statements of items with an English article: P1706 together with
                                                     (co-regent), P1365 replaces, P1366 replaced by (predecessor and
                                                     successor), P1001 applies to jurisdiction, P642 of (which country a
                                                     general title such as "king" was held in). sid is the dump's
                                                     statement id, the same one wikidata.py stores in wd_link.sid
  meta(key, value)                                   dump, schema, offset reached, lines, items kept, done

Kevin approved (2026-11-23, after the rulers import): "co-regent with X" (P1706) and predecessor/successor in a reign's
side panel (P1365/P1366). P1001/P642 cost nothing extra in the same pass. Pausing and resuming work as in wikidata.py
(PAUSE file or SIGTERM; --restart starts over).
"""
import json
import os
import signal
import sqlite3
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wikidata as W  # noqa: E402  (the dump, its reader, the PAUSE file)

OUT = os.path.join(W.W, f'{W.DUMP_NAME}-quals2.sqlite')
SCHEMA = '1'
STATEMENT_PROPS = ('P39', 'P35', 'P6')
QUALS = ('P1706', 'P1365', 'P1366', 'P1001', 'P642')
NEEDLES = tuple(f'"{p}"'.encode() for p in QUALS)


def parse(line):
    """(qid, rows) for an item with an English article and a wanted qualifier, else None."""
    e = json.loads(line)
    if not e.get('sitelinks', {}).get('enwiki'):
        return None
    qid, rows = e['id'], []
    for p in STATEMENT_PROPS:
        for c in e.get('claims', {}).get(p, []):
            v = W._value(c.get('mainsnak', {}))
            if not (isinstance(v, dict) and 'id' in v):
                continue
            for qp in QUALS:
                for qs in c.get('qualifiers', {}).get(qp, []):
                    t = W._value(qs)
                    if isinstance(t, dict) and 'id' in t:
                        rows.append((qid, p, v['id'], c.get('id'), qp, t['id']))
    return (qid, rows) if rows else None


def parse_batch(task):
    lines, off, nl = task
    out = []
    for line in lines:
        r = parse(line.rstrip(b',\r'))
        if r:
            out.append(r)
    return out, off, nl


def chunks(f, box, start_off):
    """Like wikidata.chunks, with this pass's cheap filter."""
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
        yield [l for l in whole if b'"enwiki"' in l and any(n in l for n in NEEDLES)], box[0], box[2]


def main():
    import indexed_bzip2 as ibz2
    import multiprocessing as mp
    signal.signal(signal.SIGTERM, W._stop)
    signal.signal(signal.SIGINT, W._stop)
    threads = W.flag('--threads', 2, int)
    if '--restart' in W.ARGS:
        for p in (OUT, OUT + '-wal', OUT + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(OUT)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('''
        CREATE TABLE IF NOT EXISTS wd_iqual(qid TEXT, prop TEXT, target TEXT, sid TEXT, qprop TEXT, qtarget TEXT);
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
    ''')
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('done') == '1':
        print(f'{OUT} is complete; --restart to rebuild')
        return
    offset, lines, kept = int(meta.get('offset', 0)), int(meta.get('lines', 0)), int(meta.get('kept', 0))
    f = ibz2.open(W.SRC, parallelization=threads)
    if offset:
        left = offset
        while left:
            left -= len(f.read(min(left, 1 << 26)))
        print(f'resuming at {offset / 2**30:.1f} GiB of JSON', flush=True)
    t0, last_cp, start_off = time.time(), offset, offset

    def checkpoint(done=False):
        db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)',
                       [('dump', W.DUMP_NAME), ('schema', SCHEMA), ('offset', str(offset)), ('lines', str(lines)),
                        ('kept', str(kept)), ('done', '1' if done else '0')])
        db.commit()

    box = [offset, False, lines]
    with mp.Pool(W.flag('--workers', 2, int)) as pool:
        for found, off, nl in pool.imap(parse_batch, chunks(f, box, start_off)):
            for _, rows in found:
                db.executemany('INSERT INTO wd_iqual VALUES (?,?,?,?,?,?)', rows)
            kept, offset, lines = kept + len(found), off, nl
            if offset - last_cp >= W.CHECKPOINT:
                checkpoint()
                last_cp = offset
                el = time.time() - t0
                print(f'{offset / 2**30:.0f} GiB JSON, {lines:,} lines, {kept:,} kept, '
                      f'{(offset - start_off) / 2**20 / el:.0f} MiB/s', flush=True)
    finished = box[1]
    checkpoint(done=finished)
    if finished:
        db.executescript('''
            CREATE INDEX IF NOT EXISTS wd_iqual_qid ON wd_iqual(qid);
            CREATE INDEX IF NOT EXISTS wd_iqual_sid ON wd_iqual(sid);
            CREATE INDEX IF NOT EXISTS wd_iqual_target ON wd_iqual(target);
        ''')
        db.commit()
        print('reached the end; indexed', flush=True)
    else:
        print(f'paused at {offset / 2**30:.1f} GiB of JSON; run again to resume', flush=True)
    f.close()
    el = time.time() - t0
    print(f'{lines:,} lines, {kept:,} items kept, {el / 60:.1f} min this run')


if __name__ == '__main__':
    main()
