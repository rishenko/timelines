"""
One section of a markdown file: from the first heading that contains the given text (case ignored) to the next
heading of the same or a higher level. With no heading, lists the file's headings with line numbers.

    python3 -I pipelines/extract/notes.py FILE ["heading text"]
    python3 -I pipelines/extract/notes.py pipelines/PARSING-NOTES.md "wikidata json"
"""
import re
import sys

HEADING = re.compile(r'^(#{1,6})\s+(.*)')


def headings(lines):
    """(line index, level, text) of each heading, skipping fenced code blocks."""
    out, fence = [], False
    for i, l in enumerate(lines):
        if l.lstrip().startswith('```'):
            fence = not fence
            continue
        m = None if fence else HEADING.match(l)
        if m:
            out.append((i, len(m[1]), m[2].strip()))
    return out


def section(text, want):
    """The section's lines, or None when no heading contains `want`."""
    lines = text.splitlines()
    hs = headings(lines)
    for k, (i, level, title) in enumerate(hs):
        if want.lower() in title.lower():
            end = next((j for j, lv, _ in hs[k + 1:] if lv <= level), len(lines))
            return lines[i:end]
    return None


if __name__ == '__main__':
    path, want = sys.argv[1], ' '.join(sys.argv[2:])
    text = open(path, encoding='utf8').read()
    if not want:
        print('\n'.join(f'{i + 1}: {"#" * lv} {t}' for i, lv, t in headings(text.splitlines())))
        sys.exit(0)
    s = section(text, want)
    if s is None:
        print(f'no heading containing "{want}" in {path}')
        sys.exit(1)
    print('\n'.join(s).rstrip())
