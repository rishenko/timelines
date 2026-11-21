# One-off (applied 2026-11-20): rebuilds the geography facet of data-src/ancient-classical-memberships.json for every
# row, from Kevin's ticks in the vault note "2026-11-20 Timelines region memberships review" and the evidence the
# candidate finder found in the local Wikipedia dump (enwiki-20261101). The finder and its region table live outside
# the repo, in ~/data/timelines-analysis/2026-11-20-groups/groups/ (candidates_world.py, README there).
# The people and civilization facets and their memberships are kept as they are.
#   python3 -I scripts/archive/2026-11-20-region-memberships-plan.py <finder dir> <world.json> <review note.md>
import json, re, sys
from urllib.parse import quote

finder_dir, world_path, note_path = sys.argv[1:4]
sys.path.insert(0, finder_dir)
from candidates_world import REGIONS, closure  # noqa: E402

PLAN = 'data-src/ancient-classical-memberships.json'
SRC = 'data-src/ancient-classical.json'
plan = json.load(open(PLAN))
src = json.load(open(SRC))
world = json.load(open(world_path))
id_of_name = {v['name']: r for r, v in world.items()}
id_of_region = {name: v for v, (name, _, _) in REGIONS.items()}

# ---- facet values, broad regions each followed by the regions inside them ----
children = {}
for v, (_, broader, _) in REGIONS.items():
    if broader: children.setdefault(broader[0], []).append(v)
order = []
def visit(v):
    order.append(v)
    for c in children.get(v, []): visit(c)
for v, (_, broader, _) in REGIONS.items():
    if not broader: visit(v)
geography = {'name': 'Region', 'values': {v: {'name': REGIONS[v][0], **({'broader': REGIONS[v][1]} if REGIONS[v][1] else {})} for v in order}}

# ---- sources: an existing one by address, else a new Wikipedia source ----
url_of = lambda title: 'https://en.wikipedia.org/wiki/' + quote(title.replace(' ', '_'), safe="()_,'-.:!")
by_url = {s.get('url'): k for k, s in {**src['sources'], **plan['sources']}.items() if s.get('url')}
def slug(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
from urllib.parse import unquote
by_url = {unquote(u): k for u, k in by_url.items()}
row_url = {t['id']: t.get('url') for t in src['tracks']}
new_sources = {}
def source_key(title, row_id=None):
    # a row's own article is cited by the row's own link (it may be a redirect to the title the dump gave)
    u = row_url.get(row_id) or url_of(title) if row_id else url_of(title)
    if unquote(u) in by_url: return by_url[unquote(u)]
    key = f'wp-row-{row_id}' if row_id else f'wp-{slug(title)}'
    # never reuse a key that already names another page (the town of Kerma vs. wp-kerma, the Kerma culture)
    base, n = key, 2
    while key in src['sources'] or key in plan['sources'] or key in new_sources: key, n = f'{base}-{n}', n + 1
    new_sources[key] = {'name': f'Wikipedia: {title}', 'url': u, 'tags': ['wikipedia'], 'accessed': '2026-11-20'}
    by_url[unquote(u)] = key
    return key

def located(how):
    """Finder evidence → the location in the article, in the plan's wording."""
    m = re.match(r'category “(.+?)” ⊂ “(.+?)”', how)
    if m: return f'category "{m.group(1)}" (in "{m.group(2)}")'
    m = re.match(r'category “(.+?)”', how)
    if m: return f'category "{m.group(1)}"'
    if how.startswith('first sentence'): return 'first sentence'
    m = re.match(r'infobox (\w+)', how)
    if m: return f'infobox {m.group(1)}'
    raise ValueError(how)

def refs_for(row_id, evidence, row_article_title):
    out = []
    for e in evidence:
        title, how = e.split(': ', 1)
        m = re.match(r'capital (.+?): (.+)$', how)
        if m:  # the row's infobox names the capital; the capital's article places it
            out.append({'sourceKey': source_key(title, row_id if title == row_article_title else None), 'sourceLocation': f'infobox capital ({m.group(1)})'})
            out.append({'sourceKey': source_key(m.group(1)), 'sourceLocation': located(m.group(2))})
        else:
            out.append({'sourceKey': source_key(title, row_id if title == row_article_title else None), 'sourceLocation': located(how)})
    seen, uniq = set(), []
    for r in out:
        k = (r['sourceKey'], r['sourceLocation'])
        if k not in seen: seen.add(k); uniq.append(r)
    return uniq

# hand-sourced regions (Kevin's calls where the finder had nothing)
MANUAL = {
    ('early-india', 'indus-valley'): [('Bhirrana', 'category "Indus Valley Civilisation sites"')],
    ('rouran', 'mongolian-plateau'): [('Rouran Khaganate', 'category "Former countries in Mongolian history"'),
                                      ('Rouran Khaganate', 'lead ("territory that covered all of modern-day Mongolia and Inner Mongolia")')],
}

# ---- Kevin's ticks ----
ticks, row = {}, None
for line in open(note_path, encoding='utf-8'):
    h = re.match(r'^### (.+)$', line)
    if h: row = id_of_name.get(h.group(1).strip()); continue
    t = re.match(r'^- \[x\] (.+?) — ', line)
    if t and row and t.group(1) in id_of_region: ticks.setdefault(row, []).append(id_of_region[t.group(1)])

old_geo = {r: {m['value']: m['sources'] for m in ms if m['facet'] == 'geography'} for r, ms in plan['rows'].items()}
# an earlier tick that only showed as implied by a region Kevin then unticked (Nuragic Sardinia: Italy out, so the
# Mediterranean it implied has to be listed itself)
KEEP_EARLIER = [('nuragic', 'mediterranean')]
for r, v in KEEP_EARLIER:
    if v not in ticks.get(r, []): ticks.setdefault(r, []).append(v)
rows = {}
for t in src['tracks']:
    r = t['id']
    if r not in world: continue
    w = world[r]
    article = w['articles'][0]['title'] if w['articles'] and t.get('url') else None
    geo = []
    for v in ticks.get(r, []):
        if (r, v) in MANUAL:
            refs = [{'sourceKey': source_key(title, r if title == article else None), 'sourceLocation': loc} for title, loc in MANUAL[(r, v)]]
        elif v in w['candidates'] or v in w.get('also', {}):  # a state's other sourced regions, when Kevin picked one
            refs = refs_for(r, (w['candidates'].get(v) or w['also'][v])[:3], article)
        elif v in old_geo.get(r, {}):
            refs = old_geo[r][v]
        else:
            raise SystemExit(f'no evidence for {r} → {v}')
        geo.append({'facet': 'geography', 'value': v, 'sources': refs})
    others = [m for m in plan['rows'].get(r, []) if m['facet'] != 'geography']
    if geo or others: rows[r] = geo + others

plan['facets']['geography'] = geography
plan['sources'] = {**plan['sources'], **new_sources}
# drop plan sources no membership cites any more
cited = {s['sourceKey'] for ms in rows.values() for m in ms for s in m['sources']}
plan['sources'] = {k: v for k, v in plan['sources'].items() if k in cited}
plan['rows'] = rows
json.dump(plan, open(PLAN, 'w'), ensure_ascii=False, indent=2)
open(PLAN, 'a').write('\n')
n_geo = sum(1 for ms in rows.values() for m in ms if m['facet'] == 'geography')
print(f'{len(rows)} rows, {n_geo} geography memberships, {len(geography["values"])} regions, {len(new_sources)} new sources, {len(plan["sources"])} plan sources')
