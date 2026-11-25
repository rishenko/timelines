"""
The revisions stage (wave 2 A2; Workbench "2026-11-24 Timelines wave 3 schema and evidence design", A): for every English Wikipedia page the
shipped timelines cite, the revision of that page the dump holds, so a source can name the exact version it was read from (`Source.revision`,
`Source.dump`; the generators write them, A3).

    python3 -I pipelines/common/revisions.py build [--stages DIR]   read the dump for every cited page; write the table and the record
    python3 -I pipelines/common/revisions.py titles                 print how many pages the compiled timelines cite (no dump needed)

Reads the compiled timelines (public/timelines/*.json), so it runs after the compile; the generators call wp_dump.page_revision themselves
and do not read this table (the table would feed back into them). The table, `{title: {revision, timestamp, resolved}}` sorted by title, goes
to <stages>/L1/revisions/current/revisions.json (default ~/data/stages, $TIMELINES_STAGES; scripts/lib/stages.ts has the same path rule); what
is committed is the record, data-src/provenance/stages/revisions.record.json: the dump name, the counts, the table's sha256 and the code's.
`build` fails if a cited page is missing from the dump (the PC's job 5 found 0 of 9,790).
"""
import glob
import hashlib
import json
import os
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
RECORD = os.path.join(ROOT, 'data-src', 'provenance', 'stages', 'revisions.record.json')
CODE = ['pipelines/common/revisions.py', 'pipelines/common/wp_dump.py', 'pipelines/common/settings.py']


def title_of(url):
    """The page title in an en.wikipedia.org/wiki/ URL (percent-decoded, underscores to spaces, no fragment), or None."""
    p = urllib.parse.urlparse(url)
    if p.netloc not in ('en.wikipedia.org', 'en.m.wikipedia.org') or not p.path.startswith('/wiki/'):
        return None
    return urllib.parse.unquote(p.path[len('/wiki/'):]).replace('_', ' ').strip() or None


def cited_titles(root=ROOT):
    """Every page title the compiled timelines' sources cite, sorted."""
    titles = set()
    for path in sorted(glob.glob(os.path.join(root, 'public', 'timelines', '*.json'))):
        d = json.load(open(path, encoding='utf-8'))
        for s in d.get('sources', {}).values():
            t = title_of(s.get('url', ''))
            if t:
                titles.add(t)
    return sorted(titles)


def build_table(titles):
    """({title: {revision, timestamp, resolved}}, [titles the dump lacks]); `resolved` is set only when a redirect was followed."""
    import wp_dump
    table, missing = {}, []
    for t in titles:
        p = wp_dump.page(t)
        if not p or not p['revision']:
            missing.append(t)
            continue
        e = {'revision': p['revision'], 'timestamp': p['timestamp']}
        if p['title'] != t:
            e['resolved'] = p['title']
        table[t] = e
    return table, missing


def stages_root():
    return os.environ.get('TIMELINES_STAGES') or os.path.join(os.path.expanduser('~'), 'data', 'stages')


def _sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main(argv):
    cmd = argv[0] if argv else ''
    if cmd == 'titles':
        print(len(cited_titles()), 'pages cited by the compiled timelines')
        return 0
    if cmd != 'build':
        print(__doc__)
        return 2
    import settings
    root = argv[argv.index('--stages') + 1] if '--stages' in argv else stages_root()
    titles = cited_titles()
    table, missing = build_table(titles)
    if missing:
        print(f'{len(missing)} cited page(s) are not in the dump {settings.DUMP_NAME}, e.g. {missing[:5]}', file=sys.stderr)
        return 1
    out = os.path.join(root, 'L1', 'revisions', 'current')
    os.makedirs(out, exist_ok=True)
    table_path = os.path.join(out, 'revisions.json')
    with open(table_path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(table, f, ensure_ascii=False, sort_keys=True, indent=0)
        f.write('\n')
    record = {
        'stage': 'revisions', 'layer': 'L1', 'dump': settings.DUMP_NAME,
        'pages': len(table), 'redirects_followed': sum('resolved' in e for e in table.values()), 'missing': 0,
        'table_sha256': _sha(table_path),
        'code': {f: _sha(os.path.join(ROOT, f)) for f in CODE},
    }
    os.makedirs(os.path.dirname(RECORD), exist_ok=True)
    with open(RECORD, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(record, f, indent=1)
        f.write('\n')
    print(f"revisions: {record['pages']} pages in {settings.DUMP_NAME} ({record['redirects_followed']} through a redirect), table {record['table_sha256'][:12]}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
