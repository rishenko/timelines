"""R1 check (ontology review): every row of Medieval and Modern States that links a Wikipedia article carries `ids.wikidata`.
A row without a `url` (a region group, a theme, a trade sphere) is exempt: it names no single article. A row whose article has no
Wikidata item is listed in row-ids-allow.json with the reason; an entry that no longer applies fails (stale).

    python3 -I pipelines/common/row_ids_check.py            # exits 1 on a missing id, a malformed id, or a stale allowlist entry

It reads the compiled public/timelines/<timeline>.json of the current checkout. No dump needed.
"""
import json
import os
import re
import subprocess
import sys

ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ALLOW = os.path.join('pipelines', 'common', 'row-ids-allow.json')
TIMELINES = ['medieval', 'modern-states']


def problems(rows_by_timeline, allow):
    """rows_by_timeline: {timeline: [track, ...]}; allow: {timeline: {row id: reason}}. Returns the problem lines."""
    out = []
    for tl, rows in rows_by_timeline.items():
        ok = allow.get(tl, {})
        seen = set()
        for t in rows:
            if not t.get('url'):
                continue
            q = (t.get('ids') or {}).get('wikidata')
            if q:
                seen.add(t['id'])
                if not re.fullmatch(r'Q[1-9][0-9]*', q):
                    out.append(f"{tl}/{t['id']}: ids.wikidata {q!r} is not a Wikidata item id")
                if t['id'] in ok:
                    out.append(f"{tl}/{t['id']}: has an id now, remove it from {ALLOW}")
            elif t['id'] not in ok:
                out.append(f"{tl}/{t['id']}: links {t['url'].rsplit('/', 1)[-1]} but has no ids.wikidata (add the item, or an entry in {ALLOW} saying why the article has none)")
        for r in ok:
            if r not in {t['id'] for t in rows if t.get('url')}:
                out.append(f'{tl}/{r}: in {ALLOW} but the row has no url any more; remove it')
    return out


def main():
    allow = {}
    path = os.path.join(ROOT, ALLOW)
    if os.path.exists(path):
        allow = {k: v for k, v in json.load(open(path, encoding='utf-8')).items() if not k.startswith('_')}
    rows = {tl: json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{tl}.json'), encoding='utf-8'))['tracks'] for tl in TIMELINES}
    bad = problems(rows, allow)
    for b in bad:
        print('PROBLEM', b)
    parts = []
    for tl, r in rows.items():
        with_url = [t for t in r if t.get('url')]
        have = [t for t in with_url if (t.get('ids') or {}).get('wikidata')]
        parts.append(f'{tl} {len(have)}/{len(with_url)}')
    print(f'row ids (rows with an article that carry ids.wikidata): {"; ".join(parts)}' + (f'; {len(bad)} problem(s)' if bad else ': ok'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
