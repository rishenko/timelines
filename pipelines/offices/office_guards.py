"""
The count guards of the offices stage: each row's records against Wikidata's P39 holders and the page's own numbering, every difference named by its QID
and checked against offices-expected.json (figures and reasons).
"""
import collections
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE]
import office_lists as O  # noqa: E402


def load(name):
    return json.load(open(os.path.join(HERE, name), encoding='utf-8'))


def wd_holders(q):
    """(the holders' QIDs, the number of P39 statements) of an office QID, or of several offices (a row whose head of government changed title)."""
    got, terms = set(), 0
    for office in ([q] if isinstance(q, str) else q):
        for (p,) in O.W.execute("select qid from wd_link where prop='P39' and target=?", (office,)):
            got.add(p)
            terms += 1
    return got, terms


def guards(spec, rows, out):
    """The count guards: each row's records against Wikidata's P39 holders and the page's own numbering, every difference listed by its QID.
    A page row that looks like a tenure and has no record is explained by its shape (a continuation row) or by name in offices-expected.json `page_rows_explained` ("table:row": why)."""
    g = {}
    by_hand = {rid: v.get('page_rows_explained', {}) for rid, v in load('offices-expected.json')['rows'].items()}
    tbls = {}
    for r in spec['rows']:
        pg, recs = rows[r['id']]
        people = {x['qid'] for x in recs if x['qid']}
        wd, terms = wd_holders(r['wd']) if r['wd'] else (set(), 0)
        gr = dict(records=len(recs), people=len(people), unresolved=sum(1 for x in recs if not x['qid']), wikidata_people=len(wd), wikidata_terms=terms, both=len(people & wd),
                  list_only=sorted(people - wd), wikidata_only=sorted(wd - people))
        if r.get('frozen'): gr['list_only'] = []  # no Wikidata office to compare: the frozen file's own numbering is the guard (Dev C's GUARDS.md)
        nums = [x for x in recs if x['number']]
        if r['id'] not in ('japan', 'ottoman', 'hawaii'):  # the pilot rows with no usable number column keep their figures as committed
            seqs = collections.defaultdict(list)
            for x in recs:
                if x['number']: seqs[x['table']].append(int(re.sub(r'\D', '', x['number'])) if not x['number'].startswith('(') else None)
            gr['numbering'] = {str(t): collapse([v for v in s if v is not None]) for t, s in sorted(seqs.items())}
            gr['unnumbered'] = sum(1 for x in recs if not x['number'])
        text = pg['text']
        alltb = [m.group(0) for m in re.finditer(r'\{\|.*?\n\|\}', text, re.S)] if not r.get('frozen') else []
        have = {(x['table'], x['rowidx']) for x in recs}
        cand = []
        namecells = 0
        spanned_missing = 0
        for ti in ([] if r.get('frozen') else r['tables']):
            pend = 0
            for ri, rw in enumerate(alltb[ti].split('\n|-')[1:]):
                raw = [c[0] for c in O.LR._cells(rw)]
                plain = [O.clean(c) for c in raw]
                if pend > 0:  # a row a name cell's rowspan covers: its date pair is a tenure of that person
                    pend -= 1
                    if (ti, ri) not in have and sum(1 for c in plain if O.date_cell(c)) >= 2 and not any(O.VACANT.match(c) for c in plain): spanned_missing += 1  # a vacancy row under a rowspan cell is nobody's
                for c, rs, _ in O.LR._cells(rw):
                    if rs > 1 and (O.person_link(c) or O.ILL.search(c)): pend = max(pend, rs - 1)
                link = any((O.person_link(c) or O.ILL.search(c)) and not re.search(r'\bcabinet\b', c, re.I) for c in raw)
                dated = bool(O.AYD.search(rw)) or any(O.date_cell(c) for c in plain)
                if r['id'] == 'ottoman':
                    nc = [c for c in raw if "'''" in c and (O.LR.LINK.search(c) or O.ILL.search(c)) and not re.search(r'\[\[(File|Image):', c, re.I)]
                    namecells += len(nc) if (ti, ri) in have else 0
                    gr.setdefault('name_cells_unrecorded', 0)
                    gr['name_cells_unrecorded'] += 0 if (ti, ri) in have else len(nc)
                if link and dated and (ti, ri) not in have:
                    explained = len([c for c in plain if c]) <= 3 or bool(re.search(r'\d+\. ', ' | '.join(plain))) or any(O.VACANT.match(c) for c in plain) or f'{ti}:{ri}' in by_hand.get(r['id'], {})
                    cand.append(explained)
        gr['page_rows_without_record'] = len(cand)
        gr['spanned_rows_without_record'] = spanned_missing
        gr['page_rows_unexplained'] = sum(1 for c in cand if not c)
        if r['id'] == 'ottoman': gr['name_cells_with_record'] = namecells
        if r['id'] == 'japan':
            order = sorted(x['rowidx'] for x in recs if x['table'] == 1)
            cab = []
            for ri, rw in enumerate(alltb[1].split('\n|-')[1:]):
                for c in O.LR._cells(rw):
                    cc = O.clean(c[0])
                    if re.match(r'^\d+\. \S', cc): cab.append(int(cc.split('.')[0]))
            gr['cabinets'] = len(cab)
            gr['cabinets_contiguous'] = sorted(cab) == list(range(1, len(cab) + 1))
        gr['held'] = sum(1 for x in recs if x['held'])
        g[r['id']] = gr
    return g


def collapse(v):
    """[1,2,3,1,2] -> ['1-3', '1-2']: the runs of the page's number column."""
    runs = []
    for x in v:
        if runs and x == runs[-1][-1] + 1: runs[-1].append(x)
        else: runs.append([x])
    return [f'{r[0]}-{r[-1]}' for r in runs]


def check_expected(g):
    exp = load('offices-expected.json')['rows']
    problems = []
    for rid, got in g.items():
        want = exp.get(rid)
        if want is None: problems.append(f'{rid}: no expected figures'); continue
        for k, v in got.items():
            if k in ('list_only', 'wikidata_only'):
                if sorted(want[k]) != v: problems.append(f"{rid}: {k} differs: unexplained {sorted(set(v) ^ set(want[k]))}")
            elif want.get(k) != v: problems.append(f'{rid}: {k} is {v}, expected {want.get(k)}')
        if got['spanned_rows_without_record']: problems.append(f"{rid}: {got['spanned_rows_without_record']} rows under a rowspan name cell hold a date pair and have no record")
        if got['page_rows_unexplained']: problems.append(f"{rid}: {got['page_rows_unexplained']} page rows look like tenures and have no record")
    return problems


