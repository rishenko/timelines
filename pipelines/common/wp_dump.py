"""
Reads English Wikipedia pages from the local multistream dump, by title, through index.sqlite (built once by
wp_index_db.py). page(title) -> {'title', 'text', 'redirect_from', 'revision', 'timestamp'} or None; follows one redirect. `revision` is the id of the page
revision the dump holds (the one whose text was read: the redirect target's, when a redirect was followed) and `timestamp` its time, so a
source can cite the exact version; DUMP_NAME (settings) names the dump.

Where the data lives (settings.py): $TIMELINES_DATA/wikipedia (default ~/data/wikipedia), dump $TIMELINES_WP_DUMP
(default enwiki-20261101).
"""
import bz2
import re
import sqlite3
from functools import lru_cache

from settings import DUMP, WIKIPEDIA as W

_conn = None


def _db():
    """Opened on first use, so a module that only imports wp_dump (the freeze regression in CI, which has no dump) needs no index."""
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(f'file:{W}/index.sqlite?mode=ro', uri=True)
    return _conn


_unesc = lambda s: s.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#039;', "'").replace('&amp;', '&')

@lru_cache(maxsize=256)
def _stream(offset):
    with open(DUMP, 'rb') as f:
        f.seek(offset)
        d = bz2.BZ2Decompressor(); out = b''
        while not d.eof:
            chunk = f.read(1 << 16)
            if not chunk: break
            out += d.decompress(chunk)
    return out.decode('utf-8')

def _raw(title):
    title = title.replace('_', ' ').strip()
    if title: title = title[0].upper() + title[1:]
    row = _db().execute('SELECT offset, id FROM page WHERE title = ?', (title,)).fetchone()
    if not row: return None
    xml = _stream(row[0])
    m = re.search(r'<page>\s*<title>([^<]*)</title>\s*<ns>\d+</ns>\s*<id>%d</id>(.*?)</page>' % row[1], xml, re.S)
    if not m: return None
    body = m.group(2)
    rev = re.search(r'<revision>\s*<id>(\d+)</id>(?:\s*<parentid>\d+</parentid>)?\s*<timestamp>([^<]+)</timestamp>', body)
    red = re.search(r'<redirect title="([^"]+)"', body)
    text = re.search(r'<text[^>]*>(.*?)</text>', body, re.S)
    return {'title': _unesc(m.group(1)), 'redirect': _unesc(red.group(1)) if red else None, 'text': _unesc(text.group(1)) if text else '',
            'revision': int(rev.group(1)) if rev else None, 'timestamp': rev.group(2) if rev else None}

def page(title):
    p = _raw(title)
    if p and p['redirect']:
        target = p['redirect'].split('#')[0]
        q = _raw(target)
        if q: return {'title': q['title'], 'text': q['text'], 'redirect_from': p['title'], 'revision': q['revision'], 'timestamp': q['timestamp']}
    return p and {'title': p['title'], 'text': p['text'], 'redirect_from': None, 'revision': p['revision'], 'timestamp': p['timestamp']}


def page_revision(title):
    """(revision id, timestamp) of the page the dump holds for `title` (a redirect is followed, as in page()), or None."""
    p = page(title)
    return p and p['revision'] and (p['revision'], p['timestamp'])

AI_FLAG = re.compile(r'\{\{\s*(?:AI[- ]generated|LLM[- ]generated|AI[- ]written)\b', re.I)
def ai_flagged(text): return bool(AI_FLAG.search(text))

def categories(text):
    return [re.sub(r'\s+', ' ', c.split('|')[0]).strip() for c in re.findall(r'\[\[\s*Category\s*:\s*([^\]]+)\]\]', text, re.I)]
