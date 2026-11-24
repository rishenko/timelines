"""
sample_judge: the sample-and-judge harness (pass 9, backlog 9.5 + N6). A bulk data add reaches Kevin only after a stratified
sample of it is read against its sources and the precision clears the gate (pass-9 rule: point estimate at least 95%, the Wilson
interval reported). This makes that a saved, auditable run instead of a one-off script.

    # 1. draw: candidates are a JSON list of objects or a CSV; one row per thing to judge
    python3 -I pipelines/common/sample_judge.py draw --candidates added.csv --out runs/persons-1 --seed 20261127 --n 80 \\
        --strata timeline --id-fields timeline,row,person,start --show row,person,start,end,office,lead --readers dev_a,dev_c
    # 2. each reader fills verdicts-<reader>.csv (copy the rows from verdicts-template.csv): ok | bad | unsure, plus a note
    # 3. report: merges the verdicts, prints precision, the Wilson interval, the reader agreement and the gate line
    python3 -I pipelines/common/sample_judge.py report --out runs/persons-1

`draw` writes, all in --out and all kept for the audit: `candidates.<ext>` (a copy of the input), `sample.json` (seed, n, strata
with their sizes and draws, the input's sha256, the ids drawn, which reader reads which), `blind-<reader>.csv` and `.md` (the
rows to read in a reader-specific shuffled order, the --show fields only, no verdicts and none of the other readers' work), and
`verdicts-template.csv` (id, reader, verdict, note). Every reader reads the whole sample. (`--overlap K` gives the readers after
the first only K seed-chosen rows; such a run reports agreement but its gate is INCOMPLETE.) `report` writes `report.md` and
`report.json`.

The sample is stratified by the --strata field(s), proportional to the stratum sizes (largest remainders, so the total is exactly
n), and deterministic: the same candidates, seed and arguments draw the same ids, whatever the order of the input rows.

The gate (pass-9 rule: an author's own read never passes alone) needs at least two readers on every row; with fewer, the gate line
says INCOMPLETE and `report` exits 1, whatever the precision. It is computed on the strict reading: a row is real only if every
reader who read it says `ok` (`unsure` counts as not real). The first reader's own figure is printed beside it. A disagreement is
listed, never averaged away.
"""
import argparse
import csv
import hashlib
import json
import math
import os
import random
import shutil
import sys

Z = 1.959964  # 95% two-sided
GATE = 0.95
VERDICTS = ('ok', 'bad', 'unsure')


def wilson(k, n, z=Z):
    """The Wilson score interval (low, high) for k successes in n trials."""
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    d = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / d
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, centre - half), min(1.0, centre + half))


def cohen_kappa(a, b):
    """Cohen's kappa for two lists of booleans; None when it is undefined (no variation expected by chance)."""
    n = len(a)
    if n == 0:
        return None
    po = sum(x == y for x, y in zip(a, b)) / n
    pa, pb = sum(a) / n, sum(b) / n
    pe = pa * pb + (1 - pa) * (1 - pb)
    return None if pe == 1 else (po - pe) / (1 - pe)


def read_rows(path):
    """The candidates: a JSON list of objects, or a CSV with a header row. Values are kept as written (CSV: strings)."""
    if path.endswith('.json'):
        with open(path, encoding='utf-8') as f:
            rows = json.load(f)
        if not isinstance(rows, list) or not all(isinstance(r, dict) for r in rows):
            raise SystemExit(f'{path}: expected a JSON list of objects')
        return rows
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def with_ids(rows, id_field, id_fields):
    """Each row gets a string `id`: the `id` field, or the --id-fields joined with " | ". Ids must be unique."""
    out = []
    for r in rows:
        r = dict(r)
        r['id'] = ' | '.join(str(r.get(f, '')) for f in id_fields) if id_fields else str(r.get(id_field, ''))
        out.append(r)
    ids = [r['id'] for r in out]
    if '' in ids or len(set(ids)) != len(ids):
        dup = sorted({i for i in ids if ids.count(i) > 1})[:3]
        raise SystemExit(f'ids must be present and unique (empty or repeated: {dup or ["(empty)"]}); use --id-fields')
    return out


def allocate(sizes, n):
    """Proportional allocation of n draws over strata (a dict name -> size), by largest remainders, never above a stratum's size,
    and at least one draw per stratum when n allows."""
    total = sum(sizes.values())
    n = min(n, total)
    raw = {k: n * v / total for k, v in sizes.items()}
    got = {k: min(sizes[k], int(raw[k])) for k in sizes}
    left = n - sum(got.values())
    for k in sorted(sizes, key=lambda k: (-(raw[k] - int(raw[k])), k)):
        if left <= 0:
            break
        if got[k] < sizes[k]:
            got[k] += 1
            left -= 1
    for k in sorted(sizes):  # every stratum is read at least once, taking the draw from the largest allocation
        if got[k] == 0 and n >= len(sizes):
            big = max(got, key=lambda j: (got[j], j))
            got[big] -= 1
            got[k] = 1
    return got


def draw_sample(rows, strata, seed, n):
    """(ids drawn, {stratum: [size, drawn]}) - stratified, proportional, deterministic whatever the order of `rows`."""
    groups = {}
    for r in rows:
        groups.setdefault(' / '.join(str(r.get(s, '')) for s in strata) if strata else 'all', []).append(r['id'])
    for g in groups.values():
        g.sort()
    take = allocate({k: len(v) for k, v in groups.items()}, n)
    rng = random.Random(seed)
    drawn = []
    for k in sorted(groups):
        drawn += rng.sample(groups[k], take[k])
    return drawn, {k: [len(groups[k]), take[k]] for k in sorted(groups)}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def cmd_draw(a):
    rows = with_ids(read_rows(a.candidates), 'id', [f for f in a.id_fields.split(',') if f] if a.id_fields else [])
    if not rows:
        raise SystemExit('no candidates')
    strata = [s for s in a.strata.split(',') if s] if a.strata else []
    readers = [r for r in a.readers.split(',') if r]
    if not readers:
        raise SystemExit('--readers: at least one reader')
    os.makedirs(a.out, exist_ok=True)
    if os.path.exists(os.path.join(a.out, 'sample.json')) and not a.force:
        raise SystemExit(f'{a.out}/sample.json exists: a drawn sample is never redrawn (use a new --out, or --force)')
    ext = os.path.splitext(a.candidates)[1] or '.csv'
    shutil.copyfile(a.candidates, os.path.join(a.out, 'candidates' + ext))
    drawn, strata_info = draw_sample(rows, strata, a.seed, a.n)
    by_id = {r['id']: r for r in rows}
    rng = random.Random(f'{a.seed}-overlap')
    k = len(drawn) if a.overlap is None else min(a.overlap, len(drawn))  # default: every reader reads every row
    overlap = sorted(rng.sample(sorted(drawn), k)) if len(readers) > 1 else []
    show = [f for f in a.show.split(',') if f] if a.show else [k for k in rows[0] if k != 'id']
    show = [f for f in show if f not in a.hide.split(',')]
    assign = {readers[0]: sorted(drawn)}
    for r in readers[1:]:
        assign[r] = overlap
    for r, ids in assign.items():
        order = sorted(ids)
        random.Random(f'{a.seed}-{r}').shuffle(order)  # each reader sees their own order
        with open(os.path.join(a.out, f'blind-{r}.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['n', 'id'] + show)
            for i, rid in enumerate(order, 1):
                w.writerow([i, rid] + [by_id[rid].get(s, '') for s in show])
        with open(os.path.join(a.out, f'blind-{r}.md'), 'w', encoding='utf-8') as f:
            f.write(f'# Rows to read: {r} ({len(order)})\n\nFor each row write `ok`, `bad` or `unsure` (and a note) in '
                    f'`verdicts-{r}.csv`, copied from `verdicts-template.csv`. {a.instructions}\n\n')
            for i, rid in enumerate(order, 1):
                f.write(f'{i}. **{rid}**\n')
                for s in show:
                    v = str(by_id[rid].get(s, '')).strip()
                    if v:
                        f.write(f'   - {s}: {v[:600]}\n')
    with open(os.path.join(a.out, 'verdicts-template.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['id', 'reader', 'verdict', 'note'])
        for r, ids in assign.items():
            for rid in sorted(ids):
                w.writerow([rid, r, '', ''])
    with open(os.path.join(a.out, 'sample.json'), 'w', encoding='utf-8') as f:
        json.dump({'seed': a.seed, 'n_requested': a.n, 'n': len(drawn), 'strata_field': strata, 'strata': strata_info,
                   'candidates': 'candidates' + ext, 'candidates_sha256': sha256(a.candidates), 'candidate_count': len(rows),
                   'id_fields': a.id_fields, 'shown': show, 'readers': readers, 'overlap': overlap, 'drawn': sorted(drawn)},
                  f, indent=1, ensure_ascii=False)
    print(f'drew {len(drawn)} of {len(rows)} candidates, seed {a.seed}; strata ' +
          ', '.join(f'{k} {d}/{s}' for k, (s, d) in strata_info.items()))
    for r in readers:
        print(f'  reader {r}: {len(assign[r])} rows -> {a.out}/blind-{r}.md, .csv')
    return 0


def load_verdicts(out, reader, ids):
    """{id: (verdict, note)} from verdicts-<reader>.csv; raises SystemExit on a missing, unknown or foreign row."""
    path = os.path.join(out, f'verdicts-{reader}.csv')
    if not os.path.exists(path):
        raise SystemExit(f'missing {path}')
    got = {}
    with open(path, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            v = (r.get('verdict') or '').strip().lower()
            rid = r['id']
            if rid not in ids:
                raise SystemExit(f'{path}: {rid!r} is not in the rows this reader was given')
            if v not in VERDICTS:
                raise SystemExit(f'{path}: {rid!r}: verdict {v!r} is not one of {", ".join(VERDICTS)}')
            got[rid] = (v, (r.get('note') or '').strip())
    missing = sorted(set(ids) - set(got))
    if missing:
        raise SystemExit(f'{path}: {len(missing)} rows without a verdict, e.g. {missing[:3]}')
    return got


def pct(x):
    return f'{100 * x:.1f}%'


def cmd_report(a):
    with open(os.path.join(a.out, 'sample.json'), encoding='utf-8') as f:
        S = json.load(f)
    readers, drawn = S['readers'], S['drawn']
    ids_of = {readers[0]: set(drawn)}
    for r in readers[1:]:
        ids_of[r] = set(S['overlap'])
    verdicts = {r: load_verdicts(a.out, r, ids_of[r]) for r in readers}
    first = verdicts[readers[0]]
    k1 = sum(v[0] == 'ok' for v in first.values())
    strict = {i: all(verdicts[r][i][0] == 'ok' for r in readers if i in verdicts[r]) for i in drawn}
    ks, n = sum(strict.values()), len(drawn)
    lo, hi = wilson(ks, n)
    lo1, hi1 = wilson(k1, n)
    lines = [f'# Sample-and-judge report: {os.path.basename(os.path.normpath(a.out))}', '',
             f'- Candidates: {S["candidate_count"]} (`{S["candidates"]}`, sha256 `{S["candidates_sha256"][:16]}…`); seed {S["seed"]}; '
             f'sample {n} of {S["n_requested"]} requested; strata {S["strata_field"] or "none"}: ' +
             ', '.join(f'{k} {d}/{s}' for k, (s, d) in S['strata'].items()),
             f'- Readers: ' + ', '.join(f'{r} ({len(ids_of[r])} rows)' for r in readers), '']
    lines.append(f'- **{readers[0]} alone:** {k1} of {n} real = {pct(k1 / n)}; Wilson 95% {pct(lo1)}–{pct(hi1)}')
    lines.append(f'- **Strict (every reader who read a row says ok):** {ks} of {n} real = {pct(ks / n)}; Wilson 95% {pct(lo)}–{pct(hi)}')
    for r in readers[1:]:
        ids = sorted(ids_of[r])
        x = [first[i][0] == 'ok' for i in ids]
        y = [verdicts[r][i][0] == 'ok' for i in ids]
        agree = sum(p == q for p, q in zip(x, y))
        kap = cohen_kappa(x, y)
        lines.append(f'- **Agreement {readers[0]} vs {r}** on {len(ids)} rows: {agree} agree ({pct(agree / len(ids))}); Cohen\'s kappa '
                     + ('undefined (no variation)' if kap is None else f'{kap:.2f}'))
        for i in ids:
            if (first[i][0] == 'ok') != (verdicts[r][i][0] == 'ok'):
                lines.append(f'  - DISAGREE `{i}`: {readers[0]} {first[i][0]} ({first[i][1] or "-"}); {r} {verdicts[r][i][0]} ({verdicts[r][i][1] or "-"})')
    lines += ['', '## Rows not real (strict)', '']
    bad = [i for i in sorted(drawn) if not strict[i]]
    for i in bad:
        who = '; '.join(f'{r} {verdicts[r][i][0]}' + (f' ({verdicts[r][i][1]})' if verdicts[r][i][1] else '')
                        for r in readers if i in verdicts[r] and verdicts[r][i][0] != 'ok')
        lines.append(f'- `{i}`: {who}')
    if not bad:
        lines.append('- none')
    two = sum(1 for i in drawn if sum(i in verdicts[r] for r in readers) >= 2)  # rows read by at least two readers
    complete = two == n
    ok = complete and ks / n >= GATE
    verdict = 'PASS' if ok else 'FAIL' if complete else f'INCOMPLETE ({two} of {n} rows read by two readers; the gate needs every row)'
    gate = f'GATE: {ks}/{n} = {pct(ks / n)} · point ≥95% (pass-9 gate): {verdict} · Wilson lower bound {pct(lo)} (95% {pct(lo)}–{pct(hi)})'
    lines += ['', gate, '']
    with open(os.path.join(a.out, 'report.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    with open(os.path.join(a.out, 'report.json'), 'w') as f:
        json.dump({'n': n, 'strict_ok': ks, 'strict_precision': ks / n, 'wilson': [lo, hi], 'first_reader': readers[0], 'first_ok': k1,
                   'first_wilson': [lo1, hi1], 'two_readers_rows': two, 'complete': complete, 'gate_pass': ok, 'not_real': bad}, f, indent=1)
    print('\n'.join(lines))
    return 0 if ok else 1


def main(argv):
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    sub = p.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('draw', help='draw a stratified sample and write the blind reader files')
    d.add_argument('--candidates', required=True, help='JSON list of objects, or CSV with a header')
    d.add_argument('--out', required=True)
    d.add_argument('--seed', type=int, required=True)
    d.add_argument('--n', type=int, required=True)
    d.add_argument('--strata', default='', help='comma-separated fields to stratify by (default: none)')
    d.add_argument('--id-fields', default='', help='fields that make the id (default: an `id` field)')
    d.add_argument('--show', default='', help='fields the readers see (default: all but id)')
    d.add_argument('--hide', default='', help='fields never shown (a hint, a flag)')
    d.add_argument('--readers', required=True, help='comma-separated; the gate needs at least two')
    d.add_argument('--overlap', type=int, default=None, help='rows the readers after the first read (default: all; fewer makes the gate INCOMPLETE)')
    d.add_argument('--instructions', default='A row is real if the source supports it as stated.')
    d.add_argument('--force', action='store_true')
    r = sub.add_parser('report', help='merge the verdicts and report precision, the Wilson interval and agreement')
    r.add_argument('--out', required=True)
    a = p.parse_args(argv)
    return cmd_draw(a) if a.cmd == 'draw' else cmd_report(a)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
