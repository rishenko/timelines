"""
The Wikidata pass at a glance, in 10 lines or fewer: is it running, how far along, what the tables hold, and two spot
checks (World War I's dates, Germany's heads with terms). Read-only; safe while the pass runs.

    pipelines/extract/.venv/bin/python -I pipelines/extract/wd_status.py [--db PATH] [--fast]

--fast skips the per-prop counts and spot checks (full table scans before the indexes exist: seconds to a minute).
Progress comes from pass.log and pass.pid beside the DB. The ETA assumes about 121 million entity lines in the dump
(Wikidata's entity count; the first pass saw 118.6 million at 1,696 GiB without reaching the end), so it is a guide.
"""
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402

EXPECTED_LINES = 121_000_000
PROGRESS = re.compile(r'^([\d.]+) GiB JSON, ([\d,]+) lines, ([\d,]+) kept, (\d+) MiB/s')


def last_progress(log_text):
    """(GiB, lines, kept, MiB/s) from the last progress line of pass.log, or None; plus the last line of the log."""
    lines = [l for l in log_text.splitlines() if l.strip()]
    for l in reversed(lines):
        m = PROGRESS.match(l)
        if m:
            return (float(m[1]), int(m[2].replace(',', '')), int(m[3].replace(',', '')), int(m[4])), lines[-1]
    return None, (lines[-1] if lines else '')


def eta_minutes(gib, lines, mibs, expected=EXPECTED_LINES):
    """Minutes left at the current rate, from bytes per line so far; None when it can't be told."""
    if not (lines and mibs) or lines >= expected:
        return None
    return (expected - lines) * (gib * 1024 / lines) / mibs / 60


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ValueError, TypeError):
        return False


def main(argv):
    w = os.path.join(settings.DATA, 'wikidata')
    db_path = argv[argv.index('--db') + 1] if '--db' in argv else os.path.join(w, 'wikidata-20261116.sqlite')
    d = os.path.dirname(db_path)
    pid = open(os.path.join(d, 'pass.pid')).read().strip() if os.path.exists(os.path.join(d, 'pass.pid')) else ''
    log = open(os.path.join(d, 'pass.log')).read() if os.path.exists(os.path.join(d, 'pass.log')) else ''
    prog, last = last_progress(log)
    run = f'pid {pid} ' + ('running' if pid and alive(int(pid)) else 'not running') if pid else 'no pid file'
    if prog:
        eta = eta_minutes(prog[0], prog[1], prog[3])
        run += f'; {prog[0]:.0f} GiB, {prog[1] / 1e6:.1f}M lines, {prog[2]:,} kept, {prog[3]} MiB/s'
        run += f', ETA ~{eta:.0f} min' if eta is not None else ''
    print(f'run: {run}')
    print(f'log: {last[:110]}')
    if not os.path.exists(db_path):
        print(f'db: {db_path} missing')
        return
    db = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    meta = dict(db.execute('SELECT key, value FROM meta'))
    idx = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")]
    print(f"db: schema {meta.get('schema', '1')}, done {meta.get('done')}, offset {int(meta.get('offset', 0)) / 2**30:.0f} GiB, "
          f"kept {int(meta.get('kept', 0)):,}, {os.path.getsize(db_path) / 2**20:.0f} MiB, indexes {len(idx)}")
    if '--fast' in argv:
        return
    tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for t, col in (('wd_claim', 'prop'), ('wd_link', 'prop'), ('wd_qual', 'qprop')):
        if t in tables:
            rows = db.execute(f'SELECT {col}, count(*) FROM {t} GROUP BY {col} ORDER BY 2 DESC').fetchall()
            print(f'{t}: ' + ', '.join(f'{p} {n:,}' for p, n in rows))
    ww1 = db.execute("SELECT prop, substr(time, 2, 10) FROM wd_claim WHERE qid='Q361' AND prop IN ('P580','P582')").fetchall()
    print('Q361 WW1: ' + (', '.join(f'{p} {t}' for p, t in ww1) or 'not reached') + '  (want 1914-07-28, 1918-11-11)')
    if 'wd_qual' in tables:
        de = db.execute("SELECT l.prop, count(*), count(q.sid) FROM wd_link l LEFT JOIN wd_qual q ON q.sid = l.sid AND "
                        "q.qprop='P580' WHERE l.qid='Q183' AND l.prop IN ('P6','P35') GROUP BY l.prop").fetchall()
        print('Q183 Germany: ' + (', '.join(f'{p} {n} heads, {s} with start' for p, n, s in de) or 'not reached')
              + '  (want P6 11, P35 15)')


if __name__ == '__main__':
    main(settings.take_flags(sys.argv[1:]))
