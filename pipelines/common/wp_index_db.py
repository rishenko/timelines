"""
Builds index.sqlite (title -> stream offset, page id) in the Wikipedia folder from the dump's multistream index, once
per dump (about 80 s and 2 GB). wp_dump.py reads pages by title through it.
Usage: python3 -I pipelines/common/wp_index_db.py [--data DIR] [--dump NAME]   (defaults: settings.py)
"""
import bz2
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # run as a script with -I
import settings  # noqa: E402

settings.take_flags(sys.argv[1:])
IDX, W = settings.DUMP_INDEX, settings.WIKIPEDIA

db = sqlite3.connect(f'{W}/index.sqlite')
db.execute('PRAGMA journal_mode=OFF'); db.execute('PRAGMA synchronous=OFF')
db.execute('DROP TABLE IF EXISTS page')
db.execute('CREATE TABLE page (title TEXT, offset INTEGER, id INTEGER)')
batch = []
with bz2.open(IDX, 'rt', encoding='utf-8') as f:
    for line in f:
        off, pid, title = line.rstrip('\n').split(':', 2)
        batch.append((title, int(off), int(pid)))
        if len(batch) >= 200000:
            db.executemany('INSERT INTO page VALUES (?,?,?)', batch); batch = []
db.executemany('INSERT INTO page VALUES (?,?,?)', batch)
db.execute('CREATE INDEX page_title ON page(title)')
db.commit()
print(db.execute('SELECT count(*) FROM page').fetchone()[0], 'titles')
