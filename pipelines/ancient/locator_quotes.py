"""
Quote backfill for section-only locators (pilot, 2026-11-24): an Ancient event whose Wikipedia locator names only a section
("lead and Description", "infobox") gets the sentence from that article that states its date, so the locator can be checked
by machine like the newer data. Nothing changes a date: an event no sentence supports is flagged, not re-dated.

    pipelines/.venv/bin/python -I pipelines/ancient/locator_quotes.py --find 20     # candidates for a seeded sample -> stdout (review by hand)
    pipelines/.venv/bin/python -I pipelines/ancient/locator_quotes.py --check       # every quote in locator-quotes.json is on its page and states the year

The reviewed quotes live in pipelines/ancient/locator-quotes.json ({uuid: {source, quote}} or {uuid: {source, none: reason}});
scripts/ancient-classical/locator-quotes.ts writes them into data-src (a locator 'lead' becomes 'lead: "<quote>"').
"""
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'pipelines', 'common'))
import traditions  # noqa: E402  (render: the same plain text the traditions check uses)
import wp_dump  # noqa: E402

PLAN = os.path.join(HERE, 'locator-quotes.json')
DATA = os.path.join(ROOT, 'data-src', 'ancient-classical.json')


def unquoted(loc):
    """A locator with no quoted text: no double quotes and no single-quoted passage ("navbox '3rd dynasty of Uruk, 2358–2334 BC'" is quoted)."""
    return not re.search(r'["“]|\'[^\']{6,}\'', loc or '')


def year_forms(start):
    """The ways a sentence may state the event's start: '1400 BCE', '1400 BC', '1400 B.C.', 'AD 568', '568'."""
    m = re.search(r'(\d+)\s*(BCE|CE)?', str(start))
    if not m:
        return []
    n, era = m.group(1), m.group(2) or ('BCE' if str(start).startswith('-') else 'CE')
    if era == 'BCE':
        return [rf'\b{n}\s*(?:(?:–|-|to)\s*\d+\s*)?(?:BCE|BC|B\.C\.)']  # '544 BCE', or a range '544 to 492 BCE'
    return [rf'\b(?:AD\s*)?{n}\b(?!\s*(?:BCE|BC|B\.C\.))']


def title_of(src):
    """The article a source names: 'Wikipedia: X' (Ancient) or 'X (Wikipedia)' (the generators)."""
    return re.sub(r'^Wikipedia:\s*|\s*\(Wikipedia\)$', '', src['name'])


def sentences(title):
    p = wp_dump.page(title)
    if not p or wp_dump.ai_flagged(p['text']):
        return None
    t = traditions.render(p['text'])
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z"(])|\n+', t) if 20 < len(s.strip()) < 600]


def candidates(e, sources):
    out = []
    for s in e['sources']:
        if not s['sourceKey'].startswith('wp-') or not unquoted(s.get('sourceLocation')):
            continue
        title = title_of(sources[s['sourceKey']])
        sents = sentences(title)
        if sents is None:
            out.append((s['sourceKey'], title, None))
            continue
        pats = year_forms(e['start'])
        hits = [x for x in sents if any(re.search(p, x) for p in pats) and not x.startswith(('|', '{', 'thumb'))]
        out.append((s['sourceKey'], title, hits[:3]))
    return out


def find(n):
    d = json.load(open(DATA))
    pool = [e for e in d['events'] if not e['uuid'].startswith('reign-')
            and any(s['sourceKey'].startswith('wp-') and unquoted(s.get('sourceLocation')) for s in e.get('sources', []))]
    for e in random.Random(20261124).sample(pool, n):
        print(f"== {e['uuid']} | {e['title']} | {e['start']}–{e.get('end', '')}")
        for key, title, hits in candidates(e, d['sources']):
            loc = next(s['sourceLocation'] for s in e['sources'] if s['sourceKey'] == key)
            print(f'   {key} ({title}) loc={loc!r}')
            for h in (hits or ['(no sentence states the year)'] if hits is not None else ['(page missing or AI-flagged)']):
                print('      >', h[:300])


def check():
    plan = json.load(open(PLAN))
    d = json.load(open(DATA))
    ev = {e['uuid']: e for e in d['events']}
    bad, n = [], 0
    for uuid, p in plan['events'].items():
        if 'none' in p:
            continue
        n += 1
        e = ev.get(uuid)
        if not e:
            bad.append(f'{uuid}: no such event')
            continue
        title = title_of(d['sources'][p['source']])
        page = wp_dump.page(title)['text']
        raw = re.sub(r'\{\{(?:circa|c\.)\}\}', 'c.', page, flags=re.I)
        raw = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', raw)  # infobox fields as written, links as their text (as traditions.check)
        text = re.sub(r'\s+', ' ', traditions.render(page) + ' ' + raw)
        if re.sub(r'\s+', ' ', p['quote']) not in text:
            bad.append(f'{uuid}: quote not in {title!r}')
        if not any(re.search(x, p['quote']) for x in year_forms(e['start'])) and not p.get('dateBy'):
            bad.append(f"{uuid}: the quote doesn't state the start ({e['start']}) and gives no dateBy")
        loc = next((s['sourceLocation'] for s in e['sources'] if s['sourceKey'] == p['source']), '')
        if unquoted(loc):
            bad.append(f'{uuid}: its locator still carries no quote (run scripts/ancient-classical/locator-quotes.ts)')
    for b in bad:
        print(b)
    failed = len({b.split(':')[0] for b in bad})
    print(f'locator quotes: {n - failed}/{n} ok; {sum("none" in p for p in plan["events"].values())} flagged with no supporting sentence')
    return not bad


if __name__ == '__main__':
    if '--find' in sys.argv:
        find(int(sys.argv[sys.argv.index('--find') + 1]))
    elif '--check' in sys.argv:
        sys.exit(0 if check() else 1)
    else:
        print(__doc__)
