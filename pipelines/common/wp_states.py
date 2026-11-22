"""
Pull a state's dates and successions out of its Wikipedia article (offline, from the local enwiki dump).

For each article: the infobox (former country, country, or similar) parsed with mwparserfromhell, giving
  - every dated field (life_span, year/date_start/end, event_pre/post, eventN/date_eventN, established_*),
    each as {field, raw, text, years, kind}, so a timeline can cite "infobox year_start" exactly;
  - life_span split into its segments (a state that existed twice: "1815–1848 / 1850–1866");
  - predecessors and successors (p1…, s1…), the links a "phase or row?" decision needs;
  - footnotes ({{efn}}, <ref>) kept as notes on the field they sit in, since they often hold the
    alternative date ("Some historians mark the beginning as 800");
  - disagreements: where the article's own fields give different start or end years;
  - the AI-generated-text flag (pages with it are skipped as sources).

Usage:  python -I pipelines/common/wp_states.py out.json "French First Republic" "Weimar Republic" ...
        python -I pipelines/common/wp_states.py out.json --titles titles.txt
"""
import json
import os
import re
import sys

import mwparserfromhell as mw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # run as a script with -I
import wp_dump  # offline page reader for the local dump (settings.py)

INFOBOX = re.compile(r'^infobox\s+(former country|country|former subdivision|historical era|state|empire|kingdom|political entity|war faction|government|legislature|dynasty|royal house|historical state|.*country.*)$', re.I)
DATED = re.compile(r'^(life_span|year_start|year_end|date_start|date_end|event_start|event_end|event_pre|date_pre|event_post|date_post|event\d+|date_event\d+|established_event\d+|established_date\d+|established|dissolved|date_dissolved)$')
PRED = re.compile(r'^(p\d+|s\d+|predecessor\d*|successor\d*|preceded_by\d*|succeeded_by\d*)$')
MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
YEAR = re.compile(r'(?<![\d/])(\d{1,4})(?:\s*(BCE|BC|CE|AD))?(?![\d])')
DASH = '–—−'

# Templates whose positional args are year, month, day.
YMD_TEMPLATES = {'start date', 'start date and age', 'end date', 'end date and age', 'birth date', 'death date',
                 'start and end dates', 'date', 'dts', 'start-date', 'end-date'}
# Templates that just wrap their first argument.
WRAPPERS = {'nowrap', 'nobr', 'small', 'nobold', 'smaller', 'lang', 'native name', 'avoid wrap', 'plainlist',
            'nobold', 'center', 'sup', 'resize'}
LISTS = {'ubl', 'ubli', 'unbulleted list', 'ubc', 'plainlist', 'flatlist', 'hlist', 'bulleted list', 'pli'}
DASH_TEMPLATES = {'snd': ' – ', 'ndash': '–', 'spaced ndash': ' – ', 'mdash': '—', 'spaced en dash': ' – ', 'en dash': '–', 'nbsp': ' ', '-': '–'}
CIRCA = {'circa', 'c.', 'ca', 'c', 'ca.'}
NOTES = {'efn', 'efn-ua', 'efn-lr', 'refn', 'sfn', 'r', 'ref', 'notetag', 'cref', 'nb'}
AGE = {'age', 'age in years', 'age in years and days', 'age in years, months and days', 'age in years and months',
       'age in years, months, weeks and days', 'years ago', 'ayts'}


def tname(t):
    return str(t.name).strip().lower().replace('_', ' ')


def plain(node, notes):
    """Wikitext → readable text. Collects footnote text into `notes`; rewrites date and list templates."""
    code = node if isinstance(node, mw.wikicode.Wikicode) else mw.parse(str(node))
    out = []
    for n in code.nodes:
        if isinstance(n, mw.nodes.Template):
            name = tname(n)
            args = [str(p.value) for p in n.params if not p.showkey]
            if name in NOTES:
                body = ' '.join(plain(p.value, notes) for p in n.params if not str(p.name).strip() in ('name', 'group'))
                if body.strip():
                    notes.append(body.strip())
                continue
            if name in AGE:
                continue
            if name in CIRCA:
                out.append('c. ' + (plain(mw.parse(args[0]), notes) if args else ''))
                continue
            if name in DASH_TEMPLATES:
                out.append(DASH_TEMPLATES[name])
                continue
            if name in YMD_TEMPLATES:
                nums = [a.strip() for a in args if re.fullmatch(r'\s*-?\d+\s*', a)]
                if name == 'start and end dates' and len(nums) >= 4:
                    out.append(f'{nums[0]} – {nums[3]}')
                elif nums:
                    out.append(nums[0] if len(nums) == 1 else ' '.join(reversed(nums[:3])) if False else _ymd(nums))
                continue
            if name in LISTS:
                out.append(' / '.join(plain(mw.parse(a), notes).strip() for a in args if a.strip()))
                continue
            if name in WRAPPERS or name.startswith('lang-'):
                if args:
                    out.append(plain(mw.parse(args[-1] if name in ('lang', 'native name') else args[0]), notes))
                continue
            if name in ('present',):
                out.append('present')
                continue
            # unknown template: keep its first positional arg if it looks like text
            if args and len(args[0]) < 80:
                out.append(plain(mw.parse(args[0]), notes))
            continue
        if isinstance(n, mw.nodes.Tag):
            tag = str(n.tag).lower()
            if tag == 'ref':
                if n.contents and str(n.contents).strip():
                    notes.append(plain(n.contents, []).strip())
                continue
            if tag == 'br':
                out.append(' / ')
                continue
            if tag in ('sup', 'small', 'span', 'div', 'abbr', 'b', 'i', 'li', 'ul', 'p'):
                if tag == 'li':
                    out.append(' / ')
                if n.contents:
                    out.append(plain(n.contents, notes))
                continue
            continue
        if isinstance(n, mw.nodes.Wikilink):
            out.append(plain(n.text, notes) if n.text else str(n.title).split('#')[0])
            continue
        if isinstance(n, mw.nodes.ExternalLink):
            out.append(plain(n.title, notes) if n.title else '')
            continue
        if isinstance(n, mw.nodes.Comment):
            continue
        if isinstance(n, mw.nodes.HTMLEntity):
            out.append(n.normalize())
            continue
        out.append(str(n))
    s = ''.join(out)
    s = re.sub(r"'{2,}", '', s)
    s = re.sub(r'^\s*\*\s*', ' / ', s, flags=re.M)  # plain bullet lines
    s = re.sub(r'\s+', ' ', s).strip(' /')
    return s


def _ymd(nums):
    y = nums[0]
    if len(nums) >= 3:
        months = MONTHS.split('|')
        m = int(nums[1])
        return f'{int(nums[2])} {months[m - 1]} {y}' if 1 <= m <= 12 else y
    if len(nums) == 2:
        m = int(nums[1])
        return f'{MONTHS.split("|")[m - 1]} {y}' if 1 <= m <= 12 else y
    return y


def years_in(text):
    """Years in a date text, signed (BCE negative as written, not converted), plus what kind of value it is."""
    t = text.replace('&nbsp;', ' ')
    kind = []
    if re.search(r'\bc\.\s|\bcirca\b|\bca\.\s', t):
        kind.append('circa')
    if re.search(r'\bpresent\b|\btoday\b', t, re.I):
        kind.append('present')
    if re.search(r'\d\s*/\s*\d', t):
        kind.append('alternatives')
    ys = []
    for m in YEAR.finditer(t):
        n = int(m.group(1))
        era = (m.group(2) or '').upper()
        # skip day-of-month numbers: a number directly before a month name
        after = t[m.end():m.end() + 12]
        if re.match(r'\s*(' + MONTHS + ')', after) and n <= 31:
            continue
        if n < 100 and not era and not re.search(r'\b(BC|BCE|AD|CE)\b', t):
            # two-digit numbers without an era are almost always days or footnote numbers
            continue
        ys.append(-n if era in ('BC', 'BCE') else n)
    # an era written once at the end ("1300–1200 BC") applies to every year in the text
    if re.search(r'\b(BC|BCE)\b', t) and ys and all(y > 0 for y in ys[:-1]) and ys[-1] < 0:
        ys = [-abs(y) for y in ys]
    if any(d in t for d in DASH) or ' to ' in t:
        kind.append('range')
    return ys, kind


def segments(life_span_text):
    """'1815–1848 / 1850–1866' → [(1815, 1848), (1850, 1866)]; 'present' → None as end."""
    segs = []
    # segments are separated by line breaks or list items (rendered " / "); "800/962" (no spaces) is one
    # segment whose start has alternatives
    for part in re.split(r'\s+/\s+', life_span_text):
        ys, kind = years_in(part)
        if not ys:
            continue
        end = None if 'present' in kind else ys[-1]
        seg = {'text': part.strip(), 'start': ys[0], 'end': end, 'kind': kind}
        lab = re.match(r'[^:]*\d\s*:\s*(\S.*)$', part)
        if lab:
            # "1958–1961: United Arab Republic": a labelled stretch, usually an interruption by another state
            seg['label'] = lab.group(1).strip()
        alt = re.match(r'\D*(\d{1,4})\s*/\s*(\d{1,4})', part)
        if alt:
            seg['start_alternatives'] = [int(alt.group(1)), int(alt.group(2))]
            seg['start'] = int(alt.group(2)) if len(ys) > 2 else seg['start']
        if seg['end'] is not None and seg['end'] == seg['start'] and len(ys) == 1 and 'range' not in kind:
            pass
        segs.append(seg)
    return segs


INLINE_OK = YMD_TEMPLATES | WRAPPERS | LISTS | set(DASH_TEMPLATES) | CIRCA | {'present', 'convert', 'cvt', 'lang', 'transl', 'ill', 'interlanguage link'}
HEADING_YEARS = re.compile(r'(\d{3,4})(?:\s*(?:BCE|BC|CE|AD))?\s*(?:[–—−-]|\bto\b)\s*(\d{2,4}|present)', re.I)


def _prose(code):
    """A section's prose: block templates (infoboxes, sidebars, hatnotes), files, tables and footnotes removed."""
    c = mw.parse(str(code))
    for t in c.filter_templates(recursive=False):
        if tname(t) not in INLINE_OK and not tname(t).startswith('lang-'):
            try:
                c.remove(t)
            except ValueError:
                pass
    for l in c.filter_wikilinks(recursive=False):
        if re.match(r'\s*(file|image|category):', str(l.title), re.I):
            try:
                c.remove(l)
            except ValueError:
                pass
    txt = re.sub(r'\{\|.*?\|\}', ' ', str(c), flags=re.S)  # tables
    return plain(mw.parse(txt), [])


def sentences(text):
    return [x.strip() for x in re.split(r'(?<=[.!?])\s+(?=[A-Z\[])', text) if x.strip()]


def body(code, max_lead=12):
    """Section headings (with any year range in them) and dated sentences: the lead, and each section's first dated one."""
    secs = code.get_sections(include_lead=True, flat=True)
    out = {'lead': [], 'headings': [], 'section_openers': []}
    if not secs:
        return out
    lead = secs[0]
    for sent in sentences(_prose(lead))[:60]:
        ys, _ = years_in(sent)
        if ys:
            out['lead'].append({'text': sent[:400], 'years': ys})
        if len(out['lead']) >= max_lead:
            break
    path = []
    for sec in secs[1:]:
        hs = sec.filter_headings(recursive=False)
        if not hs:
            continue
        h = hs[0]
        title = plain(h.title, []).strip()
        if title.lower() in ('see also', 'references', 'notes', 'further reading', 'external links', 'bibliography',
                             'sources', 'citations', 'footnotes', 'explanatory notes', 'works cited', 'general and cited sources'):
            continue
        lvl = h.level
        path = [p for p in path if p[0] < lvl] + [(lvl, title)]
        m = HEADING_YEARS.search(title)
        rng = None
        if m:
            a, b = m.group(1), m.group(2)
            if b.isdigit() and len(b) < len(a):  # "1815–71" -> 1871
                b = a[:len(a) - len(b)] + b
            rng = [int(a), 'present' if not b.isdigit() else int(b)]
        else:
            since = re.search(r'\b(?:since|from)\s+(\d{3,4})\b', title, re.I)
            if since:
                rng = [int(since.group(1)), 'present']
        ys, _ = years_in(title)
        out['headings'].append({'level': lvl, 'title': title, 'path': ' > '.join(t for _, t in path),
                                **({'range': rng} if rng else {}), **({'years': ys} if ys else {})})
        prose = _prose(mw.parse(str(sec).split('\n', 1)[1] if '\n' in str(sec) else ''))
        # only the section's own text, before its first subsection
        prose = prose.split('==')[0]
        for sent in sentences(prose)[:8]:
            ys, _ = years_in(sent)
            if ys:
                out['section_openers'].append({'section': ' > '.join(t for _, t in path), 'text': sent[:300], 'years': ys})
                break
    return out


def find_infobox(code):
    for t in code.filter_templates(recursive=True):
        if INFOBOX.match(tname(t)):
            return t
    return None


def extract(title):
    p = wp_dump.page(title)
    if not p:
        return {'title': title, 'missing': True}
    text = p['text']
    out = {'title': p['title'], 'asked': title, 'redirect_from': p.get('redirect_from'),
           'ai_flagged': wp_dump.ai_flagged(text)}
    code = mw.parse(text)
    out['body'] = body(code)
    box = find_infobox(code)
    if not box:
        out['infobox'] = None
        return out
    out['infobox'] = tname(box)
    fields, links = {}, {}
    for prm in box.params:
        key = str(prm.name).strip()
        if not str(prm.value).strip():
            continue
        if DATED.match(key):
            notes = []
            txt = plain(prm.value, notes)
            ys, kind = years_in(txt)
            fields[key] = {'raw': str(prm.value).strip()[:400], 'text': txt, 'years': ys, 'kind': kind,
                           **({'notes': notes} if notes else {})}
        elif PRED.match(key):
            # the article it names: the first wikilink's target, else the plain text (former-country infoboxes
            # take a bare article title in p1/s1)
            # "Target{{!}}label" is a piped link written for the infobox; the target is the part before {{!}}
            raw = str(prm.value).split('{{!}}')[0]
            wl = [l for l in mw.parse(raw).filter_wikilinks() if not re.match(r'\s*(file|image):', str(l.title), re.I)]
            name = str(wl[0].title) if wl else plain(mw.parse(raw), [])
            links[key] = re.sub(r'\s+', ' ', name.replace('&nbsp;', ' ').split('#')[0]).strip()
        elif key in ('conventional_long_name', 'common_name', 'native_name'):
            out[key] = plain(prm.value, [])
    out['fields'] = fields
    out['predecessors'] = [v for k, v in sorted(links.items()) if re.match(r'^(p\d+|predecessor|preceded)', k)]
    out['successors'] = [v for k, v in sorted(links.items()) if re.match(r'^(s\d+|successor|succeeded)', k)]

    # events: pair eventN with date_eventN (and established_eventN with established_dateN)
    events = []
    for k, v in fields.items():
        m = re.fullmatch(r'(established_)?event(\d+)', k)
        if m:
            dk = f'{m.group(1) or ""}date{"" if m.group(1) else "_event"}{m.group(2)}'
            if m.group(1):
                dk = f'established_date{m.group(2)}'
            d = fields.get(dk)
            events.append({'field': k, 'event': v['text'], 'date': d['text'] if d else None, 'years': d['years'] if d else []})
    out['events'] = events

    # start and end candidates, each with the field it came from
    def yr(k, pos):
        f = fields.get(k)
        return f['years'][pos] if f and f['years'] else None
    starts, ends = [], []
    ls = fields.get('life_span')
    if ls:
        out['life_span_segments'] = segments(ls['text'])
        if out['life_span_segments']:
            first = out['life_span_segments'][0]
            for y in first.get('start_alternatives', [first['start']]):
                starts.append(('life_span', y))
            e = out['life_span_segments'][-1]['end']
            ends.append(('life_span', 'present' if e is None else e))
    for k in ('year_start', 'date_start'):
        y = yr(k, 0)
        if y is not None:
            starts.append((k, y))
    for k in ('year_end', 'date_end'):
        y = yr(k, -1)
        if y is not None:
            ends.append((k, y))
    for k in ('established_date1',):
        y = yr(k, 0)
        if y is not None:
            starts.append((k, y))
    if yr('date_post', 0) is not None:
        ends.append(('date_post (' + fields['event_post']['text'][:40] + ')' if 'event_post' in fields else 'date_post', yr('date_post', 0)))
    if yr('date_pre', 0) is not None:
        starts.append(('date_pre (' + fields['event_pre']['text'][:40] + ')' if 'event_pre' in fields else 'date_pre', yr('date_pre', 0)))
    out['start_candidates'] = starts
    out['end_candidates'] = ends
    core_s = {y for k, y in starts if not k.startswith('date_pre')}
    core_e = {y for k, y in ends if not k.startswith('date_post')}
    out['disagreements'] = {
        **({'start': sorted(core_s)} if len(core_s) > 1 else {}),
        **({'end': sorted(map(str, core_e))} if len(core_e) > 1 else {}),
        **({'notes': [n for f in fields.values() for n in f.get('notes', [])]} if any(f.get('notes') for f in fields.values()) else {}),
    }
    return out


def main():
    args = sys.argv[1:]
    dest = args.pop(0)
    if args and args[0] == '--titles':
        titles = [l.strip() for l in open(args[1]) if l.strip() and not l.startswith('#')]
    else:
        titles = args
    res = [extract(t) for t in titles]
    json.dump(res, open(dest, 'w'), indent=1, ensure_ascii=False)
    for r in res:
        if r.get('missing'):
            print(f'MISSING  {r["title"]}')
            continue
        flag = ' AI-FLAGGED' if r['ai_flagged'] else ''
        s = ', '.join(f'{y}' for _, y in r.get('start_candidates', [])[:4])
        e = ', '.join(f'{y}' for _, y in r.get('end_candidates', [])[:4])
        dis = r.get('disagreements', {})
        print(f'{r["title"][:44]:44} [{r.get("infobox")}]{flag} start {s or "-"} | end {e or "-"}'
              + (f' | DISAGREE {dict((k, v) for k, v in dis.items() if k != "notes")}' if set(dis) - {'notes'} else '')
              + (f' | segs {[(x["start"], x["end"]) for x in r.get("life_span_segments", [])]}' if len(r.get('life_span_segments', [])) > 1 else ''))


if __name__ == '__main__':
    main()
