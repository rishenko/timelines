"""
Reigns (rulers pass, Kevin 2026-11-23: "a, yes"): merges a timeline's frozen reign claims into its source data.

The claims file (`pipelines/<generator>/reigns.json`) is written once by `pipelines/extract/reigns_freeze.py` from a
reviewed rulers bulk run (`pipelines/extract/rulers.py`), so a generator rerun reproduces the committed file without
the Wikidata tables. It holds:
  events    the reign events, as the timeline stores them (each cites the ruler's article, or a list page's row when
            the article is AI-flagged)
  sources   the source entries they cite
  review    per reign uuid: row, person, Wikidata id, how it was found, the cited page, and the reasons it is still to
            check (Wikidata's term for the same office over a month apart, outside the row's phase, an Old Style date)

`apply()` adds the events and sources and writes the review list to `data-src/provenance/<id>-reigns.json` (one line
per reign), the record of what Kevin left to check later. An event or source id already in the timeline is an error:
the freeze step drops reigns the timeline already has.
"""
import json
import os


def load(path):
    return json.load(open(path, encoding='utf-8'))


def apply(data, path, provenance=None):
    """Adds the frozen reigns at `path` to `data` (in place); writes the review list to `provenance` when given.
    Returns a one-line summary for the generator's report."""
    claims = load(path)
    have = {e['uuid'] for e in data['events']}
    clash = sorted(e['uuid'] for e in claims['events'] if e['uuid'] in have)
    if clash:
        raise SystemExit(f'{path}: reign ids already in the timeline: {", ".join(clash[:10])}')
    rows = {t['id'] for t in data['tracks']}
    lost = sorted({t for e in claims['events'] for t in e['tracks'] if t not in rows})
    if lost:
        raise SystemExit(f'{path}: reigns on rows the timeline lacks: {", ".join(lost[:10])}')
    for k, v in claims['sources'].items():
        if k in data['sources'] and data['sources'][k].get('url') != v.get('url'):
            raise SystemExit(f'{path}: source {k} differs from the timeline\'s')
        data['sources'].setdefault(k, v)
    data['events'] += claims['events']
    if provenance:
        os.makedirs(os.path.dirname(provenance), exist_ok=True)
        review = {**claims.get('skipped', {}), **claims['review']}  # skipped: century-only dates, not imported, listed
        lines = [f'  {json.dumps(u, ensure_ascii=False)}: {json.dumps(review[u], ensure_ascii=False)}' for u in sorted(review)]
        open(provenance, 'w', encoding='utf-8', newline='\n').write('{\n' + ',\n'.join(lines) + '\n}\n')
    n = len(claims['events'])
    k = sum(1 for r in claims['review'].values() if r.get('toCheck'))
    return f'{n} reigns, {k} to check'


def apply_if_present(data, path, provenance=None):
    """`apply` for a claims file that may not exist (a generator with no extra reigns): says so instead of failing."""
    return apply(data, path, provenance) if os.path.exists(path) else 'none'


RULER_KINDS = {'head-of-government': 'Head of government', 'sub-ruler': 'Governor (sub-ruler)', 'regent': 'Regent', 'de-facto': 'Ruled in fact (de facto)'}


def ruler_kind_facet():
    """The `ruler-kind` event facet of the offices stage: what kind of ruler held a term. An event without it is not stated, never read as a head."""
    return {'name': 'Kind of ruler', 'applies': 'events', 'values': {k: {'name': v} for k, v in RULER_KINDS.items()}}


def apply_offices(data, repo, timeline):
    """Adds the offices stage's events for `timeline` (pipelines/offices/emitted/offices-<timeline>.json, from pipelines/offices/offices.py) and the `ruler-kind` facet.
    The `category` facet is reserved first, so the facet order the app reads (the first events facet is the category filter) stays as it was; event_categories.apply fills it in."""
    path = os.path.join(repo, 'pipelines', 'offices', 'emitted', f'offices-{timeline}.json')
    if not os.path.exists(path):
        return 'none'
    facets = data['meta'].setdefault('facets', {})
    facets.setdefault('category', None)
    facets['ruler-kind'] = ruler_kind_facet()
    return apply(data, path, os.path.join(repo, 'data-src', 'provenance', f'{timeline}-offices.json'))
