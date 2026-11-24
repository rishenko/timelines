"""
Conflicts harvest (v2 kind 'conflict', pilot; Kevin 2026-11-23): battles as events, ranked by main combatant, then inlinks.

    pipelines/extract/.venv/bin/python -I pipelines/v2/harvest/conflicts.py [--data DIR]

For each pilot country (pilot-conflicts.json) the candidates are the members of its 'Battles involving ...' categories. Each
article is read from the dump (an AI-flagged page is refused); from its military-conflict infobox:
  - combatants: the first entry (a link or a flag template) of each combatant column: who fought, in the infobox's order;
  - main: the country (any of its 'titles') is the first entry of a column, so it is a main combatant of that battle;
  - dates: the infobox's date field and the lead's first dated sentence, each with its verbatim quote (the quote gate of the
    disasters harvest, whose helpers this module reuses); Wikidata's year only corroborates;
  - rank: (main combatant, inlinks): inlinks are the articles that link to the battle, from the extract DB.
Selection is config, not code: rules/conflicts.json says how many picks per country and timeline ('per_timeline'); the picks
are written, the rest are counted in the manifest (and listed in the review file with the cut line). The named wars of the
pilot ('wars') are multi-region: no country rows, they go to the top-level Wars row.
Writes $TIMELINES_DATA/v2/candidates/conflict.jsonl and conflict.manifest.json. Nothing here touches data-src.
"""
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE]
import disasters as D  # noqa: E402  (its helpers: infoboxes, date_claims, lead sentences; its main() is not run)
import mwparserfromhell as mw  # noqa: E402
import settings  # noqa: E402
import wp_dump  # noqa: E402
from wd_join import WD  # noqa: E402

ADAPTER = 'conflicts@1'
# a year in a lead sentence: four digits (1000-2099), or one to three digits beside AD, CE, BC or BCE; a bare 500 is a count of fighters
YEAR = re.compile(r'\b(1[0-9]{3}|20[0-9]{2})\b|\b[1-9][0-9]{0,2}\s*(?:AD|CE|BC|BCE)\b|\b(?:AD|CE)\s*[1-9][0-9]{0,2}\b')
V2 = os.path.normpath(os.path.join(HERE, '..'))


def strip_ref(s):
    return D.REF.sub('', s)


def entries(raw):
    """The country-like entries of one combatant column, in document order, inside list templates too: wikilink targets and the
    country of flag templates ({{flag|France}}, {{flagicon|France}}), without duplicates, files and flag-image templates."""
    code = mw.parse(strip_ref(raw))
    out = []
    for node in code.filter(recursive=True, forcetype=(mw.nodes.Wikilink, mw.nodes.Template)):
        if isinstance(node, mw.nodes.Wikilink):
            t = str(node.title).split('#')[0].strip()
            if t and not t.lower().startswith(('file:', 'image:', 'category:')):
                out.append(t)
        else:
            n = str(node.name).strip().lower()
            if n.startswith('flag') and 'image' not in n and node.params:
                v = str(node.params[0].value).strip()
                if v and not re.search(r'\.(png|svg|jpe?g|gif)\b', v, re.I):
                    out.append(v)
    return list(dict.fromkeys(out))[:40]


YR = r'(1[0-9]{3}|20[0-9]{2})'


def qualifiers(raw, later=False):
    """{entry: {'from': year, 'until': year, 'quote': text}} for the entries of one combatant column that carry a dated note in the
    infobox itself: "(from 1915)", "(until 1917)", "(1916–1918)", also inside {{nwr|...}}; plus the column header's own limit
    ("prior to 1635" ends every entry of the column, "after 1635" starts it) unless the entry has its own."""
    code = mw.parse(strip_ref(raw))
    out, last = {}, None
    for node in code.ifilter(recursive=True):
        if isinstance(node, mw.nodes.Wikilink):
            t = str(node.title).split('#')[0].strip()
            if t and not t.lower().startswith(('file:', 'image:', 'category:')):
                last = t
        elif isinstance(node, mw.nodes.Template):
            n = str(node.name).strip().lower()
            if n.startswith('flag') and 'image' not in n and node.params:
                v = str(node.params[0].value).strip()
                if v and not re.search(r'\.(png|svg|jpe?g|gif)\b', v, re.I):
                    last = v
        elif isinstance(node, mw.nodes.Text) and last:
            t = str(node)
            m = re.search(r'\(\s*from\s+' + YR + r'\s*\)', t)
            u = re.search(r'\(\s*(?:until|to)\s+' + YR + r'\s*\)', t)
            r2 = re.search(r'\(\s*' + YR + r'\s*[–-]\s*' + YR + r'\s*\)', t)
            if m or u or r2:
                q = out.setdefault(last, {})
                if m: q['from'] = int(m.group(1))
                if u: q['until'] = int(u.group(1))
                if r2: q['from'], q['until'] = int(r2.group(1)), int(r2.group(2))
                q['quote'] = re.sub(r'\s+', ' ', t).strip()[:80]
    head = re.sub(r"[']{2,3}", '', D.plain(raw))[:140]
    hu = re.search(r'(?:prior to|until|before)\s+' + YR, head)
    hf = re.search(r'(?:after|from)\s+' + YR, head)
    if later and not hf:  # a later alliance ('1a': "after the Peace of Prague (1635)"): its first year starts its entries
        hf = re.search(YR, head)
    for e in entries(raw):
        q = out.setdefault(e, {})
        if hu and 'until' not in q:
            q['until'] = int(hu.group(1)); q.setdefault('quote', head)
        if hf and 'from' not in q:
            q['from'] = int(hf.group(1)); q.setdefault('quote', head)
    return {k: v for k, v in out.items() if 'from' in v or 'until' in v}


def first_entry(raw):
    e = entries(raw)
    return e[0] if e else None


END_WORDS = re.compile(r'\b(climax(?:ed)?|culminat\w+|mark(?:s|ed|ing)? the end|ended|concluded|came to an end)\b[^.]{0,40}?\b(?:in|with|by)\b', re.I)


def lead_claims(sent, i, wt, pl, have):
    """Claims from a lead sentence. It only corroborates: a start year is kept only when the infobox gave none or has one within 2 years
    (a background sentence such as "conquered in 1471" must not rival the infobox). A year after "climaxed in"/"culminating in" is an end."""
    cl, why = D.date_claims(sent, f'lead sentence {i + 1}', wt, pl)
    cl = cl[:2]
    if cl and cl[0]['side'] == 'start' and END_WORDS.search(sent):
        cl = [dict(cl[0], side='end')]
    starts = [d['year'] for d in have if d['side'] == 'start']
    return [c for c in cl if c['side'] != 'start' or not starts or any(abs(c['year'] - y) <= 2 for y in starts)]


def combatants(box):
    """{column: [entries]} of an Infobox military conflict. Columns '1', '2', '3' are the sides (the first entry of one is its main combatant); '1a', '2a' are later alliances (participants only)."""
    out = {}
    for prm in box.params:
        m = re.fullmatch(r'combatant(\d)([a-z]?)', str(prm.name).strip().lower())
        if m and str(prm.value).strip():
            e = entries(str(prm.value))
            if e:
                out[m.group(1) + m.group(2)] = e  # '1', '2', and the later alliances ('1a': France after 1635)
    return out


def heading_members(article, sections):
    """Level-3 headings under the named level-2 sections of a member-list article (Allies of World War I: Serbia, Belgium,
    "Italy (1915–1918)"...): {name: {'from', 'until', 'quote', 'article'}}. The quoted date is the heading itself."""
    p = wp_dump.page(article)
    if not p or wp_dump.ai_flagged(p['text']):
        return {}
    text = p['text']
    out = {}
    for sec in sections:
        m = re.search(r'^==\s*' + re.escape(sec) + r'\s*==\s*$(.*?)(?=^==[^=])', text, re.S | re.M)
        for h in re.finditer(r'^===\s*([^=\n]+?)\s*===\s*$', m.group(1) if m else '', re.M):
            raw = h.group(1).strip()
            name = re.sub(r'\s*\([^)]*\)\s*$', '', raw).strip()
            y = re.search(r'\((\d{4})(?:/\d{2,4})?\s*[–-]\s*(\d{4})\)', raw)
            y1 = re.search(r'\((\d{4})\)\s*$', raw)  # "Czechoslovakia (1918)": the one year it took part
            e = out.setdefault(name, {'article': article})
            if (y or y1) and 'from' not in e:
                e.update({'from': int(y.group(1)) if y else int(y1.group(1)), 'until': int(y.group(2)) if y else int(y1.group(1)), 'quote': f'=== {raw} ===', 'locator': f'heading in "{sec}"'})
    return out


MONTHS = 'January February March April May June July August September October November December'.split()


def dated_list_members(article, section):
    """A dated bullet list of states ("Timeline of Allied states entering the war": "* Poland: 1 September 1939"): {name: {'from', 'quote', ...}}.
    Top-level bullets only (colonies sit one level down). The quote is the line as plain text."""
    p = wp_dump.page(article)
    if not p or wp_dump.ai_flagged(p['text']):
        return {}
    m = re.search(r'^==\s*' + re.escape(section) + r'\s*==\s*$(.*?)(?=^==[^=])', p['text'], re.S | re.M)
    out = {}
    for line in (m.group(1) if m else '').split('\n'):
        if not line.startswith('* '):
            continue
        d = re.search(r'\b(\d{1,2}\s+(?:' + '|'.join(MONTHS) + r')\s+(\d{4}))', line)
        bare = re.sub(r'\{\{[^{}]*\}\}', '', line[2:])
        link = re.findall(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]', bare)
        if not d:
            continue
        name = (link[0][0] if link else bare.split(':')[0]).strip()
        if not name:
            continue
        if name not in out:
            q = D.plain(re.sub(r'<ref.*?(?:</ref>|/>)', '', line[2:], flags=re.S)).strip()
            out[name] = {'article': article, 'from': int(d.group(2)), 'quote': q[:300], 'locator': f'list "{section}"'}
    return out


ENTRY = re.compile(r'(?:(?:signed|adhered? to|acceded to|joined) the (?:Tripartite Pact|Axis)|joined (?:in )?the (?:German-led )?invasion|declared war|declaration of war)', re.I)
MONTH_RE = '|'.join(MONTHS)


WAR_ENTRY = re.compile(r'joined (?:in )?the (?:German-led )?invasion|declared war|declaration of war', re.I)


def entry_sentence(section_text, name=None):
    """The state's own entry into the war, from its section of an Axis/Allies article. A sentence that says the state joined the
    invasion or declared war (and gives a year close after that phrase, a day and month if it has them) is its war entry; only when there is none
    does the Tripartite Pact signing stand in. With a name, the name must come before the verb: "the United Kingdom declared war on Finland"
    is not Finland's entry. Returns {'from': year, 'quote': sentence, 'kind': 'war'|'pact'} or None. A year far from the verb is not an entry."""
    best = {}
    for sent in re.split(r'(?<=[.!?])\s+', section_text):
        m = ENTRY.search(sent)
        if not m:
            continue
        if name and name.lower() not in sent[:m.start()].lower() and not re.match(r'\s*(?:It|Its)\b', sent):
            continue
        y = re.search(r'\b(19[34]\d)\b', sent[m.end():m.end() + 140]) or re.search(r'\b(19[34]\d)\b', sent[max(0, m.start() - 60):m.start()])
        if not y or int(y.group(1)) < 1939:
            continue
        kind = 'war' if WAR_ENTRY.search(m.group(0)) else 'pact'
        lo = max(0, m.start() - 90)  # a window on the entry phrase: the sentence may open with image-caption text
        if lo:
            lo = sent.find(' ', lo) + 1 or lo
        k = sent.lower().rfind(name.lower(), 0, m.start()) if name else -1
        if k >= 0:  # start at the subject, not in the middle of a caption
            lo = 0 if (k < 40 and 'thumb|' not in sent[:k]) else k
        q = re.sub(r'\b(?:thumb|left|right|upright|alt=[^|]*)\|', '', sent[lo:]).strip()
        if kind not in best or int(y.group(1)) < best[kind]['from']:
            best[kind] = {'from': int(y.group(1)), 'quote': q[:300], 'kind': kind}
    return best.get('war') or best.get('pact')


def section_texts(article, sections, exclude=()):
    """{heading name: plain text} of the level-3 sections under the named level-2 sections of an article."""
    p = wp_dump.page(article)
    if not p or wp_dump.ai_flagged(p['text']):
        return {}
    out = {}
    for sec in sections:
        m = re.search(r'^==\s*' + re.escape(sec) + r'\s*==\s*$(.*?)(?=^==[^=])', p['text'], re.S | re.M)
        for h in re.finditer(r'^===\s*([^=\n]+?)\s*===\s*$(.*?)(?=^===?[^=]|\Z)', m.group(1) if m else '', re.S | re.M):
            name = re.sub(r'\s*\([^)]*\)\s*$', '', h.group(1)).strip()
            if name not in exclude:
                out[name] = D.plain(h.group(2))
    return out


def table_initiators(article, names, not_before):
    """The first row of a war-declarations table (|date || initiator || target || ...) in which each name is an initiator, on or after not_before
    (an ISO date): {name: {'from', 'quote', ...}}. A name matches its words in the initiator cell, flag templates included (Nazi Germany, Empire of Japan)."""
    p = wp_dump.page(article)
    if not p or wp_dump.ai_flagged(p['text']):
        return {}
    alias = {'Germany': 'Nazi Germany|Germany', 'Italy': 'Fascist Italy|Kingdom of Italy|Italy', 'Japan': 'Empire of Japan|Japan',
             'Hungary': 'Kingdom of Hungary|Hungary', 'Romania': 'Kingdom of Romania|Romania', 'Bulgaria': 'Kingdom of Bulgaria|Bulgaria',
             'Slovakia': 'Slovak Republic|Slovakia'}
    out = {}
    for line in p['text'].split('\n'):
        cells = line.split('||')
        mm = re.match(r'\|\s*(\d{4}-\d{2}-\d{2})\s*$', cells[0])
        if not mm or len(cells) < 3 or mm.group(1) < not_before:
            continue
        iso, ini = mm.group(1), cells[1]
        for n in names:
            if n not in out and re.search(r'(?<![\w])(?:' + alias.get(n, re.escape(n)) + r')(?![\w])', ini):
                ini_t = D.plain(re.sub(r'<br\s*/?>', ', ', ini)).strip() or n
                tgt_t = D.plain(re.sub(r'<br\s*/?>', ', ', cells[2])).strip()
                out[n] = {'article': article, 'from': int(iso[:4]), 'quote': f'{iso}: {ini_t} \u2192 {tgt_t}'[:300], 'locator': 'table "List of war declarations"'}
    return out


def sub_of(title, itype):
    t = title.lower()
    if t.startswith('siege of') or ' siege ' in f' {t} ':
        return 'siege'
    if re.search(r'\bbattle\b', t):
        return 'battle'
    if re.search(r'\b(massacre|genocide)\b', t):
        return 'atrocity'
    if re.search(r'\b(invasion|campaign|conquest|expedition)\b', t):
        return 'invasion'
    if re.search(r'\b(wars?|conflicts?|crusades?|revolution|rebellion|uprising|mutiny|insurgency|resistance|revolts?)\b', t):
        return 'war'
    return 'battle'


def main():
    pilot = json.load(open(os.path.join(V2, 'pilot-conflicts.json')))
    rules = json.load(open(os.path.join(V2, 'rules', 'conflicts.json')))
    out_dir = os.path.join(settings.DATA, 'v2', 'candidates')
    os.makedirs(out_dir, exist_ok=True)
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    wd = WD.open(settings.DATA)

    def qid(title):
        r = db.execute('SELECT q.qid FROM page p JOIN qid q ON q.page_id=p.page_id WHERE p.title=? AND p.ns=0', (title,)).fetchone()
        if not r:
            r = db.execute('SELECT q.qid FROM page p JOIN page t ON t.title=p.redirect_to JOIN qid q ON q.page_id=t.page_id WHERE p.title=? AND p.ns=0', (title,)).fetchone()
        return r[0] if r else None

    def canon(title):
        """The article a title redirects to (or itself), spaces as the dump has them."""
        t = title.replace('_', ' ')
        r = db.execute('SELECT redirect_to FROM page WHERE title=? AND ns=0', (t,)).fetchone()
        return (r[0] if r and r[0] else t)

    idx_path = os.path.join(out_dir, 'conflict-index.jsonl')
    if not os.path.exists(idx_path):
        raise SystemExit('run harvest/conflicts_index.py first (the combatant index)')
    index = [json.loads(l) for l in open(idx_path)]
    index = [r for r in index if 'combatants' in r]
    log, picked, manifest_c = [], {}, {}
    seen = {}
    for ctry in pilot['countries']:
        mine = {canon(t) for t in ctry['titles']} | set(ctry['titles'])
        titles = {}
        for r in index:  # main combatants first: every battle whose infobox lists this country first in a column (any category)
            if {canon(v[0]) for k, v in r['combatants'].items() if v and k.isdigit()} & mine:
                titles[r['title']] = r['inlinks']
        for cat in ctry['cats']:  # then the category's other participants
            for t, n in db.execute('SELECT p.title, COALESCE(i.n, 0) FROM category c JOIN page p ON p.page_id=c.page_id '
                                   'LEFT JOIN inlink i ON i.title=p.title WHERE c.name=? AND p.ns=0 AND p.redirect_to IS NULL', (cat,)):
                titles[t] = n
        recs = []
        for t, n in titles.items():
            if t in seen:
                rec = dict(seen[t])
            else:
                p = wp_dump.page(t)
                if not p:
                    log.append(f'{t}: missing'); continue
                if wp_dump.ai_flagged(p['text']):
                    log.append(f'{t}: AI-flagged, refused'); continue
                code = mw.parse(p['text'])
                wt, pl = D.norm(p['text']), D.norm(D.plain(p['text']))
                boxes = [b for b in D.infoboxes(code) if str(b.name).strip().lower().startswith('infobox military conflict')]
                if not boxes:
                    log.append(f'{t}: no military-conflict infobox'); continue
                box = boxes[0]
                dates, dropped = [], []
                for prm in box.params:
                    k = str(prm.name).strip()
                    raw = str(prm.value).strip()
                    if k.lower() == 'date' and raw:
                        cl, why = D.date_claims(raw, f'infobox {k}', wt, pl)
                        dates += cl
                        if why:
                            dropped.append(f'infobox {k}: {why}')
                for i, sent in enumerate(D.body_sentences(code)[:4]):
                    if YEAR.search(sent):
                        dates += lead_claims(sent, i, wt, pl, dates)
                        break
                comb = combatants(box)
                loc = next((D.plain(str(prm.value)) for prm in box.params if str(prm.name).strip().lower() == 'location'), '')
                q = qid(p['title'])
                if q and wd:
                    for side, lst in wd.dates(q).items():
                        for y, m, d_, prop, cal in lst:
                            dates.append({'side': side, 'year': y if y > 0 else y + 1, 'circa': False, 'from': 'wikidata', 'locator': prop,
                                          **({'month': m} if m else {}), **({'day': d_} if d_ else {})})
                rec = {'qid': q, 'kind': 'conflict', 'sub': sub_of(p['title'], None), 'title': p['title'], 'seed': p['title'],
                       'wp': {'title': p['title'], 'dump': settings.DUMP_NAME}, 'dates': dates,
                       'combatants': {str(k): v for k, v in sorted(comb.items())}, 'inlinks': n, 'location': loc[:160],
                       'measures': {}, 'harvest': {'adapter': ADAPTER, 'at': os.environ.get('HARVEST_DATE', '2026-11-23')},
                       **({'dropped': dropped} if dropped else {})}
                seen[t] = rec
            firsts = {canon(v[0]) for k, v in rec['combatants'].items() if v and k.isdigit()}
            rec = dict(rec, ranked_for=ctry['id'], main=bool(firsts & mine))
            recs.append(rec)
        manifest_c[ctry['id']] = {'pool (main by index + category)': len(titles), 'read': len(recs)}
        picked[ctry['id']] = recs
    # selection: per country and timeline, main combatants first, then inlinks; the rest are counted, with the cut line kept
    windows = rules['windows']
    K_DEFAULT = pilot['per_timeline']
    out, cut = {}, {}
    for cid, recs in picked.items():
        K = next((c.get('per_timeline') for c in pilot['countries'] if c['id'] == cid), None) or K_DEFAULT
        by_tl = {}
        for r in recs:
            ys = [d['year'] for d in r['dates'] if d['side'] == 'start' and d['from'] == 'wikipedia']
            y = (D_year := ys[0]) if ys else None
            if y is None:
                cut.setdefault((cid, 'no quoted date'), []).append(r['title']); continue
            ay = y + 1 if y < 0 else y
            tl = next((t for t, (a, b) in windows.items() if (a is None or ay >= a) and (b is None or ay <= b)), None)
            by_tl.setdefault(tl, []).append(r)
        for tl, rs in by_tl.items():
            allow_war = next((c.get('allow_war') for c in pilot['countries'] if c['id'] == cid), False)  # regional-war countries (SE Asia, Korea, Maya...): their conflicts are titled wars
            rs = [r for r in rs if allow_war or r['sub'] != 'war']  # the pilot ranks battles, sieges and campaigns; wars are the named ones below
            rs.sort(key=lambda r: (not r['main'], -r['inlinks'], r['title']))
            for r in rs[:K]:
                out.setdefault(r['title'], dict(r, countries_ranked=[]))['countries_ranked'].append(cid)
            cut[(cid, tl)] = [(r['title'], r['main'], r['inlinks']) for r in rs[K:K + 4]]
            manifest_c[cid][tl] = {'candidates': len(rs), 'main': sum(1 for r in rs if r['main']), 'kept': min(K, len(rs))}
    # the named wars
    for w in pilot['wars']:
        p = wp_dump.page(w['title'])
        if not p or wp_dump.ai_flagged(p['text']):
            log.append(f"{w['title']}: missing or AI-flagged"); continue
        code = mw.parse(p['text'])
        wt, pl = D.norm(p['text']), D.norm(D.plain(p['text']))
        dates = []
        for box in D.infoboxes(code):
            if str(box.name).strip().lower().startswith('infobox military conflict'):
                for prm in box.params:
                    if str(prm.name).strip().lower() == 'date':
                        dates += D.date_claims(str(prm.value).strip(), 'infobox date', wt, pl)[0]
                comb = combatants(box)
                pdates = {}
                for prm in box.params:
                    mm = re.fullmatch(r'combatant(\d)([a-z]?)', str(prm.name).strip().lower())
                    if mm and str(prm.value).strip():
                        for ent, q in qualifiers(str(prm.value), later=bool(mm.group(2))).items():
                            pdates.setdefault(ent, []).append(dict(q, locator=f'infobox {str(prm.name).strip()}', article=p['title']))
                break
        else:
            comb, pdates = {}, {}
        members = {}
        for src in w.get('members', []):
            if src.get('dated_list'):
                members.update(dated_list_members(src['article'], src['dated_list']))
            elif src.get('initiators_of'):
                texts = section_texts(src['article'], src['sections'], src.get('exclude', []))
                entered, pact = {}, {}
                for n, body in texts.items():  # the state's own war-entry sentence; else the first declarations-table row it initiated; else the pact signing
                    e = entry_sentence(body, n)
                    if e and e['kind'] == 'war':
                        entered[n] = dict(e, article=src['article'], locator=f'section "{n}"')
                    elif e:
                        pact[n] = dict(e, article=src['article'], locator=f'section "{n}"')
                entered.update(table_initiators(src['initiators_of'], [n for n in texts if n not in entered], src['not_before']))
                entered.update({n: q for n, q in pact.items() if n not in entered})
                members.update(entered)
            else:
                members.update(heading_members(src['article'], src['sections']))
        for name, q in members.items():
            if name not in {x for v in comb.values() for x in v}:
                comb.setdefault('M', []).append(name)
            if 'from' in q:
                pdates.setdefault(name, []).append(q)
        # an entry dated only by a column header ("Post-1635 Peace of Prague") is better dated by a sentence that says when it entered
        sents_all = D.body_sentences(code, False)
        for ent, recs in pdates.items():
            tok = (ent.split(' of ')[-1] if ent else ent)[:5]  # a stem: 'Franc' finds France, Franco-Spanish
            for rec in recs:
                if 'from' not in rec or not str(rec.get('locator', '')).startswith('infobox combatant'):
                    continue
                if re.search(r'\(\s*(?:from|' + YR + r')', rec.get('quote', '')):
                    continue  # the entry carries its own dated note
                for sent in sents_all:
                    if re.search(r'(?<![–\-\w])' + re.escape(tok), sent) and str(rec['from']) in sent and re.search(r'\b(enter|entered|declared war|intervene|intervened|joined|entry|initiated)\b', sent) and D.norm(sent) in pl:
                        rec.update(quote=sent[:300], locator='article text (a sentence saying when it entered)')
                        break
        for i, sent in enumerate(D.body_sentences(code)[:4]):
            if YEAR.search(sent):
                dates += lead_claims(sent, i, wt, pl, dates)
                break
        q = qid(p['title'])
        if q and wd:
            for side, lst in wd.dates(q).items():
                for y, m, d_, prop, cal in lst:
                    dates.append({'side': side, 'year': y if y > 0 else y + 1, 'circa': False, 'from': 'wikidata', 'locator': prop,
                                  **({'month': m} if m else {}), **({'day': d_} if d_ else {})})
        inl = db.execute('SELECT n FROM inlink WHERE title=?', (p['title'],)).fetchone()
        out[p['title']] = {'qid': q, 'kind': 'conflict', 'sub': w['sub'], 'title': p['title'], 'seed': w['title'], 'wp': {'title': p['title'], 'dump': settings.DUMP_NAME},
                           'dates': dates, 'combatants': {str(k): v for k, v in sorted(comb.items())}, 'inlinks': inl[0] if inl else 0, 'measures': {},
                           'harvest': {'adapter': ADAPTER, 'at': os.environ.get('HARVEST_DATE', '2026-11-23')}, 'wide': bool(w.get('wide')), 'main': None, 'countries_ranked': [], 'participant_dates': pdates}
    n = 0
    with open(os.path.join(out_dir, 'conflict.jsonl'), 'w') as f:
        for r in sorted(out.values(), key=lambda r: r['title']):
            # the combatant countries: every first entry of a column (up to the three-country rule), as QIDs for the place table
            # placement counts the main combatants (the first entry of each column); allies are 'participants' (used for the wars' strips)
            r['countries'] = list(dict.fromkeys(canon(v[0]) for k, v in r['combatants'].items() if v and k.isdigit()))
            r['participants'] = {col: [canon(x) for x in v] for col, v in r['combatants'].items()}
            r['participant_qids'] = {t: qid(t) for v in r['participants'].values() for t in v}
            r['participant_dates'] = {canon(k): v for k, v in r.get('participant_dates', {}).items()}
            r['country_qids'] = [qid(c) for c in r['countries']]
            r['places'] = [x for x in r['country_qids'] if x]
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            n += 1
    json.dump({'adapter': ADAPTER, 'wikipedia': settings.DUMP_NAME, 'wikidata': wd.dump if wd else None, 'count': n, 'countries': manifest_c,
               'cut line': {f'{k[0]} / {k[1]}': v for k, v in cut.items()}, 'log': log}, open(os.path.join(out_dir, 'conflict.manifest.json'), 'w'), indent=1, ensure_ascii=False)
    print(f'{n} candidates', *log[:20], sep='\n')


if __name__ == '__main__':
    main()
