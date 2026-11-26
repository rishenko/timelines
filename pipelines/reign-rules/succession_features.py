"""
E1b of the ruler evidence record (Workbench "2026-11-25 Timelines ruler evidence record design", §1 and the E1 rulings): the succession box and
Wikidata's P1365/P1366 as features. evidence.py calls `succession_features` once per reign; nothing here writes a file or touches the rules.

Succession box (the page's {{s-start}} … {{s-ttl}} … {{end}} blocks, or the one-line {{succession box|title=…|before=…|after=…|years=…}}), a page may
hold several, one per office; the boxes whose years overlap the reign (or the page's only box, when it gives no years) are read:
  office_succession          the box's title (quoted: the title template, or the whole one-line box)
  succession_pred_on_row     the box's predecessor has a reign on the same row (derived, with `inputs`; value true/false/None when the box names none)
  succession_succ_on_row     the same for the successor
Wikidata P39 statements of the person (quals2 table `wd_iqual`: P1365 replaces, P1366 replaced by, per statement id and office):
  p39_replaces / p39_replaced_by   the neighbour QID; derived (`inputs` names the table row: a statement has no page quote); `on_row` says whether that
                                   neighbour has a reign on the row.
"""
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'extract'), os.path.join(HERE, '..', 'common')]
import dates  # noqa: E402

QUOTE_MAX = 300
WIKILINK = re.compile(r'\[\[\s*([^\]|#]+?)\s*(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]')
MAX_BOXES = 3
MAX_P39 = 6


def link_titles(raw, limit=3):
    """The article titles a before/after parameter links (underscores as spaces), at most `limit`."""
    return [t.replace('_', ' ') for t in WIKILINK.findall(raw or '')][:limit]


def plain(raw):
    """A parameter's text as a reader sees it: links shown by their label, entities and templates dropped, whitespace collapsed."""
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', raw or '')
    t = re.sub(r'\{\{[^{}]*\}\}', '', t).replace('&ndash;', '–').replace('&nbsp;', ' ')
    return re.sub(r'\s+', ' ', t).strip()


def verbatim(tpl):
    """The template's wikitext as the page holds it, whitespace collapsed, at most QUOTE_MAX characters (a prefix of a verbatim line is verbatim)."""
    return re.sub(r'\s+', ' ', str(tpl)).strip()[:QUOTE_MAX]


def param(tpl, *names):
    for n in names:
        if tpl.has(n):
            return str(tpl.get(n).value).strip()
    return ''


def boxes(text):
    """[{title, years, before: [titles], after: [titles], quote, title_quote}] of the page's succession boxes, in page order.
    A {{s-ttl}} takes the {{s-bef}} just before it and the {{s-aft}} just after it (each only when nothing else comes between)."""
    import mwparserfromhell
    try:
        tpls = mwparserfromhell.parse(text or '').filter_templates(recursive=False)
    except Exception:  # malformed wikitext
        return []
    out = []
    for i, t in enumerate(tpls):
        name = str(t.name).strip().lower()
        if name == 'succession box':
            out.append({'title': plain(param(t, 'title')), 'years': plain(param(t, 'years')), 'before': link_titles(param(t, 'before')),
                        'after': link_titles(param(t, 'after')), 'quote': verbatim(t), 'title_quote': verbatim(t)})
        elif name == 's-ttl':
            bef = tpls[i - 1] if i and str(tpls[i - 1].name).strip().lower() == 's-bef' else None
            aft = tpls[i + 1] if i + 1 < len(tpls) and str(tpls[i + 1].name).strip().lower() == 's-aft' else None
            out.append({'title': plain(param(t, 'title', '1')), 'years': plain(param(t, 'years', '2')),
                        'before': link_titles(param(bef, 'before', '1')) if bef else [], 'after': link_titles(param(aft, 'after', '1')) if aft else [],
                        'quote': verbatim(t), 'title_quote': verbatim(t), 'before_quote': verbatim(bef) if bef else None, 'after_quote': verbatim(aft) if aft else None})
    return out


def years_overlap(years, s0, s1, slack=1):
    """True/False when the box's years text parses and does (not) overlap [s0, s1] (astronomical years) within `slack`; None when it doesn't parse."""
    spans = [x for x in dates.spans(years or '') if x['start'][0] is not None]
    if not spans:
        return None
    for x in spans:
        a = dates.astro(x['start'][0])
        b = dates.astro(x['end'][0]) if x.get('end') else a
        a, b = min(a, b), max(a, b)
        if a - slack <= s1 and b + slack >= s0:
            return True
    return False


def pick(all_boxes, s0, s1):
    """The boxes about this reign: those whose years overlap it; else, when no box gives years, the page's only box."""
    hit = [b for b in all_boxes if years_overlap(b['years'], s0, s1) is True]
    if hit:
        return hit[:MAX_BOXES]
    return all_boxes[:1] if len(all_boxes) == 1 and years_overlap(all_boxes[0]['years'], s0, s1) is None else []


def on_row(neighbours, row_titles, canon):
    """True when one of the neighbour titles is an article a reign of the row cites; None when the box names nobody."""
    if not neighbours:
        return None
    return any(canon(n) in row_titles for n in neighbours)


class Quals:
    """Read-only handle on the Wikidata quals2 table: P39 statements' P1365/P1366 qualifiers by person QID."""

    def __init__(self, path):
        self.path = path
        self.con = sqlite3.connect(f'file:{path}?mode=ro', uri=True)

    def edges(self, qid):
        """[(statement id, office QID, 'P1365'|'P1366', neighbour QID)] of the person's P39 statements, sorted."""
        return sorted(self.con.execute("select sid, target, qprop, qtarget from wd_iqual where prop='P39' and qprop in ('P1365','P1366') and qid=?", (qid,)))

    def close(self):
        self.con.close()


def succession_features(reign, page, ctx, canon, quals=None):
    """The E1b features of one reign. `page` is the dump page (dict with text, title, revision) or None; `ctx` has `by_row`, `pages` (uuid → cited article)
    and optionally `qid_rows` ({row: {qid}}), `canon` turns a title into the dump's (a redirect followed)."""
    e = reign['event']
    s0, s1 = e['start'], e.get('end') if e.get('end') is not None else e['start']
    key = (reign['timeline'], reign['row'])
    row_titles = {canon(ctx['pages'][r['uuid']]) for r in ctx['by_row'].get(key, []) if ctx['pages'].get(r['uuid'])}
    out = []
    if page:
        for b in pick(boxes(page['text']), s0, s1):
            where = 'succession box'
            base = {'where': where, 'page': page.get('title'), 'revision': page.get('revision')}
            if b['title']:
                out.append({'feature': 'office_succession', 'value': b['title'], 'quote': b['title_quote'], **base})
            for feature, names in (('succession_pred_on_row', b['before']), ('succession_succ_on_row', b['after'])):
                out.append({'feature': feature, 'value': on_row(names, row_titles, canon), 'names': names, 'years': b['years'],
                            'inputs': f'succession box of {page.get("title")} and the articles cited by the reigns of row {reign["row"]}'})
    qid = (reign.get('review') or {}).get('qid')
    if quals and qid:
        rows_qids = ctx.get('qid_rows', {}).get(key, set())
        for sid, office, qprop, other in quals.edges(qid)[:MAX_P39]:
            out.append({'feature': 'p39_replaces' if qprop == 'P1365' else 'p39_replaced_by', 'value': other, 'office': office, 'on_row': other in rows_qids,
                        'inputs': f'wikidata quals2 wd_iqual: statement {sid} of {qid} (P39 {office}), {qprop} {other}'})
    return out
