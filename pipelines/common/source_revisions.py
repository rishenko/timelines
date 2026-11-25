"""
Stamps every English Wikipedia source of a timeline with the dump and the page revision it was read from (wave 2 A3; Workbench "2026-11-24
Timelines wave 3 schema and evidence design", A). `Source.dump` and `Source.revision` are core since v5; `accessed` is the date the pages were read, which
for a source read from a dump is the dump's date (enwiki-20261101 -> 2026-11-01), not the day a generator last ran.

    import source_revisions
    REPORT.append(f'source revisions: {source_revisions.apply(data)}')    # in a generator, right before the file is written

Only sources whose `url` is an en.wikipedia.org/wiki/ page are touched; a source the dump lacks is left as it was and counted. Idempotent. The
revision is the one the dump holds for the page (wp_dump.page_revision: a redirect is followed, as the generators read it).
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import settings  # noqa: E402
import wp_dump  # noqa: E402
from revisions import title_of  # noqa: E402


def dump_date(dump_name=None):
    """'enwiki-20261101' -> '2026-11-01'."""
    m = re.search(r'(\d{4})(\d{2})(\d{2})$', dump_name or settings.DUMP_NAME)
    if not m:
        raise ValueError(f'dump name without a date: {dump_name or settings.DUMP_NAME}')
    return '-'.join(m.groups())


def apply(data, page_revision=None):
    """Sets dump, revision and accessed on the Wikipedia sources of `data` in place; returns 'N sources, M stamped, K not in the dump'."""
    page_revision = page_revision or wp_dump.page_revision
    memo = {}
    stamped = missing = 0
    for s in data.get('sources', {}).values():
        t = title_of(s.get('url', ''))
        if not t:
            continue
        if t not in memo:
            memo[t] = page_revision(t)
        r = memo[t]
        if not r:
            missing += 1
            continue
        s['dump'] = settings.DUMP_NAME
        s['revision'] = r[0]
        s['accessed'] = dump_date()
        stamped += 1
    return f'{stamped} Wikipedia sources stamped with {settings.DUMP_NAME}, {missing} not in the dump'
