"""
Builds data-src/earth-life.json (Earth and Life, deep time) and its provenance manifest data-src/provenance/earth-life.json.

PILOT (2026-11-23): the ICS spine (eons, eras and periods) and the Phanerozoic's five mass extinctions. More events
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

PRESENT = 1950
ICS_KEY = 'ics-chart-2026-06'
ACC = '2026-11-23'


def stored(ma_text):
    """Stored year of an age in Ma (Decimal text)."""
    return PRESENT - int(Decimal(ma_text) * 1_000_000)


def margin(pm_text):
    return int(Decimal(pm_text) * 1_000_000)


def figure(printed):
    """(Ma text, ± text or None, approximate) from a printed chart figure: "538.8 ±0.6", "~ 635", "4031 ± 3", "present"."""
    if printed == 'present':
        return '0', None, False
    m = re.fullmatch(r'(~ ?)?(\d+(?:\.\d+)?)(?: ?± ?(\d+(?:\.\d+)?))?', printed)
    return m.group(2), m.group(3), bool(m.group(1))


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

    sources = {
        ICS_KEY: {
            'name': 'International Chronostratigraphic Chart v2026/06 (International Commission on Stratigraphy)',
            'url': chart['url'], 'author': 'Cohen, Harper, Gibbard & Car', 'year': '2026', 'accessed': ACC, 'tags': ['ics'],
        },
        'burgess-2014-pnas': {
            'name': "Burgess, Bowring & Shen (2014), High-precision timeline for Earth's most severe extinction, PNAS 111: 3316–3321",
            'url': 'https://doi.org/10.1073/pnas.1317692111', 'author': 'Burgess, Bowring & Shen', 'year': '2014', 'accessed': ACC,
            'tags': ['journal'],
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

    # ---- the pilot events: the five mass extinctions of the Phanerozoic ----
    def ev(uuid, title, descr, best, claims, sref):
        e = {'uuid': uuid, 'title': title, 'descr': descr, 'start': stored(best), 'tracks': ['life'], 'sources': sref, 'startDates': claims}
        return e

    def claim(ma_text, ref, pm_text=None, note=None):
        c = {'year': stored(ma_text), 'source': ref}
        if pm_text:
            c['margin'] = margin(pm_text)
        if note:
            c['note'] = note
        return c

    def ics_at(boundary_key, what=None):
        ma_text, pm_text, _ = figure(ics['boundaries'][boundary_key])
        return claim(ma_text, ics_ref(what or where[boundary_key]), pm_text)

    events = []
    # Late Ordovician: Wikipedia "roughly 445 Ma"; the extinction pulses fall in the Hirnantian, whose base the chart gives
    t = 'Ordovician–Silurian extinction events'
    w_lo = wp(t, 'roughly 445 million years ago', '445')
    hirn = wp(t, 'Hirnantian', 'Hirnantian')
    events.append(ev('late-ordovician-extinction', 'Late Ordovician mass extinction',
                     'The first of the "big five" mass extinctions: about 85% of marine species were lost, in pulses around the Hirnantian.',
                     '445.2', [claim('445', w_lo, note='"Roughly 445 million years ago": a rounded figure.'),
                               claim('445.2', ics_ref('Hirnantian base'), '0.9',
                                     note='The base of the Hirnantian, the age the article places the extinction in.')],
                     [w_lo, hirn, ics_ref('Hirnantian base')]))
    # Late Devonian (Kellwasser, then Hangenberg): the article gives each at its ICS boundary
    t = 'Late Devonian extinction'
    w_kw = wp(t, '372.15 million years ago', '372.15')
    w_hb = wp(t, '358.86 million years ago', '358.86')
    events.append(ev('kellwasser-extinction', 'Late Devonian extinction (Kellwasser event)',
                     'A mass extinction at the Frasnian–Famennian boundary, thought to have followed global anoxia.',
                     '372.15', [claim('372.15', w_kw), claim('372.15', ics_ref('Famennian base'), '0.46')], [w_kw, ics_ref('Famennian base')]))
    events.append(ev('hangenberg-extinction', 'Late Devonian extinction (Hangenberg event)',
                     'A second extinction, at the end of the Devonian, as the world passed into the Carboniferous.',
                     '358.86', [claim('358.86', w_hb), ics_at('carboniferous-base', 'Carboniferous base')], [w_hb, ics_at('carboniferous-base')['source']]))
    # End-Permian: the chart's boundary, the article's lead, and Burgess et al. (the article's own source for its interval)
    t = 'Permian–Triassic extinction event'
    w_pt = wp(t, '251.902 million years ago', '251.902')
    w_pt2 = wp(t, '251.941 ± 0.037', '251.941')
    events.append(ev('end-permian-extinction', 'End-Permian mass extinction',
                     'The most severe extinction of the Phanerozoic, at the Permian–Triassic boundary; the loss of most marine and many land species took about 60,000 years.',
                     '251.902', [claim('251.902', w_pt), ics_at('triassic-base', 'Triassic base'),
                                 claim('251.941', w_pt2, '0.037', note='The start of the extinction interval the article gives (it runs to 251.880 ± 0.031 Ma).'),
                                 claim('251.941', {'sourceKey': 'burgess-2014-pnas', 'sourceLocation': 'abstract: "between 251.941 ± 0.037 and 251.880 ± 0.031 Mya"'}, '0.037', note='The start of the extinction interval; the interval ends at 251.880 ± 0.031 Ma.')],
                     [w_pt, ics_at('triassic-base', 'Triassic base')['source'], {'sourceKey': 'burgess-2014-pnas', 'sourceLocation': 'abstract'}]))
    # End-Triassic: the article's date is a template the dump doesn't carry; only the chart gives a figure
    t = 'Triassic–Jurassic extinction event'
    w_tj = wp(t, 'marks the boundary between the Triassic and Jurassic periods', 'Triassic')
    events.append(ev('end-triassic-extinction', 'End-Triassic mass extinction',
                     'An extinction at the Triassic–Jurassic boundary, linked to volcanism in the Central Atlantic Magmatic Province.',
                     '201.4', [ics_at('jurassic-base', 'Jurassic base')], [w_tj, ics_at('jurassic-base', 'Jurassic base')['source']]))
    # K-Pg: the article's lead still says 65.5; its Deccan section gives 66.0 for the impact, the chart 66.00
    t = 'Cretaceous–Paleogene extinction event'
    w_old = wp(t, 'around 65.5 million years ago', '65.5')
    w_imp = wp(t, 'Chicxulub impact 66.0 Mya', '66.0')
    events.append(ev('cretaceous-paleogene-extinction', 'Cretaceous–Paleogene extinction (K–Pg)',
                     'The extinction that ended the non-avian dinosaurs, at the Cretaceous–Paleogene boundary, following the Chicxulub impact.',
                     '66.00', [claim('66.00', w_imp, note='The age the article gives for the Chicxulub impact.'),
                               ics_at('paleogene-base', 'Paleogene base'),
                               claim('65.5', w_old, note="The article's own lead gives this older figure.")],
                     [w_imp, ics_at('paleogene-base', 'Paleogene base')['source']]))

    meta = {
        'id': 'earth-life', 'title': 'Earth and Life',
        'subtitle': 'Deep time: the geological eons, eras and periods, and the Phanerozoic extinctions',
        'description': 'The Earth\'s geological time scale from its formation, as the International Commission on Stratigraphy\'s eons, eras and periods, with the five Phanerozoic mass extinctions. A pilot: more events are to come.',
        'credits': ('Boundary ages and colour codes: International Commission on Stratigraphy, International Chronostratigraphic Chart '
                    'v2026/06 (stratigraphy.org; © ICS, all rights reserved). Cite: Cohen, K.M., Harper, D.A.T., Gibbard, P.L. & Car, N. '
                    '(2025, updated), The ICS International Chronostratigraphic Chart this decade, Episodes 48: 105–115. '
                    'Extinction dates also from the English Wikipedia articles (dump of 1 November 2026) and Burgess et al. (2014).'),
        'calendar': {'before': 'BP', 'after': 'AP', 'yearZero': True, 'beforePresent': {'present': PRESENT, 'circaShare': 0.01}},
        'increments': [100000, 1000000, 10000000, 100000000, 1000000000], 'defaultIncrement': 100000000,
        'hideRowsOutOfView': False,
        # Kevin (2026-11-23): shortened gaps off for deep time until there are real events to fill it (they hid the Archean and Proterozoic)
        'compress': False,
        'range': {'start': stored('4567'), 'end': PRESENT},
        'lines': {'ics-eon': {'name': 'Eons'}, 'ics-era': {'name': 'Eras'}, 'ics-period': {'name': 'Periods'}},
        'context': context,
    }
    data = {
        'schemaVersion': 10, 'meta': meta, 'present': PRESENT,
        'tracks': [
            # Earth's own lifespan, from the chart's oldest boundary to now: it anchors the whole axis, so the Hadean
            # and the other Precambrian eons can be reached before any event there exists (ages are not anchors)
            {'id': 'earth', 'name': 'Earth', 'color': '#6b8fb3', 'kind': 'theme',
             'span': {'start': stored('4567'), 'ongoing': True,
                      'startDates': [claim('4567', ics_ref('Hadean base'))],
                      'ongoingSources': [ics_ref('present: the youngest unit, the Meghalayan, runs to the present')]}},
            {'id': 'life', 'name': 'Life', 'color': '#4f9d5d', 'kind': 'theme'},
        ],
        'sources': sources,
        'tags': {'wikipedia': {'name': 'Wikipedia'}, 'ics': {'name': 'International Commission on Stratigraphy'}, 'journal': {'name': 'Peer-reviewed journal'}},
        'events': events,
    }
    manifest = {
        'output': 'data-src/earth-life.json',
        'wikipedia_dump': 'enwiki-20261101 (read through pipelines/common/wp_sections.py)',
        'ics_chart': {k: chart[k] for k in ('version', 'url', 'copyright', 'cite', 'read')} | {'table': 'pipelines/earth-life/ics_2026_06.json (verified by verify_ics.py)'},
        'journal': {'burgess-2014-pnas': 'abstract read through Europe PMC (PMID 24516148)'},
        'articles': manifest_articles,
    }
    return data, manifest


def main():
    repo = os.path.abspath(os.path.join(HERE, '..', '..'))
    data, manifest = build(repo)
    out = os.path.join(repo, 'data-src', 'earth-life.json')
    prov = os.path.join(repo, 'data-src', 'provenance', 'earth-life.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(prov, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'wrote {out}: {len(data["meta"]["context"])} spine spans, {len(data["events"])} events')


if __name__ == '__main__':
    sys.argv[1:] = settings.take_flags(sys.argv[1:])
    main()
