"""
Date normaliser for the extractor: turns the wikitext of an infobox field, a table cell or a sentence into dated spans.

    spans(raw, year_hint=False) -> [{'start': (y, m, d), 'end': (y, m, d) | None, 'alts': [(y, m, d)], 'circa': bool,
                                     'old_style': bool, 'precision': 'day'|'month'|'year'|'century', 'text': str}]

- Years are astronomical-free historical years: negative for BC, no year zero (1 BC is -1, as the timelines store them).
- Ranges: "28 July 1914 – 11 November 1918", "24–29 April 1916", "24 April – 1 May 1916", "June–July 1848",
  "1914–18", "44–42 BC"; the left side takes the missing month, year or era from the right.
- Alternatives ("11 November 1918/13 November 1918", "1453 or 1454") go to `alts` beside the end (or start) they follow.
- Templates: {{Start date|1914|7|28}}, {{End date}}, {{Start and end dates|y|m|d|y|m|d}}, {{OldStyleDate|…}}, {{circa}}.
- Old Style: "O.S.", "Old Style", "Julian", {{OldStyleDate}} set `old_style`; dates are kept as written, never converted.
  A bracketed Old Style twin ("[O.S. 23 February]") is dropped and only flags the span.
- year_hint: the field holds years (year_start, year_end): a bare 1–4 digit number is a year.
"""
import re

MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
MONTH = {m: i + 1 for i, m in enumerate(MONTHS)} | {m[:3]: i + 1 for i, m in enumerate(MONTHS)} | {'sept': 9}

_OS = re.compile(r'\bO\.\s?S\.|\bOld Style\b|\bJulian\b|\{\{\s*OldStyleDate', re.I)


def clean(raw):
    """Wikitext -> plain text with dates kept: refs, comments and ages dropped, links to their labels, dashes as '–'."""
    s = raw
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>', '', s, flags=re.S | re.I)
    s = re.sub(r'<br\s*/?>', ' ; ', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&nbsp;', ' ').replace('&ndash;', '–').replace('&mdash;', '—').replace('&minus;', '−')
    s = re.sub(r'\{\{\s*(?:snd|spnd|ndash|spaced ndash|mdash|spaced en dash|en dash|dash)\s*\}\}', ' – ', s, flags=re.I)
    s = re.sub(r'\{\{\s*(?:circa|c\.|ca)\s*\|?\s*', '{{c-mark|', s, flags=re.I)
    s = _templates(s)
    s = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', s)
    s = re.sub(r"'{2,}", '', s)
    return re.sub(r'\s+', ' ', s).strip()


def _fmt(y, m=None, d=None):
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
        if n == 'start and end dates' and nums:
            a, b = nums[:3], nums[3:6]
            return _fmt(*a) + (' – ' + _fmt(*b) if b else '')
        if n == 'oldstyledate' and parts:
            # {{OldStyleDate|8 March|1917|23 February}}: the New Style date as written, flagged Old Style
            return f'{parts[0]} {parts[1] if len(parts) > 1 else ""} (O.S.)'
        if n in ('nowrap', 'nobr', 'small', 'abbr', 'lang') and parts:
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
    r'|(?P<sep>[^\s])', re.I)


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
        elif kind == 'sep':
            ch = m.group('sep')
            if ch.isalpha() or ch.isdigit() or ch in ';:()[]':
                out.append(('sep', ch))
        else:
            out.append((kind, m.group(0)))
    # words break atoms: collapse runs of letters into one separator
    merged = []
    for t in out:
        if t[0] == 'sep' and merged and merged[-1][0] == 'sep':
            continue
        merged.append(t)
    return merged


def _atom(toks, i):
    """One date at toks[i]: (atom, next index) or (None, i). atom = dict(y, m, d, era, circa, century)."""
    a = {'y': None, 'm': None, 'd': None, 'era': None, 'circa': False, 'century': None}
    j = i
    if j < len(toks) and toks[j][0] == 'circa':
        a['circa'] = True; j += 1
    k = lambda n=0: toks[j + n][0] if j + n < len(toks) else None
    v = lambda n=0: toks[j + n][1]
    if k() == 'century':
        a['century'] = v(); j += 1
    elif k() == 'num' and k(1) == 'month':  # 28 July [1914]
        a['d'], a['m'] = v(), v(1); j += 2
        if k() == 'comma' and k(1) == 'num':
            j += 1
        if k() == 'num' and v() > 31 or (k() == 'num' and k(1) == 'era'):
            a['y'] = v(); j += 1
        elif k() == 'num' and k(1) != 'month':
            a['y'] = v(); j += 1
    elif k() == 'month':  # July [28,] [1914]
        a['m'] = v(); j += 1
        if k() == 'num' and v() <= 31 and (k(1) == 'comma' or (k(1) == 'num')):
            a['d'] = v(); j += 1
            if k() == 'comma':
                j += 1
        if k() == 'num':
            if a['d'] is None and v() <= 31 and k(1) not in ('era',) and (k(1) in ('dash', 'alt', None, 'sep', 'comma')):
                # "July 28" with no year, or "June 1848"? a number <= 31 after a month with nothing after: a day
                a['d'] = v(); j += 1
            else:
                a['y'] = v(); j += 1
    elif k() == 'num' and v() <= 31 and k(1) == 'comma' and k(2) == 'num' and v(2) > 31:  # "…11–16, 1862": a day, then its year
        a['d'], a['y'] = v(), v(2); j += 3
    elif k() == 'num':  # 1914, or a day before a dash ("24–29 April 1916"), resolved by the range
        a['y'] = v(); j += 1
    else:
        return None, i
    if k() == 'era':
        a['era'] = v(); j += 1
    return a, j


def _resolve(left, right):
    """Give the left side of a range what it lacks from the right: month, year, era; "1914–18" -> 1918."""
    if left['century'] or right['century']:
        return
    if left['m'] is None and left['d'] is None and left['y'] is not None and left['y'] <= 31 and right['m'] is not None and right['d'] is not None:
        left['d'], left['y'] = left['y'], None  # 24–29 April 1916
    if left['m'] is None and left['d'] is not None:
        left['m'] = right['m']
    if right['m'] is None and right['d'] is not None:  # "February 11–16, 1862"
        right['m'] = left['m']
    if left['y'] is None:
        left['y'] = right['y']
    if right['y'] is not None and left['y'] is not None and right['m'] is None and left['m'] is None and right['y'] < 100 <= left['y'] \
            and right['y'] < left['y'] % 100 + 100:
        right['y'] = left['y'] // 100 * 100 + right['y']  # 1914–18
        if right['y'] < left['y']:
            right['y'] += 100
    if left['era'] is None and right['era'] == 'bc':
        left['era'] = 'bc'


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
    if a['century'] or a['m'] or a['d']:
        return a['y'] is not None or a['century'] is not None
    y = a['y']
    if y is None:
        return False
    return bool(a['era']) or year_hint or a['circa'] or y >= 100


def spans(raw, year_hint=False):
    text = clean(raw)
    old_style = bool(_OS.search(raw) or _OS.search(text))
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
        span = {'start': sv, 'end': cend, 'alts': [], 'circa': start['circa'], 'old_style': old_style,
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
