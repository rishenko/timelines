"""
The people pass, schema 2 (report only): for every human with an English article, what the people block and the selection need, plus the
labels and the P17/P279/P31 of every other item with an English article (the occupations, countries and places those claims point to).
One streaming read-only pass over the Wikidata dump into a separate file; wd_item and the persons store are untouched. Design: Workbench
"2026-11-24 Timelines people pass design review", build step 1.

    nice -n 19 pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py [--threads 2] [--workers 3] [--restart]
    pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py --check [--out FILE]     # invariants and counts of a finished file
    ... --out FILE --max-gib 2 --restart      # a smoke run on the first 2 GiB of JSON (about a minute), into another file

Writes wikidata-<dump>-people2.sqlite beside the dump (--out FILE overrides). The schema 1 file (`-people.sqlite`, the 2026-11-24 report's
input) is not touched or resumed. Tables:
  person(qid, label, enwiki, p106, p27, p19, born, died,            human (P31 Q5) with an enwiki sitelink, living people left out (below)
         born_prec, born_cal, born_rank, born_n, died_prec, died_cal, died_rank, died_n,
         p27d, p937, p551, fl, wp_start, wp_end, sitelinks, aliases)
  ref(qid, label, enwiki, p31, p279, p17, p30)                      any other item with an enwiki sitelink (as schema 1); index on enwiki
  meta(key, value)                                                  dump, schema '2', offset, counts, skipped_living, done

  p106, p27, p19, p937, p551: JSON lists of item ids, non-deprecated claims only, preferred rank first and then the dump's order. The first
      p106 is the primary occupation (performers and athletes are judged on it alone).
  born, died: the best P569/P570 claim as Wikidata gives its time string (preferred rank, else normal, never deprecated; the first in
      dump order within a rank); *_prec its precision (9 year, 10 month, 11 day; 8 decade, 7 century, 6 millennium), *_cal its calendar model
      item (Q1985727 proleptic Gregorian, Q1985786 proleptic Julian), *_rank 'preferred' or 'normal', *_n the number of non-deprecated claims
      (more than 1 is a contested date). A P570 of "unknown value" counts as dead with no date: died NULL, died_n 1.
  p27d: JSON list of [country item, P580 start time string or null, P582 end time string or null, rank] for every non-deprecated P27 claim.
  p937, p551: work location and residence as the same [item, start, end, rank] lists (their ids stay in the plain list columns above).
  fl: first non-deprecated P1317 (floruit) as [time string, precision] or null; wp_start, wp_end: P2031 and P2032 likewise.
  sitelinks: the number of Wikipedia-language and Wikimedia sitelinks (commons, species, meta, mediawiki and wikidata excluded);
  aliases: the English aliases, JSON list.
Living people: no death claim at all and born in 1916 or later (under 110 on the dump's date) are not written; they are counted in
meta.skipped_living. Heads of state and government who are alive come in through their reigns (Kevin, 2026-11-24).

Pause with the file ~/data/wikidata/PAUSE-people or SIGTERM; run again to resume (--restart starts over).
"""
import json
import os
import re
import signal
import sqlite3
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wikidata as W  # noqa: E402

OUT = W.flag('--out', os.path.join(W.W, f'{W.DUMP_NAME}-people2.sqlite'))
PAUSE = os.path.join(W.W, 'PAUSE-people')
SCHEMA = '2'
NEEDLE = b'"enwiki":{"site":"enwiki"'
LIVING_BORN_FROM = 1916  # no death claim and born from this year: possibly alive, left out
NOT_LANGUAGE_SITES = {'commonswiki', 'specieswiki', 'metawiki', 'mediawikiwiki', 'wikidatawiki'}
PERSON_COLS = ('qid', 'label', 'enwiki', 'p106', 'p27', 'p19', 'born', 'died', 'born_prec', 'born_cal', 'born_rank', 'born_n', 'died_prec', 'died_cal',
               'died_rank', 'died_n', 'p27d', 'p937', 'p551', 'fl', 'wp_start', 'wp_end', 'sitelinks', 'aliases')
YEAR = re.compile(r'^([+-])0*(\d+)-')


def year_of(t):
    """The year of a Wikidata time string ("+1564-04-23T00:00:00Z" -> 1564, "-0356-..." -> -356), or None."""
    m = YEAR.match(t or '')
    return (-1 if m.group(1) == '-' else 1) * int(m.group(2)) if m else None


def live(claims):
    """The non-deprecated claims, preferred rank first, then the dump's order."""
    ok = [c for c in claims or [] if c.get('rank') != 'deprecated']
    return sorted(ok, key=lambda c: c.get('rank') != 'preferred')


def item_id(c):
    v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
    return v.get('id') if isinstance(v, dict) else None


def time_value(c):
    v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
    return v if isinstance(v, dict) and v.get('time') else None


def qual_time(c, prop):
    for q in (c.get('qualifiers') or {}).get(prop, []):
        v = q.get('datavalue', {}).get('value')
        if isinstance(v, dict) and v.get('time'):
            return v['time']
    return None


def dated(claims):
    """[[item, start, end, rank]] for the non-deprecated claims (P580/P582 qualifiers as time strings)."""
    return [[item_id(c), qual_time(c, 'P580'), qual_time(c, 'P582'), c.get('rank', 'normal')] for c in live(claims) if item_id(c)]


def best_date(claims):
    """(time string, precision, calendar model, rank, claim count) of the best P569/P570 claim; (None,)*4 + (n,) with an unknown value
    (n counts it); all None and 0 without a claim."""
    cs = live(claims)
    if not cs:
        return None, None, None, None, 0
    for c in cs:
        v = time_value(c)
        if v:
            return v['time'], v.get('precision'), v.get('calendarmodel', '').rsplit('/', 1)[-1] or None, c.get('rank', 'normal'), len(cs)
    return None, None, None, None, len(cs)


def first_time(claims):
    for c in live(claims):
        v = time_value(c)
        if v:
            return [v['time'], v.get('precision')]
    return None


def parse(line):
    e = json.loads(line)
    cl = e.get('claims', {})

    def ids(p):
        return [i for i in (item_id(c) for c in live(cl.get(p))) if i]

    title = (e.get('sitelinks', {}).get('enwiki') or {}).get('title')
    if not title:
        return None
    lab = e.get('labels', {}).get('en', {}).get('value')
    p31 = ids('P31')
    if 'Q5' in p31:
        born, born_prec, born_cal, born_rank, born_n = best_date(cl.get('P569'))
        died, died_prec, died_cal, died_rank, died_n = best_date(cl.get('P570'))
        by = year_of(born)
        if died_n == 0 and by is not None and by >= LIVING_BORN_FROM:
            return ('l', None)
        sites = sum(1 for k in e.get('sitelinks', {}) if k.endswith('wiki') and k not in NOT_LANGUAGE_SITES)
        aliases = [a['value'] for a in e.get('aliases', {}).get('en', [])]
        j = lambda x: json.dumps(x, ensure_ascii=False)  # noqa: E731
        return ('p', (e['id'], lab, title, j(ids('P106')), j(ids('P27')), j(ids('P19')), born, died, born_prec, born_cal, born_rank, born_n,
                      died_prec, died_cal, died_rank, died_n, j(dated(cl.get('P27'))), j(dated(cl.get('P937'))), j(dated(cl.get('P551'))),
                      j(first_time(cl.get('P1317'))), j(first_time(cl.get('P2031'))), j(first_time(cl.get('P2032'))), sites, j(aliases)))
    p17 = ids('P17')
    return ('r', (e['id'], lab, title, json.dumps(p31), json.dumps(ids('P279')), p17[0] if p17 else None, json.dumps(ids('P30'))))


def parse_batch(task):
    lines, off, nl = task
    ps, rs, living = [], [], 0
    for l in lines:
        r = parse(l.rstrip(b',\r'))
        if r:
            if r[0] == 'l':
                living += 1
            else:
                (ps if r[0] == 'p' else rs).append(r[1])
    return ps, rs, living, off, nl


def chunks(f, box):
    limit = W.flag('--max-gib', 0, float) * (1 << 30)
    while True:
        if W.stop or os.path.exists(PAUSE) or (limit and box[0] >= limit):
            return
        chunk = f.read(1 << 24)
        if not chunk:
            box[1] = True
            return
        buf = box[3] + chunk
        *whole, rest = buf.split(b'\n')
        box[3] = rest
        box[2] += len(whole)
        box[0] = f.tell() - len(rest)
        yield [l for l in whole if l[:2] == b'{"' and NEEDLE in l], box[0], box[2]


PERSON_SQL = ('CREATE TABLE IF NOT EXISTS person(qid TEXT PRIMARY KEY, label TEXT, enwiki TEXT, p106 TEXT, p27 TEXT, p19 TEXT, born TEXT, died TEXT, '
              'born_prec INTEGER, born_cal TEXT, born_rank TEXT, born_n INTEGER, died_prec INTEGER, died_cal TEXT, died_rank TEXT, died_n INTEGER, '
              'p27d TEXT, p937 TEXT, p551 TEXT, fl TEXT, wp_start TEXT, wp_end TEXT, sitelinks INTEGER, aliases TEXT) WITHOUT ROWID;')
REF_SQL = 'CREATE TABLE IF NOT EXISTS ref(qid TEXT PRIMARY KEY, label TEXT, enwiki TEXT, p31 TEXT, p279 TEXT, p17 TEXT, p30 TEXT) WITHOUT ROWID;'


def setup(db):
    db.executescript(PERSON_SQL + REF_SQL + 'CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);'
                     'CREATE INDEX IF NOT EXISTS ref_enwiki ON ref(enwiki);')


def check(db):
    """(problems, counts) for a finished file: invariants every row must satisfy and the numbers to read against the design review."""
    q = lambda sql: db.execute(sql).fetchone()[0]  # noqa: E731
    problems = []
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('schema') != '2':
        problems.append(f"meta.schema is {meta.get('schema')!r}, not '2'")
    if meta.get('done') != '1':
        problems.append('the pass is not finished (meta.done is not 1)')
    for name, sql in (
            ('a date with no precision', "SELECT COUNT(*) FROM person WHERE (born IS NOT NULL AND born_prec IS NULL) OR (died IS NOT NULL AND died_prec IS NULL)"),
            ('a date with no rank', "SELECT COUNT(*) FROM person WHERE (born IS NOT NULL AND born_rank IS NULL) OR (died IS NOT NULL AND died_rank IS NULL)"),
            ('a deprecated rank was kept', "SELECT COUNT(*) FROM person WHERE born_rank = 'deprecated' OR died_rank = 'deprecated'"),
            ('a person with no enwiki title', "SELECT COUNT(*) FROM person WHERE enwiki IS NULL OR enwiki = ''"),
            ('a negative sitelink count', 'SELECT COUNT(*) FROM person WHERE sitelinks < 1'),
            ('a p27d that does not parse as a list', "SELECT COUNT(*) FROM person WHERE p27d IS NULL OR substr(p27d, 1, 1) != '['")):
        n = q(sql)
        if n:
            problems.append(f'{n} rows: {name}')
    alive = sum(1 for (b,) in db.execute('SELECT born FROM person WHERE died_n = 0 AND born IS NOT NULL') if (year_of(b) or 0) >= LIVING_BORN_FROM)
    if alive:
        problems.append(f'{alive} rows: a living person was written (no death claim, born {LIVING_BORN_FROM} or later)')
    counts = {'persons': q('SELECT COUNT(*) FROM person'), 'refs': q('SELECT COUNT(*) FROM ref'), 'skipped_living': int(meta.get('skipped_living', 0)),
              'with born': q('SELECT COUNT(*) FROM person WHERE born IS NOT NULL'), 'with died': q('SELECT COUNT(*) FROM person WHERE died IS NOT NULL'),
              'born year-or-finer': q('SELECT COUNT(*) FROM person WHERE born_prec >= 9'), 'born coarser than year': q('SELECT COUNT(*) FROM person WHERE born_prec < 9'),
              'contested born (n>1)': q('SELECT COUNT(*) FROM person WHERE born_n > 1'), 'Julian born': q("SELECT COUNT(*) FROM person WHERE born_cal = 'Q1985786'"),
              'with dated P27': q("SELECT COUNT(*) FROM person WHERE EXISTS (SELECT 1 FROM json_each(p27d) j WHERE json_extract(j.value, '$[1]') IS NOT NULL OR json_extract(j.value, '$[2]') IS NOT NULL)"),
              'with work location': q("SELECT COUNT(*) FROM person WHERE p937 != '[]'"), 'with floruit': q("SELECT COUNT(*) FROM person WHERE fl != 'null'"),
              'with work period': q("SELECT COUNT(*) FROM person WHERE wp_start != 'null' OR wp_end != 'null'")}
    return problems, counts


def main():
    import multiprocessing as mp
    signal.signal(signal.SIGTERM, W._stop)
    signal.signal(signal.SIGINT, W._stop)
    if '--check' in W.ARGS:
        problems, counts = check(sqlite3.connect(f'file:{OUT}?mode=ro', uri=True))
        for k, v in counts.items():
            print(f'{k}: {v:,}')
        for pr in problems:
            print('PROBLEM', pr)
        sys.exit(1 if problems else 0)
    if '--restart' in W.ARGS:
        for p in (OUT, OUT + '-wal', OUT + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(OUT)
    db.execute('PRAGMA journal_mode=WAL')
    setup(db)
    meta = dict(db.execute('SELECT key, value FROM meta'))
    if meta.get('done') == '1':
        print(f'{OUT} is complete; --restart to rebuild')
        return
    if meta.get('schema', SCHEMA) != SCHEMA:
        sys.exit(f"{OUT} holds schema {meta.get('schema')}; --restart to rebuild")
    offset, lines, kp, kr, kl = (int(meta.get(k, 0)) for k in ('offset', 'lines', 'persons', 'refs', 'skipped_living'))
    try:
        import indexed_bzip2 as ibz2
        f = ibz2.open(W.SRC, parallelization=W.flag('--threads', 2, int))
    except ImportError:  # a machine without indexed_bzip2 (the Mac): sequential, fine for a smoke run with --max-gib
        import bz2
        f = bz2.open(W.SRC, 'rb')
    if offset:
        left = offset
        while left:
            left -= len(f.read(min(left, 1 << 26)))
        print(f'resuming at {offset / 2**30:.1f} GiB of JSON', flush=True)
    t0, last_cp, start_off = time.time(), offset, offset

    def checkpoint(done=False):
        db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)', [('dump', W.DUMP_NAME), ('schema', SCHEMA), ('offset', str(offset)), ('lines', str(lines)),
                                                                     ('persons', str(kp)), ('refs', str(kr)), ('skipped_living', str(kl)), ('done', '1' if done else '0')])
        db.commit()

    box = [offset, False, lines, b'']
    qs = ','.join('?' * len(PERSON_COLS))
    with mp.Pool(W.flag('--workers', 3, int)) as pool:
        for ps, rs, nliving, off, nl in pool.imap(parse_batch, chunks(f, box)):
            db.executemany(f'INSERT OR REPLACE INTO person VALUES ({qs})', ps)
            db.executemany('INSERT OR REPLACE INTO ref VALUES (?,?,?,?,?,?,?)', rs)
            kp, kr, kl, offset, lines = kp + len(ps), kr + len(rs), kl + nliving, off, nl
            if offset - last_cp >= W.CHECKPOINT:
                checkpoint()
                last_cp = offset
                print(f'{offset / 2**30:.0f} GiB JSON, {lines:,} lines, {kp:,} persons, {kr:,} refs, {kl:,} living left out, {(offset - start_off) / 2**20 / (time.time() - t0):.0f} MiB/s', flush=True)
    finished = box[1]
    checkpoint(done=finished)
    print('reached the end' if finished else f'paused at {offset / 2**30:.1f} GiB; run again to resume', flush=True)
    f.close()
    print(f'{lines:,} lines, {kp:,} persons, {kr:,} refs, {kl:,} living left out, {(time.time() - t0) / 60:.1f} min this run')


if __name__ == '__main__':
    main()
