"""
Adds each page's Wikidata QID to extract-<dump>.sqlite, read from the same dump's page_props SQL file
(<dump>-page_props.sql.gz in the Wikipedia folder; its `wikibase_item` rows map page id -> QID). Streamed, never unpacked.

    pipelines/extract/.venv/bin/python -I pipelines/extract/page_props.py [--sample] [--data DIR] [--dump NAME]

--sample fills the sample file (extract-<dump>-sample.sqlite) instead, keeping only its pages.
"""
import gzip
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
ROW = re.compile(rb"\((\d+),'wikibase_item','(Q\d+)',")


def main():
    W = settings.WIKIPEDIA
    src = os.path.join(W, f'{settings.DUMP_NAME}-page_props.sql.gz')
    path = os.path.join(W, f'extract-{settings.DUMP_NAME}{"-sample" if "--sample" in ARGS else ""}.sqlite')
    db = sqlite3.connect(path)
    db.execute('PRAGMA journal_mode=OFF'); db.execute('PRAGMA synchronous=OFF')
    db.execute('DROP TABLE IF EXISTS qid')
    db.execute('CREATE TABLE qid(page_id INTEGER PRIMARY KEY, qid TEXT)')
    n = 0
    with gzip.open(src, 'rb') as f:
        for line in f:
            if b'wikibase_item' in line:  # one row per line after each INSERT line (some dumps put many on one)
                rows = [(int(a), b.decode()) for a, b in ROW.findall(line)]
                db.executemany('INSERT OR IGNORE INTO qid VALUES (?,?)', rows)
                n += len(rows)
    if '--sample' in ARGS:
        db.execute('DELETE FROM qid WHERE page_id NOT IN (SELECT page_id FROM page)')
    db.execute('CREATE INDEX IF NOT EXISTS qid_qid ON qid(qid)')
    db.execute("INSERT OR REPLACE INTO meta VALUES ('page_props', ?)", (os.path.basename(src),))
    db.commit()
    print(f'{n} wikibase_item rows read; {db.execute("SELECT count(*) FROM qid").fetchone()[0]} kept in {path}')


if __name__ == '__main__':
    main()
