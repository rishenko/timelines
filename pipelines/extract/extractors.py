"""
Extractors, in order of precision. Each yields candidate dicts for one article:
  {'kind', 'title_suggestion', 'span' (dates.spans item), 'sourceLocation', 'locator', 'quote', 'cluster'}

  infobox  the article's infobox date fields (from the side tables, raw wikitext)
  table    rows of tables and dated bullet lines (timeline and list pages, and any article's lists)
  lead     dated sentences of the lead
  heading  dated section headings
  prose    body sentences with a day or month date (bare years are too noisy for prose)

Every quote is plain text found verbatim in the cleaned page (check_quote), so the locator finds it again.
"""
import re

from dates import clean, spans

# end sections that list sources, not events
BACK_MATTER = {'see also', 'references', 'notes', 'further reading', 'external links', 'bibliography', 'sources', 'citations',
               'footnotes', 'works cited', 'primary sources', 'secondary sources', 'notes and references', 'literature'}
KIND_RANK = {'infobox': 0, 'table': 1, 'lead': 2, 'heading': 3, 'prose': 4}
# infobox fields that date the article's own subject (others, e.g. `year` on a ship, are left out)
EVENT_FIELDS = re.compile(r'^(date|dates|start_?date|end_?date|date_?start|date_?end|signed|effective|year_?start|year_?end|'
                          r'date_?event\d*|established|founded|formation|dissolved|abolished|begin|end|start|finish)$')
SENT = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9"\'(])')
# a full stop after these is not a sentence end: "the U.S. Army", "Gen. Allenby", "St. Petersburg", "J. Smith"
ABBREV = re.compile(r'(?:\b(?:[A-Z]\.){1,3}|\b(?:Geo|Vict|Edw|Will|Wm|Eliz|Hen|Car|Jac|Mr|Mrs|Ms|Dr|St|Ste|Mt|Ft|Gen|Col|Lt|Capt|Cmdr|Maj|Adm|Sgt|Cpl|Pvt|Gov|Sen|Rep|'
                    r'Rev|Hon|Pres|Prof|Sr|Jr|No|Nos|Vol|vs|etc|approx|ca|cf|Co|Corp|Inc|Ltd|Bros|Jan|Feb|Mar|Apr|Jun|Jul|'
                    r'Aug|Sep|Sept|Oct|Nov|Dec|e\.g|i\.e|op|cit|ibid|pp|p|fl|r|d|b|c)\.)$')


def sentences(text):
    """Sentences of plain text, not split after abbreviations or initials."""
    out = []
    for part in SENT.split(text):
        if out and ABBREV.search(out[-1]):
            out[-1] += ' ' + part
        else:
            out.append(part)
    return out
HEADING = re.compile(r'^(={2,6})\s*(.+?)\s*\1\s*$', re.M)
LINK1 = re.compile(r'\[\[([^\]|#]+)')
ATTRS = re.compile(r'^\s*(?:[a-z-]+\s*=\s*(?:"[^"]*"|\S+)\s*)+\|(?!\|)', re.I)  # cell attributes: align="right"|
MONTH_WORD = re.compile(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b')
WORDS = re.compile(r'[A-Za-z]{3,}.*[A-Za-z]{3,}')  # an event cell has words, not just numbers


def _strip_templates(text):
    """Remove templates (infoboxes, navboxes, citations) but keep date templates' text via clean() later."""
    prev = None
    while prev != text:
        prev = text
        text = re.sub(r'\{\{(?!\s*(?:start date|end date|start and end dates|oldstyledate|circa|c\.|snd|ndash|mdash|nowrap)\b)[^{}]*\}\}',
                      '', text, flags=re.I)
    text = re.sub(r'\{\|.*?\|\}', '', text, flags=re.S)  # tables (read by the table extractor)
    text = re.sub(r'<gallery[^>]*>.*?</gallery>', '', text, flags=re.S | re.I)  # image galleries: file names and captions
    return text


def _dated(sp, need_month):
    return [s for s in sp if not need_month or s['precision'] in ('day', 'month') or s['start'][0] < 0]


def infobox(fields):
    for box_no, box_type, field, raw in fields:
        if not EVENT_FIELDS.match(field):
            continue
        text = clean(raw)
        for s in spans(raw, year_hint=field.startswith('year')):
            yield {'kind': 'infobox', 'span': s, 'quote': text,
                   'sourceLocation': f'infobox {field}: {text[:160]}',
                   'locator': {'kind': 'infobox', 'field': field, 'value': text[:300]}}


def _sections(text):
    """[(heading or '', body)] with the lead first."""
    out, last, head = [], 0, ''
    for m in HEADING.finditer(text):
        out.append((head, text[last:m.start()]))
        head, last = clean(m.group(2)), m.end()
    out.append((head, text[last:]))
    return out


def lead_and_prose(text):
    body = _strip_templates(text)
    body = re.sub(r'\[\[(?:File|Image|Category)\s*:[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]', '', body, flags=re.I)
    for i, (head, sec) in enumerate(_sections(body)):
        if head.lower() in BACK_MATTER:
            continue
        plain = clean(sec)
        for sent in sentences(plain):
            if len(sent) < 20 or len(sent) > 600:
                continue
            sp = _dated(spans(sent), need_month=(i > 0))
            for s in sp:
                if i == 0:
                    yield {'kind': 'lead', 'span': s, 'quote': sent, 'sourceLocation': f'lead: "{sent[:160]}"',
                           'locator': {'kind': 'lead', 'quote': sent}}
                else:
                    yield {'kind': 'prose', 'span': s, 'quote': sent, 'sourceLocation': f'{head}: "{sent[:160]}"',
                           'locator': {'kind': 'section', 'heading': head, 'quote': sent}}
        if i > 0:
            for s in spans(head):
                yield {'kind': 'heading', 'span': s, 'quote': head, 'sourceLocation': f'section "{head}"',
                       'locator': {'kind': 'section', 'heading': head}}


def heading_year(head):
    """The year a heading dates its section by: "1915", "January 1919"; None for anything else ("Post-1920")."""
    if re.fullmatch(r'\s*\d{3,4}\s*', head):
        return head.strip()
    sp = spans(head)
    if len(head.split()) <= 3 and len(sp) == 1 and not sp[0]['end'] and sp[0]['precision'] in ('month', 'year'):
        return str(sp[0]['start'][0])
    return None


def tables_and_lists(text):
    """Dated rows: wikitable rows whose first cells hold a date, and bullet lines that start with one.
    - A row's date without a year ("January 2") takes the year of its section heading ("== 1915 ==", "=== January 1919
      ==="), carried into the subsections below it until a heading that isn't a date.
    - A dated bullet with nothing after it ("*21 January:") dates the deeper bullets under it ("**Soloheadbeg ambush: …")."""
    year = None
    for head, sec in _sections(text):
        if head.lower() in BACK_MATTER:
            continue  # bibliographies: "Coogan, Tim Pat (2001). 1916: The Easter Rising" is a book, not an event
        if head:
            year = heading_year(head)

        def dated(cell):
            sp = spans(cell)
            if not sp and year and MONTH_WORD.search(clean(cell)):
                # "12 August" + " 1922"; "August 24 – 26" + ", 1914" (US order needs the comma): keep the more precise
                tries = [spans(f'{clean(cell)} {year}'), spans(f'{clean(cell)}, {year}')]
                rank = lambda t: (bool(t), t and t[0]['precision'] == 'day', t and bool(t[0]['end']))
                sp = max(tries, key=rank)
                for x in sp:
                    x['year_from_heading'] = True
            return sp

        # bullet lines: "* 28 June 1914: Assassination of …", "* 1848 – …", or "*21 January:" then "**…"
        pending = None  # (depth, spans) of a dated bullet whose events are the deeper bullets under it
        for line in sec.split('\n'):
            b = re.match(r'^(\*+)\s*(.*)$', line)
            if not b:
                if line.strip():
                    pending = None
                continue
            depth, body = len(b.group(1)), b.group(2)
            plain = clean(body)
            link = next((x for x in LINK1.finditer(body) if not spans(x.group(1))), None)  # the row's subject
            m = re.match(r'(.{3,60}?)\s*(?::|–|—|-)\s*(.*)$', plain)
            sp = dated(m.group(1)) if m else []
            if sp and len(m.group(2)) >= 8:
                pending = None
                yield from _row(sp, m.group(2), plain, head, link)
            elif sp:
                pending = (depth, sp)
            elif pending and depth > pending[0] and len(plain) >= 8:
                yield from _row(pending[1], plain, plain, head, link)
            else:
                pending = None
        # tables: |- rows, cells split by || or newline |
        for tbl in re.findall(r'\{\|.*?\|\}', sec, re.S):
            for row in re.split(r'\n\|-[^\n]*', tbl)[1:]:
                cells = [c for c in re.split(r'\n[|!]|\|\||!!', '\n' + row.strip()) if c.strip()]
                cells = [ATTRS.sub('', c).strip() for c in cells]
                if len(cells) < 2:
                    continue
                sp = dated(cells[0]) or (dated(cells[1]) if len(cells) > 2 else [])
                if not sp:
                    continue
                texts = [c for c in cells[1:] if not spans(c) and WORDS.search(clean(c))]
                event_cell = max(texts, key=lambda c: len(clean(c))) if texts else None  # the longest text cell
                if event_cell is None:
                    continue  # numbers only (casualty and strength tables)
                plain = ' | '.join(clean(c) for c in cells if clean(c))
                yield from _row(sp, clean(event_cell), plain, head, LINK1.search(event_cell))


def short_title(text):
    """A row's lead phrase, for a title (and the classifier, which reads titles best): up to the first full stop,
    semicolon or dash after 25 characters; else the whole words within 90. Commas don't end it: "Republican officer
    Tom Barry, who had escaped, was recaptured" would lose its verb."""
    m = re.search(r'^(.{25,90}?)(?:\. |; | – | — )', text)
    t = m.group(1) if m else (text if len(text) <= 90 else text[:90].rsplit(' ', 1)[0])
    return t.rstrip(' .,;:')


def _row(sp, event_text, plain, head, link):
    """A dated row; its quote is the event's own text (found verbatim in the page), the location shows the whole row.
    A row whose text is only a name ("Ulster Volunteers", an organisation) is no event: at least three words, one of
    them lowercase."""
    words = event_text.split()
    if len(words) < 3 or not any(w[:1].islower() for w in words):
        return
    for s in sp[:1]:
        yield {'kind': 'table', 'span': s, 'quote': event_text[:300], 'title_suggestion': short_title(event_text),
               'sourceLocation': f'{head or "list"}: {plain[:160]}',
               'locator': {'kind': 'section', 'heading': head or '', 'quote': event_text[:300]},
               'cluster': link.group(1).strip() if link else None}


def plain_texts(text):
    """The cleaned page, as the table extractor and the prose extractors see it (check_quote looks in both)."""
    return clean(text), clean(_strip_templates(text))


def check_quote(cand, plains):
    """Infobox values come from the field table; every other quote occurs verbatim in the cleaned page."""
    if cand['kind'] == 'infobox':
        return True
    q = cand['locator'].get('quote') or cand['locator'].get('heading') or ''
    return any(q[:120] in p for p in plains)
