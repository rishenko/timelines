"""
Succession-graph consistency, report only (Fable's better-ruler-data options §2; Kevin 2026-11-25, "all recommendations"). For each row, the
reigns shipped on it are the nodes; the edges are Wikidata's predecessor and successor qualifiers on the person's position-held statements
(P1365 "replaces", P1366 "replaced by", from the quals2 table). Per row and phase (a row without phases is one span), it reports:

  gap       years of the phase no shipped reign covers (more than TOL years): a recall item; with the person Wikidata names as the successor
            of the reign before it, or predecessor of the one after it, when that person is not shipped on the row ("missing: Q... title")
  fork      a reign with two or more different successors (or predecessors) in the chain: a rival line, or a wrong row, to card
  overlap   two reigns of different people that overlap by more than TOL years (co-rule is not declared yet, so every one is listed)
  orphan    a reign with no chain neighbour on the row at all (neither a predecessor nor a successor, shipped or named): suspect
  linked    a reign with at least one shipped chain neighbour

v2: the edges come from two sources, each labelled: Wikidata (above) and the Wikipedia infobox predecessor/successor fields of the person's
article (the succession box; needs the dump and the extractor's venv, else the report says "Wikidata only"). The report counts the linked
reigns by source (both, Wikidata only, Wikipedia only), and a reign that has neighbours but disagrees across sources is listed.

Nothing is written but the report; it changes no data. Needs the Wikidata quals2 and main sqlite tables (<data root>/wikidata).

    pipelines/.venv/bin/python -I pipelines/extract/succession_graph.py [--timeline T] [--out FILE.md] row [row ...]
    pipelines/.venv/bin/python -I pipelines/extract/succession_graph.py --timeline medieval japan mali-empire
"""
import glob
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import dates  # noqa: E402
import settings  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TIMELINE_DIR = {'ancient-classical': 'ancient', 'medieval': 'medieval', 'modern-states': 'modern-states'}
TOL = 1.0  # years: a gap or an overlap smaller than this is the rounding of dates


def year_of(e, which):
    """The event's start or end as a fractional astronomical year (month and day when it has them)."""
    y = e.get('start' if which == 'start' else 'end')
    if y is None:
        return None
    m = e.get('startMonth' if which == 'start' else 'endMonth') or 1
    d = e.get('startDay' if which == 'start' else 'endDay') or 1
    return y + (m - 1) / 12 + (d - 1) / 365


def phase_spans(track, reigns):
    """[(name, start, end)] in astronomical years: the track's phases, else its span, else the reigns' own extent."""
    def conv(v):
        if isinstance(v, (int, float)) or v is None:
            return v
        s = dates.spans(v)
        return dates.astro(s[0]['start'][0]) if s else None
    out = [(p.get('name', ''), conv(p.get('start')), conv(p.get('end'))) for p in track.get('phases', [])]
    if not out and track.get('span'):
        sp = track['span']
        out = [('span', conv(sp.get('start')), conv(sp.get('end')))] if isinstance(sp, dict) else []
    lo = min((r['start'] for r in reigns), default=None)
    hi = max((r['end'] or r['start'] for r in reigns), default=None)
    return [(n, s if s is not None else lo, e if e is not None else hi) for n, s, e in out] or [('reigns', lo, hi)]


def gaps(reigns, phases, tol=TOL):
    """[(phase, from, to, before, after)]: stretches of a phase no reign covers, and the reigns on either side of each."""
    out = []
    spans = sorted(((r['start'], r['end'] if r['end'] is not None else r['start'], i, r) for i, r in enumerate(reigns)))
    for name, ps, pe in phases:
        if ps is None or pe is None:
            continue
        cur, last = ps, None
        for s, e, _, r in spans:
            if e < ps or s > pe:
                continue
            if s - cur > tol:
                out.append((name, cur, s, last, r))
            if e >= cur:
                cur, last = e, r
        if pe - cur > tol:
            out.append((name, cur, pe, last, None))
    return out


def overlaps(reigns, tol=TOL):
    """[(a, b, years)]: pairs of different people whose reigns overlap by more than `tol` years."""
    out = []
    rs = sorted(reigns, key=lambda r: r['start'])
    for i, a in enumerate(rs):
        for b in rs[i + 1:]:
            if b['start'] >= (a['end'] if a['end'] is not None else a['start']):
                break
            width = min(a['end'] if a['end'] is not None else a['start'], b['end'] if b['end'] is not None else b['start']) - b['start']
            if a.get('key', a['qid']) != b.get('key', b['qid']) and width > tol:
                out.append((a, b, width))
    return out


def chain(reigns, edges):
    """({qid: successors}, {qid: predecessors}) of `edges` (pred, succ) pairs, as sets."""
    succ, pred = {}, {}
    for a, b in edges:
        succ.setdefault(a, set()).add(b)
        pred.setdefault(b, set()).add(a)
    return succ, pred


def read_reigns(timeline, row, root=ROOT):
    """[{uuid, person, qid, start, end}] of the reigns shipped on a row (data-src events, the person from the committed freeze review)."""
    gen = TIMELINE_DIR[timeline]
    review = {}
    for p in glob.glob(os.path.join(root, 'pipelines', gen, 'reigns.json')) + glob.glob(os.path.join(root, 'pipelines', gen, '*-reigns.json')):
        with open(p, encoding='utf-8') as f:
            review.update(json.load(f).get('review', {}))
    with open(os.path.join(root, 'data-src', f'{timeline}.json'), encoding='utf-8') as f:
        data = json.load(f)
    track = next(t for t in data['tracks'] if t['id'] == row)
    out = []
    for e in data['events']:
        if e['uuid'].startswith('reign-') and row in e.get('tracks', []):
            rv = review.get(e['uuid'], {})
            out.append({'uuid': e['uuid'], 'person': rv.get('person') or e['title'], 'qid': rv.get('qid'), 'article': rv.get('cited') or rv.get('person') or e['title'], 'start': year_of(e, 'start'),
                        'end': year_of(e, 'end'), 'span': f"{e.get('start')}–{e.get('end')}"})
    return track, [r for r in out if r['start'] is not None]


def read_edges(qids, data_dir):
    """{(predecessor qid, successor qid)} from the position-held qualifiers of `qids` (P1365 replaces, P1366 replaced by)."""
    con = sqlite3.connect(f"file:{os.path.join(data_dir, 'wikidata', 'wikidata-20261116-quals2.sqlite')}?mode=ro", uri=True)
    edges, marks = set(), ','.join('?' * len(qids))
    try:
        for qid, qprop, target in con.execute(f"select qid, qprop, qtarget from wd_iqual where prop='P39' and qprop in ('P1365','P1366') and qid in ({marks})", list(qids)):
            edges.add((target, qid) if qprop == 'P1365' else (qid, target))
    finally:
        con.close()
    return edges


WIKILINK = re.compile(r'\[\[([^\]|#]+)')
CHAIN_FIELD = re.compile(r'^(predecessor|successor)\d*$')


def link_titles(raw):
    """The article titles a predecessor/successor field links, in order (text without a link gives none)."""
    return [t.strip().replace('_', ' ') for t in WIKILINK.findall(raw or '')]


def infobox_chain(params):
    """({predecessor titles}, {successor titles}) of one infobox's parameters (predecessor, predecessor2, successor, ...)."""
    out = {'predecessor': [], 'successor': []}
    for k, v in params.items():
        m = CHAIN_FIELD.match(k)
        if m:
            out[m.group(1)] += link_titles(v)
    return out['predecessor'], out['successor']


def read_infobox_edges(reigns, wp_dump, RU):
    """{(predecessor article, successor article)} from the infobox of each shipped reign's article; titles are the dump's (redirects
    followed). A linked article that no reign ships counts only when its own infobox has reign or term blocks (a ruler: not "Mali Empire",
    "Mansa (title)" or a language the field also links)."""
    shipped = {(wp_dump.page(r['article']) or {'title': r['article']})['title'] for r in reigns}
    ruler = {}

    def canon(t):
        p = wp_dump.page(t)
        return p['title'] if p else t

    def holds_office(t):
        if t not in ruler:
            p = wp_dump.page(t)
            ruler[t] = bool(p and RU.wp_reigns(RU.infobox_params(p['text'])))
        return t in shipped or ruler[t]
    edges = set()
    for article in sorted({r['article'] for r in reigns}):
        p = wp_dump.page(article)
        if not p:
            continue
        me = p['title']
        before, after = infobox_chain(RU.infobox_params(p['text']))
        edges |= {(t, me) for t in map(canon, before) if holds_office(t)} | {(me, t) for t in map(canon, after) if holds_office(t)}
    return edges


def merge_sources(wikidata, wikipedia):
    """{edge: {'wikidata', 'wikipedia'}} from the two edge sets."""
    out = {}
    for src, es in (('wikidata', wikidata), ('wikipedia', wikipedia)):
        for e in es:
            out.setdefault(e, set()).add(src)
    return out


def titles(qids, data_dir):
    con = sqlite3.connect(f"file:{os.path.join(data_dir, 'wikidata', 'wikidata-20261116.sqlite')}?mode=ro", uri=True)
    try:
        return {q: t for q, t in con.execute(f"select qid, enwiki from wd_item where qid in ({','.join('?' * len(qids))})", list(qids))} if qids else {}
    finally:
        con.close()


def dump_tools():
    """(wp_dump, rulers) when the Wikipedia extract and mwparserfromhell are here, else None (the report then uses Wikidata only)."""
    try:
        import mwparserfromhell  # noqa: F401
        import rulers as RU
        import wp_dump
        if os.path.exists(os.path.join(settings.WIKIPEDIA, 'extract-' + settings.DUMP_NAME + '.sqlite')):
            return wp_dump, RU
    except Exception:
        pass
    return None


def report(timeline, row, data_dir=None, tools=None):
    data_dir = data_dir or settings.DATA
    track, reigns = read_reigns(timeline, row)
    canon = (lambda t: (tools[0].page(t) or {'title': t})['title']) if tools else (lambda t: t)
    for r in reigns:
        r['key'] = canon(r['article'])
    mine = {r['key'] for r in reigns}
    by_qid = {r['qid']: r['key'] for r in reigns if r['qid']}
    wd = read_edges(set(by_qid), data_dir)
    unshipped = {q for e in wd for q in e if q not in by_qid}
    name = titles(unshipped, data_dir)
    key = lambda q: by_qid.get(q) or name.get(q) or q
    wd = {(key(a), key(b)) for a, b in wd}
    wp = read_infobox_edges(reigns, *tools) if tools else set()
    sources = merge_sources({e for e in wd if e[0] in mine or e[1] in mine}, {e for e in wp if e[0] in mine or e[1] in mine})
    succ, pred = chain(reigns, set(sources))
    tag = lambda a, b: '+'.join(sorted(sources[(a, b)]))
    lines = [f'### {timeline} / {row}: {len(reigns)} reigns shipped' + ('' if tools else ' (Wikidata edges only: no dump here)')]
    reached = lambda k: (succ.get(k, set()) | pred.get(k, set()))
    linked = [r for r in reigns if reached(r['key']) & mine]
    orphans = [r for r in reigns if not reached(r['key'])]
    lines.append(f'- linked to a shipped neighbour: {len(linked)}; orphans (no chain neighbour at all): {len(orphans)}' + (': ' + ', '.join(f"{r['person']} ({r['span']})" for r in orphans[:8]) + (' …' if len(orphans) > 8 else '') if orphans else ''))
    if tools:
        def srcs(r):
            out = set()
            for o in reached(r['key']) & mine:
                out |= sources.get((o, r['key']), set()) | sources.get((r['key'], o), set())
            return out
        only = lambda name_: sum(srcs(r) == {name_} for r in linked)
        lines.append(f"- shipped links by source: both {sum(len(srcs(r)) == 2 for r in linked)}, Wikidata only {only('wikidata')}, Wikipedia only {only('wikipedia')}")
        lone = [r for r in reigns if (sw := {e for e in sources if r['key'] in e and 'wikidata' in sources[e]}) and (sp := {e for e in sources if r['key'] in e and 'wikipedia' in sources[e]}) and not sw & sp]
        lines.append(f"- both sources have neighbours for the reign but name different ones: {len(lone)}" + (': ' + ', '.join(r['person'] for r in lone[:8]) + (' …' if len(lone) > 8 else '') if lone else ''))
    for g in gaps(reigns, phase_spans(track, reigns)):
        before = g[3]['key'] if g[3] else None
        after = g[4]['key'] if g[4] else None
        miss = sorted({q for q in (succ.get(before, set()) if before else set()) | (pred.get(after, set()) if after else set()) if q not in mine})
        lines.append(f"- gap in {g[0]}: {g[1]:.0f} to {g[2]:.0f} ({g[2] - g[1]:.0f} years), after {g[3]['person'] if g[3] else 'the start'}, before {g[4]['person'] if g[4] else 'the end'}" + (f"; named, not shipped: {', '.join(m + ' [' + (tag(before, m) if (before, m) in sources else tag(m, after)) + ']' for m in miss)}" if miss else ''))
    seen = set()
    for r in reigns:
        for kind, links in (('successors', succ), ('predecessors', pred)):
            others = sorted(links.get(r['key'], set()))
            if len(others) > 1 and (r['key'], kind) not in seen:
                seen.add((r['key'], kind))
                lines.append(f"- fork at {r['person']} ({r['span']}), {kind}: {', '.join(others)}")
    ov = overlaps(reigns)
    lines.append(f'- overlaps of more than {TOL:g} year between different people: {len(ov)}' + (': ' + '; '.join(f"{a['person']} / {b['person']} ({w:.0f} y)" for a, b, w in ov[:6]) + (' …' if len(ov) > 6 else '') if ov else ''))
    return '\n'.join(lines)


def main(argv):
    timeline = argv[argv.index('--timeline') + 1] if '--timeline' in argv else None
    out = argv[argv.index('--out') + 1] if '--out' in argv else None
    rows = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] not in ('--timeline', '--out'))]
    if not timeline or not rows:
        print(__doc__)
        return 2
    tools = dump_tools()
    text = '\n\n'.join(report(timeline, r, tools=tools) for r in rows)
    print(text)
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
