#!/usr/bin/env python3
"""Connections claims (2026-11-22, Education session): Cold War bloc memberships + a 3-row pilot of theme rows
(ideas, religions, movements). modern-states/blocs.py builds the bloc rows from this file; the theme rows wait for
schema v5 (Track.kind).

Inputs: pipelines/out/connections-cache/ (fetch.py, from the Wikipedia dump), claims_data.py (hand claims), and
        Modern States at MS_REV (read with git show) to map member names to rows and phases. The mapping is pinned to
        that commit so the claims don't depend on the rows they produce; pass a path to map against another file.
Outputs: connections-claims.json here (committed), pipelines/out/connections-report.txt (counts, unmapped names,
         checks). Exits 1 on any problem.

Every quote must be a verbatim substring of the cached page: its plain text (mwparserfromhell strip_code) or its
wikitext with markup stripped. Infobox claims check the raw field. Table/list memberships (NATO, NAM) are parsed
from the wikitext, so a later dump that changes a row changes the claim; diff the JSON to review.
Pages with an AI-generated-text flag are refused (fetch.py records the flag).

Run from the repo root, after fetch.py:
    pipelines/.venv/bin/python -I pipelines/modern-states/connections/build_claims.py [modern-states.json]
"""
import json, re, sys, pathlib
import subprocess
HERE = pathlib.Path(__file__).resolve().parent
PIPELINES = HERE.parent.parent
REPO = PIPELINES.parent
import mwparserfromhell as mw

CACHE = PIPELINES / 'out' / 'connections-cache'
MS_REV = '77c8375'  # main when the claims were first built (2026-11-22), before the bloc rows existed
PAGES = json.loads((CACHE / 'pages.json').read_text(encoding='utf-8'))
for _k, _v in list(PAGES['pages'].items()): PAGES['pages'].setdefault(_v['title'], _v)  # index redirect targets too
if len(sys.argv) > 1:
    MS_LABEL = pathlib.Path(sys.argv[1]).name
    DATA = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
else:
    MS_LABEL = f'data-src/modern-states.json at {MS_REV}'
    DATA = json.loads(subprocess.check_output(['git', '-C', str(REPO), 'show', f'{MS_REV}:data-src/modern-states.json']))
ROWS = {t['id']: t for t in DATA['tracks']}
EVENTS = {e['uuid']: e for e in DATA['events']}
PROBLEMS, WARN = [], []

def fname(p): return PAGES['pages'][p]['title'].replace(' ', '_').replace('/', '%2F')
def norm(s): return re.sub(r'\s+', ' ', s).strip()
def wclean(t):
    t = re.sub(r'<ref[^>/]*/>', '', t); t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', t)
    return norm(t.replace("'''", '').replace("''", ''))
_txt, _wiki = {}, {}
def plain(p):
    if p not in _txt: _txt[p] = norm((CACHE / (fname(p) + '.txt')).read_text(encoding='utf-8'))
    return _txt[p]
def wiki(p):
    if p not in _wiki: _wiki[p] = (CACHE / (fname(p) + '.wiki')).read_text(encoding='utf-8')
    return _wiki[p]
def check_quote(q, p, who):
    if PAGES['pages'][p]['aiFlagged']: PROBLEMS.append(f'AI-FLAGGED PAGE {p} ({who})'); return
    if norm(q) in plain(p): return 'text'
    if norm(q) in wclean(wiki(p)): return 'wikitext'
    PROBLEMS.append(f'QUOTE NOT FOUND {who} | {p} | {q[:90]}')
def infobox_field(p, field):
    for t in mw.parse(wiki(p)).filter_templates(recursive=False):
        if str(t.name).strip().lower().startswith('infobox') and t.has(field): return str(t.get(field).value).strip()
    PROBLEMS.append(f'NO INFOBOX FIELD {p}:{field}')
    return ''
def url(p): return 'https://en.wikipedia.org/wiki/' + fname(p)

# ---------------------------------------------------------------- name -> row/phase
ALIASES = {}
def alias(name, row, phase=None, before=None): ALIASES.setdefault(name, []).append((row, phase, before))
BYNAME = {}
for t in DATA['tracks']:
    BYNAME.setdefault(t['name'].lower(), (t['id'], None))
    for ph in t.get('phases', []): BYNAME.setdefault(ph['name'].lower(), (t['id'], ph['name']))
def resolve(name, year):
    for row, phase, before in ALIASES.get(name, []):
        if before is None or year < before: return row, phase, 'alias'
    hit = BYNAME.get(name.lower())
    if hit: return hit[0], hit[1], 'name'
    return None, None, None
def phase_for(row, phase, frm, to, who):
    t = ROWS.get(row)
    if not t: PROBLEMS.append(f'NO ROW {row} ({who})'); return phase
    phs = t.get('phases', [])
    if phase:
        ph = next((x for x in phs if x['name'] == phase), None)
        if not ph: PROBLEMS.append(f'NO PHASE {row}/{phase} ({who})'); return phase
    else:
        cover = [x for x in phs if x.get('start', -1e9) <= frm < (x.get('end') or 1e9)]
        if len(cover) > 1: WARN.append(f'AMBIGUOUS PHASE {who}: {row} has {[x["name"] for x in cover]} in {frm}')
        ph = cover[0] if len(cover) == 1 else None
        phase = ph and ph['name']
    if ph and frm < ph.get('start', -1e9):
        WARN.append(f'MEMBERSHIP BEFORE PHASE {who}: {row}/{ph["name"]} starts {ph["start"]}, membership from {frm}')
    return phase

# ---------------------------------------------------------------- claim builders (used by claims_data.py)
ENT, ORDER = {}, []
def ent(id, name, kind, pages):
    ENT[id] = dict(id=id, name=name, suggestedKind=kind, timeline='modern-states', pages=pages, span=[], memberships=[],
                   events=[], existingEvents=[], gaps=[], unmapped=[])
    ORDER.append(id)
def src(p, how, locator):
    return dict(page=PAGES['pages'][p]['title'], url=url(p), dump=PAGES['dump'], checkedIn=how, locator=locator)
def span(id, what, year, date, quote=None, page=None, infobox=None, note=None, optional=False):
    d = dict(what=what, year=year, date=date)
    if infobox:
        p, field = infobox; raw = infobox_field(p, field)
        ys = year if isinstance(year, list) else [year]
        if not all(str(y) in raw for y in ys if isinstance(y, int)): PROBLEMS.append(f'INFOBOX YEAR {id} {p}:{field} = {raw[:80]}')
        d['source'] = src(p, 'infobox', dict(kind='infobox', field=field, value=date or norm(mw.parse(raw).strip_code())))  # the cited day when the field is a date template
    else:
        how = check_quote(quote, page, f'{id} span {what}')
        d['source'] = src(page, how, dict(kind='lead' if how else 'page', quote=quote))
    if note: d['note'] = note
    if optional: d['note'] = (d.get('note', '') + ' Ongoing: cite in ongoingSources (schema v5).').strip()
    ENT[id]['span'].append(d)
def mem(id, member, frm, to, quote, page, toQuote=None, infobox=None, note=None, locator=None):
    who = f'{id}:{member}'
    row, phase, how = resolve(member, frm)
    if not row:
        ENT[id]['unmapped'].append(dict(member=member, **{'from': frm, 'to': to})); return
    phase = phase_for(row, phase, frm, to, who)
    d = {'member': member, 'row': row, 'phaseAtStart': phase, 'from': frm, 'to': to}
    if locator: d['fromSource'] = src(page, 'parsed', locator)
    elif infobox:
        field, name = infobox; raw = infobox_field(page, field)
        if '{{flag|' + name not in raw and '{{flagcountry|' + name not in raw: PROBLEMS.append(f'NOT IN INFOBOX {who}')
        d['fromSource'] = src(page, 'infobox', dict(kind='infobox', field=field, value=name))
    else:
        h = check_quote(quote, page, who); d['fromSource'] = src(page, h, dict(kind='section', heading='', quote=quote))
    if toQuote:
        h = check_quote(toQuote, page, who + ' to'); d['toSource'] = src(page, h, dict(kind='section', heading='', quote=toQuote))
    if note: d['note'] = note
    ENT[id]['memberships'].append(d)
def ev(id, title, year, date, tracks, page, quote, end=None, note=None, phaseNote=None):
    for r in tracks:
        if r != id and r not in ROWS: PROBLEMS.append(f'EVENT TRACK NOT A ROW {id}:{title} -> {r}')
    h = check_quote(quote, page, f'{id} event {title}')
    d = dict(title=title, year=year, end=end, date=date, tracks=tracks, source=src(page, h, dict(kind='section', heading='', quote=quote)))
    dup = [e['uuid'] for e in EVENTS.values() if e['title'].lower() == title.lower()]
    if dup: WARN.append(f'EVENT EXISTS {id}:{title} -> {dup}')
    if note: d['note'] = note
    if phaseNote: d['phaseNote'] = phaseNote
    ENT[id]['events'].append(d)
def link(id, uuid, note):
    e = EVENTS.get(uuid)
    if not e: PROBLEMS.append(f'NO EVENT {uuid}'); return
    ENT[id]['existingEvents'].append(dict(uuid=uuid, title=e['title'], start=e.get('start'), tracks=e['tracks'], note=note))
def gap(id, text): ENT[id]['gaps'].append(text)

exec((HERE / 'claims_data.py').read_text(encoding='utf-8'))

# ---------------------------------------------------------------- parsed memberships
def heading_before(text, pos):
    hs = [m for m in re.finditer(r'^(=+)\s*(.*?)\s*\1\s*$', text[:pos], re.M)]
    return hs[-1].group(2) if hs else ''
def parse_nato():
    p = 'Member states of NATO'; t = wiki(p)
    start = t.index('{{sronly|List of member states of NATO}}'); end = t.index('|}', start)
    for row in t[start:end].split('\n|-')[1:]:
        m = re.search(r'^!\s*(?:scope="row"\s*\|\s*)?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]', row, re.M); d = re.search(r'\{\{dts\|([^}]+)\}\}', row)
        if not m: continue
        name = m.group(2) or m.group(1)
        if not d:
            if name not in NATO_FALLBACK: PROBLEMS.append(f'NATO ROW WITHOUT DATE {name}'); continue
            yr, q = NATO_FALLBACK[name]
            mem('nato', name, yr, None, q, 'NATO', note='Member states of NATO table has no accession cell for this row in this dump; cited from the NATO page.')
            continue
        yr = int(re.search(r'\d{4}', d.group(1)).group())
        loc = dict(kind='section', heading=heading_before(t, start), quote=f'{name} | Accession {d.group(1)}')
        mem('nato', name, yr, None, None, p, locator=loc,
            note='Founding member (treaty signed 4 April 1949; table gives entry into force).' if 'name=found' in row else None)
    gap('nato', 'France left the integrated military command 1966–2009 and Greece 1974–1980; still members, so not modelled as ends. Say if they should be notes or phases.')
def parse_nam():
    p = 'Non-Aligned Movement'; t = wiki(p)
    cur = t.index('=== Current members ==='); obs = t.index('=== Observers ===')
    for m in re.finditer(r'^# (?:\{\{flagdeco\|[^}]*\}\}/)?\{\{flag\|([^}|]+)(?:\|[^}]*)?\}\}\s*\((\d{4})(?:[–-](?:\[\[[^\]|]*\|)?(\d{4})\]?\]?)?\)?', t[cur:obs], re.M):
        name, frm, to = m.group(1), int(m.group(2)), m.group(3) and int(m.group(3))
        pos = cur + m.start()
        loc = dict(kind='section', heading=heading_before(t, pos), quote=norm(m.group(0)))
        mem('non-aligned-movement', name, frm, to, None, p, locator=loc)
    gap('non-aligned-movement', 'Observers and guests left out. SWAPO (a movement, not a state) was a member until 1990; left out.')
parse_nato(); parse_nam()

# ---------------------------------------------------------------- output
out = dict(
    note=('Connections claims (Education session, 2026-11-22). Format-neutral: a later data session turns these into rows '
          'once schema v5 (Track.kind) is approved. Blocs are unions: their members get memberOf entries on the row (phaseAtStart is informational: memberOf is per row, and phases change during a membership); '
          'pilot themes are kind "theme" rows whose events also sit on the state rows they touch. Years only; days in "date". '
          'Every quote is verbatim from the cached page (checkedIn says where); parsed table/list memberships carry the parsed cell.'),
    dump=PAGES['dump'], modernStates=MS_LABEL, entities=[ENT[i] for i in ORDER])
(HERE / 'connections-claims.json').write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8', newline='\n')
lines = [f'Connections claims report ({PAGES["dump"]}; rows from {MS_LABEL})', '']
for i in ORDER:
    e = ENT[i]
    lines.append(f'{e["name"]:<26} kind={e["suggestedKind"]:<6} span={len(e["span"])} memberships={len(e["memberships"])} '
                 f'events={len(e["events"])} existing={len(e["existingEvents"])} unmapped={len(e["unmapped"])}')
lines += ['', 'UNMAPPED (no row/phase found):'] + [f'  {i}: {u["member"]} {u["from"]}–{u["to"] or ""}' for i in ORDER for u in ENT[i]['unmapped']]
lines += ['', 'WARNINGS:'] + ['  ' + w for w in WARN] + ['', f'PROBLEMS ({len(PROBLEMS)}):'] + ['  ' + p for p in PROBLEMS]
(PIPELINES / 'out' / 'connections-report.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8', newline='\n')
print('\n'.join(lines))
sys.exit(1 if PROBLEMS else 0)
