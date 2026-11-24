"""
Writes the list of Wikipedia articles that carry an AI-generated-text notice, so `npm run data:check` can refuse a
citation of one without the dump (CI has no ~/data). Kevin's rule: never cite a page flagged for AI-generated text.

    pipelines/extract/.venv/bin/python -I pipelines/extract/ai_flagged.py [--data DIR] [--dump NAME] [--out FILE]

Reads extract-<dump>.sqlite (build_index.py): every article (ns 0) with ai_flag=1, plus every redirect to one, since a
citation may name the redirect. Writes data-src/ai-flagged-pages.txt: a header naming the dump, then one title per
line, sorted. Rerun it with each new dump (the monthly refresh) and commit the result; the diff shows the pages that
gained or lost a notice.
"""
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import settings  # noqa: E402

ARGS = settings.take_flags(sys.argv[1:])
OUT = ARGS[ARGS.index('--out') + 1] if '--out' in ARGS else os.path.join(HERE, '..', '..', 'data-src', 'ai-flagged-pages.txt')


def titles(db):
    """Flagged articles and the redirects to them, sorted."""
    flagged = {t for (t,) in db.execute('SELECT title FROM page WHERE ns = 0 AND ai_flag = 1')}
    redirects = {t for (t,) in db.execute(
        'SELECT r.title FROM page r JOIN page p ON p.ns = 0 AND p.title = r.redirect_to AND p.ai_flag = 1 WHERE r.ns = 0')}
    return sorted(flagged | redirects), len(flagged), len(redirects)


def main():
    path = os.path.join(settings.WIKIPEDIA, f'extract-{settings.DUMP_NAME}.sqlite')
    db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    dump = dict(db.execute('SELECT key, value FROM meta')).get('dump', settings.DUMP_NAME)
    out, n_flagged, n_redirects = titles(db)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(f'# Wikipedia articles with an AI-generated-text notice ({n_flagged}), and redirects to them ({n_redirects}).\n')
        f.write(f'# Dump {dump}. Written by pipelines/extract/ai_flagged.py; never edit by hand. One title per line.\n')
        for t in out:
            f.write(t + '\n')
    print(f'{os.path.relpath(OUT)}: {n_flagged} flagged articles + {n_redirects} redirects ({dump})')


if __name__ == '__main__':
    main()
