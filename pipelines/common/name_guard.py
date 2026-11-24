"""
The GitHub account name (used in pull request labels such as `rishenko-overrides`) never appears in timeline data
(Kevin, 2026-11-24: labels and guard code may name it, "as long as "rishenko" doesn't appear in the final timeline
data"). Fails if it appears, in any case, in public/timelines/*.json or anywhere under data-src/.

    python3 -I pipelines/common/name_guard.py
"""
import glob
import os
import re
import subprocess
import sys

ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, encoding='utf-8').stdout.strip() or \
    os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
NAME = re.compile('rishenko', re.I)


def hits(paths):
    """[(path, line number)] for every line that names the account."""
    out = []
    for p in paths:
        with open(p, encoding='utf-8', errors='replace') as f:
            out += [(p, n) for n, line in enumerate(f, 1) if NAME.search(line)]
    return out


def main():
    paths = sorted(glob.glob(os.path.join(ROOT, 'public', 'timelines', '*.json')))
    paths += sorted(p for p in glob.glob(os.path.join(ROOT, 'data-src', '**', '*'), recursive=True) if os.path.isfile(p))
    found = hits(paths)
    for p, n in found[:20]:
        print(f'  {os.path.relpath(p, ROOT)}:{n}')
    if found:
        print(f'{len(found)} line(s) of timeline data name the account; take it out (labels and guard code only)')
        return 1
    print(f'name: not in {len(paths)} data files')
    return 0


if __name__ == '__main__':
    sys.exit(main())
