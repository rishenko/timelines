"""
Wikidata side tables for the extractor: one streaming pass over the Wikidata JSON dump (a single bz2 stream, read in
parallel by indexed_bzip2, never unpacked) keeps, for every item with an English Wikipedia article, its dates and its
"part of" and "instance of" links. The extractor joins them to candidates by QID (page_props.py), as a cross-check and
a discovery route; the cited source stays the Wikipedia quote.

    pipelines/extract/.venv/bin/python -I pipelines/extract/wikidata.py [--threads 2] [--workers 2] [--limit-gb N] [--restart]

About 4 cores: 2 decompression threads, the reading process, and 2 JSON-parsing workers (Kevin: at most 4 of 10).

Writes wikidata-<dump>.sqlite beside the dump ($TIMELINES_DATA/wikidata):
  wd_item(qid, enwiki)                                 the item's English Wikipedia title
  wd_claim(qid, prop, time, precision, calendar, rank) P580 start, P582 end, P585 point in time, P571 inception,
                                                       P576 dissolved: the time string as Wikidata gives it, precision
                                                       (9 year, 10 month, 11 day), calendar (Q1985727 Gregorian,
                                                       Q1985786 Julian)
  wd_link(qid, prop, target, rank)                     P361 part of, P31 instance of
  meta(key, value)                                     dump, offset reached, lines, items kept, done

Pausing: touch $TIMELINES_DATA/wikidata/PAUSE, or send SIGTERM/SIGINT. The pass commits, saves its offset and the
exits; the next run skips back to that offset (decompressing, about 600 MiB/s) and goes on (--restart starts over).
"""
import json
import os
import signal
import sqlite3
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
DUMP_NAME = os.environ.get('TIMELINES_WD_DUMP', 'wikidata-20261116')
W = os.path.join(settings.DATA, 'wikidata')
SRC = os.path.join(W, f'{DUMP_NAME}-all.json.bz2')
OUT = os.path.join(W, f'{DUMP_NAME}.sqlite')
PAUSE = os.path.join(W, 'PAUSE')
TIME_PROPS = ('P580', 'P582', 'P585', 'P571', 'P576')
LINK_PROPS = ('P361', 'P31')
NEEDLES = tuple(f'"{p}"'.encode() for p in TIME_PROPS + ('P361',))
CHECKPOINT = 4 << 30  # commit and save the offset every 4 GiB of JSON


def flag(name, default, cast=str):
    return cast(ARGS[ARGS.index(name) + 1]) if name in ARGS else default


stop = False


def _stop(*_):
    global stop
    stop = True


def parse(line):
    """(qid, enwiki title, time claims, link claims) for an item with an English article and a wanted property, else None."""
    e = json.loads(line)
    en = e.get('sitelinks', {}).get('enwiki')
    if not en:
        return None
    qid, claims, times, links = e['id'], e.get('claims', {}), [], []
    for p in TIME_PROPS:
        for c in claims.get(p, []):
            s = c.get('mainsnak', {})
            v = s.get('datavalue', {}).get('value') if s.get('snaktype') == 'value' else None
            if isinstance(v, dict) and 'time' in v:
                times.append((qid, p, v['time'], v.get('precision'), v.get('calendarmodel', '').rsplit('/', 1)[-1], c.get('rank')))
    for p in LINK_PROPS:
        for c in claims.get(p, []):
            s = c.get('mainsnak', {})
            v = s.get('datavalue', {}).get('value') if s.get('snaktype') == 'value' else None
            if isinstance(v, dict) and 'id' in v:
                links.append((qid, p, v['id'], c.get('rank')))
    if not times and not any(l[1] == 'P361' for l in links):
        return None
    return qid, en['title'], times, links


def parse_batch(task):
    """Worker: parse the lines that passed the cheap filter; (items, claims, links, offset, lines seen)."""
    lines, off, nl = task
    items, claims, links = [], [], []
    for line in lines:
        r = parse(line.rstrip(b',\r'))
        if r:
            items.append((r[0], r[1]))
            claims += r[2]
            links += r[3]
    return items, claims, links, off, nl


def chunks(f, offset_box, limit, start_off):
    """Main process: read, split into lines, keep the ones that may matter; yields line batches (offset after each)."""
    buf = b''
    while True:
        if stop or os.path.exists(PAUSE) or (limit and offset_box[0] - start_off >= limit * 2**30):
            return
        chunk = f.read(1 << 24)
        if not chunk:
            offset_box[1] = True
            return
        buf += chunk
        *whole, buf = buf.split(b'\n')
        offset_box[2] += len(whole)
        offset_box[0] = f.tell() - len(buf)
        yield [l for l in whole if b'"enwiki"' in l and any(n in l for n in NEEDLES)], offset_box[0], offset_box[2]


def main():
    import indexed_bzip2 as ibz2
    signal.signal(signal.SIGTERM, _stop)
    signal.signal(signal.SIGINT, _stop)
    threads, limit = flag('--threads', 2, int), flag('--limit-gb', None, float)
    if '--restart' in ARGS:
        for p in (OUT, OUT + '-wal', OUT + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(OUT)
    db.execute('PRAGMA journal_mode=WAL')
    db.executescript('''
        CREATE TABLE IF NOT EXISTS wd_item(qid TEXT PRIMARY KEY, enwiki TEXT) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS wd_claim(qid TEXT, prop TEXT, time TEXT, precision INTEGER, calendar TEXT, rank TEXT);
        CREATE TABLE IF NOT EXISTS wd_link(qid TEXT, prop TEXT, target TEXT, rank TEXT);
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
    ''')
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('done') == '1':
        print(f'{OUT} is complete; --restart to rebuild')
        return
    offset, lines, kept = int(meta.get('offset', 0)), int(meta.get('lines', 0)), int(meta.get('kept', 0))
    f = ibz2.open(SRC, parallelization=threads)
    if offset:
        # skip forward by decompressing (about 600 MiB/s): indexed_bzip2's export_index hung on this dump, so no
        # block index is saved between runs
        left = offset
        while left:
            left -= len(f.read(min(left, 1 << 26)))
        print(f'resuming at {offset / 2**30:.1f} GiB of JSON, {lines:,} lines, {kept:,} items kept', flush=True)
    t0, last_cp, start_off = time.time(), offset, offset

    def checkpoint(done=False):
        db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)',
                       [('dump', DUMP_NAME), ('offset', str(offset)), ('lines', str(lines)), ('kept', str(kept)),
                        ('done', '1' if done else '0')])
        db.commit()

    import multiprocessing as mp
    box = [offset, False, lines]  # bytes read, reached the end, lines seen
    with mp.Pool(flag('--workers', 2, int)) as pool:
        for items, claims, links, off, nl in pool.imap(parse_batch, chunks(f, box, limit, start_off)):
            db.executemany('INSERT OR REPLACE INTO wd_item VALUES (?,?)', items)
            db.executemany('INSERT INTO wd_claim VALUES (?,?,?,?,?,?)', claims)
            db.executemany('INSERT INTO wd_link VALUES (?,?,?,?)', links)
            kept, offset, lines = kept + len(items), off, nl
            if offset - last_cp >= CHECKPOINT:
                checkpoint()
                last_cp = offset
                el = time.time() - t0
                print(f'{offset / 2**30:.0f} GiB JSON, {lines:,} lines, {kept:,} kept, '
                      f'{(offset - start_off) / 2**20 / el:.0f} MiB/s', flush=True)
    finished = box[1]
    checkpoint(done=finished)
    if finished:
        db.executescript('''
            CREATE INDEX IF NOT EXISTS wd_item_enwiki ON wd_item(enwiki);
            CREATE INDEX IF NOT EXISTS wd_claim_qid ON wd_claim(qid);
            CREATE INDEX IF NOT EXISTS wd_link_qid ON wd_link(qid);
            CREATE INDEX IF NOT EXISTS wd_link_target ON wd_link(target);
        ''')
        db.commit()
        print('reached the end; indexed', flush=True)
    else:
        print(f'paused at {offset / 2**30:.1f} GiB of JSON; run again to resume', flush=True)
    f.close()  # stop the decompressor's threads before Python exits
    el = time.time() - t0
    print(f'{lines:,} lines, {kept:,} items kept, {el / 60:.1f} min this run, {(offset - start_off) / 2**20 / max(el, 1):.0f} MiB/s')


if __name__ == '__main__':
    main()
