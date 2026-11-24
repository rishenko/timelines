"""
How closely a Medieval event description follows the Wikipedia sentences it cites (Kevin's licence option C: descriptions
are the generator's own words; only the source locators quote Wikipedia, under CC BY-SA 4.0).

Measures, per event, against the full text of every Wikipedia sentence the event cites (resolved from its source locators):
  run    the longest run of consecutive words the description shares with one source sentence, not counting names and
         numbers (a capitalised word that is not the first of its sentence, and any digit-bearing word): "Holy Roman
         Emperor Frederick I Barbarossa" or "1204" cannot be rewritten, so only the ordinary words in a shared run count.
  ngram  the share of the description's word 5-grams that also occur in a source sentence (names and numbers included).
An event is near-verbatim when run >= RUN_LIMIT; the generator refuses to build with one (gen_medieval.py calls check()).

  python3 -I pipelines/medieval/description_check.py [--list FILE]    (needs the dump: TIMELINES_DATA)
"""
import re

RUN_LIMIT = 6   # ordinary shared words in a row; tested on the pilot (see the PR) against names and titles
WORD = re.compile(r"[\w'’-]+")


def tokens(text):
    """[(word lowercased, counts)] for a text: counts is False for names (capitalised, not sentence-initial) and numbers."""
    out, start = [], True
    for m in WORD.finditer(text):
        w = m.group(0)
        name = (w[0].isupper() and not start) or any(c.isdigit() for c in w)
        out.append((w.lower().strip("'’-"), not name))
        # a sentence starts after . ! ? (not after an abbreviation's dot inside a word)
        tail = text[m.end():m.end() + 2]
        start = bool(re.match(r'[.!?]\s', tail))
    return out


def run_words(descr, sources):
    """(ordinary words in the longest shared run, the run as text, the source index) against a list of source sentences."""
    a = tokens(descr)
    best = (0, '', -1)
    for si, s in enumerate(sources):
        b = tokens(s)
        idx = {}
        for j, (w, _) in enumerate(b):
            idx.setdefault(w, []).append(j)
        for i, (w, _) in enumerate(a):
            for j in idx.get(w, ()):
                k = 0
                while i + k < len(a) and j + k < len(b) and a[i + k][0] == b[j + k][0]:
                    k += 1
                n = sum(1 for t in a[i:i + k] if t[1])
                if n > best[0]:
                    best = (n, ' '.join(t[0] for t in a[i:i + k]), si)
    return best


def ngram_share(descr, sources, n=5):
    a = [t[0] for t in tokens(descr)]
    grams = {tuple(a[i:i + n]) for i in range(len(a) - n + 1)}
    if not grams:
        return 0.0
    src = set()
    for s in sources:
        b = [t[0] for t in tokens(s)]
        src |= {tuple(b[i:i + n]) for i in range(len(b) - n + 1)}
    return len(grams & src) / len(grams)


def source_sentences(event, wp_sources, sentences_of, lead_sentences):
    """The full text of each Wikipedia sentence an event cites. `wp_sources`: {source key: article title};
    `sentences_of(title)` gives ('where', sentence) pairs; locators are cut at 160 characters, so match by prefix."""
    out = []
    for r in event.get('sources', []):
        title = wp_sources.get(r['sourceKey'])
        loc = r.get('sourceLocation', '')
        m = re.match(r'(?:lead|section "[^"]*"): "(.*?)(?:…)?"?$', loc, re.S)
        if not title:
            continue
        if not m:
            out.append(loc)  # an infobox field: the locator carries its (short) text
            continue
        prefix = m.group(1)
        hit = next((s for _, s in sentences_of(title) if s.startswith(prefix[:120])), None)
        out.append(hit or prefix)
    return out
