"""
Reads the cached sources the Earth and Life events cite, finds the sentence that holds a claim's phrase, and builds the
events from events_data.py. Nothing here fetches: the caches are filled by hand (see the pipelines README):
  $TIMELINES_DATA/europepmc/<doi with / as _>.json     a Europe PMC "core" record (title, authors, journal, abstract)
  $TIMELINES_DATA/europepmc/<PMC id>.xml               an open-access paper's full text (Europe PMC fullTextXML)
  $TIMELINES_DATA/smithsonian/<page>.html              a humanorigins.si.edu species page
A claim's phrase (`needle`) that its source does not hold stops the build, so no date is cited from text that isn't there.
"""
import html
import json
import os
import re
import unicodedata

import settings

CACHE = {}
ACCESSED = '2026-11-23'


def _plain(raw):
    raw = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
    t = re.sub(r'\s+', ' ', t).replace('’', "'").strip()
    return re.sub(r'\s+([,.;:)\]])', r'\1', re.sub(r'([(\[])\s+', r'\1', t))


def _read(path, loader):
    if path not in CACHE:
        if not os.path.exists(path):
            raise SystemExit(f'not cached: {path}')
        CACHE[path] = loader(path)
    return CACHE[path]


def paper_record(doi):
    return _read(os.path.join(settings.DATA, 'europepmc', doi.replace('/', '_') + '.json'), lambda p: json.load(open(p, encoding='utf-8')))


def paper_text(doi):
    r = paper_record(doi)
    return _plain(r.get('abstractText') or '')


def oa_text(pmcid):
    return _read(os.path.join(settings.DATA, 'europepmc', pmcid + '.xml'), lambda p: _plain(open(p, encoding='utf-8', errors='ignore').read()))


def si_text(page):
    return _read(os.path.join(settings.DATA, 'smithsonian', page + '.html'), lambda p: _plain(open(p, encoding='utf-8', errors='ignore').read()))


def quote(text, needle, label):
    """The stretch of the sentence holding `needle` (about 170 characters from a little before it)."""
    t = text.replace('’', "'")
    n = needle.replace('’', "'")
    i = t.find(n)
    if i < 0:
        raise SystemExit(f'{label}: the text does not hold {needle!r}')
    # back to the start of the sentence (a capital after ". "), at most 160 characters before the phrase
    lo = max(0, i - 160)
    ms = list(re.finditer(r'[.!?]\s+(?=[A-Z0-9(])', t[lo:i]))
    start = lo + ms[-1].end() if ms else lo
    end = min(len(t), max(i + len(n) + 40, start + 200))
    return ('…' if not ms and lo > 0 else '') + t[start:end].strip() + ('…' if end < len(t) else '')


def phrase(text, needle, label, words=14):
    """A short stretch (at most 14 words, so under the 15 the checks treat as a quotation) around `needle`: enough to find the
    place again, without copying a source's sentence (only Wikipedia's is licensed for it: LICENSE-DATA.md)."""
    t = text.replace('’', "'")
    n = needle.replace('’', "'")
    i = t.find(n)
    if i < 0:
        raise SystemExit(f'{label}: the text does not hold {needle!r}')
    if len(n.split()) > words:
        raise SystemExit(f'{label}: the phrase {needle!r} is longer than {words} words')
    room = words - len(n.split())
    head, tail = t[:i], t[i + len(n):]
    nb = min(len(head.split()), room // 2)
    na = min(len(tail.split()), room - nb)
    nb = min(len(head.split()), room - na)
    mb = re.search(r'(?:\S+\s+){%d}$' % nb, head) if nb else None
    ma_ = re.match(r'(?:\s*\S+){%d}' % na, tail) if na else None
    pre = mb.group(0) if mb else ''
    post = ma_.group(0) if ma_ else ''
    return ('…' if len(head[:len(head) - len(pre)].strip()) else '') + (pre + n + post).strip() + ('…' if len(tail[len(post):].strip()) else '')


def figure(printed):
    """(Ma text, ± text or None, approximate) from a printed chart figure: "538.8 ±0.6", "~ 635", "4031 ± 3", "present"."""
    if printed == 'present':
        return '0', None, False
    m = re.fullmatch(r'(~ ?)?(\d+(?:\.\d+)?)(?: ?± ?(\d+(?:\.\d+)?))?', printed)
    return m.group(2), m.group(3), bool(m.group(1))


def surnames(author_string):
    out = []
    for a in (author_string or '').rstrip('.').split(', '):
        parts = a.split()
        while parts and re.fullmatch(r'[A-Z]{1,3}', parts[-1]):
            parts.pop()
        out.append(' '.join(parts))
    return [x for x in out if x]


def paper_source(doi):
    r = paper_record(doi)
    names = surnames(r.get('authorString'))
    who = names[0] + ' et al.' if len(names) > 3 else (' & '.join([', '.join(names[:-1]), names[-1]]) if len(names) > 1 and len(names) > 2 else ' & '.join(names))
    ji = r.get('journalInfo', {})
    journal = (ji.get('journal', {}).get('title') or r.get('journalTitle') or '').rstrip('.')
    bits = [b for b in (journal, (str(ji.get('volume') or r.get('journalVolume') or '')), r.get('pageInfo') or '') if b]
    cite = bits[0] + (' ' + bits[1] if len(bits) > 1 else '') + (': ' + bits[2] if len(bits) > 2 else '')
    title = (r.get('title') or '').rstrip('.')
    plain = unicodedata.normalize('NFKD', names[0] if names else 'paper').encode('ascii', 'ignore').decode().lower()
    key = 'p-' + re.sub(r'[^a-z0-9]+', '-', plain).strip('-') + '-' + str(r.get('pubYear'))
    return key, {'name': f"{who} ({r.get('pubYear')}), {title}, {cite}".strip(', '),
                 'url': 'https://doi.org/' + doi, 'author': who, 'year': str(r.get('pubYear')), 'accessed': ACCESSED, 'tags': ['journal']}


def si_source(page):
    t = si_text(page)
    m = re.search(r'^(.*?) \| The Smithsonian', t) or re.search(r'<title>(.*?)</title>', t)
    name = page.replace('-', ' ').capitalize()
    return 'si-' + page, {'name': f"{name} (Smithsonian Institution's Human Origins Program)", 'url': f'https://humanorigins.si.edu/evidence/human-fossils/species/{page}',
                          'accessed': ACCESSED, 'tags': ['museum']}


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
