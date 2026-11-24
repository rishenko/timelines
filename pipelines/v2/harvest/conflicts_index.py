"""
Combatant index for the conflicts harvest: one pass over every article with a military-conflict infobox (about 24,000), recording
who fought (each combatant column's entries, in order, as `conflicts.entries` reads them: the first is the main combatant) and how many articles link to it.
The extract DB keeps only each infobox's date, so the combatants are read from the article itself, through the dump.

    pipelines/extract/.venv/bin/python -I pipelines/v2/harvest/conflicts_index.py [--data DIR] [--workers 4]

Writes $TIMELINES_DATA/v2/candidates/conflict-index.jsonl ({title, inlinks, combatants: {column: entry}}). It is re-runnable
and takes some minutes; conflicts.py reads it to find each country's battles whatever their categories say (a battle such as
Agincourt or Austerlitz is not in 'Battles involving France').
"""
import json
import multiprocessing
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE]
import conflicts as C  # noqa: E402
import disasters as D  # noqa: E402
import mwparserfromhell as mw  # noqa: E402
import settings  # noqa: E402
import wp_dump  # noqa: E402


def one(title):
    p = wp_dump.page(title)
    if not p or wp_dump.ai_flagged(p['text']):
        return None
    try:
        code = mw.parse(p['text'])
        boxes = [b for b in D.infoboxes(code) if str(b.name).strip().lower().replace('millitary', 'military').startswith('infobox military conflict')]
        if not boxes:
            return None
        return {'title': p['title'], 'combatants': {str(k): v for k, v in sorted(C.combatants(boxes[0]).items())}}
    except Exception as e:  # a malformed page must not stop the pass
        return {'title': title, 'error': str(e)[:80]}


def main():
    workers = int(sys.argv[sys.argv.index('--workers') + 1]) if '--workers' in sys.argv else 4
    db = sqlite3.connect(f'file:{os.path.join(settings.WIKIPEDIA, "extract-" + settings.DUMP_NAME + ".sqlite")}?mode=ro', uri=True)
    rows = db.execute("SELECT p.title, COALESCE(i.n, 0) FROM page p LEFT JOIN inlink i ON i.title=p.title WHERE p.ns=0 AND p.redirect_to IS NULL "
                      "AND p.ai_flag=0 AND (p.infobox_type LIKE '%military conflict%' OR p.infobox_type LIKE '%millitary conflict%')").fetchall()
    inl = dict(rows)
    out_path = os.path.join(settings.DATA, 'v2', 'candidates', 'conflict-index.jsonl')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    n = 0
    with multiprocessing.Pool(workers) as pool, open(out_path + '.part', 'w', encoding='utf-8') as f:
        for r in pool.imap_unordered(one, [t for t, _ in rows], chunksize=40):
            if r:
                r['inlinks'] = inl.get(r['title'], 0)
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
                n += 1
            if n % 2000 == 0 and n:
                print(n, flush=True)
    os.replace(out_path + '.part', out_path)
    print(f'{n} of {len(rows)} articles indexed')


if __name__ == '__main__':
    main()
