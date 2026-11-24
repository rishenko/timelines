"""
How closely a Medieval event description follows the Wikipedia sentences it cites (Kevin's licence option C: descriptions
are the generator's own words; only the source locators quote Wikipedia, under CC BY-SA 4.0).

Scope: only Wikipedia sentences are compared (that is what the licence is about); the scholarly sources are not. Only the
sentences an event *cites* are compared, not the rest of the article.

Two measures, against the full text of every Wikipedia sentence the event cites (resolved from its source locators):
  run    the longest run of consecutive words the description shares with one source sentence, not counting names and
         numbers (a capitalised word that is not the first of its sentence, one with a capital inside it such as
         "ad-Din", and any digit-bearing word): "Holy Roman Emperor Frederick I Barbarossa" or "1204" cannot be
         rewritten, so only the ordinary words in a shared run count.
  ngram  the share of the description's word 5-grams that also occur in a source sentence (names and numbers included).
A description is too close when run >= RUN_LIMIT or ngram >= NGRAM_LIMIT; the generator refuses to build with one
(gen_medieval.py calls too_close()). The ngram limit catches what the run misses when no run reaches the limit but much of
the wording is still the source's: a short description that copies five words and changes the sixth (run 5, share 0.5).
It does not catch a word swapped in every sixth place: then only about a sixth of the phrases survive (share about 0.2),
so both measures pass. That is a known limit; the review of the wording covers it.

  python3 -I pipelines/medieval/description_check.py [data-src/medieval.json] [--all]
lists the events at or over a limit (all described events with --all), one line each: uuid, run, share, the shared run.
It needs the Wikipedia dump (TIMELINES_DATA) and the built file. Tests: python3 -I pipelines/medieval/test_description_check.py
"""
import re

RUN_LIMIT = 6        # ordinary shared words in a row; tested on the pilot against names and titles
NGRAM_LIMIT = 0.4    # share of the description's 5-word phrases found in a cited sentence
WORD = re.compile(r"[\w'’-]+")
ABBREV = {'st', 'dr', 'mt', 'mr', 'mrs', 'ms', 'vs', 'ca', 'cf', 'fl', 'no', 'ft', 'jr', 'sr'}


def tokens(text):
    """[(word lowercased, counts)] for a text: counts is False for names (capitalised and not sentence-initial, or with a
    capital inside) and numbers (a digit in them)."""
    out, start = [], True
    for m in WORD.finditer(text):
        w = m.group(0)
        name = (w[0].isupper() and not start) or any(c.isupper() for c in w[1:]) or (w[0].islower() and any(c.isupper() for c in w)) or any(c.isdigit() for c in w)
        bare = w.lower().strip("'’-")
        out.append((bare, not name))
        # a sentence starts after . ! ? and a space, but not after an abbreviation ("St.", "Dr.", "c.", "r.") or an initial
        start = bool(re.match(r'[.!?]\s', text[m.end():m.end() + 2])) and not (text[m.end():m.end() + 1] == '.' and (len(bare) <= 2 or bare in ABBREV))
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
    """The share of the description's word n-grams (5 by default) that occur in any source sentence."""
    a = [t[0] for t in tokens(descr)]
    grams = {tuple(a[i:i + n]) for i in range(len(a) - n + 1)}
    if not grams:
        return 0.0
    src = set()
    for s in sources:
        b = [t[0] for t in tokens(s)]
        src |= {tuple(b[i:i + n]) for i in range(len(b) - n + 1)}
    return len(grams & src) / len(grams)


def too_close(descr, sources):
    """(run, run text, ngram share, reasons): reasons is empty when the description is far enough from its sources."""
    n, run, _ = run_words(descr, sources)
    share = ngram_share(descr, sources)
    why = []
    if n >= RUN_LIMIT:
        why.append(f'{n} ordinary words in a row ("{run}")')
    if share >= NGRAM_LIMIT:
        why.append(f'{round(share * 100)}% of its five-word phrases are in a cited sentence')
    return n, run, share, why


def source_sentences(event, wp_sources, sentences_of):
    """The full text of each Wikipedia sentence an event cites. `wp_sources`: {source key: article title};
    `sentences_of(title)` gives ('where', sentence) pairs. Locators are cut at 160 characters, so a sentence is found by
    its start (or, for an item of a list the dump joins into one sentence, by containing it). An infobox locator is used
    as given. A quoted locator that matches no sentence stops the build (a copy of the rest of that sentence would
    otherwise pass unseen)."""
    out = []
    for r in event.get('sources', []):
        title = wp_sources.get(r['sourceKey'])
        if not title:
            continue
        loc = r.get('sourceLocation', '')
        m = re.match(r'(?:lead|section "[^"]*"): "(.*?)(?:…)?"?$', loc, re.S)
        if not m:
            out.append(loc)  # an infobox field: the locator carries its (short) text
            continue
        prefix = m.group(1)[:120]
        sents = [s for _, s in sentences_of(title)]
        hit = next((s for s in sents if s.startswith(prefix)), None) or next((s for s in sents if prefix[:80] in s), None)
        if hit is None:
            raise SystemExit(f'{event.get("uuid")}: the sentence cited as {loc[:90]!r} was not found in "{title}"; '
                             f'the description check cannot compare against it')
        out.append(hit)
    return out


if __name__ == '__main__':
    import json
    import os
    import sys
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path[:0] = [here, os.path.join(here, '..', 'common')]
    import wp_sections
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    data = json.load(open(args[0] if args else os.path.join(here, '..', '..', 'data-src', 'medieval.json'), encoding='utf-8'))
    titles = {k: v['name'][:-len(' (Wikipedia)')] for k, v in data['sources'].items() if v['name'].endswith(' (Wikipedia)')}
    rows = []
    for e in data['events']:
        if e.get('descr'):
            n, run, share, why = too_close(e['descr'], source_sentences(e, titles, wp_sections.sentences_of))
            rows.append((bool(why), n, share, e['uuid'], run))
    shown = [r for r in sorted(rows, key=lambda r: (-r[1], -r[2])) if r[0] or '--all' in sys.argv]
    for _, n, share, u, run in shown:
        print(f'{u}\trun {n}\tshare {share:.2f}\t{run[:80]}')
    print(f'{sum(1 for r in rows if r[0])} of {len(rows)} descriptions at or over a limit (run >= {RUN_LIMIT}, share >= {NGRAM_LIMIT})')
    sys.exit(1 if any(r[0] for r in rows) else 0)
