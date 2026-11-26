"""
The ruler evidence record, E1 (Workbench "2026-11-25 Timelines ruler evidence record design"; Architect, 2026-11-25): for every committed reign, a list of
features, each one fact read from one place with the words that say it. The rules read facts the rulers stage drops (lead verbs, status words, categories,
the reign's place in the row's phases); this file writes them down once, with a verbatim quote that is checked against the dump page.

    python3 -I pipelines/reign-rules/evidence.py --rows ancient-classical:assyria,medieval:japan [--stages DIR] [--out DIR]

Writes <out>/evidence.jsonl (one line per reign, sorted by timeline and uuid) and <out>/evidence.record.json (dump, rows, code and pattern sha256,
reigns, features per kind, quote checks, output sha256). Default <out> is <stages>/L1/reign-evidence/pilot. Needs the dump ($TIMELINES_DATA) and the
recorded rulers inputs (facts.py). Read-only; no network. A feature is **quoted** (a `quote` of at most 300 characters from the page) or **derived**
(computed from the committed data: `inputs` instead of a quote). A quoted feature whose quote is not found on the page is dropped and counted.

E1 features: office_infobox (the infobox line, quoted), office_recorded (the rulers stage's composed office, `inputs`), lead_status, status_scope, lead_accession, category_family (quoted); span_in_phase, other_row_office (derived from the committed data).
Vocabulary lives in evidence-patterns.json, so a word is reviewed there, with a test in test_evidence.py naming a real page.
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'common')]
import classify as CL  # noqa: E402
import facts as FA  # noqa: E402
import leads as LD  # noqa: E402
import rules as RU  # noqa: E402

ROOT = CL.ROOT
PATTERNS = os.path.join(HERE, 'evidence-patterns.json')
LEAD_SENTENCES = 3
QUOTE_MAX = 300
QUOTE_MIN = 12
PILOT = ('ancient-classical:rome-republic-empire,ancient-classical:eastern-roman,ancient-classical:assyria,ancient-classical:anuradhapura,'
         'medieval:mali-empire,modern-states:nicaragua,medieval:japan,ancient-classical:suebi,ancient-classical:ostrogoths')
YEARS = re.compile(r'\b\d{3,4}\b')


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def load_patterns(path=PATTERNS):
    with open(path, encoding='utf-8') as f:
        j = json.load(f)
    comp = lambda d: {k: re.compile(v, re.I) for k, v in d.items()}
    return {'lead_status': comp(j['lead_status']), 'lead_accession': comp(j['lead_accession']),
            'category_family': [(c['family'], re.compile(c['pattern'], re.I)) for c in j['category_family']]}


def clean(text):
    """The page as a reader sees it: templates (to depth 4), references, link markup, bold and italic removed; whitespace collapsed."""
    tx = text
    for _ in range(4):
        tx = re.sub(r'\{\{[^{}]*\}\}', '', tx)
    tx = re.sub(r'<ref[^>]*?/>|<ref.*?</ref>', '', tx, flags=re.S)
    tx = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', tx)
    tx = tx.replace("'''", '').replace("''", '')
    return re.sub(r'\s+', ' ', tx).strip().lower()


def raw(s):
    return re.sub(r'\s+', ' ', s).strip().lower()


def quote_found(quote, page_text):
    """tools/verify_quotes.py's test: a quote is found raw, or with both sides reduced by clean(); under QUOTE_MIN characters fails."""
    return len(raw(quote)) >= QUOTE_MIN and (raw(quote) in raw(page_text) or clean(quote) in clean(page_text))


def sentences(text):
    return re.split(r'(?<=[.!?])\s+(?=[A-Z])', LD.lead_sentences(text, LEAD_SENTENCES, 1500))


def window(sentence, at, width=QUOTE_MAX):
    """At most `width` characters of the sentence around position `at`, cut at word edges."""
    if len(sentence) <= width:
        return sentence
    a = max(0, min(at - width // 2, len(sentence) - width))
    piece = sentence[a:a + width]
    if a:
        piece = piece.split(' ', 1)[-1]
    return piece.rsplit(' ', 1)[0] if a + width < len(sentence) else piece


def year_span(reign):
    e = reign['event']
    return e['start'], e.get('end') if e.get('end') is not None else e['start']


def mentions_span(sentence, reign):
    """The sentence names a year of the reign (within one year), or the office text of the reign, so the status it carries is about this reign."""
    s0, s1 = year_span(reign)
    return any(s0 - 1 <= int(y) <= s1 + 1 for y in YEARS.findall(sentence))


def clause(sentence, at):
    """The clause of the sentence that holds position `at`: between the commas, semicolons, dashes and brackets around it."""
    cuts = [m.end() for m in re.finditer(r'[;,()]|\s[–—-]\s', sentence[:at])]
    a = cuts[-1] if cuts else 0
    m = re.search(r'[;,()]|\s[–—-]\s', sentence[at:])
    return sentence[a:at + m.start()] if m else sentence[a:]


def lead_features(reign, text, pat):
    """Quoted features from the first three sentences of the lead: the first sentence that matches each status or accession word gives that value."""
    out, sents = [], sentences(text)
    for kind in ('lead_status', 'lead_accession'):
        for value, rx in pat[kind].items():
            for i, s in enumerate(sents):
                m = rx.search(s)
                if m:
                    out.append({'feature': kind, 'value': value, 'where': f'lead, sentence {i + 1}', 'quote': window(s, m.start())})
                    if kind == 'lead_status':
                        out.append({'feature': 'status_scope', 'value': 'this-reign' if mentions_span(clause(s, m.start()), reign) else 'person', 'status': value,
                                    'where': f'lead, sentence {i + 1}', 'quote': window(s, m.start())})
                    break
    seen, uniq = set(), []
    for f in out:  # the same (feature, value, status, quote) is written once
        k = (f['feature'], f['value'], f.get('status'), f['quote'])
        if k not in seen:
            seen.add(k)
            uniq.append(f)
    return uniq


def category_features(page_text, pat):
    """One feature per family that a category of the page names, quoted as the category line."""
    out = {}
    for c in re.findall(r'\[\[\s*Category\s*:\s*([^\]|]+)', page_text, re.I):
        c = re.sub(r'\s+', ' ', c).strip()
        for family, rx in pat['category_family']:
            if rx.search(c) and family not in out:
                out[family] = {'feature': 'category_family', 'value': family, 'where': 'categories', 'quote': f'Category:{c}'}
    return list(out.values())


def infobox_line(page_text, office):
    """The raw infobox line (`| title = …`) whose value reads as the office text, or None when the rulers stage composed the office from several lines."""
    want = clean(office)
    for line in page_text.splitlines():
        m = re.match(r'\s*\|\s*[\w \-]+?\s*=\s*(.+)', line)
        if m and clean(m.group(1)) == want:
            return line.strip()[:QUOTE_MAX]
    return None


def derived_features(reign, ctx, office):
    """Features computed from the committed data, with the inputs they read."""
    out = []
    d = ctx['rows'].get(reign['timeline'], {}).get(reign['row'], {})
    s0, s1 = year_span(reign)
    inside = [n for a, b, n in d.get('phase_spans', []) if RU._overlaps(reign, a, b)]
    out.append({'feature': 'span_in_phase', 'value': bool(inside) if d.get('phase_spans') else None, 'phases': inside,
                'inputs': f'reign {s0}–{s1}, phases of row {reign["row"]} in data-src'})
    if office:
        toks = RU._words(office)
        own = RU._row_stems(ctx, reign['timeline']).get(reign['row'], set()) & toks
        other = sorted(r for r, ws in RU._row_stems(ctx, reign['timeline'], phases=False).items() if r != reign['row'] and ws & toks)
        out.append({'feature': 'other_row_office', 'value': bool(other) and not own, 'rows': other[:3], 'inputs': f'office {office!r} against the row names of {reign["timeline"]}'})
    return out


def build(reign, ctx, office, pat, fetch):
    """The record of one reign: {timeline, uuid, person, row, page, revision, features}; quote checks counted in `checked`/`dropped`."""
    pages = ctx['pages'].get(reign['uuid'])
    pg = fetch(pages) if pages else None
    rec = {'timeline': reign['timeline'], 'uuid': reign['uuid'], 'person': reign['review'].get('person') or reign['event'].get('title', ''),
           'row': reign['row'], 'start': reign['event'].get('start'), 'end': reign['event'].get('end'), 'page': pages, 'revision': pg and pg['revision'], 'features': []}
    feats, dropped, checked = [], 0, 0
    if office:
        line = pg and infobox_line(pg['text'], office)
        if line:
            feats.append({'feature': 'office_infobox', 'value': office, 'where': 'infobox', 'quote': line})
        else:  # composed by the rulers stage from several lines or a template: carried as derived, not quoted
            rec['features'].append({'feature': 'office_recorded', 'value': office, 'inputs': 'office text of the recorded rulers inputs (facts.py), not one infobox line'})
    if pg:
        feats += lead_features(reign, pg['text'], pat) + category_features(pg['text'], pat)
    for f in feats:
        checked += 1
        if pg and quote_found(f['quote'], pg['text']):
            f['page'], f['revision'] = pg['title'], pg['revision']
            rec['features'].append(f)
        else:
            dropped += 1
    rec['features'] += derived_features(reign, ctx, office)
    return rec, checked, dropped


def pilot_rows(arg):
    return {tuple(x.split(':', 1)) for x in arg.split(',') if x}


def main(argv):
    import wp_dump
    arg = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
    rows = pilot_rows(arg('--rows', PILOT))
    stages = arg('--stages')
    out_dir = arg('--out') or os.path.join(CL.stages_root() if not stages else stages, 'L1', 'reign-evidence', 'pilot')
    inputs = FA.inputs_dir()
    bad = FA.record_problems(inputs) if inputs else ['no recorded rulers inputs found (TIMELINES_RULERS_INPUTS)']
    if bad:
        print('evidence: the rulers inputs can\'t be used:\n  ' + '\n  '.join(bad))
        return 1
    pat = load_patterns()
    offices = FA.offices(inputs, CL.TIMELINES)
    spans, names = CL.rows()
    loaded = [x for x in CL.load() if (x[1], (x[2].get('tracks') or [x[3].get('row')])[0]) in rows]
    by_row = {}
    for f, tl, e, rv in loaded:
        by_row.setdefault((tl, (e.get('tracks') or [rv.get('row')])[0]), []).append({'uuid': e['uuid'], 'timeline': tl, 'event': e, 'review': rv})
    ctx = {'spans': spans, 'rows': names, 'by_row': by_row, 'pages': LD.reign_pages()}
    cache = {}

    def fetch(title):
        if title not in cache:
            cache[title] = wp_dump.page(title)
        return cache[title]

    recs, checked, dropped, seen = [], 0, 0, set()
    for f, tl, e, rv in loaded:
        if (tl, e['uuid']) in seen:
            continue
        seen.add((tl, e['uuid']))
        reign = {'uuid': e['uuid'], 'timeline': tl, 'row': (e.get('tracks') or [rv.get('row')])[0], 'file': f, 'event': e, 'review': rv}
        rec, c, d = build(reign, ctx, (offices.get((tl, e['uuid'])) or {}).get('office') or '', pat, fetch)
        recs.append(rec)
        checked += c
        dropped += d
    recs.sort(key=lambda r: (r['timeline'], r['uuid']))
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, 'evidence.jsonl')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        for r in recs:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    kinds = {}
    for r in recs:
        for ft in r['features']:
            kinds[ft['feature']] = kinds.get(ft['feature'], 0) + 1
    import settings
    record = {'dump': os.path.basename(str(settings.DUMP)), 'rows': sorted(f'{a}:{b}' for a, b in rows), 'reigns': len(recs),
              'reigns_without_a_page': sum(1 for r in recs if not r['page']), 'features': dict(sorted(kinds.items())), 'quotes_checked': checked,
              'quotes_dropped': dropped, 'code_sha256': {n: sha256(os.path.join(HERE, n)) for n in ('evidence.py', 'evidence-patterns.json', 'leads.py')},
              'output_sha256': sha256(path)}
    with open(os.path.join(out_dir, 'evidence.record.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(record, f, indent=1, sort_keys=True)
        f.write('\n')
    print(json.dumps(record, indent=1, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
