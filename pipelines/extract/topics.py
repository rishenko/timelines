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

from dates import spans

CAT_DEPTH = 3
WINDOW_AFTER = 5  # years after the seeds' last date still in the topic (peace treaties, aftermath)
BOX_OVERLAP = 0.3
LIST_TITLE = re.compile(r'^timeline|timeline|^list of .*\b(battles|events|operations|offensives|campaigns|conflicts|treaties|'
                        r'wars|engagements|naval battles|actions|revolutions|uprisings|massacres|declarations)\b', re.I)
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
                           r'political party|ship|aircraft|weapon|building|museum|book|film|newspaper|biography|cricketer|'
                           r'sportsperson|football|player|athlete|artist|writer|scientist|award|decoration|medal|order|'
                           r'holiday|memorial|cemetery', re.I)
EVENT_TITLE = re.compile(r'\b(uprising|revolution|revolt|rebellion|insurrection|riots?|massacre|war|battle|siege|treaty|'
                         r'armistice|campaign|offensive|coup|mutiny|strike|days|crisis|incident|affair|congress|conference|'
                         r'declaration|proclamation|occupation|invasion|landing|raid|expedition|evacuation|deportation)\b', re.I)
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

    def event_like(self, page_id, box, title=None):
        if box and NOT_EVENT_BOX.search(box):
            return False
        if box and EVENT_BOX.search(box):
            return True
        if not box and title and EVENT_TITLE.search(title):  # no infobox: "March Revolution", "Vienna Uprising"
            return True
        q = 'SELECT 1 FROM infobox_field WHERE page_id=? AND field IN (%s) LIMIT 1' % ','.join('?' * len(DATE_FIELDS))
        return bool(self.one(q, page_id, *DATE_FIELDS))


def article_set(T, seeds, seed_links, cap=4000):
    """{title: {'page_id', 'box', 'routes': set, 'rev_id'}} plus a report of route counts and exclusions."""
    out, excluded = {}, {'ai_flag': [], 'not_event': 0, 'cap': 0, 'box_overlap': [], 'out_of_window': []}

    def add(title, route, need_event):
        """The article's title (after a redirect) when it is in the set, else None."""
        p = T.page(title)
        if not p:
            return None
        pid, t, box, ai, rev = p
        if ai:
            if t not in excluded['ai_flag']:
                excluded['ai_flag'].append(t)
            return None
        if t in out:
            out[t]['routes'].add(route)
            return t
        if need_event and not T.event_like(pid, box, t):
            excluded['not_event'] += 1
            return None
        if need_event and not overlaps(pid, t):
            excluded['out_of_window'].append(t)
            return None
        if len(out) >= cap:
            excluded['cap'] += 1
            return None
        out[t] = {'page_id': pid, 'box': box, 'routes': {route}, 'rev_id': rev}
        return t

    seed_titles = []
    for s in seeds:
        t = add(s, 'seed', False)
        if t:
            seed_titles.append(t)
    # the seeds' own years (their infobox dates), for campaignbox names such as "Atlantic 1914–1918"
    years = [sp['start'][0] for s in seed_titles for f in T.fields(out[s]['page_id']) if f[2] in DATE_FIELDS
             for sp in spans(f[3]) for _ in [0]] + [sp['end'][0] for s in seed_titles for f in T.fields(out[s]['page_id'])
                                                   if f[2] in DATE_FIELDS for sp in spans(f[3]) if sp['end']]
    lo, hi = (min(years), max(years)) if years else (None, None)

    win = (lo - 1, hi + WINDOW_AFTER) if lo is not None else None

    def overlaps(pid, title):
        """An article's infobox dates, else the years in its title, touch the topic's window (or nothing says otherwise)."""
        if not win:
            return True
        ys = [y for f in T.fields(pid) if f[2] in DATE_FIELDS for sp in spans(f[3])
              for y in (sp['start'][0], (sp['end'] or sp['start'])[0])]
        ys = ys or [int(y) for y in re.findall(r'\b(1\d{3}|20\d{2})\b', title)]
        return not ys or (max(ys) >= win[0] and min(ys) <= win[1])
    def names_topic(box):
        """A campaignbox named after a seed ("East African (World War I)"), or only for years within the seeds' dates."""
        initials = [''.join(w[0] for w in s.split()) for s in seed_titles if len(s.split()) > 1]  # "WWI"
        if any(re.search(r'(?<![\w])' + re.escape(s) + r'(?![\w])', box) for s in seed_titles + initials):
            return True
        ys = [int(y) for y in re.findall(r'\b(1\d{3}|20\d{2})\b', box)]
        return bool(ys) and lo is not None and all(lo <= y <= hi for y in ys)

    def names_carrier(box, carriers):
        """A theatre's own box: "Campaignbox Sinai and Palestine" on the article "Sinai and Palestine campaign"."""
        core = re.sub(r'^campaignbox\s+|\s+campaign$', '', box, flags=re.I).lower()
        return len(core) > 3 and any(core in c.lower() for c in carriers)

    # campaignboxes, depth 2: a member's other campaignboxes count only when they overlap the set (BOX_OVERLAP of their
    # members already in it), so a battle's box for an older war doesn't pull that war in
    boxes, seen_boxes = set(), set()
    for s in seed_titles:
        boxes |= {b for (b,) in T.db.execute('SELECT template FROM campaignbox_use WHERE page_id=?', (out[s]['page_id'],))}
    for depth in (1, 2):
        nxt, carriers = set(), {}
        for b in sorted(boxes - seen_boxes):
            seen_boxes.add(b)
            for (tgt,) in T.db.execute('SELECT target FROM nav_member WHERE template=?', (b,)):
                t = add(tgt, 'campaignbox', False)
                if t and depth == 1:
                    for (x,) in T.db.execute('SELECT template FROM campaignbox_use WHERE page_id=?', (out[t]['page_id'],)):
                        nxt.add(x)
                        carriers.setdefault(x, []).append(t)
        boxes = set()
        for b in nxt - seen_boxes:
            members = [t for (t,) in T.db.execute('SELECT target FROM nav_member WHERE template=?', (b,))]
            inside = sum(1 for t in members if t in out)
            if (members and inside / len(members) >= BOX_OVERLAP) or names_topic(b) or names_carrier(b, carriers.get(b, [])):
                boxes.add(b)
            else:
                excluded['box_overlap'].append(b)
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
    # timeline pages, and lists of events, naming a seed as a whole name ("World War I", not "World War II")
    lists = []
    for s in seed_titles:
        whole = re.compile(r'(?<![\w])' + re.escape(s) + r'(?![\w])', re.I)
        for (title,) in T.db.execute("SELECT title FROM page WHERE ns=0 AND redirect_to IS NULL AND ai_flag=0 AND title LIKE ?",
                                     (f'%{s}%',)):
            if not whole.search(title) or not LIST_TITLE.search(title):
                continue
            t = add(title, 'list', False)
            if t:
                lists.append(t)
    # links from the seeds' text, event-like only
    for t in seed_links:
        add(t, 'link', True)
    report = {'window': (lo, hi), 'categories': len(cats), 'campaignboxes': sorted(seen_boxes), 'lists': lists, 'excluded': excluded,
              'routes': {r: sum(1 for v in out.values() if r in v['routes']) for r in ('seed', 'campaignbox', 'category', 'list', 'link')}}
    return out, report
