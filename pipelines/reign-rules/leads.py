"""
The reign leads for the reign-rules stage (Workbench "2026-11-25 Timelines reign rules precision plan"; the Architect, 2026-11-25): for every committed
reign, the first two sentences of the lead of the page it cites, from the Wikipedia dump, so the rules can read the cues only a lead carries
(acting, co-ruler, usurper, claimant). Same pattern as facts.py: a script writes the file once, a committed record (dump name, count, sha256)
pins it, and the stage checks the file against the record and stops when they differ. No network.

    python3 -I pipelines/reign-rules/leads.py [--stages DIR] [--write-record]

Writes <stages>/L1/reign-leads/leads.json ({"<reign uuid>": "<lead sentences>"}); --write-record also rewrites pipelines/reign-rules/leads.record.json
(commit it in the PR that regenerates the file). The dump is read from $TIMELINES_DATA (settings.py); runs locally, one pass of about a minute and a
half.
"""
import hashlib
import json
import os
import re
import sys
from urllib.parse import unquote

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
RECORD = os.path.join(HERE, 'leads.record.json')
TIMELINES = ['ancient-classical', 'medieval', 'modern-states']
WP = 'https://en.wikipedia.org/wiki/'
SENTENCES = 2
MAX_CHARS = 600


def stages_root(given=None):
    return given or os.environ.get('TIMELINES_STAGES') or os.path.join(os.path.expanduser('~'), 'data', 'stages')


def leads_path(stages=None):
    return os.path.join(stages_root(stages), 'L1', 'reign-leads', 'leads.json')


def sha256(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def reign_pages(root=ROOT):
    """{reign uuid: page title} for every committed reign's first cited page (data-src/<timeline>.json, `reign-*` events)."""
    out = {}
    for tl in TIMELINES:
        with open(os.path.join(root, 'data-src', f'{tl}.json'), encoding='utf-8') as f:
            d = json.load(f)
        for e in d['events']:
            if e['uuid'].startswith('reign-') and e.get('sources'):
                url = d['sources'].get(e['sources'][0]['sourceKey'], {}).get('url', '')
                if url.startswith(WP):
                    out[e['uuid']] = unquote(url[len(WP):]).replace('_', ' ')
    return out


def lead_sentences(text, sentences=SENTENCES, cap=MAX_CHARS):
    """The article's first paragraph of prose (templates, references, link markup removed), cut to its first two sentences (evidence.py asks for three)."""
    tx = text
    for _ in range(4):
        tx = re.sub(r'\{\{[^{}]*\}\}', '', tx)
    tx = re.sub(r'<ref[^>]*?/>|<ref.*?</ref>', '', tx, flags=re.S)
    tx = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', tx)
    tx = tx.replace("'''", '').replace("''", '')
    m = re.search(r'\n([^\n=|{}*\[][^\n]{80,})', tx)
    para = re.sub(r'\s+', ' ', m.group(1)) if m else ''
    return ' '.join(re.split(r'(?<=[.!?])\s+(?=[A-Z])', para)[:sentences])[:cap]


def record_problems(path, record=RECORD):
    """[] when the leads file matches the committed record; else what differs."""
    if not os.path.exists(path):
        return [f'{path}: missing (run pipelines/reign-rules/leads.py)']
    with open(record, encoding='utf-8') as f:
        rec = json.load(f)
    with open(path, encoding='utf-8') as f:
        n = len(json.load(f))
    bad = []
    if sha256(path) != rec['sha256']:
        bad.append('leads.json differs from leads.record.json')
    if n != rec['reigns']:
        bad.append(f"leads.json has {n} reigns, the record {rec['reigns']}")
    return bad


def main(argv):
    sys.path[:0] = [os.path.join(HERE, '..', 'common')]
    import settings
    import wp_dump
    out = leads_path(argv[argv.index('--stages') + 1] if '--stages' in argv else None)
    pages, by_title = reign_pages(), {}
    for t in sorted(set(pages.values())):
        pg = wp_dump.page(t)
        by_title[t] = lead_sentences((pg or {}).get('text', ''))
    leads = {u: by_title[t] for u, t in pages.items()}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(leads, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write('\n')
    empty = sum(1 for v in leads.values() if not v)
    print(f'reign leads: {len(leads)} reigns on {len(by_title)} pages, {empty} reigns with no lead found, {out}')
    if '--write-record' in argv:
        with open(RECORD, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'dump': os.path.basename(str(settings.DUMP)), 'reigns': len(leads), 'sha256': sha256(out)}, f, indent=1)
            f.write('\n')
        print(f'reign leads: wrote {RECORD}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
