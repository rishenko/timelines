"""
One batch of the offices stage, run on its own (v4 step 2 bulk): reads the batch's rows from a spec in offices-rows.json's shape and writes records, guards and a
checksum list into an output folder outside the repo. Nothing in the repo changes; a batch that passes its read has its rows added to offices-rows.json,
its figures to offices-expected.json and its rulings to hand-rulings.json in the batch's PR, and offices.py makes the committed files.

    pipelines/extract/.venv/bin/python -I pipelines/offices/batch.py SPEC.json OUTDIR [RULINGS.json]

OUTDIR gets <row>.json (records, held, Wikidata holders), guards.json, GUARDS.md and SHA256SUMS. The guards are the pilot's: records and people against
Wikidata's P39 holders of the row's offices, the page's own numbering, the page-side rows that look like tenures and have no record, each difference named.
"""
import collections
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE]
import office_lists as O  # noqa: E402
import offices as S  # noqa: E402


def row_guards(r, pg, recs):
    people = {x['qid'] for x in recs if x['qid']}
    wd, terms = S.wd_holders(r['wd']) if r.get('wd') else (set(), 0)
    g = dict(records=len(recs), people=len(people), unresolved=[x['key'] for x in recs if not x['qid']], held=sum(1 for x in recs if x['held']),
             wikidata_people=len(wd), wikidata_terms=terms, both=len(people & wd), list_only=sorted(people - wd), wikidata_only=sorted(wd - people),
             expected_p39_in_window=r.get('exp_wd'), expected_category_pages=r.get('exp_cat'))
    seqs = collections.defaultdict(list)
    for x in recs:
        if x['number']: seqs[x['table']].append(None if x['number'].startswith('(') else int(re.sub(r'\D', '', x['number']) or 0))
    g['numbering'] = {str(t): S.collapse([v for v in s if v]) for t, s in sorted(seqs.items())}
    g['unnumbered'] = sum(1 for x in recs if not x['number'])
    alltb = [m.group(0) for m in re.finditer(r'\{\|.*?\n\|\}', pg['text'], re.S)]
    have = {(x['table'], x['rowidx']) for x in recs}
    cand = []
    for ti in r['tables']:
        for ri, rw in enumerate(alltb[ti].split('\n|-')[1:]):
            raw = [c[0] for c in O.LR._cells(rw)]
            plain = [O.clean(c) for c in raw]
            link = any((O.person_link(c) or O.ILL.search(c)) and not re.search(r'\bcabinet\b', c, re.I) for c in raw)
            dated = bool(O.AYD.search(rw)) or any(O.date_cell(c) for c in plain)
            if link and dated and (ti, ri) not in have:
                n = len([c for c in plain if c])
                cand.append(dict(table=ti, row=ri, cells=n, explained=n <= 3 or bool(re.search(r'\d+\. ', ' | '.join(plain))) or any(O.VACANT.match(c) for c in plain), text=' | '.join(c for c in plain if c)[:140]))
    g['page_rows_without_record'] = len(cand)
    g['page_rows_unexplained'] = [c for c in cand if not c['explained']]
    return g


def main(argv):
    spec = json.load(open(argv[0], encoding='utf-8'))
    out = argv[1]
    rulings = json.load(open(argv[2], encoding='utf-8')) if len(argv) > 2 else []
    os.makedirs(out, exist_ok=True)
    rows = S.read_rows(spec)
    S.apply_rulings(rows, rulings)
    S.hold_out(rows, spec)
    guards, md = {}, ['# Guards (batch run)', '']
    for r in spec['rows']:
        pg, recs = rows[r['id']]
        g = row_guards(r, pg, recs)
        guards[r['id']] = g
        json.dump(dict(row=r, page=dict(title=pg['title'], revision=pg['revision'], timestamp=pg['timestamp']), records=recs), open(os.path.join(out, r['id'] + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
        md += [f"## {r['name']} ({r['id']}): {pg['title']} rev {pg['revision']}",
               f"- records {g['records']} (held {g['held']}); people {g['people']}; unresolved {len(g['unresolved'])} {g['unresolved'][:6]}",
               f"- Wikidata P39: {g['wikidata_people']} people / {g['wikidata_terms']} terms; both {g['both']}; list-only {len(g['list_only'])}; Wikidata-only {len(g['wikidata_only'])}; expected P39 in window {g['expected_p39_in_window']}, category pages {g['expected_category_pages']}",
               f"- numbering {g['numbering']}; unnumbered {g['unnumbered']}; page rows without a record {g['page_rows_without_record']}, unexplained {len(g['page_rows_unexplained'])}"]
        for c in g['page_rows_unexplained'][:5]: md.append(f"  - unexplained: table {c['table']} row {c['row']}: {c['text']}")
        names = {x['qid']: x['name'] for x in recs if x['qid']}
        for q in g['list_only'][:25]: md.append(f"  - list-only {q} {names.get(q)}")
        for q in g['wikidata_only'][:25]:
            lab = (O.PE.execute('select label from person where qid=?', (q,)).fetchone() or [None])[0]
            md.append(f"  - Wikidata-only {q} {lab}")
        held = [x for x in recs if x['held']]
        for x in held[:12]: md.append(f"  - held {x['key']} {x['name']} {x['start']}..{x['end']}: {x['held'][:90]}")
        md.append('')
    json.dump(guards, open(os.path.join(out, 'guards.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(out, 'GUARDS.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    files = sorted(f for f in os.listdir(out) if f.endswith(('.json', '.md', '.py')) and f != 'SHA256SUMS')
    open(os.path.join(out, 'SHA256SUMS'), 'w').write(''.join(f"{hashlib.sha256(open(os.path.join(out, f), 'rb').read()).hexdigest()}  {f}\n" for f in files))
    print(f"batch: {sum(g['records'] for g in guards.values())} records, {sum(g['held'] for g in guards.values())} held, {sum(len(g['unresolved']) for g in guards.values())} unresolved, in {len(guards)} rows -> {out}")


if __name__ == '__main__':
    main(sys.argv[1:])
