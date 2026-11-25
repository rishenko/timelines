"""
The people pass, schema 2 (report only): for every human with an English article, what the people block and the selection need, plus the
labels and the P17/P279/P31 of every other item with an English article (the occupations, countries and places those claims point to).
One streaming read-only pass over the Wikidata dump into a separate file; wd_item and the persons store are untouched. Design: Workbench
"2026-11-24 Timelines people pass design review", build step 1.

    nice -n 19 pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py [--workers 30] [--restart] [--trace-mem]
    pipelines/.venv/bin/python -I pipelines/extract/wd_people_attrs.py --check [--out FILE]     # invariants and counts of a finished file
    ... --out FILE --max-gib 2 --restart      # a smoke run on the first 2 GiB of JSON (about a minute), into another file

Writes wikidata-<dump>-people2.sqlite beside the dump (--out FILE overrides). The schema 1 file (`-people.sqlite`, the 2026-11-24 report's
input) is not touched or resumed. Tables:
  person(qid, label, enwiki, p106, p27, p19, born, died,            every human (P31 Q5) with an enwiki sitelink; status says who is alive
         born_prec, born_cal, born_rank, born_n, died_prec, died_cal, died_rank, died_n,
         p27d, p937, p551, fl, wp_start, wp_end, sitelinks, aliases, status)
  ref(qid, label, enwiki, p31, p279, p17, p30)                      any other item with an enwiki sitelink (as schema 1); index on enwiki
  meta(key, value)                                                  dump, schema '2', offset, bit, out, carry (resume point), counts, recoveries, done

  p106, p27, p19, p937, p551: JSON lists of item ids, non-deprecated claims only, preferred rank first and then the dump's order. The first
      p106 is the primary occupation (performers and athletes are judged on it alone).
  born, died: the best P569/P570 claim as Wikidata gives its time string (preferred rank, else normal, never deprecated; the first in
      dump order within a rank); *_prec its precision (9 year, 10 month, 11 day; 8 decade, 7 century, 6 millennium), *_cal its calendar model
      item (Q1985727 proleptic Gregorian, Q1985786 proleptic Julian), *_rank 'preferred' or 'normal', *_n the number of non-deprecated claims
      (more than 1 is a contested date). A P570 of "unknown value" counts as dead with no date: died NULL, died_n 1.
  status: 'deceased' (a death claim), 'living' (no death claim and born in 1916 or later: under 110 on the dump's date) or 'unknown' (no
      death claim and no birth date, or born before 1916). Kevin, 2026-11-24: living people are kept and judged by importance like anyone
      else; the status says who they are. Nobody is dropped by this pass.
  p27d: JSON list of [country item, P580 start time string or null, P582 end time string or null, rank] for every non-deprecated P27 claim.
  p937, p551: work location and residence as the same [item, start, end, rank] lists (their ids stay in the plain list columns above).
  fl: first non-deprecated P1317 (floruit) as [time string, precision] or null; wp_start, wp_end: P2031 and P2032 likewise.
  sitelinks: the number of Wikipedia-language and Wikimedia sitelinks (commons, species, meta, mediawiki and wikidata excluded);
  aliases: the English aliases, JSON list.

How it runs: pbz2 (pipelines/common/pbz2.py, block-parallel stdlib bz2, flat memory) finds the bz2 blocks and hands groups of 64 to --workers
processes; a worker decompresses its group, splits it into lines, filters on the enwiki needle and parses, and returns only rows. The main
process joins the line that spans two groups, writes the rows in file order (so the SQLite rows are the same whatever --workers is) and
commits a checkpoint every few GiB: rows, counts and pbz2's resume point (bit offset, decompressed bytes, the partial-line carry) in one
transaction. A false block magic inside the compressed data (about 0.003 expected per pass) is recovered by pbz2 and recorded in meta
(recoveries: [[dropped bit offsets], first bit, end bit]); the run logs the count. Memory stays flat (the groups in flight, 2 x workers).

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
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import pbz2  # noqa: E402
import wikidata as W  # noqa: E402

OUT = W.flag('--out', os.path.join(W.W, f'{W.DUMP_NAME}-people2.sqlite'))
PAUSE = os.path.join(W.W, 'PAUSE-people')
SCHEMA = '2'
NEEDLE = b'"enwiki":{"site":"enwiki"'
LIVING_BORN_FROM = 1916  # no death claim and born from this year: status 'living' (under 110 on the dump's date)
GROUP = pbz2.GROUP  # bz2 blocks per task (pbz2); tests lower it
# Persons the pass must write, per dump. Schema 1 counted 2,157,652 humans with an enwiki article; schema 2 drops the 39 whose only Q5 (human)
# claim is deprecated-rank (bands, duos, 'human biblical figure'): 2,157,652 - 39 = 2,157,613 (PC full pass at 69c19ae). The 39 are listed in the
# Workbench note '2026-11-24 Timelines people pass deprecated-Q5 ids'.
EXPECTED_PERSONS = {'wikidata-20261116': 2157613}
NOT_LANGUAGE_SITES = {'commonswiki', 'specieswiki', 'metawiki', 'mediawikiwiki', 'wikidatawiki'}
PERSON_COLS = ('qid', 'label', 'enwiki', 'p106', 'p27', 'p19', 'born', 'died', 'born_prec', 'born_cal', 'born_rank', 'born_n', 'died_prec', 'died_cal',
               'died_rank', 'died_n', 'p27d', 'p937', 'p551', 'fl', 'wp_start', 'wp_end', 'sitelinks', 'aliases', 'status')
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


def label_of(e, title):
    """The label to show: English, else the `mul` (any language) label, which Wikidata now uses for many names (Shakira, Lady Gaga), else the
    enwiki title. 55,694 people had no English label in the first full pass."""
    labs = e.get('labels', {})
    return (labs.get('en') or {}).get('value') or (labs.get('mul') or {}).get('value') or title


def parse(line):
    e = json.loads(line)
    cl = e.get('claims', {})

    def ids(p):
        return [i for i in (item_id(c) for c in live(cl.get(p))) if i]

    title = (e.get('sitelinks', {}).get('enwiki') or {}).get('title')
    if not title:
        return None
    lab = label_of(e, title)
    p31 = ids('P31')
    if 'Q5' in p31:
        born, born_prec, born_cal, born_rank, born_n = best_date(cl.get('P569'))
        died, died_prec, died_cal, died_rank, died_n = best_date(cl.get('P570'))
        by = year_of(born)
        status = 'deceased' if died_n else 'living' if by is not None and by >= LIVING_BORN_FROM else 'unknown'
        sites = sum(1 for k in e.get('sitelinks', {}) if k.endswith('wiki') and k not in NOT_LANGUAGE_SITES)
        aliases = [a['value'] for a in e.get('aliases', {}).get('en', [])]
        j = lambda x: json.dumps(x, ensure_ascii=False)  # noqa: E731
        return ('p', (e['id'], lab, title, j(ids('P106')), j(ids('P27')), j(ids('P19')), born, died, born_prec, born_cal, born_rank, born_n,
                      died_prec, died_cal, died_rank, died_n, j(dated(cl.get('P27'))), j(dated(cl.get('P937'))), j(dated(cl.get('P551'))),
                      j(first_time(cl.get('P1317'))), j(first_time(cl.get('P2031'))), j(first_time(cl.get('P2032'))), sites, j(aliases), status))
    p17 = ids('P17')
    return ('r', (e['id'], lab, title, json.dumps(p31), json.dumps(ids('P279')), p17[0] if p17 else None, json.dumps(ids('P30'))))


def parse_lines(data):
    """In a worker (pbz2.map_lines' fn): whole lines of the dump (a group's, or one line that spans two groups), keep the human and item lines
    that carry an enwiki sitelink, parse them. -> (persons, refs, number of lines)"""
    ps, rs = [], []
    for l in data.split(b'\n'):
        if l[:2] == b'{"' and NEEDLE in l:
            r = parse(l.rstrip(b',\r'))
            if r:
                (ps if r[0] == 'p' else rs).append(r[1])
    return ps, rs, data.count(b'\n')


PERSON_SQL = ('CREATE TABLE IF NOT EXISTS person(qid TEXT PRIMARY KEY, label TEXT, enwiki TEXT, p106 TEXT, p27 TEXT, p19 TEXT, born TEXT, died TEXT, '
              'born_prec INTEGER, born_cal TEXT, born_rank TEXT, born_n INTEGER, died_prec INTEGER, died_cal TEXT, died_rank TEXT, died_n INTEGER, '
              'p27d TEXT, p937 TEXT, p551 TEXT, fl TEXT, wp_start TEXT, wp_end TEXT, sitelinks INTEGER, aliases TEXT, status TEXT) WITHOUT ROWID;')
REF_SQL = 'CREATE TABLE IF NOT EXISTS ref(qid TEXT PRIMARY KEY, label TEXT, enwiki TEXT, p31 TEXT, p279 TEXT, p17 TEXT, p30 TEXT) WITHOUT ROWID;'


def setup(db):
    db.executescript(PERSON_SQL + REF_SQL + 'CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);'
                     'CREATE INDEX IF NOT EXISTS ref_enwiki ON ref(enwiki);')


def check(db, expected=None):
    """(problems, counts) for a finished file: invariants every row must satisfy and the numbers to read against the design review.
    expected: the number of humans the pass must have written (None: not checked)."""
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
            ('a person with no label', "SELECT COUNT(*) FROM person WHERE label IS NULL OR label = ''"),
            ('a sitelink count below 1', 'SELECT COUNT(*) FROM person WHERE sitelinks < 1'),
            ('a p27d that is not a list', "SELECT COUNT(*) FROM person WHERE p27d IS NULL OR substr(p27d, 1, 1) != '['"),
            ('a status that is not deceased, living or unknown', "SELECT COUNT(*) FROM person WHERE status IS NULL OR status NOT IN ('deceased', 'living', 'unknown')"),
            ('deceased without a death claim, or a death claim not deceased', "SELECT COUNT(*) FROM person WHERE (status = 'deceased') != (died_n > 0)")):
        n = q(sql)
        if n:
            problems.append(f'{n} rows: {name}')
    wrong = sum(1 for st, b in db.execute("SELECT status, born FROM person WHERE died_n = 0") if (st == 'living') != ((year_of(b) or 0) >= LIVING_BORN_FROM and b is not None))
    if wrong:
        problems.append(f'{wrong} rows: living must be exactly no death claim and born {LIVING_BORN_FROM} or later')
    counts = {'persons': q('SELECT COUNT(*) FROM person'), 'refs': q('SELECT COUNT(*) FROM ref'),
              'deceased': q("SELECT COUNT(*) FROM person WHERE status = 'deceased'"), 'living': q("SELECT COUNT(*) FROM person WHERE status = 'living'"),
              'unknown': q("SELECT COUNT(*) FROM person WHERE status = 'unknown'"),
              'with born': q('SELECT COUNT(*) FROM person WHERE born IS NOT NULL'), 'with died': q('SELECT COUNT(*) FROM person WHERE died IS NOT NULL'),
              'born year-or-finer': q('SELECT COUNT(*) FROM person WHERE born_prec >= 9'), 'born coarser than year': q('SELECT COUNT(*) FROM person WHERE born_prec < 9'),
              'contested born (n>1)': q('SELECT COUNT(*) FROM person WHERE born_n > 1'), 'Julian born': q("SELECT COUNT(*) FROM person WHERE born_cal = 'Q1985786'"),
              'with dated P27': q("SELECT COUNT(*) FROM person WHERE EXISTS (SELECT 1 FROM json_each(p27d) j WHERE json_extract(j.value, '$[1]') IS NOT NULL OR json_extract(j.value, '$[2]') IS NOT NULL)"),
              'with work location': q("SELECT COUNT(*) FROM person WHERE p937 != '[]'"), 'with floruit': q("SELECT COUNT(*) FROM person WHERE fl != 'null'"),
              'with work period': q("SELECT COUNT(*) FROM person WHERE wp_start != 'null' OR wp_end != 'null'")}
    if expected is not None and counts['persons'] != expected:
        problems.append(f"{counts['persons']:,} persons, not the {expected:,} humans with an English article that this dump should give (see EXPECTED_PERSONS): a parse difference")
    return problems, counts


def rss_windows_mb():
    """This process's working set in MB on Windows (psapi GetProcessMemoryInfo through ctypes: no dependency); None if the call fails."""
    import ctypes
    from ctypes import wintypes

    class Counters(ctypes.Structure):
        _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD), ('PeakWorkingSetSize', ctypes.c_size_t),
                    ('WorkingSetSize', ctypes.c_size_t), ('QuotaPeakPagedPoolUsage', ctypes.c_size_t), ('QuotaPagedPoolUsage', ctypes.c_size_t),
                    ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t), ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
                    ('PagefileUsage', ctypes.c_size_t), ('PeakPagefileUsage', ctypes.c_size_t)]

    c = Counters()
    c.cb = ctypes.sizeof(c)
    kernel, psapi = ctypes.WinDLL('kernel32', use_last_error=True), ctypes.WinDLL('psapi', use_last_error=True)
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
    if not psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(), ctypes.byref(c), c.cb):
        return None
    return c.WorkingSetSize // (1 << 20)


def rss_mb():
    """The main process's resident memory in MB (psutil when installed; on Windows psapi through ctypes; else the peak from resource; None where
    none of them exists)."""
    try:
        import psutil
        return psutil.Process().memory_info().rss // (1 << 20)
    except ImportError:
        pass
    if sys.platform == 'win32':
        try:
            return rss_windows_mb()
        except (OSError, AttributeError, ValueError):
            return None
    try:
        import resource
        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return peak // (1 << 20) if sys.platform == 'darwin' else peak // 1024
    except ImportError:
        return None


def run(src, out, workers=3, max_gib=0.0, restart=False, log=print, trace_mem=False):
    """One pass (or a resumed or partial one) from the dump `src` into the SQLite file `out`. Returns the counts of the finished or paused file.
    The dump is read by pbz2 (block-parallel, flat memory). A checkpoint commits the rows, the counts and pbz2's resume point (bit offset,
    decompressed bytes so far, and the partial line `carry`) in one transaction, so a resume neither loses nor doubles the line that spans it."""
    if restart:
        for p in (out, out + '-wal', out + '-shm'):
            if os.path.exists(p):
                os.remove(p)
    db = sqlite3.connect(out)
    try:
        db.execute('PRAGMA journal_mode=WAL')
        setup(db)
        meta = dict(db.execute('SELECT key, value FROM meta'))
        if meta.get('done') == '1':
            log(f'{out} is complete; --restart to rebuild')
            return meta
        if meta.get('schema', SCHEMA) != SCHEMA:
            sys.exit(f"{out} holds schema {meta.get('schema')}; --restart to rebuild")
        if int(meta.get('offset', 0)) and 'bit' not in meta:
            sys.exit(f'{out} was started by the indexed_bzip2 version (no resume bit); --restart to rebuild')
        lines, kp, kr = (int(meta.get(k, 0)) for k in ('lines', 'persons', 'refs'))
        start = pbz2.Position(int(meta['bit']), int(meta['out']), bytes.fromhex(meta['carry'])) if 'bit' in meta else None
        recoveries = [pbz2.Recovery(tuple(d), f, e) for d, f, e in json.loads(meta.get('recoveries', '[]'))]  # false block magics dropped so far
        here = start or pbz2.Position(32, 0, b'')
        if start:
            log(f'resuming at {start.out / 2**30:.1f} GiB of JSON')
        t0, last_cp, start_off = time.time(), here.out, here.out

        def checkpoint(pos, done=False):
            db.executemany('INSERT OR REPLACE INTO meta VALUES (?,?)', [
                ('dump', W.DUMP_NAME), ('schema', SCHEMA), ('offset', str(pos.out)), ('bit', str(pos.bit)), ('out', str(pos.out)), ('carry', pos.carry.hex()),
                ('lines', str(lines)), ('persons', str(kp)), ('refs', str(kr)), ('recoveries', json.dumps([[list(r.dropped), r.first, r.end] for r in recoveries])),
                ('done', '1' if done else '0')])
            db.commit()

        if trace_mem:  # --trace-mem: at each checkpoint, what the main process holds, by source line (tracemalloc)
            import tracemalloc
            tracemalloc.start(8)
        qs = ','.join('?' * len(PERSON_COLS))
        stopped = False
        for (ps, rs, nl), pos in pbz2.map_lines(src, parse_lines, workers=workers, start=start, size=GROUP, recoveries=recoveries):  # in file order: the rows do not depend on --workers
            db.executemany(f'INSERT OR REPLACE INTO person VALUES ({qs})', ps)
            db.executemany('INSERT OR REPLACE INTO ref VALUES (?,?,?,?,?,?,?)', rs)
            kp, kr, lines = kp + len(ps), kr + len(rs), lines + nl
            if pos is None:  # a line spanning two groups, or the file's last line: committed with the group's checkpoint
                continue
            here = pos
            stopped = bool(W.stop or os.path.exists(PAUSE) or (max_gib and pos.out >= max_gib * (1 << 30)))
            if stopped or pos.out - last_cp >= W.CHECKPOINT:
                checkpoint(pos)
                last_cp = pos.out
                log(f'{pos.out / 2**30:.0f} GiB JSON, {lines:,} lines, {kp:,} persons, {kr:,} refs, {(pos.out - start_off) / 2**20 / (time.time() - t0):.0f} MiB/s, main process {rss_mb()} MB')
                if trace_mem:
                    cur, peak = tracemalloc.get_traced_memory()
                    log(f'  tracemalloc: {cur / 2**20:.0f} MB now, {peak / 2**20:.0f} MB peak; top: ' + '; '.join(
                        f'{st.traceback[0].filename.rsplit(os.sep, 1)[-1]}:{st.traceback[0].lineno} {st.size / 2**20:.0f} MB' for st in tracemalloc.take_snapshot().statistics('lineno')[:5]))
            if stopped:
                break
        if not stopped:
            here = pbz2.Position(here.bit, here.out, b'')  # the last line had no newline or its carry is already written: nothing left to resume
        checkpoint(here, done=not stopped)
        log(f'paused at {here.out / 2**30:.1f} GiB; run again to resume' if stopped else 'reached the end')
        log(f'{lines:,} lines, {kp:,} persons, {kr:,} refs, {(time.time() - t0) / 60:.1f} min this run; {len(recoveries)} false block magics recovered')
        return dict(db.execute('SELECT key, value FROM meta'))
    finally:
        db.close()  # a crashed run must not hold the file: a resume in the same process would find it locked


def main():
    signal.signal(signal.SIGTERM, W._stop)
    signal.signal(signal.SIGINT, W._stop)
    if '--check' in W.ARGS:
        problems, counts = check(sqlite3.connect(f'file:{OUT}?mode=ro', uri=True), EXPECTED_PERSONS.get(W.DUMP_NAME))
        for k, v in counts.items():
            print(f'{k}: {v:,}')
        for pr in problems:
            print('PROBLEM', pr)
        sys.exit(1 if problems else 0)
    run(W.SRC, OUT, W.flag('--workers', 3, int), W.flag('--max-gib', 0, float), '--restart' in W.ARGS,
        lambda m: print(m, flush=True), '--trace-mem' in W.ARGS)


if __name__ == '__main__':
    main()
