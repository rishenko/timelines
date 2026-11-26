"""
reign-pages: the pages behind a reign, read the same way by every session and every blind reader (Kevin 2026-11-26: "I want everybody to do lookups
the same way repeatedly"; "efficient, quick, doesn't use a lot of resources, but is automated via code to retrieve"). Plain code, local only: the
committed timelines, the Wikipedia dump (wp_dump) and the Wikidata item table. No model, no network.

    npm run reign-pages -- <uuid> [<uuid> ...] [--from FILE] [--full]
    python3 -I pipelines/common/reign_pages.py <uuid> ...

For each reign it prints three pages, each with its title, Wikidata QID and the dump revision read:
  person  the reign's own source page (the first source that is not a list page; an offices event's first source is its list page)
  realm   the page of the row's Wikidata item (Track.ids.wikidata)
  office  the first link in the person's infobox office fields (succession, title, office, office1…)
then each page's infobox and lead (the whole page with --full). A page the dump does not hold prints "no page"; a missing QID prints "none". Nothing
is guessed. $TIMELINES_REPO names another checkout to read the timelines from (a blind reader's copy). Lookups are cached in ~/data/reign-pages-cache.jsonl (one line per dump + title), so a repeat costs a few milliseconds.
"""
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get('TIMELINES_REPO') or os.path.normpath(os.path.join(HERE, '..', '..'))  # a reader's folder points it at the read's frozen checkout
sys.path[:0] = [HERE]
import data_root  # noqa: E402

TIMELINES = ('ancient-classical', 'medieval', 'modern-states')
CACHE = os.path.expanduser(os.environ.get('REIGN_PAGES_CACHE', '~/data/reign-pages-cache.jsonl'))
OFFICE_FIELDS = ('succession', 'title', 'office', 'office1', 'reign_type', 'order')
INFOBOX_MAX, LEAD_MAX = 3500, 2500


def infobox_and_lead(text):
    """The first {{Infobox …}} (braces balanced) and the lead: the text before the first heading, with that infobox taken out."""
    box = ''
    m = re.search(r'\{\{\s*Infobox', text, re.I)
    if m:
        depth, i = 0, m.start()
        while i < len(text) - 1:
            two = text[i:i + 2]
            if two == '{{':
                depth += 1; i += 2; continue
            if two == '}}':
                depth -= 1; i += 2
                if depth == 0:
                    break
                continue
            i += 1
        box = text[m.start():i]
    body = text.replace(box, '', 1) if box else text
    lead = re.split(r'\n==[^=]', body, maxsplit=1)[0]
    lead = re.sub(r'^\s*(\{\{[^{}]*\}\}\s*)+', '', lead.strip())  # hatnotes and short-description templates before the first sentence
    return box, lead.strip()


def office_link(box):
    """The first [[link]] in the infobox's office fields, or None."""
    for f in OFFICE_FIELDS:
        m = re.search(rf'^\s*\|\s*{f}\s*=\s*(.*)$', box, re.M | re.I)
        if m:
            link = re.search(r'\[\[([^\]|#]+)', m.group(1))
            if link:
                return link.group(1).strip()
    return None


def person_source(event, sources):
    """The reign's own page: its first source that is not a list page (offices events cite the list page first, the person's page second)."""
    for s in event.get('sources', []):
        src = sources.get(s['sourceKey'], {})
        title = _title(src)
        if title and not title.startswith('List of'):
            return title
    return _title(sources.get(event['sources'][0]['sourceKey'], {})) if event.get('sources') else None


def _title(src):
    url = src.get('url', '')
    if '/wiki/' not in url:
        return None
    from urllib.parse import unquote
    return unquote(url.rsplit('/wiki/', 1)[-1]).replace('_', ' ')


class Cache:
    def __init__(self, path):
        self.path, self.rows = path, {}
        if os.path.exists(path):
            for line in open(path, encoding='utf-8'):
                r = json.loads(line)
                self.rows[(r['dump'], r['asked'])] = r

    def get(self, dump, title):
        return self.rows.get((dump, title))

    def put(self, r):
        self.rows[(r['dump'], r['asked'])] = r
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


_wd = None


def _wd_db():
    global _wd
    if _wd is None:
        _wd = sqlite3.connect(f'file:{data_root.where("wikidata", "wikidata-20261116.sqlite")}?mode=ro', uri=True)
    return _wd


def qid_of_title(title):
    if not title:
        return None
    x = _wd_db().execute('select qid from wd_item where enwiki=?', (title,)).fetchone()
    return x[0] if x else None


def title_of_qid(qid):
    if not qid:
        return None
    x = _wd_db().execute('select enwiki from wd_item where qid=?', (qid,)).fetchone()
    return x[0] if x and x[0] else None


def read(title, cache, dump, full=False):
    """{'asked', 'title', 'qid', 'revision', 'redirect_from', 'infobox', 'lead'[, 'text']} or {'asked', 'missing': True}."""
    if not title:
        return {'asked': None, 'missing': True}
    hit = cache.get(dump, title)
    if hit and not full:
        return hit
    import wp_dump
    p = wp_dump.page(title)
    if not p:
        r = {'dump': dump, 'asked': title, 'missing': True}
    else:
        box, lead = infobox_and_lead(p['text'])
        r = {'dump': dump, 'asked': title, 'title': p['title'], 'qid': qid_of_title(p['title']) or qid_of_title(title), 'revision': p['revision'],
             'redirect_from': p['redirect_from'], 'infobox': box[:INFOBOX_MAX], 'lead': lead[:LEAD_MAX]}
    if not hit:
        cache.put(r)
    return dict(r, text=p['text']) if full and p else r


def load_reigns(uuids):
    """{uuid: (timeline, event, row track, sources)} for the asked uuids, from the committed timelines (public/timelines/*.json)."""
    want, out = set(uuids), {}
    for tl in TIMELINES:
        d = json.load(open(os.path.join(ROOT, 'public', 'timelines', f'{tl}.json'), encoding='utf-8'))
        tracks = {}
        stack = list(d['tracks'])
        while stack:
            t = stack.pop()
            tracks[t['id']] = t
            stack.extend(t.get('children', []))
        for e in d['events']:
            if e['uuid'] in want and e['uuid'] not in out:
                out[e['uuid']] = (tl, e, tracks.get(e['tracks'][0], {}), d.get('sources', {}))
        if len(out) == len(want):
            break
    return out


def show(label, r, full=False):
    if r.get('missing'):
        return [f"-- {label}: {r.get('asked') or 'none'} | no page in the dump"]
    head = f"-- {label}: {r['title']} | QID {r.get('qid') or 'none'} | {r['dump']} rev {r['revision']}" + (f" | redirect from {r['redirect_from']}" if r.get('redirect_from') else '')
    lines = [head, 'INFOBOX:', r['infobox'] or '(none)', 'LEAD:', r['lead'] or '(none)']
    if full and r.get('text'):
        lines += ['PAGE:', r['text']]
    return lines


def main(argv):
    full = '--full' in argv
    args = [a for a in argv if a != '--full']
    uuids = []
    while args:
        a = args.pop(0)
        if a == '--from':
            uuids += [l.strip() for l in open(args.pop(0), encoding='utf-8') if l.strip()]
        else:
            uuids.append(a)
    if not uuids:
        print(__doc__.strip().split('\n\n')[1])
        return 2
    import settings
    dump = os.path.basename(settings.DUMP).split('-pages')[0]
    cache, reigns, out = Cache(CACHE), load_reigns(uuids), []
    for u in uuids:
        if u not in reigns:
            out += [f'== reign {u}: not in the committed timelines', '']
            continue
        tl, e, row, sources = reigns[u]
        person = read(person_source(e, sources), cache, dump, full)
        realm = read(title_of_qid((row.get('ids') or {}).get('wikidata')), cache, dump)
        office = read(office_link(person.get('infobox', '')) if not person.get('missing') else None, cache, dump)
        out += [f"== reign {u} ({tl}, row {e['tracks'][0]} {row.get('name', '')}, {e['start']}–{e.get('end', e['start'])}): {e.get('title', '')}"]
        out += show('person', person, full) + show('realm', realm) + show('office', office) + ['']
    print('\n'.join(out))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
