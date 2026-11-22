"""
Topic -> article set for the extractor. Seeds are the topic's own articles; the set grows by routes, and each article
records the routes that reached it (a scoring input):

  campaignbox   members of the campaignboxes on the seeds, then of the campaignboxes on those members (depth 2)
  category      articles in the seeds' eponymous categories and their subcategories (depth CAT_DEPTH), event-like only
  list          "Timeline of …"/"List of …" pages naming a seed (read for their tables and lists)
  link          articles the seeds link to, event-like only
  (wikidata)    everything transitively `part of` a seed's QID, once the Wikidata tables exist
"""
import re
import sqlite3

CAT_DEPTH = 3
# category branches about people, things and memory, not events
CAT_STOP = re.compile(r'\b(people|personnel|biograph|by nationality|recipients|soldiers|officers|generals|admirals|aviators|'
                      r'veterans|politicians|writers|poets|artists|ships|aircraft|weapons|equipment|units|formations|'
                      r'regiments|squadrons|films|novels|books|songs|music|poetry|paintings|art|works|video games|'
                      r'memorials|monuments|museums|cemeteries|images|postage|stamps|medals|awards|in fiction|in popular culture|'
                      r'historians|historiography|organisations|organizations)\b', re.I)
EVENT_BOX = re.compile(r'military conflict|civil conflict|revolution|protest|rebellion|treaty|international agreement|election|'
                       r'referendum|event|military operation|battle|riot|massacre|attack|disaster|earthquake|pandemic|'
                       r'uprising|legislation|coup|war|siege|conference|summit', re.I)
# states, places, people, organisations and things: their date fields date the subject, not an event
NOT_EVENT_BOX = re.compile(r'country|former country|state|empire|kingdom|settlement|city|place|person|royalty|officeholder|'
                           r'monarch|military person|military unit|military branch|armed forces|organi[sz]ation|company|'
                           r'political party|ship|aircraft|weapon|building|museum|book|film|newspaper', re.I)
DATE_FIELDS = ('date', 'dates', 'start_date', 'end_date', 'date_start', 'date_end', 'signed', 'effective')


class Tables:
    def __init__(self, path, dump):
        self.db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        meta = dict(self.db.execute('SELECT key, value FROM meta'))
        if meta.get('dump') != dump:
            raise SystemExit(f'{path} was built from {meta.get("dump")}, not {dump}: rerun build_index.py')
        self.meta = meta
        self.has_qid = bool(self.db.execute("SELECT 1 FROM sqlite_master WHERE name='qid'").fetchone())

    def one(self, sql, *a):
        return self.db.execute(sql, a).fetchone()

    def page(self, title):
        """(page_id, title, infobox_type, ai_flag, rev_id) for an article, following one redirect."""
        r = self.one('SELECT page_id, title, infobox_type, ai_flag, rev_id, redirect_to FROM page WHERE ns=0 AND title=?', title)
        if r and r[5]:
            r = self.one('SELECT page_id, title, infobox_type, ai_flag, rev_id, redirect_to FROM page WHERE ns=0 AND title=?', r[5])
        return r and r[:5]

    def categories(self, page_id):
        return [c for (c,) in self.db.execute('SELECT name FROM category WHERE page_id=?', (page_id,))]

    def fields(self, page_id):
        return self.db.execute('SELECT box_no, box_type, field, raw FROM infobox_field WHERE page_id=? ORDER BY box_no, rowid',
                               (page_id,)).fetchall()

    def inlinks(self, title):
        r = self.one('SELECT n FROM inlink WHERE title=?', title)
        return r[0] if r else 0

    def qid(self, page_id):
        if not self.has_qid:
            return None
        r = self.one('SELECT qid FROM qid WHERE page_id=?', page_id)
        return r and r[0]

    def event_like(self, page_id, box):
        if box and NOT_EVENT_BOX.search(box):
            return False
        if box and EVENT_BOX.search(box):
            return True
        q = 'SELECT 1 FROM infobox_field WHERE page_id=? AND field IN (%s) LIMIT 1' % ','.join('?' * len(DATE_FIELDS))
        return bool(self.one(q, page_id, *DATE_FIELDS))


def article_set(T, seeds, seed_links, cap=4000):
    """{title: {'page_id', 'box', 'routes': set, 'rev_id'}} plus a report of route counts and exclusions."""
    out, excluded = {}, {'ai_flag': [], 'not_event': 0, 'cap': 0}

    def add(title, route, need_event):
        p = T.page(title)
        if not p:
            return False
        pid, t, box, ai, rev = p
        if ai:
            if t not in excluded['ai_flag']:
                excluded['ai_flag'].append(t)
            return False
        if t in out:
            out[t]['routes'].add(route)
            return True
        if need_event and not T.event_like(pid, box):
            excluded['not_event'] += 1
            return False
        if len(out) >= cap:
            excluded['cap'] += 1
            return False
        out[t] = {'page_id': pid, 'box': box, 'routes': {route}, 'rev_id': rev}
        return True

    seed_titles = []
    for s in seeds:
        if add(s, 'seed', False):
            seed_titles.append(T.page(s)[1])
    # campaignboxes, depth 2
    boxes, seen_boxes = set(), set()
    for s in seed_titles:
        boxes |= {b for (b,) in T.db.execute('SELECT template FROM campaignbox_use WHERE page_id=?', (out[s]['page_id'],))}
    for depth in (1, 2):
        nxt = set()
        for b in sorted(boxes - seen_boxes):
            seen_boxes.add(b)
            for (tgt,) in T.db.execute('SELECT target FROM nav_member WHERE template=?', (b,)):
                if add(tgt, 'campaignbox', False) and depth == 1:
                    nxt |= {x for (x,) in T.db.execute('SELECT template FROM campaignbox_use WHERE page_id=?', (out[tgt]['page_id'],))}
        boxes = nxt
    # category tree: the seeds' eponymous categories
    cats, frontier = set(), [s for s in seed_titles if T.one('SELECT 1 FROM category WHERE name=? LIMIT 1', s)]
    for depth in range(CAT_DEPTH + 1):
        nxt = []
        for c in frontier:
            if c in cats or CAT_STOP.search(c):
                continue
            cats.add(c)
            for pid, ns, title in T.db.execute('SELECT p.page_id, p.ns, p.title FROM category k JOIN page p ON p.page_id=k.page_id WHERE k.name=?', (c,)):
                if ns == 14:
                    nxt.append(title.split(':', 1)[1])
                elif ns == 0:
                    add(title, 'category', True)
        frontier = nxt
    # timeline and list pages naming a seed
    lists = []
    for s in seed_titles:
        for (title,) in T.db.execute("SELECT title FROM page WHERE ns=0 AND redirect_to IS NULL AND ai_flag=0 AND "
                                     "(title LIKE 'Timeline of %' OR title LIKE 'List of %' OR title LIKE '%timeline%') AND title LIKE ?",
                                     (f'%{s}%',)):
            if add(title, 'list', False):
                lists.append(title)
    # links from the seeds' text, event-like only
    for t in seed_links:
        add(t, 'link', True)
    report = {'categories': len(cats), 'campaignboxes': sorted(seen_boxes), 'lists': lists, 'excluded': excluded,
              'routes': {r: sum(1 for v in out.values() if r in v['routes']) for r in ('seed', 'campaignbox', 'category', 'list', 'link')}}
    return out, report
