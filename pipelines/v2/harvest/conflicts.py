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
    return list(dict.fromkeys(out))[:15]


def first_entry(raw):
    e = entries(raw)
    return e[0] if e else None


def combatants(box):
    """{column number: [entries]} of an Infobox military conflict (the first entry of a column is its main combatant)."""
    out = {}
    for prm in box.params:
        m = re.fullmatch(r'combatant(\d)', str(prm.name).strip().lower())
        if m and str(prm.value).strip():
            e = entries(str(prm.value))
            if e:
                out[int(m.group(1))] = e
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
            if {canon(v[0]) for v in r['combatants'].values() if v} & mine:
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
                        cl, why = D.date_claims(sent, f'lead sentence {i + 1}', wt, pl)
                        dates += cl[:2]
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
            firsts = {canon(v[0]) for v in rec['combatants'].values() if v}
            rec = dict(rec, ranked_for=ctry['id'], main=bool(firsts & mine))
            recs.append(rec)
        manifest_c[ctry['id']] = {'pool (main by index + category)': len(titles), 'read': len(recs)}
        picked[ctry['id']] = recs
    # selection: per country and timeline, main combatants first, then inlinks; the rest are counted, with the cut line kept
    windows = rules['windows']
    K = pilot['per_timeline']
    out, cut = {}, {}
    for cid, recs in picked.items():
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
            rs = [r for r in rs if r['sub'] != 'war']  # the pilot ranks battles, sieges and campaigns; wars are the named ones below
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
                break
        else:
            comb = {}
        for i, sent in enumerate(D.body_sentences(code)[:4]):
            if YEAR.search(sent):
                dates += D.date_claims(sent, f'lead sentence {i + 1}', wt, pl)[0][:2]
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
                           'harvest': {'adapter': ADAPTER, 'at': os.environ.get('HARVEST_DATE', '2026-11-23')}, 'wide': True, 'main': None, 'countries_ranked': []}
    n = 0
    with open(os.path.join(out_dir, 'conflict.jsonl'), 'w') as f:
        for r in sorted(out.values(), key=lambda r: r['title']):
            # the combatant countries: every first entry of a column (up to the three-country rule), as QIDs for the place table
            # placement counts the main combatants (the first entry of each column); allies are 'participants' (used for the wars' strips)
            r['countries'] = list(dict.fromkeys(canon(v[0]) for v in r['combatants'].values() if v))
            r['participants'] = {col: [canon(x) for x in v] for col, v in r['combatants'].items()}
            r['country_qids'] = [qid(c) for c in r['countries']]
            r['places'] = [x for x in r['country_qids'] if x]
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
            n += 1
    json.dump({'adapter': ADAPTER, 'wikipedia': settings.DUMP_NAME, 'wikidata': wd.dump if wd else None, 'count': n, 'countries': manifest_c,
               'cut line': {f'{k[0]} / {k[1]}': v for k, v in cut.items()}, 'log': log}, open(os.path.join(out_dir, 'conflict.manifest.json'), 'w'), indent=1, ensure_ascii=False)
    print(f'{n} candidates', *log[:20], sep='\n')


if __name__ == '__main__':
    main()
