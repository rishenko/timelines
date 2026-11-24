"""
Disasters harvest (v2 step 2, pilot): for each event in pilot-disasters.json, reads the Wikipedia article from the dump and
writes a candidate record (the v2 contract in the Workbench brief) to $TIMELINES_DATA/v2/candidates/disaster.jsonl
plus a manifest beside it.

    pipelines/extract/.venv/bin/python -I pipelines/v2/harvest/disasters.py [--data DIR]

Per event:
  - dates: every date the article gives for the event, each with its verbatim quote and locator: the infobox's date
    fields (`infobox <field>`) and the lead's sentence with the date (`lead`). A date is kept only if its quote is found
    in the article's wikitext or plain text (the quote gate). Wikidata's year (P580/P585/P571, from the dump) joins as
    `from: wikidata`, only beside quoted dates, and is never the headline by itself.
  - measures: magnitude, VEI, deaths from the infobox, each with its quote.
  - places: the QIDs of the pilot's country articles (extract DB `qid` table); notability: inlinks (sitelinks and
    pageviews are not on hand).
An article with an AI-generated-text notice is refused (no flagged sources). Nothing here touches data-src.
"""
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path[:0] = [os.path.join(ROOT, 'pipelines', 'common'), os.path.join(ROOT, 'pipelines', 'extract')]
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
import mwparserfromhell as mw  # noqa: E402
import wp_dump  # noqa: E402
from dates import spans, clean  # noqa: E402
from wd_join import WD  # noqa: E402

ADAPTER = 'disasters@1'
DATE_FIELDS = ('date', 'start_date', 'end_date', 'timestamp', 'dates', 'time', 'local_date', 'period')  # not 'year': an effects box's year is the year of the toll, not the event
MEASURES = {'magnitude': ('magnitude', 'mag'), 'vei': ('vei',), 'deaths': ('deaths', 'fatalities', 'total_fatalities', 'casualties', 'killed', 'total_deaths')}
REF = re.compile(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>|\{\{(sfn|efn|r|sfnp|harvnb)[^}]*\}\}', re.S | re.I)
SENT = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')


DASH = re.compile(r'\{\{\s*(snds?|ndash|spaced ndash|spnd|nbsndash)\s*\}\}', re.I)


def plain(s):
    """Plain text of a wikitext fragment. {{snd}}/{{snds}} stay a dash ("28 July 1914{{snd}}11 November 1918" must not collapse to
    "191411 November 1918"); whole templates go first, so a footnote ({{Efn|… <ref>…</ref> …}}) takes its refs and braces with it."""
    s = DASH.sub(' – ', s)
    code = mw.parse(s)
    for tpl in code.filter_templates(recursive=False):
        try:
            code.remove(tpl)
        except ValueError:
            pass
    s = re.sub(r'</?ref[^>]*>', '', REF.sub('', str(code)))
    return re.sub(r'\s+', ' ', mw.parse(s).strip_code().replace('&nbsp;', ' ')).strip()


def norm(s):
    return re.sub(r'\s+', ' ', s.replace(' ', ' ')).strip().lower()


def infoboxes(code):
    """Every infobox of the article, nested ones too (a volcano's article holds its eruption's box)."""
    return [t for t in code.filter_templates(recursive=True) if str(t.name).strip().lower().startswith('infobox')]


FILES = re.compile(r'\[\[\s*(file|image):(?:[^\[\]]|\[\[[^\]]*\]\])*\]\]', re.I)


def body_sentences(code, lead_only=True):
    """Plain sentences of the lead (or, with lead_only False, the whole article), without files and templates."""
    text = FILES.sub('', str(code))
    if lead_only:
        first = re.search(r'^==', text, re.M)
        text = text[:first.start()] if first else text
    c = mw.parse(text)
    for t in c.filter_templates(recursive=False):
        try:
            c.remove(t)
        except ValueError:
            pass
    s = plain(str(c))
    return [x for x in SENT.split(s) if x]


def lead_sentences(code):
    """The lead's plain sentences (before the first heading), without the infobox and templates' leftovers."""
    text = str(code)
    first = re.search(r'^==', text, re.M)
    lead = mw.parse(text[:first.start()] if first else text)
    for t in lead.filter_templates(recursive=False):
        try:
            lead.remove(t)
        except ValueError:
            pass
    s = plain(str(lead))
    return [x for x in SENT.split(s) if x]


def claim(side, v, circa, quote, locator, src='wikipedia'):
    d = {'side': side, 'year': v[0], 'circa': bool(circa), 'quote': quote, 'locator': locator, 'from': src}
    if v[1]:
        d['month'] = v[1]
    if v[2]:
        d['day'] = v[2]
    return d


def date_claims(raw, locator, wikitext_norm, plain_norm):
    """Claims from one quoted text: its first span's start and (if any) end. The quote must be in the article."""
    q = REF.sub('', str(raw)).strip() if '{{' in str(raw) and re.search(r'\{\{\s*(start|end|date|dts|birth|death|value)', str(raw), re.I) else plain(raw)
    q = q or plain(REF.sub('', str(raw)).replace('{{', '').replace('}}', '').replace('|', ' '))
    if not q or not (norm(q) in plain_norm or norm(str(raw)) in wikitext_norm or norm(q) in wikitext_norm
                     or norm(REF.sub('', str(raw))) in wikitext_norm):
        return [], 'quote not found'
    out = []
    iso = re.match(r'(\d{4})-(\d\d)-(\d\d)\b', q)
    if iso:  # "1948-10-05 20:12:09"
        return [claim('start', (int(iso[1]), int(iso[2]), int(iso[3])), False, q[:300], locator)], None
    all_sp = spans(raw)
    if len(all_sp) > 1 and re.fullmatch(r'[\d\s,;–—\-]+', q):  # a bare list of years ("993, 1010, 1018–1019": a war's campaigns): first start to last end
        last = all_sp[-1]
        out.append(claim('start', all_sp[0]['start'], all_sp[0]['circa'], q[:300], locator))
        out.append(claim('end', last['end'] or last['start'], last['circa'], q[:300], locator))
        return out, None
    for sp in all_sp[:1]:
        out.append(claim('start', sp['start'], sp['circa'], q[:300], locator))
        if sp['end']:
            out.append(claim('end', sp['end'], sp['circa'], q[:300], locator))
    return out, None if out else 'no date read'


def main():
    pilot = json.load(open(os.path.join(HERE, '..', 'pilot-disasters.json')))['events']
    out_dir = os.path.join(settings.DATA, 'v2', 'candidates')
    os.makedirs(out_dir, exist_ok=True)
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    wd = WD.open(settings.DATA)

    def qid(title):
        r = db.execute('SELECT q.qid FROM page p JOIN qid q ON q.page_id=p.page_id WHERE p.title=? AND p.ns=0', (title,)).fetchone()
        if not r:  # a redirect: follow it
            r = db.execute('SELECT q.qid FROM page p JOIN page t ON t.title=p.redirect_to JOIN qid q ON q.page_id=t.page_id WHERE p.title=? AND p.ns=0', (title,)).fetchone()
        return r[0] if r else None

    n, log = 0, []
    with open(os.path.join(out_dir, 'disaster.jsonl'), 'w') as f:
        for seed in pilot:
            p = wp_dump.page(seed['title'])
            if not p:
                log.append(f"{seed['title']}: missing"); continue
            if wp_dump.ai_flagged(p['text']):
                log.append(f"{seed['title']}: AI-flagged, refused"); continue
            code = mw.parse(p['text'])
            wt, pl = norm(p['text']), norm(plain(p['text']))
            boxes = infoboxes(code)
            dates, measures, dropped = [], {}, []
            for box in boxes:
                for prm in box.params:
                    k = str(prm.name).strip()
                    kl = k.lower()
                    raw = str(prm.value).strip()
                    if not raw:
                        continue
                    if kl in DATE_FIELDS:
                        side = 'end' if kl == 'end_date' else 'start'
                        cl, why = date_claims(raw, f'infobox {k}', wt, pl)
                        if side == 'end':
                            cl = [dict(c, side='end') for c in cl[:1]]
                        dates += cl
                        if why:
                            dropped.append(f'infobox {k}: {why}')
                    for m, names in MEASURES.items():
                        if kl in names and m not in measures:
                            q = plain(raw)
                            mult = 1e6 if re.search(r'\bmillion\b', q, re.I) else 1
                            nums = [float(x.replace(',', '')) * mult for x in re.findall(r'\d[\d,]*\.?\d*', q)]
                            if nums:
                                rng = re.search(r'(\d[\d,]*\.?\d*)\s*(million)?\s*(?:–|—|-|to)\s*(\d[\d,]*\.?\d*)\s*(million)?', q, re.I)
                                lo = hi = nums[0]
                                if rng:  # a sourced range keeps both ends ("5,000–45,000", "1–10 million")
                                    big = 1e6 if (rng.group(4) or rng.group(2)) else mult
                                    lo, hi = float(rng.group(1).replace(',', '')) * (1e6 if rng.group(2) else big), float(rng.group(3).replace(',', '')) * big
                                big_nums = [n for n in nums if n >= 1000]
                                if not rng and m == 'deaths' and len(big_nums) >= 2:  # several records in one field: the range they span
                                    lo, hi = min(big_nums), max(big_nums)
                                measures[m] = {'value': lo, 'low': lo, 'high': hi, 'all': nums[:4], 'quote': q[:200], 'locator': f'infobox {k}'}
            if seed.get('find'):
                hits = [x for x in body_sentences(code, False) if all(w.lower() in x.lower() for w in seed['find'])]
                sents = hits[:1]
            else:
                sents = body_sentences(code)[:4]
            if seed.get('find'):  # a long article sentence about many events: quote only the clause at the first keyword
                def clause(x):
                    k = min((x.lower().find(w.lower()) for w in seed['find'] if w.lower() in x.lower()), default=0)
                    a = max(0, k - 12)
                    while a and x[a - 1] != ' ':  # start at a word, not inside one
                        a -= 1
                    return x[a:k + 150].rsplit(' ', 1)[0] if len(x) > k + 150 else x[a:]
                sents = [clause(x) for x in sents]
            for i, sent in enumerate(sents):
                if re.search(r'\b(1[0-9]{3}|[1-9][0-9]{2})\b|\b(BC|BCE|AD|CE)\b', sent):
                    cl, why = date_claims(sent, 'sentence' if seed.get('find') else f'lead sentence {i + 1}', wt, pl)
                    dates += cl[:2]
                    break
                elif seed.get('find'):
                    dropped.append('find: no date in sentence')
            also = None
            if seed.get('also'):
                sents = body_sentences(code, False)
                quotes = []
                for needle in seed['also']['finds']:
                    hit = next((x for x in sents if needle.lower() in x.lower()), None)
                    if hit and norm(hit) in pl:
                        quotes.append({'quote': hit[:400], 'locator': 'sentence'})
                    else:
                        dropped.append(f'also: no sentence with {needle!r}')
                also = {'sub': seed['also']['sub'], 'quotes': quotes}
            places = [q for q in (qid(c) for c in seed['countries']) if q]
            q = qid(p['title'])
            if q and wd:
                for side, lst in wd.dates(q).items():
                    for y, m, d, prop, cal in lst:
                        dates.append({'side': side, 'year': y if y > 0 else y + 1, 'circa': False, 'from': 'wikidata', 'locator': prop,
                                      **({'month': m} if m else {}), **({'day': d} if d else {})})
            inl = db.execute('SELECT n FROM inlink WHERE title=?', (p['title'],)).fetchone()
            rec = {'qid': q, 'kind': 'disaster', 'sub': seed['sub'], 'title': p['title'], 'seed': seed['title'],
                   'wp': {'title': p['title'], 'dump': settings.DUMP_NAME}, 'dates': dates, 'places': places,
                   'countries': seed['countries'], 'measures': measures, 'notability': {'inlinks': inl[0] if inl else None},
                   'harvest': {'adapter': ADAPTER, 'at': os.environ.get('HARVEST_DATE', '2026-11-23')},
                   **({'dropped': dropped} if dropped else {}), **({'span': seed['span']} if seed.get('span') else {}), **({'also': also} if also else {}), **({'label': seed['label']} if seed.get('label') else {}),
                   **({'wide': True} if seed.get('wide') else {}), **({'flag': seed['flag']} if seed.get('flag') else {})}
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            n += 1
    json.dump({'adapter': ADAPTER, 'wikipedia': settings.DUMP_NAME, 'wikidata': wd.dump if wd else None, 'count': n, 'log': log},
              open(os.path.join(out_dir, 'disaster.manifest.json'), 'w'), indent=1)
    print(f'{n} candidates', *log, sep='\n')


if __name__ == '__main__':
    main()
