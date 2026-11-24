"""
Row parser for Wikipedia list pages of disasters (v2 step 2, bulk): one dated table row -> its own event article, with the year and
the toll read from the row's own cells, not from the whole row. Used by select_disasters_bulk.py.

A table is read through its header: each column is a role (date, event, location, deaths, comments) from the header's words. For a row:
  - date: the date cell (a sort template gives the signed year: {{Date table sorting|-441}}, {{dts|684|11|29}}, {{nat|512-05-21}}, {{hs|-1780}}),
    else the cell's plain text through dates.spans; the plain cell is the quote;
  - article: the first link of the event cell; else the event cell's own text if it is a page title ("512 Shaanxi earthquake"); else a link in
    the comments cell whose text names a disaster ("see [[AD 17 Lydia earthquake]]"). A place link is never the article (the 885 row of the
    Egypt list links Cairo, which is not an event): such a row has no article and is counted, not seeded;
  - toll: the deaths cell only, references and templates removed, the high end of a range ("1.5 million", "5,310 (estimate)").
Nothing is typed; a row without a date or an article is listed in the report with its reason.
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'extract'))
from dates import spans  # noqa: E402

REF = re.compile(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>|<!--.*?-->', re.S)
KEYWORD = re.compile(r'earthquake|quake|famine|plague|epidemic|pandemic|flood|tsunami|eruption|volcan|drought|hardship|disaster|storm|cyclone|typhoon|hurricane|outbreak|pestilence|fever|smallpox|landslide|avalanche|tornado|heat wave|cholera|\bgreat (?:\w+ )?fire\b|\bfire of\b|\bblack death\b|\bdeath toll\b', re.I)
ROLES = [('date', r'^date|^year|^years$|^when'), ('deaths', r'death|fatalit|toll|killed|casualt'), ('event', r'^event|^article|^name|^volcano|epidemics|^eruption|^disaster'),
         ('location', r'location|place|epicent|country|region|area'), ('comments', r'comment|notes?$|description|remarks')]
LINK = re.compile(r'\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]*))?\]\]')


def _drop_templates(s):
    """Templates removed, except the ones that carry a value we read: nts/sort give their number."""
    s = re.sub(r'\{\{\s*(?:nts|sort)\s*\|\s*([^|{}]*)[^{}]*\}\}', r'\1', s, flags=re.I)
    prev = None
    while prev != s:
        prev, s = s, re.sub(r'\{\{[^{}]*\}\}', '', s)
    return s


def plain(s):
    s = _drop_templates(REF.sub('', s))
    s = LINK.sub(lambda m: m.group(2) or m.group(1), s)
    s = re.sub(r"<br\s*/?>|<[^>]+>|''+", ' ', s).replace('&nbsp;', ' ')
    return re.sub(r'\s+', ' ', s).strip(' |')


ATTR = re.compile(r'^([^|\[{]*=[^|\[{]*)\|(?!\|)(.*)$', re.S)


def _span(attrs, name):
    m = re.search(name + r'\s*=\s*["\']?(\d+)', attrs or '', re.I)
    return int(m.group(1)) if m else 1


def _cells(row):
    """The row's cells as (content, rowspan, colspan): lines starting '|' and inline '||'; a leading 'attr="x" |' gives the spans."""
    text = REF.sub('', row)
    out = []
    for line in re.split(r'\n(?=\s*[|!])', '\n' + text.strip('\n')):
        line = line.strip()
        if not line or line.startswith('|-') or line.startswith('|}') or line.startswith('{|'):
            continue
        line = line[1:]
        for c in re.split(r'\|\||!!', line):
            m = ATTR.match(c)
            attrs, c = (m.group(1), m.group(2)) if m else ('', c)
            out.append((c.strip(), _span(attrs, 'rowspan'), _span(attrs, 'colspan')))
    return out


def expand(cells, carry):
    """The row's cells by column, with colspan copied across and the rowspan cells of earlier rows carried in (carry: column -> [text, rows left])."""
    out, col, it = [], 0, iter(cells)
    while True:
        if col in carry and carry[col][1] > 0:
            out.append(carry[col][0])
            carry[col][1] -= 1
            col += 1
            continue
        c = next(it, None)
        if c is None:
            break
        text, rs, cs = c
        for k in range(cs):
            out.append(text)
            if rs > 1:
                carry[col + k] = [text, rs - 1]
        col += cs
    return out


def header_block(table):
    """The first block (between '|-' lines) that holds '!' lines: tables open '{|\\n! Date' and '{|\\n|-\\n! Date' alike."""
    for blk in table.split('\n|-'):
        if re.search(r'^!', blk, re.M):
            return blk
    return ''


def header_names(table):
    names = []
    for line in re.findall(r'^!(.*)$', header_block(table), re.M):
        for h in re.split(r'!!', line):
            m = ATTR.match(h)
            names.append(plain(m.group(2) if m else h).lower())
    return names


def header_roles(table):
    roles = {}
    for i, n in enumerate(header_names(table)):
        for role, pat in ROLES:
            if role not in roles and re.search(pat, n):
                roles[role] = i
                break
    return roles


def year_of(raw):
    """(year, month, day, quote) from a date cell, or None. One BCE convention throughout: a year before 1 CE is the negative of its
    BCE number (1 BCE = -1), as dates.spans gives it; the emitter converts to astronomical (emit.astro) in one place.
      - {{hs|-1780}} and {{Date table sorting|-441}} show "1780 BC" / "441 BC" (checked against the displayed text on the lists): used as is;
      - {{dts|y|m|d}} / {{nat|y-m-d}} with a negative year: not read (their BC convention is not verified here); the row reports 'no date'."""
    quote = plain(raw)
    if re.search(r'\{\{\s*(?:dts|nat)\s*\|\s*-', raw, re.I):
        return None
    m = re.search(r'\{\{\s*Date table sorting\s*\|\s*(-?\d+)', raw, re.I) or re.search(r'\{\{\s*hs\s*\|\s*(-?\d{1,5})(?:-(\d\d)-(\d\d))?', raw, re.I)
    if m and not re.search(r'\{\{\s*(dts|nat)', raw, re.I):
        y = int(m.group(1))
        return (y, None, None, quote)
    m = re.search(r'\{\{\s*(?:dts|nat)\s*\|\s*(\d+)[|-](\d+)[|-](\d+)[^{}]*\}\}', raw, re.I)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(0))
    sp = spans(quote)[:1]
    if sp and sp[0]['start'][0] is not None and abs(sp[0]['start'][0]) < 3000:
        y, mo, d = sp[0]['start']
        return (y, mo, d, quote)
    return None


def toll_of(raw):
    """The cell's toll: the largest number of its main text, a range giving its high end. Parentheses are dropped first ("1,000 (1556 est.)" is
    1,000), and a four-digit number after "est.", "in", "c." or "AD" is a year, not a toll."""
    s = plain(raw)
    s = re.sub(r'\([^)]*\)|\[[^\]]*\]', ' ', s)
    s = re.sub(r'\b(?:est\.?|in|c\.|ca\.|circa|AD|CE|by|of)\s*\d{3,4}\b', ' ', s, flags=re.I)
    best = 0.0
    for m in re.finditer(r'(\d[\d,]*(?:\.\d+)?)\s*(million|billion)?', s):
        try:
            v = float(m.group(1).replace(',', ''))
        except ValueError:
            continue
        v *= 1e6 if m.group(2) == 'million' else 1e9 if m.group(2) == 'billion' else 1
        best = max(best, v)
    return best if best < 1e9 else 0.0


def article_of(event_raw, comments_raw, exists):
    cell = plain(event_raw or '')
    for m in LINK.finditer(REF.sub('', event_raw or '')):
        t = m.group(1).strip()
        shown = (m.group(2) or t).strip()
        # the event itself: a disaster word in the title, and the link is most of the cell (a sentence that merely mentions an event is not it)
        if exists(t) and KEYWORD.search(t) and len(shown) >= 0.5 * max(len(cell), 1):
            return t
    txt = plain(event_raw or '')
    if txt and exists(txt) and KEYWORD.search(txt):
        return txt
    for m in LINK.finditer(REF.sub('', comments_raw or '')):
        t = m.group(1).strip()
        if KEYWORD.search(t) and exists(t):
            return t
    return None


def rows(wikitext, exists, report=None):
    """Every table row of the page: dicts with date/article/deaths/location. `report` (a list) collects tables with no date column and
    rows skipped (no date, or a cell count that differs from the header's) with the reason."""
    out = []
    for tm in re.finditer(r'\{\|.*?\n\|\}', wikitext, re.S):
        table = tm.group(0)
        names = header_names(table)
        roles = header_roles(table)
        hblock = header_block(table)
        unit = 1e6 if re.search(r'(death|toll|fatalit)[^!\n]*\(\s*millions?\s*\)', hblock, re.I) else 1.0  # "Death toll (million)"
        if 'date' not in roles:
            if report is not None and len(table) > 400:
                report.append({'table': 'no date column', 'header': names[:6]})
            continue
        carry = {}
        for row in table.split('\n|-')[1:]:
            if row.lstrip().startswith('!') and '\n|' not in row:
                continue  # a second header line
            c = expand(_cells(row), carry)
            if not c:
                continue
            if len(c) != len(names):
                if report is not None:
                    report.append({'skip': f'{len(c)} cells for {len(names)} columns', 'cell': plain(c[0])[:60]})
                continue
            g = lambda role: c[roles[role]] if role in roles else None  # noqa: E731
            if not g('date'):
                continue
            d = year_of(g('date'))
            if not d:
                if report is not None:
                    report.append({'skip': 'no date', 'cell': plain(g('date'))[:60]})
                continue
            out.append({'year': d[0], 'month': d[1], 'day': d[2], 'dateQuote': d[3][:120], 'article': article_of(g('event'), g('comments'), exists),
                        'toll': (toll_of(g('deaths')) * (1.0 if re.search(r'million|billion', g('deaths'), re.I) else unit)) if g('deaths') else 0.0,
                        'location': plain(g('location') or '')[:80], 'event': plain(g('event') or '')[:80]})
    return out
