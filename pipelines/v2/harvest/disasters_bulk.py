"""
Disasters bulk harvest, harvest only (v2 step 3 plan): reads every article whose infobox is a disaster type and writes a light
candidate record per article (no emit), so the review file can show how many pass the thresholds in each region × era.

    pipelines/extract/.venv/bin/python -I pipelines/v2/harvest/disasters_bulk.py [--limit N]

Writes $TIMELINES_DATA/v2/candidates/disaster-bulk.jsonl. Per article: sub-kind (from the infobox type and the article's
categories), the start year (the first quoted date of the infobox, else the lead), magnitude, VEI (the "VEI-n eruptions"
category or the infobox), deaths as a range with its quote, and the countries named in its categories ("Earthquakes in
Turkey") with their region. Nothing here is a date source for the timelines: the pilot's quote gate applies when a candidate
is emitted. An article with an AI-generated-text notice is skipped.
"""
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'extract'), os.path.join(HERE, '..')]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import mwparserfromhell as mw  # noqa: E402
import wp_dump  # noqa: E402
import regions  # noqa: E402
from dates import spans  # noqa: E402

TYPES = ('earthquake', 'eruption', 'flood', 'weather event', 'famine', 'pandemic', 'disease outbreak')
REF = re.compile(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>|\{\{(?:sfn|efn|r|sfnp|harvnb)[^}]*\}\}', re.S | re.I)
DATE_F = ('date', 'start_date', 'timestamp', 'local_date', 'dates', 'time', 'formed', 'period', 'year')
DEATH_F = ('deaths', 'fatalities', 'total_fatalities', 'casualties', 'killed', 'total_deaths', 'direct_fatalities')


def plain(s):
    return re.sub(r'\s+', ' ', mw.parse(REF.sub('', s)).strip_code().replace('&nbsp;', ' ')).strip()


def nums(q):
    mult = 1e6 if re.search(r'\bmillion\b', q, re.I) else 1
    return [float(x.replace(',', '')) * mult for x in re.findall(r'\d[\d,]*\.?\d*', q)]


def sub_of(box_type, cats):
    c = ' | '.join(cats).lower()
    if box_type == 'earthquake':
        return 'earthquake'
    if box_type == 'eruption':
        return 'eruption'
    if box_type == 'flood':
        return 'flood'
    if box_type == 'famine':
        return 'famine'
    if box_type in ('pandemic', 'disease outbreak'):
        return 'epidemic'
    if re.search(r'tropical cyclone|hurricane|typhoon|tornado|blizzard|storm|cyclone', c):
        return 'storm'
    if re.search(r'flood', c):
        return 'flood'
    if re.search(r'heat wave|cold wave|winter|freez', c):
        return 'extreme-temperature'
    if re.search(r'drought', c):
        return 'drought'
    return 'weather'


def main():
    limit = int(ARGS[ARGS.index('--limit') + 1]) if '--limit' in ARGS else None
    out_dir = os.path.join(settings.DATA, 'v2', 'candidates')
    os.makedirs(out_dir, exist_ok=True)
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    q = ('SELECT p.page_id, p.title, p.infobox_type, q.qid FROM page p LEFT JOIN qid q ON q.page_id=p.page_id '
         f'WHERE p.ns=0 AND p.redirect_to IS NULL AND p.ai_flag=0 AND p.infobox_type IN ({",".join("?" * len(TYPES))}) ORDER BY p.page_id')
    pages = db.execute(q, TYPES).fetchall()
    if limit:
        pages = pages[:limit]
    n = skipped = 0
    with open(os.path.join(out_dir, 'disaster-bulk.jsonl'), 'w') as f:
        for pid, title, itype, qid in pages:
            cats = [r[0] for r in db.execute('SELECT name FROM category WHERE page_id=?', (pid,))]
            pg = wp_dump.page(title)
            if not pg or wp_dump.ai_flagged(pg['text']):
                skipped += 1
                continue
            code = mw.parse(pg['text'])
            boxes = [t for t in code.filter_templates(recursive=True) if str(t.name).strip().lower().startswith('infobox')]
            year = None
            dq = None
            mag = vei = None
            deaths = None
            for box in boxes:
                for prm in box.params:
                    k = str(prm.name).strip().lower()
                    raw = str(prm.value).strip()
                    if not raw:
                        continue
                    if k in DATE_F and year is None:
                        iso = re.match(r'\s*(-?\d{3,4})-\d\d-\d\d', plain(raw))
                        sp = [{'start': (int(iso[1]), None, None)}] if iso else spans(raw)[:1]
                        if sp:
                            year, dq = sp[0]['start'][0], plain(raw)[:120]
                    if k in ('magnitude', 'mag') and mag is None:
                        v = nums(plain(raw))
                        mag = v[0] if v else None
                    if k == 'vei' and vei is None:
                        v = nums(plain(raw))
                        vei = v[0] if v else None
                    if k in DEATH_F and deaths is None:
                        qq = plain(raw)
                        v = [x for x in nums(qq) if x >= 1] if qq else []
                        big = [x for x in v if x >= 10]
                        if big:
                            deaths = {'low': min(big[:4]), 'high': max(big[:4]), 'quote': qq[:160]}
            if year is None:
                m = re.search(r'\b(1[0-9]{3}|[1-9][0-9]{2}|20[0-2][0-9])\b', pg['text'][:600])
                year = int(m.group(1)) if m else None
            for c in cats:
                m = re.match(r'VEI-(\d) eruptions', c)
                if m and vei is None:
                    vei = float(m.group(1))
            places = []
            for c in cats:
                m = re.match(r'(?:.*?\b(?:in|of|on)\b )(.+)$', c)
                if m and not re.search(r'\d', c):
                    reg = regions.region_of(m.group(1))
                    if reg:
                        places.append((m.group(1), reg))
            rec = {'title': pg['title'], 'qid': qid, 'box': itype, 'sub': sub_of(itype, cats), 'year': year, 'dateQuote': dq,
                   'magnitude': mag, 'vei': vei, 'deaths': deaths, 'places': places[:4], 'cats': cats[:6]}
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            n += 1
    print(f'{n} candidates, {skipped} skipped (missing or AI-flagged), {len(pages)} pages in the pool')


if __name__ == '__main__':
    main()
