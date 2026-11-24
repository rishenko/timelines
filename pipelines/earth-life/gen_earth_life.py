"""
Builds data-src/earth-life.json (Earth and Life, deep time) and its provenance manifest data-src/provenance/earth-life.json.

PILOT (2026-11-23): the ICS spine (eons, eras and periods) and the Phanerozoic's five mass extinctions; cycle rows (cycles_data.py, added
2026-11-24: a period plus a start point, drawn by the app). More events
come after Kevin has seen this.

  spine   pipelines/earth-life/ics_2026_06.json: the ICS International Chronostratigraphic Chart v2026/06, transcribed
          by hand and checked against the chart's own text by verify_ics.py (run first; this script stops if it fails).
          Each eon, era and period is a context span of kind `age` on a line per rank (ics-eon, ics-era, ics-period);
          each boundary is a date claim on both neighbours, with the chart's ± as the claim's margin and a citation to
          the chart. A "~" age (Ediacaran and Cryogenian bases) has no margin and marks its span circa.
  events  the extinctions are the only events. Every date is a claim naming its source: the ICS chart (a boundary the
          event sits on), the Wikipedia article (a sentence read from the dump, which must contain the figure), and a
          peer-reviewed paper where its abstract gives the figure (Burgess et al. 2014). The best estimate is the one
          the sources agree on; a source that differs is kept as a claim, with a note.

Stored years: deep time is stored as years in the file's own calendar (1950 = present; 66 Ma = -66,000,000 + 1950 =
-65,998,050), as calendar.beforePresent says. Figures are Decimal so no float error reaches a year.

Run (from the repo root):  pipelines/.venv/bin/python -I pipelines/earth-life/gen_earth_life.py
Rerunning it reproduces the committed files byte for byte.
"""
import json
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
sys.path.insert(0, HERE)
import settings  # noqa: E402
import verify_ics  # noqa: E402
from evidence import build_events, figure  # noqa: E402

PRESENT = 1950
ICS_KEY = 'ics-chart-2026-06'
ACC = '2026-11-23'


def stored(ma_text):
    """Stored year of an age in Ma (Decimal text)."""
    return PRESENT - int(Decimal(ma_text) * 1_000_000)


def margin(pm_text):
    return int(Decimal(pm_text) * 1_000_000)


def build(repo):
    from wp_sections import find  # needs the dump; imported late so verify_ics errors come first

    problems = verify_ics.problems()
    if problems:
        raise SystemExit('the ICS table does not match the chart:\n  ' + '\n  '.join(problems))
    ics = verify_ics.load()
    chart = ics['chart']
    # what each boundary is called in a claim's location: the highest-ranking unit that starts at it
    where = {'present': 'present'}
    for u in sorted(ics['units'], key=lambda u: {'eon': 0, 'era': 1, 'period': 2}[u['rank']]):
        where.setdefault(u['base'], f"{u['name']} base")
    # an event's claim names the boundary by its period where there is one ("Triassic base"), the spans by the highest unit
    where_event = {'present': 'present'}
    for u in sorted(ics['units'], key=lambda u: {'period': 0, 'era': 1, 'eon': 2}[u['rank']]):
        where_event.setdefault(u['base'], f"{u['name']} base")

    sources = {
        ICS_KEY: {
            'name': 'International Chronostratigraphic Chart v2026/06 (International Commission on Stratigraphy)',
            'url': chart['url'], 'author': 'Cohen, Harper, Gibbard & Car', 'year': '2026', 'accessed': ACC, 'tags': ['ics'],
        },
    }
    manifest_articles = {}

    def wp(title, needle, must):
        """A Wikipedia sentence (cited by section) that holds `needle`; refuses a sentence without `must` (the figure)."""
        hit = find(title, needle)
        if not hit:
            raise SystemExit(f'{title}: no sentence with {needle!r}')
        where_, text = hit
        if must not in text:
            raise SystemExit(f'{title}: the sentence with {needle!r} does not hold {must!r}: {text[:200]}')
        key = 'wp-' + ''.join(c if c.isalnum() else '-' for c in title.lower()).strip('-')
        while '--' in key:
            key = key.replace('--', '-')
        sources.setdefault(key, {'name': f'{title} (Wikipedia)', 'url': 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_'),
                                 'accessed': '2026-11-21', 'tags': ['wikipedia']})
        manifest_articles.setdefault(title, []).append({'where': where_, 'sentence': text[:240]})
        # the quote is the stretch of the sentence around the figure, so the citation shows what it cites
        i = max(0, text.find(must) - 70)
        quote = ('…' if i else '') + text[i:i + 170] + ('…' if i + 170 < len(text) else '')
        loc = f'lead: "{quote}"' if where_ == 'lead' else f'section "{where_}": "{quote}"'
        return {'sourceKey': key, 'sourceLocation': loc}

    def ics_ref(loc):
        return {'sourceKey': ICS_KEY, 'sourceLocation': loc}

    # ---- the spine ----
    lines = {'eon': 'ics-eon', 'era': 'ics-era', 'period': 'ics-period'}
    context = []
    ranks = {'eon': 0, 'era': 1, 'period': 2}
    for u in sorted(ics['units'], key=lambda u: (ranks[u['rank']], -Decimal(figure(ics['boundaries'][u['base']])[0]))):
        s_ma, s_pm, s_ap = figure(ics['boundaries'][u['base']])
        e_ma, e_pm, e_ap = figure(ics['boundaries'][u['top']])
        span = {'id': u['id'], 'kind': 'age', 'name': u['name'], 'line': lines[u['rank']], 'color': u['color'],
                'start': stored(s_ma), 'end': stored(e_ma), 'sources': [ics_ref(f"{u['name']} (chart: {u['rank']}, base {ics['boundaries'][u['base']]})")]}
        if u['top'] == 'present':
            # the chart's youngest units run to the present: ongoing, not a closed end at 1950
            del span['end']
            span['ongoing'] = True
            span['ongoingSources'] = [ics_ref('present: the youngest unit, the Meghalayan, runs to the present')]
        if s_ap or e_ap:
            span['circa'] = True
        for field, ma_text, pm_text, key in (('startDates', s_ma, s_pm, u['base']), ('endDates', e_ma, e_pm, u['top'])):
            if key == 'present':
                continue  # the present is not a measured age
            claim = {'year': stored(ma_text), 'source': ics_ref(where[key])}
            if pm_text:
                claim['margin'] = margin(pm_text)
            span[field] = [claim]
        context.append(span)

    # ---- the events (events_data.py): every claim read from its cached source ----
    import events_data
    events, review = build_events(events_data.EVENTS, ics, where_event, sources, ics_ref, wp, stored, margin)

    # ---- cycle rows (cycles_data.py; Track.cycle, draft schema v11): a period plus a start point, in a Cycles group ----
    import cycles_data
    cycles = cycles_data.cycle_tracks(wp, PRESENT)
    sources.update(cycles_data.WEB_SOURCES)

    meta = {
        'id': 'earth-life', 'title': 'Earth and Life',
        'subtitle': 'Deep time: the geological eons, eras and periods, and the Phanerozoic extinctions',
        'description': 'The Earth\'s geological time scale from its formation, as the International Commission on Stratigraphy\'s eons, eras and periods, with the five Phanerozoic mass extinctions, and astronomical cycles (the solar cycle, precession, orbital eccentricity, the galactic year) as rows that open folded. A pilot: more events are to come.',
        'credits': ('Boundary ages and colour codes: International Commission on Stratigraphy, International Chronostratigraphic Chart '
                    'v2026/06 (stratigraphy.org; © ICS, all rights reserved). Cite: Cohen, K.M., Harper, D.A.T., Gibbard, P.L. & Car, N. '
                    '(2025, updated), The ICS International Chronostratigraphic Chart this decade, Episodes 48: 105–115. '
                    'Extinction dates also from the English Wikipedia articles (dump of 1 November 2026) and Burgess et al. (2014). Cycle periods also from NASA and NOAA\'s Space Weather Prediction Center.'),
        'calendar': {'before': 'BP', 'after': 'AP', 'yearZero': True, 'beforePresent': {'present': PRESENT, 'circaShare': 0.01}},
        'increments': [100000, 1000000, 10000000, 100000000, 1000000000], 'defaultIncrement': 100000000,
        'hideRowsOutOfView': False,
        # cycle rows open folded in their group (Kevin, 2026-11-23: small rows to turn on and off)
        'collapsed': ['cycles'],
        # Kevin (2026-11-23): shortened gaps off for deep time until there are real events to fill it (they hid the Archean and Proterozoic)
        'compress': False,
        'range': {'start': stored('4567'), 'end': PRESENT},
        'lines': {'ics-eon': {'name': 'Eons'}, 'ics-era': {'name': 'Eras'}, 'ics-period': {'name': 'Periods'}},
        'context': context,
    }
    data = {
        'schemaVersion': 10, 'meta': meta, 'present': PRESENT,
        # sources the pilot replaced (the end-Permian and end-Triassic events now cite other sources)
        'redirects': {'burgess-2014-pnas': None, 'wp-triassic-jurassic-extinction-event': None},
        'tracks': [
            # Earth's own lifespan, from the chart's oldest boundary to now: it anchors the whole axis, so the Hadean
            # and the other Precambrian eons can be reached before any event there exists (ages are not anchors)
            {'id': 'earth', 'name': 'Earth', 'color': '#6b8fb3', 'kind': 'theme',
             'span': {'start': stored('4567'), 'ongoing': True,
                      'startDates': [{'year': stored('4567'), 'source': ics_ref('Hadean base')}],
                      'ongoingSources': [ics_ref('present: the youngest unit, the Meghalayan, runs to the present')]}},
            {'id': 'life', 'name': 'Life', 'color': '#4f9d5d', 'kind': 'theme'},
            {'id': 'humans', 'name': 'Humans and their ancestors', 'color': '#c07a3a', 'kind': 'theme'},
            *cycles,
        ],
        'sources': sources,
        'tags': {'wikipedia': {'name': 'Wikipedia'}, 'ics': {'name': 'International Commission on Stratigraphy'}, 'journal': {'name': 'Peer-reviewed journal'}, 'museum': {'name': 'Museum'}, 'agency': {'name': 'Government science agency'}},
        'events': events,
    }
    manifest = {
        'output': 'data-src/earth-life.json',
        'wikipedia_dump': 'enwiki-20261101 (read through pipelines/common/wp_sections.py)',
        'ics_chart': {k: chart[k] for k in ('version', 'url', 'copyright', 'cite', 'read')} | {'table': 'pipelines/earth-life/ics_2026_06.json (verified by verify_ics.py)'},
        'europe_pmc': 'abstracts and open-access full texts cached in $TIMELINES_DATA/europepmc/ (Europe PMC REST); Smithsonian pages in $TIMELINES_DATA/smithsonian/',
        'articles': manifest_articles,
    }
    return data, manifest, review


def main():
    repo = os.path.abspath(os.path.join(HERE, '..', '..'))
    data, manifest, review = build(repo)
    # event categories (pipelines/common/event_categories.py): all 24 events are reviewed overrides (categories.json)
    import event_categories
    counts = event_categories.apply(data, os.path.join(HERE, 'categories.json'), os.path.join(repo, 'data-src', 'provenance', 'earth-life-categories.json'))
    print(f'categories: {counts}')
    out = os.path.join(repo, 'data-src', 'earth-life.json')
    prov = os.path.join(repo, 'data-src', 'provenance', 'earth-life.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(prov, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    rp = os.path.join(repo, 'pipelines', 'out', 'earth-life-events-report.txt')
    os.makedirs(os.path.dirname(rp), exist_ok=True)
    open(rp, 'w', encoding='utf-8').write('\n'.join(review) + '\n')
    print(f'wrote {out}: {len(data["meta"]["context"])} spine spans, {len(data["events"])} events')


if __name__ == '__main__':
    sys.argv[1:] = settings.take_flags(sys.argv[1:])
    main()
