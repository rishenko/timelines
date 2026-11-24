"""
Reads the cached sources the Earth and Life events cite, finds the sentence that holds a claim's phrase, and builds the
events from events_data.py. Nothing here fetches: the caches are filled by hand (see the pipelines README):
  $TIMELINES_DATA/europepmc/<doi with / as _>.json     a Europe PMC "core" record (title, authors, journal, abstract)
  $TIMELINES_DATA/europepmc/<PMC id>.xml               an open-access paper's full text (Europe PMC fullTextXML)
  $TIMELINES_DATA/smithsonian/<page>.html              a humanorigins.si.edu species page
A claim's phrase (`needle`) that its source does not hold stops the build, so no date is cited from text that isn't there.
"""
import re

from source_cache import oa_text, paper_source as _paper_source, paper_text, phrase, quote, si_source as _si_source, si_text  # noqa: F401

ACCESSED = '2026-11-23'


def paper_source(doi):
    return _paper_source(doi, ACCESSED)


def si_source(page):
    return _si_source(page, ACCESSED)


def figure(printed):
    """(Ma text, ± text or None, approximate) from a printed chart figure: "538.8 ±0.6", "~ 635", "4031 ± 3", "present"."""
    if printed == 'present':
        return '0', None, False
    m = re.fullmatch(r'(~ ?)?(\d+(?:\.\d+)?)(?: ?± ?(\d+(?:\.\d+)?))?', printed)
    return m.group(2), m.group(3), bool(m.group(1))


def build_events(spec, ics, where, sources, ics_ref, wp, stored, margin):
    """Events and a review (text lines) from events_data.EVENTS. `wp(title, needle, must)` returns a Wikipedia ref."""
    def ics_claim(key, note):
        printed = {**ics['boundaries'], **ics.get('stage_boundaries', {})}[key]
        ma, pm, _ = figure(printed)
        label = where.get(key) or key.replace('-base', '').capitalize() + ' base'
        return {'year': stored(ma), 'source': ics_ref(label), **({'margin': margin(pm)} if pm else {}), **({'note': note} if note else {})}, 'ics'

    events, review = [], []
    for e in spec:
        claims, refs, fams, support = [], [], [], []
        for c in e['claims']:
            k = c['kind']
            if k == 'ics':
                cl, fam = ics_claim(c['source'], c['note'])
                ref = cl['source']
            else:
                if k == 'wikipedia':
                    ref, fam = wp(c['source'], c['needle'], c['needle']), 'wikipedia'
                elif k == 'paper':
                    key, src = paper_source(c['source'])
                    sources.setdefault(key, src)
                    ref, fam = {'sourceKey': key, 'sourceLocation': 'abstract: "' + phrase(paper_text(c['source']), c['needle'], key) + '"'}, key
                elif k == 'oa':
                    key, src = paper_source(c['doi'])
                    sources.setdefault(key, src)
                    ref, fam = {'sourceKey': key, 'sourceLocation': 'full text: "' + phrase(oa_text(c['source']), c['needle'], key) + '"'}, key
                else:
                    key, src = si_source(c['source'])
                    sources.setdefault(key, src)
                    ref, fam = {'sourceKey': key, 'sourceLocation': '"' + phrase(si_text(c['source']), c['needle'], key) + '"'}, key
                cl = {'year': stored(c['ma']), 'source': ref, **({'margin': margin(c['pm'])} if c['pm'] else {}), **({'note': c['note']} if c['note'] else {})}
            claims.append(cl)
            refs.append(cl['source'])
            fams.append(fam)
            if not c.get('alt'):
                support.append(fam)
        ev = {'uuid': e['id'], 'title': e['title'], 'descr': f"{e['descr']} Where: {e['locality']}.", 'start': stored(e['best']), 'tracks': [e['row']],
              'sources': [dict(t) for t in {tuple(sorted(r.items())) for r in refs}], 'startDates': claims}
        ev['sources'].sort(key=lambda r: (r['sourceKey'], r['sourceLocation']))
        if e.get('end'):
            ev['end'] = stored(e['end'])
            ec, _ = ics_claim(e['end_key'], 'The end of the Maastrichtian.')
            ev['endDates'] = [ec]
            ev['sources'].append(ec['source'])
        if e['circa']:
            ev['circa'] = True
        events.append(ev)
        nonwp = sorted({f for f in support if f != 'wikipedia'})
        wpn = support.count('wikipedia')
        total = len(nonwp) + (1 if wpn else 0)  # Wikipedia counts once however many sentences are cited
        auto = '' if (nonwp and total >= 2) else ('Only Wikipedia gives a figure.' if not nonwp else 'One source with a figure.')
        flag = e.get('flag') or auto
        alts = sum(1 for c in e['claims'] if c.get('alt'))
        review.append(f"{e['id']} | {e['locality']} | best {e['best']} Ma{' ± ' + e['pm'] if e.get('pm') else ''} | supporting: {len(nonwp)} outside Wikipedia ({', '.join(nonwp) or 'none'}) + {'Wikipedia' if wpn else 'no Wikipedia'}; {alts} other candidate(s) kept | {flag or 'ok'}")
    return events, review
