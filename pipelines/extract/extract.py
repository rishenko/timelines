"""
The date/event extractor: a topic's dated events from the dump, as candidates for review (never timeline data).

    pipelines/extract/.venv/bin/python -I pipelines/extract/extract.py --topic ww1 --seed "World War I" [--seed …]
        [--cap 4000] [--prose 40] [--categories DIR | --no-categories] [--tables FILE] [--data DIR] [--dump NAME]

Needs extract-<dump>.sqlite (build_index.py, then page_props.py). Writes pipelines/out/extract/<topic>/candidates.csv
and report.md. Event categories come from pipelines/common/event_categories.py.
Candidates keep a stable `cand_id` (article + locator + dates), so review decisions in reviewed-<topic>.csv carry over
to a later dump's run.
"""
import csv
import hashlib
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])

import wp_dump as wp  # noqa: E402
import extractors as X  # noqa: E402
from topics import LIST_TITLE, WINDOW_AFTER, Tables, article_set
from dates import astro, iso  # noqa: E402
from wd_join import WD, compare  # noqa: E402

KIND_WEIGHT = {'infobox': 5, 'table': 4, 'lead': 3, 'heading': 2, 'prose': 1}
WIKI = 'https://en.wikipedia.org/wiki/'


def opt(name, default=None, cast=str, many=False):
    vals = [ARGS[i + 1] for i, a in enumerate(ARGS) if a == name]
    if many:
        return vals
    return cast(vals[-1]) if vals else default


def cand_id(article, locator, s):
    key = json.dumps([article, locator, s['start'], s['end']], ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(key.encode()).hexdigest()[:12]


class WpShim:
    """What event_categories needs from wp_dump, from the side tables: the infobox type and the categories."""
    def __init__(self, T):
        self.T = T

    def page(self, title):
        p = self.T.page(title)
        if not p:
            return None
        text = (f'{{{{Infobox {p[2]}}}}}\n' if p[2] else '') + ''.join(f'[[Category:{c}]]' for c in self.T.categories(p[0]))
        return {'title': p[1], 'text': text}

    ai_flagged = staticmethod(lambda text: False)  # flagged pages never reach the classifier
    categories = staticmethod(wp.categories)


def main():
    topic, seeds = opt('--topic'), opt('--seed', many=True)
    if not topic or not seeds:
        raise SystemExit(__doc__)
    cap, prose_cap = opt('--cap', 4000, int), opt('--prose', 40, int)
    T = Tables(opt('--tables') or os.path.join(settings.WIKIPEDIA, f'extract-{settings.DUMP_NAME}.sqlite'), settings.DUMP_NAME)
    # event categories: the shared classifier in pipelines/common (--categories DIR imports another copy; --no-categories skips)
    classify = None
    if '--no-categories' not in ARGS:
        if opt('--categories'):
            sys.path.insert(0, opt('--categories'))
        import event_categories
        classify = event_categories.classify
    # the seeds' own links (route "link")
    seed_links = []
    for s in seeds:
        p = wp.page(s)
        if p:
            seed_links += [l.strip() for l in X.LINK1.findall(p['text']) if ':' not in l]
    # Wikidata (wikidata.py): used only once its pass is complete
    wd = WD.open(settings.DATA)
    if wd and not wd.complete and '--wd-partial' not in ARGS:  # --wd-partial: test against a pass still running
        print('Wikidata tables are incomplete (pass still running or paused): not used')
        wd = None
    arts, rep = article_set(T, seeds, list(dict.fromkeys(seed_links)), cap=cap, wd=wd)

    cands, dropped, flagged = [], Counter(), []
    for title in sorted(arts):
        a = arts[title]
        p = wp.page(title)
        if not p or wp.ai_flagged(p['text']):
            flagged.append(title)
            continue
        plains = X.plain_texts(p['text'])
        found = []
        if 'list' in a['routes'] or 'seed' in a['routes'] or LIST_TITLE.search(title):  # timelines reached by any route
            found += list(X.tables_and_lists(p['text']))
        if T.event_like(a['page_id'], a['box']):
            found += list(X.infobox(T.fields(a['page_id'])))
        n_prose = 0
        for c in X.lead_and_prose(p['text']):
            if c['kind'] == 'prose':
                n_prose += 1
                if n_prose > prose_cap:
                    dropped['prose cap'] += 1
                    continue
            found.append(c)
        for c in found:
            if not X.check_quote(c, plains):
                dropped['quote not found'] += 1
                continue
            c['article'], c['page_id'], c['rev_id'] = title, a['page_id'], a['rev_id']
            # a row groups under the article it links only when that article is an event; a row whose link is a
            # person or organisation ("Sinn Féin", "Irish Volunteers") stands alone, named by its own text
            cl = c.get('cluster')
            cp = T.page(cl) if cl else None
            if c['kind'] != 'table':
                c['cluster'], c['own'] = title, False
            elif cp and T.event_like(cp[0], cp[2], cp[1]):
                c['cluster'], c['own'] = cp[1], False
            else:
                c['cluster'], c['own'] = f'{title}: {c["title_suggestion"][:100]}', True
            cands.append(c)

    # dedupe: one candidate per (cluster, start, end), keeping the most precise kind; the rest count as confirmations
    best = {}
    for c in cands:
        k = (c['cluster'], c['span']['start'], c['span']['end'])
        c['also'] = []
        if k not in best:
            best[k] = c
        else:
            b = best[k]
            hi, lo = (c, b) if X.KIND_RANK[c['kind']] < X.KIND_RANK[b['kind']] else (b, c)
            hi['also'] = sorted(set(b['also'] + c['also'] + [lo['kind']]))
            best[k] = hi
    rows = list(best.values())

    # scores: kind, inbound links of the cluster's article (percentile in the topic), campaignbox, routes, confirmations
    inl = {cl: T.inlinks(cl) for cl in {r['cluster'] for r in rows}}
    order = sorted(inl, key=lambda t: inl[t])
    pct = {t: i / max(1, len(order) - 1) for i, t in enumerate(order)}
    for r in rows:
        routes = (arts.get(r['cluster']) or arts.get(r['article']) or {}).get('routes', set())
        r['routes'] = sorted(routes)
        r['inlinks'] = inl[r['cluster']]
        r['score'] = round(KIND_WEIGHT[r['kind']] + 4 * pct[r['cluster']] + 3 * ('seed' in routes) + ('campaignbox' in routes)
                           + 0.5 * len(routes)
                           + 0.5 * len(r['also']) + (0.5 if r['span']['precision'] == 'day' else 0), 2)
    # suggested importance per cluster: its primary claim (best score) gets 1 (top 10%), 2 (next 30%) or 3; the rest 3
    primary = {}
    for r in rows:
        if r['cluster'] not in primary or r['score'] > primary[r['cluster']]['score']:
            primary[r['cluster']] = r
    ranked = sorted(primary.values(), key=lambda r: -r['score'])
    for i, r in enumerate(ranked):
        r['importance'] = 1 if i < len(ranked) * 0.1 else 2 if i < len(ranked) * 0.4 else 3
    for r in rows:
        r.setdefault('importance', 3)
        r['primary'] = r is primary[r['cluster']]

    # event categories, from the Architect's classifier, on each cluster's primary claim
    if classify:
        shim = WpShim(T)
        for r in primary.values():
            e = {'title': r['title_suggestion'] if r.get('own') else r['cluster'], 'descr': r['quote'][:300], 'tracks': [], 'sources': [{'sourceKey': 'wp', 'sourceLocation': r['sourceLocation']}]}
            ds = {'sources': {'wp': {'url': WIKI + r['cluster'].replace(' ', '_')}}, 'tracks': []}
            got = classify(e, ds, shim)
            r['category'] = got
        for r in rows:
            if not r['primary']:
                r['category'] = primary[r['cluster']].get('category', [])

    # the topic's window: the seeds' own dates, a year before to five after (aftermath treaties); outside rows sort last
    lo, hi = rep['window']
    win = (lo - 1, hi + WINDOW_AFTER) if lo is not None else None
    for r in rows:
        y0 = r['span']['start'][0]
        y1 = (r['span']['end'] or r['span']['start'])[0]
        r['in_window'] = '' if not win else int(y1 >= win[0] and y0 <= win[1])
    qids = {r['page_id']: T.qid(r['page_id']) for r in rows}
    # Wikidata cross-check on each row's cluster article (rows standing alone have no article to check)
    wd_dates = {}
    for r in rows:
        if not wd:
            r['wikidata'] = 'not loaded'
        elif r.get('own'):
            r['wikidata'] = 'no item (row stands alone)'
        else:
            if r['cluster'] not in wd_dates:
                cp = T.page(r['cluster'])
                q = T.qid(cp[0]) if cp else None
                wd_dates[r['cluster']] = (q, wd.dates(q) if q else None)
            q, d = wd_dates[r['cluster']]
            res = 'no item' if not q else compare(r['span'], d)
            # only the infobox gives the article's own dates; a lead or table row may date something else, so it is
            # marked only when it matches
            r['wikidata'] = res if r['kind'] == 'infobox' or res in ('agree', 'no item', 'no date') else 'not compared'
    rows.sort(key=lambda r: (r['in_window'] == 0, r['cluster'], sortable(r['span']['start']), X.KIND_RANK[r['kind']]))
    out = os.path.join(os.path.dirname(HERE), 'out', 'extract', topic)
    os.makedirs(out, exist_ok=True)
    cols = ['cand_id', 'topic', 'cluster', 'primary', 'title_suggestion', 'start', 'end', 'in_window', 'alts', 'precision', 'circa', 'old_style',
            'kind', 'also', 'sourceLocation', 'locator', 'quote', 'article', 'page_id', 'rev_id', 'qid', 'routes', 'inlinks',
            'score', 'importance_suggested', 'category_main', 'category_second', 'category_evidence', 'wikidata', 'dump']
    # prose rows go to their own file (Kevin, 2026-11-22): review starts with infobox, table, lead and heading rows
    files = {name: open(os.path.join(out, name), 'w', newline='', encoding='utf-8') for name in ('candidates.csv', 'candidates-prose.csv')}
    writers = {name: csv.writer(f) for name, f in files.items()}
    for wr in writers.values():
        wr.writerow(cols)
    for r in rows:
        w = writers['candidates-prose.csv' if r['kind'] == 'prose' else 'candidates.csv']
        s, cat = r['span'], r.get('category') or []
        title = r.get('title_suggestion') or (f'{r["article"]}: {r["quote"]}' if r['kind'] == 'heading' else
                                               r['quote'][:160] if r['kind'] == 'prose' else r['article'])
        w.writerow([cand_id(r['article'], r['locator'], s), topic, r['cluster'], int(r['primary']), title, iso(s['start']),
                    iso(s['end']), r['in_window'], ';'.join(iso(a) for a in s['alts']), s['precision'], int(s['circa']), int(s['old_style']),
                    r['kind'], ';'.join(r['also']), r['sourceLocation'], json.dumps(r['locator'], ensure_ascii=False), r['quote'],
                    r['article'], r['page_id'], r['rev_id'], qids[r['page_id']] or '', ';'.join(r['routes']), r['inlinks'],
                    r['score'], r['importance'], cat[0][0] if cat else '', cat[1][0] if len(cat) > 1 else '',
                    ' | '.join(x[1] for x in cat), r['wikidata'], settings.DUMP_NAME])
    for f in files.values():
        f.close()
    report(out, topic, seeds, T, rep, arts, rows, primary, dropped, flagged, bool(classify), wd)
    print(f'{len(arts)} articles, {len(rows)} candidates ({len(primary)} clusters) -> {out}')


def sortable(v):
    """A date as a sort key (month and day may be missing)."""
    return v[0], v[1] or 0, v[2] or 0


def span_txt(s):
    t = iso(s['start']) + (f' – {iso(s["end"])}' if s['end'] else '')
    return ('c. ' if s['circa'] else '') + t + (' (O.S.)' if s['old_style'] else '')


def report(out, topic, seeds, T, rep, arts, rows, primary, dropped, flagged, has_cat, wd=None):
    md = [f'# Extractor candidates: {topic}', '',
          f'Seeds: {", ".join(seeds)}. Dump {T.meta["dump"]}; tables {T.meta["code_version"]}. '
          f'Candidates are for review, not timeline data. Columns: see pipelines/extract/extract.py.', '',
          '## Article set', '',
          f'- {len(arts)} articles. By route: ' + ', '.join(f'{k} {v}' for k, v in rep['routes'].items()) + '.',
          f'- Campaignboxes ({len(rep["campaignboxes"])}): ' + ', '.join(rep['campaignboxes'][:40]) + (' …' if len(rep['campaignboxes']) > 40 else ''),
          f'- Categories walked: {rep["categories"]}. Timeline/list pages: ' + (', '.join(rep['lists'][:20]) or 'none') + '.',
          f'- Excluded: {len(rep["excluded"]["ai_flag"])} AI-flagged ({", ".join(rep["excluded"]["ai_flag"][:10]) or "none"}); '
          f'{rep["excluded"]["not_event"]} not event-like (category and link routes); {len(rep["excluded"]["out_of_window"])} with dates outside the window ({", ".join(rep["excluded"]["out_of_window"][:8])}); {rep["excluded"]["cap"]} over the cap; '
          f'campaignboxes left out for little overlap: {", ".join(rep["excluded"]["box_overlap"][:15]) or "none"}.', '',
          '## Candidates', '',
          f'- {len(rows)} candidates in {len(primary)} clusters (one per linked article). By kind: '
          + ', '.join(f'{k} {v}' for k, v in Counter(r['kind'] for r in rows).most_common()) + '.',
          f'- Dropped: ' + (', '.join(f'{v} {k}' for k, v in dropped.items()) or 'none') + '.',
          f'- Files: candidates.csv {sum(r["kind"] != "prose" for r in rows)} rows (infobox, table, lead, heading); '
          f'candidates-prose.csv {sum(r["kind"] == "prose" for r in rows)}.',
          f'- Topic window: ' + (f'{astro(rep["window"][0] - 1)}–{astro(rep["window"][1] + WINDOW_AFTER)} (astronomical years; the seeds\' dates, a year before, '
                                 f'{WINDOW_AFTER} after); outside it: {sum(r["in_window"] == 0 for r in rows)} rows, sorted last.'
                                 if rep['window'][0] is not None else 'none (the seeds have no infobox dates).'),
          f'- Old Style flagged: {sum(r["span"]["old_style"] for r in rows)}. Circa: {sum(r["span"]["circa"] for r in rows)}.',
          f'- Event categories: ' + ('from event_categories.classify on each cluster\'s primary claim: '
                                     + ', '.join(f'{k} {v}' for k, v in Counter((r.get('category') or [("(none)",)])[0][0] for r in primary.values()).most_common(12))
                                     if has_cat else 'not run (--no-categories).') + '.', '',
          '## Top clusters (suggested importance 1)', '', '| Article | Dates | Kind | Inbound links | Category |', '|---|---|---|---|---|']
    for r in sorted((r for r in primary.values() if r['importance'] == 1), key=lambda r: -r['score'])[:60]:
        cat = (r.get('category') or [('',)])[0][0]
        md.append(f'| {r["cluster"]} | {span_txt(r["span"])} | {r["kind"]} | {r["inlinks"]} | {cat} |')
    # conflicts: a cluster whose infobox and lead give different starts
    conf = []
    by = defaultdict(dict)
    for r in rows:
        if r['kind'] in ('infobox', 'lead') and r['span']['precision'] in ('day', 'month'):
            by[r['cluster']].setdefault(r['kind'], set()).add(r['span']['start'])
    for cl, d in sorted(by.items()):
        if 'infobox' in d and 'lead' in d and not (d['infobox'] & d['lead']):
            conf.append(f'- {cl}: infobox {", ".join(iso(x) for x in sorted(d["infobox"], key=sortable))}; lead {", ".join(iso(x) for x in sorted(d["lead"], key=sortable))}')
    md += ['', f'## Infobox and lead disagree ({len(conf)})', ''] + (conf[:40] or ['- none'])
    if wd:
        boxes = [r for r in rows if r['kind'] == 'infobox']
        c = Counter('differs' if r['wikidata'].startswith('differs') else r['wikidata'] for r in boxes)
        dated = c['agree'] + c['differs']
        others = [r for r in rows if r['kind'] not in ('infobox', 'prose')]
        jul = sum('Julian' in r['wikidata'] for r in boxes)
        md += ['', f'## Wikidata ({wd.dump})', '',
               f'- Infobox rows (the articles\' own dates, {len(boxes)}): {dated} have a Wikidata date for their article '
               f'({dated / max(1, len(boxes)):.0%}); {c["agree"]} agree, {c["differs"]} differ ({c["differs"] / max(1, dated):.0%} of '
               f'those with a date); {c["no date"]} items without a date; {c["no item"]} articles without an item.',
               f'- Table, lead and heading rows ({len(others)}): {sum(r["wikidata"] == "agree" for r in others)} match a Wikidata date '
               f'of their article (they may date something else, so a mismatch isn\'t counted).',
               f'- Differences naming a Julian-calendar value: {jul}.',
               f'- Articles found by the Wikidata part-of route: {rep["routes"].get("wikidata", 0)}.', '',
               '| Article | Wikipedia | Wikidata |', '|---|---|---|']
        for r in [r for r in boxes if r['wikidata'].startswith('differs')][:30]:
            md.append(f'| {r["cluster"]} | {span_txt(r["span"])} | {r["wikidata"][9:].replace("|", "/")} |')
    sample = rows[::max(1, len(rows) // 20)][:20]
    md += ['', '## 20 sample rows (every nth)', '', '| Dates | Kind | Title | Source location |', '|---|---|---|---|']
    for r in sample:
        t = (r.get('title_suggestion') or r['article']).replace('|', '/')
        md.append(f'| {span_txt(r["span"])} | {r["kind"]} | {t[:70]} | {r["sourceLocation"][:90].replace("|", "/")} |')
    open(os.path.join(out, 'report.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')


if __name__ == '__main__':
    main()
