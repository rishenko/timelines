"""
Date normaliser for the extractor: turns the wikitext of an infobox field, a table cell or a sentence into dated spans.

    spans(raw, year_hint=False) -> [{'start': (y, m, d), 'end': (y, m, d) | None, 'alts': [(y, m, d)], 'circa': bool,
                                     'old_style': bool, 'precision': 'day'|'month'|'year'|'century', 'text': str}]

- Years inside this module are historical: negative for BC, no year zero (1 BC is -1, 44 BC is -44). The timelines
  store astronomical years (1 BC is 0, 44 BC is -43; docs/data-format.md), so anything written out goes through
  `astro()` (`iso()` does).
- An era word may come before the year as well as after it: "AD 43", "14 March AD 1066", "AD 9–14".
- Ranges: "28 July 1914 – 11 November 1918", "24–29 April 1916", "24 April – 1 May 1916", "June–July 1848",
  "1914–18", "44–42 BC"; the left side takes the missing month, year or era from the right.
- Alternatives ("11 November 1918/13 November 1918", "1453 or 1454") go to `alts` beside the end (or start) they follow.
- Templates: {{Start date|1914|7|28}}, {{End date}}, {{Start and end dates|y|m|d|y|m|d}}, {{OldStyleDate|…}}, {{circa}}.
- Old Style: "O.S.", "Old Style", "Julian", {{OldStyleDate}}, {{Gregorian to Julian}} and "17 (6) May" set `old_style`;
  dates are kept as written, never converted.
  A bracketed Old Style twin ("[O.S. 23 February]") is dropped and only flags the span.
- year_hint: the field holds years (year_start, year_end): a bare 1–4 digit number is a year.
"""
import re

MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
MONTH = {m: i + 1 for i, m in enumerate(MONTHS)} | {m[:3]: i + 1 for i, m in enumerate(MONTHS)} | {'sept': 9}

# "17 (6) May 1727" (Peter II of Russia): the New Style day with its Old Style twin in parentheses
_OS_DAY = re.compile(r'\b(\d{1,2})\s*\((\d{1,2})\)(?=\s+[A-Z][a-z]+)')
_OS = re.compile(r'\bO\.\s?S\.|\bOld Style\b|\bJulian\b|\{\{\s*OldStyleDate', re.I)


def astro(y):
    """A historical year (1 BC = -1, no year zero) -> the astronomical year the timelines store (1 BC = 0, 44 BC = -43)."""
    return y + 1 if y is not None and y < 0 else y


def iso(v):
    """A (y, m, d) with a historical year -> ISO text with the astronomical year the timelines store (44 BC -> -0043)."""
    if not v:
        return ''
    y, m, d = v
    y = astro(y)
    s = f'{y:05d}' if y < 0 else f'{y:04d}'
    return s + (f'-{m:02d}' if m else '') + (f'-{d:02d}' if d else '')


def clean(raw):
    """Wikitext -> plain text with dates kept: refs, comments and ages dropped, links to their labels, dashes as '–'."""
    s = raw
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>', '', s, flags=re.S | re.I)
    s = re.sub(r'([–—-]|&ndash;)\s*<br\s*/?>', r'\1 ', s, flags=re.I)  # a break right after a dash continues the range (Joanna of Castile)
    s = re.sub(r'<br\s*/?>', ' ; ', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'(?<=\S) ~ ', ' – ', s)  # a spaced tilde between two dates is a range (Goi of Baekje: "234 ~ November 286"); "~1500" stays an approximation
    s = s.replace('&nbsp;', ' ').replace('&ndash;', '–').replace('&mdash;', '—').replace('&minus;', '−')
    s = re.sub(r'\{\{\s*(?:snd|snds|spnd|ndash|spaced ndash|mdash|spaced en dash|en dash|dash)\s*\}\}', ' – ', s, flags=re.I)
    s = re.sub(r'\{\{\s*(?:circa|c\.|ca)\s*\|?\s*', '{{c-mark|', s, flags=re.I)
    s = _templates(s)
    # an unclosed template or ref runs to the end (a field value cut short, as the side tables store at most 2,000
    # characters): drop it, so a long footnote's years don't leak in
    s = re.sub(r'\{\{.*$|<ref[^>]*>.*$', '', s, flags=re.S | re.I)
    s = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', s)
    s = re.sub(r"'{2,}", '', s)
    return re.sub(r'\s+', ' ', s).strip()


def _fmt(y, m=None, d=None):
    if m is not None and not 1 <= m <= 12:  # a malformed template ({{start date|1914|0}}): keep the year only
        m = d = None
    if d is not None and not 1 <= d <= 31:
        d = None
    out = []
    if d:
        out.append(str(d))
    if m:
        out.append(MONTHS[m - 1].capitalize())
    out.append(str(abs(y)) + (' BC' if y < 0 else ''))
    return ' '.join(out)


def _templates(s):
    """Date templates to text; other templates (ages, notes, flags) dropped. Innermost first."""
    def one(m):
        name, _, args = m.group(1).partition('|')
        n = name.strip().lower()
        parts = [a.strip() for a in args.split('|')] if args else []
        nums = [int(a) for a in parts if re.fullmatch(r'-?\d{1,4}', a)]
        if n == 'c-mark':
            return 'c. ' + '|'.join(parts)
        if n in ('start date', 'end date', 'start date and age', 'end date and age', 'birth date', 'death date', 'dts',
                 'start-date', 'end-date', 'date') and nums:
            return _fmt(*nums[:3])
        if n in ('start and end dates', 'start and end date', 'date range') and nums:
            a, b = nums[:3], nums[3:6]
            return _fmt(*a) + (' – ' + _fmt(*b) if b else '')
        if n == 'oldstyledate' and parts:
            # {{OldStyleDate|8 March|1917|23 February}}: the New Style date as written, flagged Old Style
            return f'{parts[0]} {parts[1] if len(parts) > 1 else ""} (O.S.)'
        if n in ('gregorian to julian', 'julian to gregorian') and parts:
            # {{Gregorian to Julian|23 July 1645}} (Alexis of Russia): the date as written, which shows both styles
            return f'{parts[0]} (O.S.)'
        if n in ('nowrap', 'nobr', 'awrap', 'avoid wrap', 'small', 'abbr', 'lang') and parts:
            return parts[-1] if n == 'lang' else parts[0]
        return ' '
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r'\{\{([^{}]*)\}\}', one, s)
    return s


TOKEN = re.compile(
    r'(?P<century>(\d{1,2})(?:st|nd|rd|th)[\s-]+century)'
    r'|(?P<os>\[\s*O\.\s?S\.[^\]]*\]|\(\s*O\.\s?S\.[^)]*\))'
    r'|(?P<circa>\bc\.|\bca\.|\bcirca\b|\bapprox\.?|\babout\b|\baround\b)'
    r'|(?P<era>\bB\.?\s?C\.?(?:E\.?)?(?![a-z])|\bA\.?\s?D\.?(?![a-z])|\bC\.?E\.?(?![a-z]))'
    r'|(?P<month>\b(?:' + '|'.join(MONTHS) + r'|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b\.?)'
    r'|(?P<num>\b\d{1,4}\b)(?:st|nd|rd|th)?'
    r'|(?P<dash>–|—|−|-|\bto\b|\buntil\b|\btill\b|\bthrough\b)'
    r'|(?P<alt>/|\bor\b)'
    r'|(?P<comma>,)'
    r'|(?P<word>[A-Za-z][A-Za-z\'’]*)'
    r'|(?P<sep>[^\s])', re.I)
# words after which a bare number is a year ("in 1915", "since 1848"); elsewhere a bare number needs punctuation, a
# dash or an era after it ("205 mutineers" and "153 seats" are counts)
YEAR_BEFORE = {'in', 'since', 'by', 'until', 'till', 'from', 'during', 'early', 'late', 'mid', 'spring', 'summer', 'autumn',
               'fall', 'winter', 'year', 'years', 'around', 'before', 'after', 'between', 'through', 'circa', 'c', 'ca',
               'about', 'throughout'}
# weaker: "of 1848", "the 1914 election", but also "of 235 seats": a year only with four digits
YEAR_BEFORE_4 = {'of', 'the', 'and', 'to', 'for', 'on', 'end', 'beginning', 'start', 'middle'}
# numbers that are never dates: clock times, thousands, decimals, percentages, compounds ("2,500-year", "38.7%", "150-person")
QUANTITY = re.compile(r'\b\d{1,2}:\d{2}\b|\b\d{1,3}(?:,\d{3})+\b|\b\d+\.\d+\b|\b\d+\s?%|\b\d+-(?=[a-z])', re.I)


def _tokens(text):
    out = []
    for m in TOKEN.finditer(text):
        kind = m.lastgroup
        if kind == 'century':
            out.append(('century', int(m.group(2))))
        elif kind == 'month':
            w = m.group('month').lower().rstrip('.')
            out.append(('month', MONTH.get(w) or MONTH[w[:3]]))
        elif kind == 'num':
            out.append(('num', int(m.group('num'))))
        elif kind == 'era':
            out.append(('era', 'bc' if m.group('era').upper().startswith('B') else 'ad'))
        elif kind == 'word':
            out.append(('word', m.group('word').lower()))
        elif kind == 'sep':
            ch = m.group('sep')
            if ch in ';:()[].!?"#':
                out.append(('sep', ch))
        else:
            out.append((kind, m.group(0)))
    return out


def _atom(toks, i):
    """One date at toks[i]: (atom, next index) or (None, i). atom = dict(y, m, d, era, circa, century)."""
    a = {'y': None, 'm': None, 'd': None, 'era': None, 'circa': False, 'century': None}
    j = i
    if j < len(toks) and toks[j][0] == 'circa':
        a['circa'] = True; j += 1
    k = lambda n=0: toks[j + n][0] if j + n < len(toks) else None
    v = lambda n=0: toks[j + n][1]
    lead_ad = lambda: k() == 'era' and v() == 'ad' and k(1) == 'num'  # "AD 43": the era before the year
    if lead_ad():
        a['era'] = 'ad'; j += 1
    if k() == 'century':
        a['century'] = v(); j += 1
    elif k() == 'num' and v() > 31 and k(1) == 'month':  # year first: "1919 May 26 – June 3" (a number over 31 cannot be a day)
        a['y'], a['m'] = v(), v(1); j += 2
        if k() == 'num' and v() <= 31 and k(1) != 'era':
            a['d'] = v(); j += 1
    elif k() == 'num' and k(1) == 'month':  # 28 July [1914]
        a['d'], a['m'] = v(), v(1); j += 2
        if lead_ad():  # 14 March AD 1066
            a['era'] = 'ad'; j += 1
        if k() == 'num' and v() > 31 or (k() == 'num' and k(1) == 'era'):
            a['y'] = v(); j += 1
        elif k() == 'num' and k(1) != 'month':
            a['y'] = v(); j += 1
    elif k() == 'month':  # July [28[,]] [1914]: after a month, a number up to 31 is a day, a larger one the year
        a['m'] = v(); j += 1
        if k() == 'num' and v() <= 31 and k(1) != 'era':
            a['d'] = v(); j += 1
            if k() == 'comma':
                j += 1
        if k() == 'comma' and k(1) == 'num' and v(1) > 31:  # "July–August, 1914"
            j += 1
        if lead_ad():  # March AD 1066
            a['era'] = 'ad'; j += 1
        if k() == 'num' and (v() > 31 or k(1) == 'era'):
            a['y'] = v(); j += 1
    elif k() == 'num' and v() <= 31 and k(1) == 'comma' and k(2) == 'num' and v(2) > 31 and i > 0 and toks[i - 1][0] in ('dash', 'alt'):
        a['d'], a['y'] = v(), v(2); j += 3  # the right side of "February 11–16, 1862": a day, then its year
    elif k() == 'num':  # 1914, or a day before a dash ("24–29 April 1916"), resolved by the range
        before = toks[i - 1] if i > 0 else None
        after = k(1)
        w = before[1].rstrip('.') if before is not None and before[0] in ('word', 'circa') else None
        a['strong'] = w in YEAR_BEFORE  # "in 476 the…": a year even with a word after it
        a['bare_ok'] = w in YEAR_BEFORE or (w in YEAR_BEFORE_4 and v() >= 1000) or \
            before is not None and before[0] in ('dash', 'alt') or after in (None, 'comma', 'dash', 'alt', 'era', 'sep')
        a['y'] = v(); j += 1
    else:
        return None, i
    if k() == 'era':
        a['era'] = v(); j += 1
    elif a['y'] is not None and a['y'] < 1000 and k() == 'word' and not a.get('strong'):
        a['count'] = True  # "3 April 500 men", "16 July 16 Squadron": a number of things, not a year
    return a, j


def _resolve(left, right):
    """Give the left side of a range what it lacks from the right: month, year, era; "1914–18" -> 1918."""
    if left['century'] or right['century']:
        return
    if right['m'] is None and right['d'] is None and right['y'] is not None and right['y'] <= 31 and left['d'] is not None:
        right['d'], right['y'], right['m'] = right['y'], left['y'], left['m']  # "March 24 to 29": a day of the same month
    if left['m'] is None and left['d'] is None and left['y'] is not None and left['y'] <= 31 and right['m'] is not None and right['d'] is not None:
        left['d'], left['y'] = left['y'], None  # 24–29 April 1916
    if left['m'] is None and left['d'] is not None:
        left['m'] = right['m']
    if right['m'] is None and right['d'] is not None:  # "February 11–16, 1862"
        right['m'] = left['m']
    if left['y'] is None:
        left['y'] = right['y']
    elif right['y'] is None and right['m'] is not None and right['d'] is not None:
        right['y'] = left['y']  # "1919 May 26 – June 3": the end takes the start's year
    if right['y'] is not None and left['y'] is not None and right['m'] is None and left['m'] is None and right['y'] < 100 <= left['y'] \
            and right['y'] < left['y'] % 100 + 100:
        right['y'] = left['y'] // 100 * 100 + right['y']  # 1914–18
        if right['y'] < left['y']:
            right['y'] += 100
    if left['era'] is None and right['era'] == 'bc':
        left['era'] = 'bc'
    if left['era'] == 'bc' and right['era'] is None and right['y'] is not None and left['y'] is not None and right['y'] < left['y']:
        right['era'] = 'bc'  # "331 BC – 321": the later year is earlier by the numbers, so still BC (Mithrenes of Armenia)


def _value(a):
    if a['century']:
        c = a['century']
        if a['era'] == 'bc':
            return (-(c * 100), None, None), (-((c - 1) * 100 + 1), None, None)
        return ((c - 1) * 100 + 1, None, None), (c * 100, None, None)
    y = a['y']
    if y is None:
        return None, None
    if a['era'] == 'bc':
        y = -y
    return (y, a['m'], a['d']), None


def _precision(v, a):
    if a['century']:
        return 'century'
    return 'day' if v[2] else 'month' if v[1] else 'year'


def _ok(a, year_hint):
    """A bare number is a year only when it can't be anything else."""
    if a.get('count'):
        return False
    if a['century'] or a['m'] or a['d']:
        return a['y'] is not None or a['century'] is not None
    y = a['y']
    if y is None:
        return False
    return bool(a['era']) or year_hint or (y >= 100 and a.get('bare_ok', True)) or (a['circa'] and a.get('bare_ok', True))


_DECADE = re.compile(r'\b(?:(early|mid|late)[\s-]+)?(?:the\s+)?(\d{3,4})s\b(?!\s*(?:BC|B\.C|CE|AD))', re.I)
_QCENT = re.compile(r'\b(early|mid|late)[\s-]+(\d{1,2})(?:st|nd|rd|th)[\s-]+century\b(?!\s*(?:BC|B\.C))', re.I)
_PARTS = {'early': (0, 33), 'mid': (33, 66), 'late': (66, 99), None: (0, 99)}


def _vague(text):
    """Decades ("the 1880s", "early 1880s") and qualified centuries ("late 19th century") become circa ranges ("c. 1880–1883"), or,
    before a dash, their low bound ("early 1880s–1904" starts c. 1880), instead of being read as one year or a whole century."""
    def rng(lo, hi, m):
        before_dash = re.match(r'\s*(?:[–—-]|to\b)\s*\d', m.string[m.end():])
        return f'c. {lo}' if before_dash else f'c. {lo}–{hi}'

    def dec(m):
        a, b = _PARTS[(m.group(1) or '').lower() or None]
        y = int(m.group(2))
        return rng(y + (a * 10 // 99 if a else 0), y + (round(b * 9 / 99)), m)

    def cen(m):
        a, b = _PARTS[m.group(1).lower()]
        base = (int(m.group(2)) - 1) * 100
        return rng(base + a + 1, base + (b if b < 99 else 100), m)
    return _QCENT.sub(cen, _DECADE.sub(dec, text))


_BETWEEN = re.compile(r'\bbetween\s+(\d{1,4})\s+and\s+(\d{1,4}\s*(?:BCE|BC|CE|AD)\b)', re.I)


def spans(raw, year_hint=False):
    text = QUANTITY.sub(' # ', clean(raw))
    text = _vague(text)
    text = _BETWEEN.sub(r'\1–\2', text)  # "between 109 and 108 BCE" is a range, so the first year shares the era
    old_style = bool(_OS.search(raw) or _OS.search(text) or _OS_DAY.search(text))
    text = _OS_DAY.sub(r'\1', text)
    toks = [t for t in _tokens(text) if t[0] != 'os']
    out, i = [], 0
    while i < len(toks):
        a, j = _atom(toks, i)
        if not a:
            i += 1
            continue
        group = [('start', a)]
        while j < len(toks) and toks[j][0] in ('dash', 'alt'):
            b, k = _atom(toks, j + 1)
            if not b:
                break
            group.append(('end' if toks[j][0] == 'dash' else 'alt', b))
            j = k
        i = j
        # resolve ranges right to left, so "24 April – 1 May 1916" and alternatives share the year
        for n in range(len(group) - 2, -1, -1):
            _resolve(group[n][1], group[n + 1][1])
        start = group[0][1]
        if not _ok(start, year_hint):
            continue
        sv, cend = _value(start)
        if sv is None:  # no year on either side ("May to June")
            continue
        span = {'start': sv, 'end': cend, 'alts': [], 'circa': start['circa'] or bool(start['century']), 'old_style': old_style,
                'precision': _precision(sv, start), 'text': text}
        for role, b in group[1:]:
            bv, bend = _value(b)
            if bv is None:
                continue
            if role == 'end' and span['end'] is None:
                span['end'] = bend or bv
            else:
                span['alts'].append(bv)
            span['circa'] = span['circa'] or b['circa']
        out.append(span)
    return out
