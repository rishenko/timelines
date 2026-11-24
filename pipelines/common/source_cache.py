"""
The shared source cache for pipelines that cite papers and museum pages: fetch once, read from disk, and prove that every
phrase a claim cites is really in its source. Used by earth-life; a disasters or traditions pipeline imports it too, so
nobody rebuilds the same evidence code.

Caches (all under $TIMELINES_DATA, outside the repo; names are the identity, so a record is fetched once):
  europepmc/<doi with / as _>.json     a Europe PMC "core" record (title, authors, journal, abstract)
  europepmc/<PMC id>.xml               an open-access paper's full text (Europe PMC fullTextXML)
  smithsonian/<page>.html              a humanorigins.si.edu species page

Reading never fetches: a missing file stops with "not cached: <path>". Fetching is explicit (`fetch_paper` etc., or a
pipeline's cache script), uses only open programmatic endpoints (Europe PMC's REST API; the Smithsonian's public pages),
and never works around a site that refuses automated readers: UNESCO, Britannica and UCMP do, so they are not used.

Rules the checks rely on:
  - `phrase(text, needle, label)` returns at most 14 words around `needle` (under the 15 the checks treat as a
    quotation), and stops the build if the source does not hold `needle`. Only Wikipedia's text is licensed for longer
    quotes (LICENSE-DATA.md), so papers and museum pages are cited by a short phrase that finds the place again.
  - `quote(text, needle, label)` is the longer sentence form, for sources whose text may be quoted.
"""
import html
import json
import os
import re
import unicodedata
import urllib.parse
import urllib.request

import settings

_CACHE = {}
EUROPE_PMC = 'https://www.ebi.ac.uk/europepmc/webservices/rest'
SMITHSONIAN = 'https://humanorigins.si.edu/evidence/human-fossils/species/'


def _dir(name):
    return os.path.join(settings.DATA, name)


def plain(raw):
    """Readable text from HTML or XML: scripts and tags gone, entities decoded, one space between words, curly apostrophes straight."""
    raw = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', raw, flags=re.S)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
    t = re.sub(r'\s+', ' ', t).replace('’', "'").strip()
    return re.sub(r'\s+([,.;:)\]])', r'\1', re.sub(r'([(\[])\s+', r'\1', t))


def _read(path, loader):
    if path not in _CACHE:
        if not os.path.exists(path):
            raise SystemExit(f'not cached: {path}')
        _CACHE[path] = loader(path)
    return _CACHE[path]


def paper_path(doi):
    return os.path.join(_dir('europepmc'), doi.replace('/', '_') + '.json')


def oa_path(pmcid):
    return os.path.join(_dir('europepmc'), pmcid + '.xml')


def si_path(page):
    return os.path.join(_dir('smithsonian'), page + '.html')


def paper_record(doi):
    return _read(paper_path(doi), lambda p: json.load(open(p, encoding='utf-8')))


def paper_text(doi):
    """A paper's abstract as plain text."""
    return plain(paper_record(doi).get('abstractText') or '')


def oa_text(pmcid):
    """An open-access paper's full text as plain text."""
    return _read(oa_path(pmcid), lambda p: plain(open(p, encoding='utf-8', errors='ignore').read()))


def si_text(page):
    """A Smithsonian species page as plain text."""
    return _read(si_path(page), lambda p: plain(open(p, encoding='utf-8', errors='ignore').read()))


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


def surnames(author_string):
    """Surnames from Europe PMC's "Smith AB, Jones C." author string (initials dropped)."""
    out = []
    for a in (author_string or '').rstrip('.').split(', '):
        parts = a.split()
        while parts and re.fullmatch(r'[A-Z]{1,3}', parts[-1]):
            parts.pop()
        out.append(' '.join(parts))
    return [x for x in out if x]


def paper_source(doi, accessed):
    """(source key, source entry) for a cached paper: key `p-<first author>-<year>`, name 'Who (year), title, journal vol: pages'."""
    r = paper_record(doi)
    names = surnames(r.get('authorString'))
    who = names[0] + ' et al.' if len(names) > 3 else ', '.join(names[:-1]) + ' & ' + names[-1] if len(names) > 2 else ' & '.join(names)
    ji = r.get('journalInfo', {})
    journal = (ji.get('journal', {}).get('title') or r.get('journalTitle') or '').rstrip('.')
    bits = [b for b in (journal, (str(ji.get('volume') or r.get('journalVolume') or '')), r.get('pageInfo') or '') if b]
    cite = bits[0] + (' ' + bits[1] if len(bits) > 1 else '') + (': ' + bits[2] if len(bits) > 2 else '')
    title = (r.get('title') or '').rstrip('.')
    first = unicodedata.normalize('NFKD', names[0] if names else 'paper').encode('ascii', 'ignore').decode().lower()
    key = 'p-' + re.sub(r'[^a-z0-9]+', '-', first).strip('-') + '-' + str(r.get('pubYear'))
    return key, {'name': f"{who} ({r.get('pubYear')}), {title}, {cite}".strip(', '),
                 'url': 'https://doi.org/' + doi, 'author': who, 'year': str(r.get('pubYear')), 'accessed': accessed, 'tags': ['journal']}


def si_source(page, accessed):
    """(source key, source entry) for a Smithsonian Human Origins species page (tag `museum`)."""
    name = page.replace('-', ' ').capitalize()
    return 'si-' + page, {'name': f"{name} (Smithsonian Institution's Human Origins Program)", 'url': SMITHSONIAN + page,
                          'accessed': accessed, 'tags': ['museum']}


def _get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def _write(path, data):
    """Writes through a .tmp file and renames it, so a half-written file never reads as 'have'."""
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)


def fetch_paper(doi):
    """Caches a paper's Europe PMC record by DOI unless it is already there. Returns 'cached', 'have' or 'not found'."""
    f = paper_path(doi)
    if os.path.exists(f):
        return 'have'
    os.makedirs(_dir('europepmc'), exist_ok=True)
    q = urllib.parse.urlencode({'query': f'DOI:"{doi}"', 'format': 'json', 'resultType': 'core', 'pageSize': 1})
    res = json.loads(_get(f'{EUROPE_PMC}/search?' + q))['resultList']['result']
    if not res:
        return 'not found'
    _write(f, json.dumps(res[0]).encode())
    return 'cached'


def fetch_oa(pmcid):
    """Caches an open-access paper's full text (Europe PMC fullTextXML) by PMC id unless it is already there."""
    f = oa_path(pmcid)
    if os.path.exists(f):
        return 'have'
    os.makedirs(_dir('europepmc'), exist_ok=True)
    _write(f, _get(f'{EUROPE_PMC}/{pmcid}/fullTextXML'))
    return 'cached'


def fetch_si(page):
    """Caches a Smithsonian Human Origins species page unless it is already there."""
    f = si_path(page)
    if os.path.exists(f):
        return 'have'
    os.makedirs(_dir('smithsonian'), exist_ok=True)
    _write(f, _get(SMITHSONIAN + page))
    return 'cached'
