"""
Wikidata side tables for the extractor: one streaming pass over the Wikidata JSON dump (a single bz2 stream, read in
parallel by indexed_bzip2, never unpacked) keeps, for every item with an English Wikipedia article, its dates and its
item links (part of, instance of, rulers, offices, conflicts, discoverers), with the start/end qualifiers on those
links. The extractor joins them to candidates by QID (page_props.py), as a cross-check and a discovery route; the cited
source stays the Wikipedia quote. The row passes (rulers and conflicts per polity row) and the science pass read the
same tables, so one pass serves all three.

    pipelines/extract/.venv/bin/python -I pipelines/extract/wikidata.py [--threads 2] [--workers 2] [--limit-gb N] [--restart]

About 4 cores: 2 decompression threads, the reading process, and 2 JSON-parsing workers (Kevin: at most 4 of 10).

Writes wikidata-<dump>.sqlite beside the dump ($TIMELINES_DATA/wikidata):
  wd_item(qid, enwiki)                                 the item's English Wikipedia title
  wd_claim(qid, prop, time, precision, calendar, rank) P580 start, P582 end, P585 point in time, P571 inception,
                                                       P576 dissolved, P575 time of discovery or invention, P577
                                                       publication date: the time string as Wikidata gives it,
                                                       precision (9 year, 10 month, 11 day), calendar (Q1985727
                                                       Gregorian, Q1985786 Julian)
  wd_link(qid, prop, target, rank, sid)                P361 part of, P31 instance of, P6 head of government, P35 head
                                                       of state, P1906/P1313 office held by head of state/government,
                                                       P39 position held, P1344 participant in, P607 conflict, P61
                                                       discoverer or inventor; sid is the statement id, set only when
                                                       the statement has time qualifiers
  wd_qual(sid, qprop, time, precision, calendar)       the time qualifiers of those statements: P580 start, P582 end,
                                                       P585 point in time (who held P35 when, when a person held P39)
  meta(key, value)                                     dump, schema, offset reached, lines, items kept, done

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
SCHEMA = '2'  # 1: dates + P361/P31 (first pass); 2: + row-pass and science props, qualifiers
TIME_PROPS = ('P580', 'P582', 'P585', 'P571', 'P576',
              'P575', 'P577')  # science pass: time of discovery or invention, publication date
# P31 only describes a kept item; every other link prop is a reason to keep it
LINK_PROPS = ('P361', 'P31',
              'P6', 'P35', 'P1906', 'P1313', 'P39',  # row passes, rulers: heads of state/government, their offices
              'P1344', 'P607',  # row passes, conflicts: participant in, conflict
              'P61')  # science pass: discoverer or inventor
QUAL_PROPS = ('P580', 'P582', 'P585')  # time qualifiers kept on link statements (not on P31)
KEEP_LINKS = tuple(p for p in LINK_PROPS if p != 'P31')
NEEDLES = tuple(f'"{p}"'.encode() for p in TIME_PROPS + KEEP_LINKS)
CHECKPOINT = 4 << 30  # commit and save the offset every 4 GiB of JSON


def flag(name, default, cast=str):
    return cast(ARGS[ARGS.index(name) + 1]) if name in ARGS else default


stop = False


def _stop(*_):
    global stop
    stop = True


def _value(snak):
    """A snak's value when it has one (not 'somevalue' or 'novalue'), else None."""
    return snak.get('datavalue', {}).get('value') if snak.get('snaktype') == 'value' else None


def _time(v):
    """(time, precision, calendar QID) of a time value, or None."""
    if isinstance(v, dict) and 'time' in v:
        return v['time'], v.get('precision'), v.get('calendarmodel', '').rsplit('/', 1)[-1]
    return None


def parse(line):
    """(qid, enwiki title, time claims, link claims, qualifiers) for an item with an English article and a wanted
    property, else None."""
    e = json.loads(line)
    en = e.get('sitelinks', {}).get('enwiki')
    if not en:
        return None
    qid, claims, times, links, quals = e['id'], e.get('claims', {}), [], [], []
    for p in TIME_PROPS:
        for c in claims.get(p, []):
            t = _time(_value(c.get('mainsnak', {})))
            if t:
                times.append((qid, p) + t + (c.get('rank'),))
    for p in LINK_PROPS:
        for c in claims.get(p, []):
            v = _value(c.get('mainsnak', {}))
            if not (isinstance(v, dict) and 'id' in v):
                continue
            sid, q = None, []
            if p != 'P31':
                for qp in QUAL_PROPS:
                    for qs in c.get('qualifiers', {}).get(qp, []):
                        t = _time(_value(qs))
                        if t:
                            q.append((qp,) + t)
            if q:
                sid = c.get('id') or f'{qid}${p}${v["id"]}${len(links)}'
                quals += [(sid,) + x for x in q]
            links.append((qid, p, v['id'], c.get('rank'), sid))
    if not times and not any(l[1] != 'P31' for l in links):
        return None
    return qid, en['title'], times, links, quals


def parse_batch(task):
    """Worker: parse the lines that passed the cheap filter; (items, claims, links, qualifiers, offset, lines seen)."""
    lines, off, nl = task
    items, claims, links, quals = [], [], [], []
    for line in lines:
        r = parse(line.rstrip(b',\r'))
        if r:
            items.append((r[0], r[1]))
            claims += r[2]
            links += r[3]
            quals += r[4]
    return items, claims, links, quals, off, nl


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


def create(db):
    db.executescript('''
        CREATE TABLE IF NOT EXISTS wd_item(qid TEXT PRIMARY KEY, enwiki TEXT) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS wd_claim(qid TEXT, prop TEXT, time TEXT, precision INTEGER, calendar TEXT, rank TEXT);
        CREATE TABLE IF NOT EXISTS wd_link(qid TEXT, prop TEXT, target TEXT, rank TEXT, sid TEXT);
        CREATE TABLE IF NOT EXISTS wd_qual(sid TEXT, qprop TEXT, time TEXT, precision INTEGER, calendar TEXT);
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
    ''')


def store(db, items, claims, links, quals):
    db.executemany('INSERT OR REPLACE INTO wd_item VALUES (?,?)', items)
    db.executemany('INSERT INTO wd_claim VALUES (?,?,?,?,?,?)', claims)
    db.executemany('INSERT INTO wd_link VALUES (?,?,?,?,?)', links)
    db.executemany('INSERT INTO wd_qual VALUES (?,?,?,?,?)', quals)


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
    db.execute('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT)')
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('schema', '1') != SCHEMA and (meta.get('offset') or meta.get('done')):
        print(f'{OUT} was written by schema {meta.get("schema", "1")} (this is {SCHEMA}); --restart to rebuild it')
        return
    create(db)
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
                       [('dump', DUMP_NAME), ('schema', SCHEMA), ('offset', str(offset)), ('lines', str(lines)), ('kept', str(kept)),
                        ('done', '1' if done else '0')])
        db.commit()

    import multiprocessing as mp
    box = [offset, False, lines]  # bytes read, reached the end, lines seen
    with mp.Pool(flag('--workers', 2, int)) as pool:
        for items, claims, links, quals, off, nl in pool.imap(parse_batch, chunks(f, box, limit, start_off)):
            store(db, items, claims, links, quals)
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
            CREATE INDEX IF NOT EXISTS wd_qual_sid ON wd_qual(sid);
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
