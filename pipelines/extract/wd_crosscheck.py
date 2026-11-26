"""
Wikidata cross-check of the compiled timelines (report only; Wikidata is not a date source, nothing here edits data).
For each unit with a dated claim and a Wikipedia article, Wikidata's dates for that article's item are set beside ours:

  row     a row's span (start/end) against the item of the row's own article (`url`, or `ids.wikidata`)
  phase   a phase's span against the item of the article its first start date cites
  event   an event's start/end against the item of the article it cites, only when that article is the event's own
          (the event's title and the article's title share their words); an event that merely cites a polity's article
          ("Otto I crowned emperor" on Holy Roman Empire) is counted as `host` and not compared.
Reigns (reign-*) are left out: the rulers pass compares them against the office's own terms.

    pipelines/extract/.venv/bin/python -I pipelines/extract/wd_crosscheck.py [--out DIR] [timeline ...]

Writes, per timeline, <out>/crosscheck-<timeline>.jsonl (the v2 candidate shape keyed by QID: qid, kind, title, wp,
dates = ours and Wikidata's claims, verdict, region, era) and <out>/crosscheck-summary.md: the verdict tally by unit and
the region × era table of disagreements and missing items. Default out: pipelines/out/crosscheck.
Verdicts: agree, differs, no date (Wikidata has no usable date), no item (article has no Wikidata item), host.
"""
import json
import os
import re
import sys
from collections import Counter, defaultdict
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import settings  # noqa: E402
from wd_join import WD, compare  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
ERAS = ['before 500 BCE', '500 BCE–500 CE', '500–1500', '1500–1800', '1800 on']
STOP = {'the', 'of', 'and', 'in', 'a', 'an', 'to', 'for', 'de', 'la', 'le'}


def era(y):
    return ERAS[0 if y < -500 else 1 if y < 500 else 2 if y < 1500 else 3 if y < 1800 else 4]


def hist(y):
    """The astronomical year the files store -> the historical year Wikidata and wd_join use (0 = 1 BC -> -1)."""
    return y - 1 if y <= 0 else y


def title_of(url):
    return unquote(url.rsplit('/wiki/', 1)[-1]).replace('_', ' ')


def words(s):
    return {w for w in re.findall(r'\w+', re.sub(r'\(.*?\)', '', s.lower())) if w not in STOP}


def own_article(event_title, article):
    a, e = words(article), words(event_title)
    return bool(a) and len(a & e) >= 0.7 * max(len(a), len(e))


def span_of(o, pre=''):
    """{'start': (y, m, d), 'end': (y, m, d) or None} in historical years, from start/startMonth/startDay fields."""
    def pt(k):
        if o.get(k) is None:
            return None
        return (hist(o[k]), o.get(k + 'Month'), o.get(k + 'Day'))
    return {'start': pt('start'), 'end': pt('end')}


def iso(v):
    return None if not v else '-'.join(str(x) for x in v if x is not None)


def run(timeline, wd, qid_of, out):
    d = json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{timeline}.json'), encoding='utf-8'))
    tracks = {t['id']: t for t in d['tracks']}

    def top(tid):
        t = tracks.get(tid)
        while t and t.get('parent') in tracks:
            t = tracks[t['parent']]
        return t['name'] if t else 'unplaced'

    def article(key):
        s = d['sources'].get(key or '')
        return title_of(s['url']) if s and s.get('url', '').startswith('https://en.wikipedia.org/wiki/') else None

    units = []
    for t in d['tracks']:
        sp = t.get('span')
        segs = sp if isinstance(sp, list) else [sp] if sp else []  # a row with a gap has one span per stretch
        for i, s in enumerate(segs):
            if s.get('start') is None:
                continue
            if isinstance(sp, list):  # each stretch cites its own article
                key = ((s.get('startDates') or [{}])[0].get('source') or {}).get('sourceKey')
                units.append(('row', f"{t['id']}#{i + 1}", t['name'], t['id'], article(key), None, span_of(s), s['start']))
            else:
                units.append(('row', t['id'], t['name'], t['id'], title_of(t['url']) if t.get('url') else None,
                              (t.get('ids') or {}).get('wikidata'), span_of(s), s['start']))
        for p in t.get('phases', []):
            key = ((p.get('startDates') or [{}])[0].get('source') or {}).get('sourceKey')
            units.append(('phase', f"{t['id']}/{p['name']}", p['name'], t['id'], article(key), None, span_of(p), p['start']))
    for e in d['events']:
        if e['uuid'].startswith('reign-'):
            continue
        key = (e['sources'][0] or {}).get('sourceKey') if e.get('sources') else None
        art = article(key)
        units.append(('event', e['uuid'], e['title'], e['tracks'][0], art, None, span_of(e), e['start']))

    tally, table, missing = Counter(), defaultdict(Counter), []
    with open(os.path.join(out, f'crosscheck-{timeline}.jsonl'), 'w', encoding='utf-8') as f:
        for kind, uid, title, row, art, qid, span, start in units:
            region, e_ = top(row), era(start)
            if art is None:
                verdict, dates = 'no article', {'start': [], 'end': []}
            else:
                qid = qid or qid_of(art)
                if kind in ('event', 'phase') and not own_article(title, art):
                    verdict, dates = 'host', {'start': [], 'end': []}
                elif not qid:
                    verdict, dates = 'no item', {'start': [], 'end': []}
                else:
                    dates = wd.dates(qid)
                    verdict = compare(span, dates)
                    verdict = verdict.split(':')[0] if verdict.startswith('differs') else verdict
                    detail = compare(span, dates)
                    if verdict == 'differs':
                        side = 'end' if detail.startswith('differs: end') else 'start'
                        ref = span[side]
                        vals = [v[0] for v in (dates['end'] if side == 'end' else dates['start'])]
                        delta = min((abs(v - ref[0]) for v in vals), default=None) if ref else None
            tally[(kind, verdict)] += 1
            if verdict == 'differs':
                tally[(kind, 'small' if delta is not None and delta <= 10 else 'large')] += 1
            table[(region, e_)][verdict] += 1
            rec = {'qid': qid, 'kind': kind, 'id': uid, 'title': title, 'wp': {'title': art, 'dump': settings.DUMP_NAME},
                   'dates': {'ours': {'start': iso(span['start']), 'end': iso(span['end'])},
                             'wikidata': {s: [list(v[:3]) + [v[3]] for v in dates[s]] for s in ('start', 'end')}},
                   'verdict': verdict, 'region': region, 'era': e_}
            if verdict == 'differs':
                rec['detail'] = detail
                rec['deltaYears'] = delta
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    return tally, table


def main():
    args = sys.argv[1:]
    out = os.path.join(ROOT, 'pipelines', 'out', 'crosscheck')
    if '--out' in args:
        i = args.index('--out')
        out = args[i + 1]
        del args[i:i + 2]
    names = args or TIMELINES
    os.makedirs(out, exist_ok=True)
    import sqlite3
    wd = WD.open(settings.DATA)
    db = sqlite3.connect(f'file:{os.path.join(settings.DATA, "wikidata", "wikidata-20261116.sqlite")}?mode=ro', uri=True)
    cache = {}

    def qid_of(title):
        if title not in cache:
            r = db.execute('SELECT qid FROM wd_item WHERE enwiki=?', (title,)).fetchone()
            cache[title] = r[0] if r else None
        return cache[title]

    lines = ['# Wikidata cross-check (report only)', '', f'Wikidata dump {wd.dump}; Wikipedia {settings.DUMP_NAME}.', '']
    for t in names:
        tally, table = run(t, wd, qid_of, out)
        lines += [f'## {t}', '', '| unit | agree | differs | of which ≤10 yrs | of which >10 yrs | no date | no item | no article | host |', '|---|---|---|---|---|---|---|---|---|']
        for kind in ('row', 'phase', 'event'):
            lines.append(f'| {kind} | ' + ' | '.join(str(tally[(kind, v)]) for v in
                         ('agree', 'differs', 'small', 'large', 'no date', 'no item', 'no article', 'host')) + ' |')
        lines += ['', 'Region × era (differs / compared = agree + differs; the rest count no date, no item, no article, host):', '',
                  '| region | ' + ' | '.join(ERAS) + ' |', '|---|' + '---|' * len(ERAS)]
        for region in sorted({r for r, _ in table}):
            cells = []
            for e_ in ERAS:
                c = table[(region, e_)]
                cells.append(f"{c['differs']}/{c['agree'] + c['differs']} (+{sum(c.values()) - c['agree'] - c['differs']})" if c else '·')
            lines.append(f'| {region} | ' + ' | '.join(cells) + ' |')
        lines.append('')
    open(os.path.join(out, 'crosscheck-summary.md'), 'w', encoding='utf-8').write('\n'.join(lines))
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
