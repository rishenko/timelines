# DONE (2026-11-24, PR #192): applied to pipelines/. Kept as a template: rerun it on new pipeline code, then prove
# the result with 2026-11-24-only-inserts.py. Run from the repo root with -X utf8.
"""Proves every changed file differs from BASE only by the inserted keyword arguments given.
Usage: python only_inserts.py BASE "<insert>" ["<insert>" ...]   (run from the repo root)"""
import subprocess, sys, re
base, inserts = sys.argv[1], sys.argv[2:]
files = subprocess.run(['git', 'diff', '--name-only', base, '--', 'pipelines', 'scripts'], capture_output=True, text=True, encoding='utf-8').stdout.split()
def norm(s):
    for ins in inserts:  # ", kw" / " kw," / "(kw" forms
        s = s.replace(', ' + ins, '').replace(' ' + ins + ',', '').replace('(' + ins + ')', '()')
    return s
bad = 0
for f in files:
    old = subprocess.run(['git', 'show', f'{base}:{f}'], capture_output=True, text=True, encoding='utf-8').stdout
    new = open(f, encoding='utf-8', newline='').read()
    if norm(old) != norm(new):
        bad += 1; print('DIFFERS beyond inserts:', f)
print(f'{len(files)} files checked, {bad} differ beyond the inserts')
