"""Every sentence of an article, by section, from the offline dump (Kevin, 2026-11-22: descriptions may rest on any
sentence of a section, cited by section, beyond the lead and section openers the extractor keeps).

Uses wp_states' own prose cleaning (_prose, sentences) so the text matches what the extractor produces; refuses
missing and AI-flagged articles. Reference sections (See also, Notes...) are skipped.

sentences_of(title) -> [(where, text)] with where = 'lead' or the section path ('History > Decline').
CLI: python -I med_sections.py <title> [needle]   prints the sentences (those containing needle, if given).
"""
import os
import sys
from functools import lru_cache

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'common'))
import mwparserfromhell as mw  # noqa: E402
import wp_states as W  # noqa: E402
from wp_states import wp_dump  # noqa: E402

SKIP = {'see also', 'references', 'notes', 'further reading', 'external links', 'bibliography', 'sources', 'citations',
        'footnotes', 'explanatory notes', 'works cited', 'general and cited sources'}


@lru_cache(maxsize=None)
def sentences_of(title):
    p = wp_dump.page(title)
    if not p:
        raise SystemExit(f'missing article: {title}')
    if wp_dump.ai_flagged(p['text']):
        raise SystemExit(f'AI-flagged article, not usable as a source: {title}')
    secs = mw.parse(p['text']).get_sections(include_lead=True, flat=True)
    out = []
    if not secs:
        return tuple(out)
    out += [('lead', s) for s in W.sentences(W._prose(secs[0]))]
    path = []
    for sec in secs[1:]:
        hs = sec.filter_headings(recursive=False)
        if not hs:
            continue
        h = hs[0]
        t = W.plain(h.title, []).strip()
        path = [x for x in path if x[0] < h.level] + [(h.level, t)]
        if any(x[1].lower() in SKIP for x in path):
            continue
        prose = W._prose(mw.parse(str(sec).split('\n', 1)[1] if '\n' in str(sec) else '')).split('==')[0]
        where = ' > '.join(x for _, x in path)
        out += [(where, s) for s in W.sentences(prose)]
    return tuple(out)


def find(title, needle):
    """(where, text) of the first sentence of `title` containing `needle`: lead first, then sections in order."""
    for where, s in sentences_of(title):
        if needle in s:
            return where, s
    return None


if __name__ == '__main__':
    for where, s in sentences_of(sys.argv[1]):
        if len(sys.argv) < 3 or sys.argv[2] in s:
            print(f'[{where}] {s}')
