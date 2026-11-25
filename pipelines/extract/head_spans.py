"""R15 (2026-11-25): which spans of one infobox are reigns of a row, beyond the office filters in rulers.py (NOT_HEAD, RULER_WORD).

holding   the span that holds the whole Wikidata term and ends with it beats a closer span that starts later (Victoria on Canada: the 1837 reign,
          not Empress of India 1876). A longer span never beats a short term that starts at the Wikidata date (Poher: a Senate term beside an acting presidency).
touching  a span that touches one already picked (a gap of at most a year) and names the row's own head title is a spell of the row (Francis II, Ecuador's
          Noboa), never an association, an embassy or a collective presidency.
"""
import re

# an office text that is a seat, a staff post or a body's chair, never a state's head: the only span left once the non-head offices went is no reign
NOT_A_SEAT = re.compile(r'\b(member of|politburo|orgburo|association|institute|alliance|ambassador|commissioner|senator|mayor|chief medical|'
                        r'lord lieutenant|house of lords|knesset|rada|bar association|director|bishop|department|legislative seat|pioneer)', re.I)
NOT_A_SPELL = re.compile(r'\b(heir|crown|co-|junior|designate|elect|claimant|pretender|regent|titular|nominal|acting|interim)', re.I)
ADJECTIVES = re.compile(r'^\W*(?:\d+(?:st|nd|rd|th)(?:,? and \d+(?:st|nd|rd|th))?\s+)?(?:(?:provisional|interim|state|grand|de facto|first)\s+)*')


def holding(spans, g, days, year):
    """g = (field, span, succession, (term start, term end)) the closest span to a Wikidata term; the span holding the term, or g."""
    t0, t1 = g[3]
    if g[1]['start'][0] > t0[0] + 1:
        holds = [x for x in spans if x[1] is not g[1] and x[1]['start'][0] <= t0[0] and x[1]['end'] and t1 and abs(x[1]['end'][0] - year(t1)) <= 1]
        if holds:
            f, s, succ = min(holds, key=lambda x: days(x[1]['start']))
            return f, s, succ, (t0, t1)
    return g


def names_row(succ, words, ruler_word, ordinal):
    """The office is the polity's own head title: "[ordinal] [adjective] King/President of [the] [two words at most] <row word>", with no other "of"
    between (not "President of the Football Association of Finland", "Ambassador of Portugal", "President of the Presidency of …")."""
    t = ADJECTIVES.sub('', re.sub(r'\([^)]*\)', ' ', ordinal.sub(' ', succ.lower())))
    return bool(ruler_word.match(t)) and 'presidency' not in t and not NOT_A_SEAT.search(t) and any(
        len(w) >= 5 and re.match(r'[a-z\-]+(?: [a-z\-]+)? of (?:the )?(?:(?:republic|kingdom|state|empire|commonwealth) of (?:the )?)?(?:(?!of\b)[a-z\-]+ ){0,2}'
                                 + re.escape(w) + r'\b', t) for w in words)


def touches(a, b, days):
    """Two spans meet: one starts within a year after the other ends."""
    return any(y['end'] and 0 <= days(x['start']) - days(y['end']) <= 372 + 31 for x, y in ((a, b), (b, a)))


def touching(spans, out, words, ruler_word, not_ruler, ordinal, days):
    """The spans to add to the picks `out` (up to three rounds, so a chain of three offices is followed): [(field, span, succession, None)]."""
    got = []
    for _ in range(3):
        for f, s, succ in spans:
            picked = [o[1] for o in out + got]
            if picked and all(s is not p for p in picked) and ruler_word.search(succ) and not not_ruler.search(succ) and not NOT_A_SPELL.search(succ) \
                    and names_row(succ, words, ruler_word, ordinal) and any(touches(s, p, days) for p in picked):
                got.append((f, s, succ, None))
    return got
