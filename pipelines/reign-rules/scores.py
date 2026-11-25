"""The scores of a reign-rules run and their change against the stored baseline (Workbench "2026-11-25 Timelines ruler rules as code
design" §3). One table per timeline and a total: reigns in, classified, excluded; decided by code, by a human ruling, needing a ruling,
unclassified (counts and shares of the reigns classified); single-source; conflicts; review flags by kind; per class and per verdict;
and the validation hits by check. The baseline is the same table without anything per reign."""
from collections import Counter

DECIDED = ('code', 'human')


def flag_kind(text):
    """A review flag's kind: its text before the first colon or bracket ("Wikidata differs: 1 – 2" -> "Wikidata differs")."""
    return str(text).split(':')[0].split(' (')[0].strip()


def table(records, excluded, hits, reigns_in):
    n = len(records)
    share = lambda k: round(k / n, 4) if n else 0.0
    code = sum(r['decided_by'] == 'code' for r in records)
    human = sum(r['decided_by'] == 'human' for r in records)
    needs = sum(r['decided_by'] == 'none' and r['rule'] != 'R14' for r in records)
    uncl = sum(r['verdict'] == 'unclassified' for r in records)
    return {
        'reigns': reigns_in, 'classified': n, 'excluded': len(excluded),
        'decided_code': code, 'decided_human': human, 'needs_ruling': needs, 'unclassified': uncl,
        'share': {'decided_code': share(code), 'decided_human': share(human), 'needs_ruling': share(needs), 'unclassified': share(uncl)},
        'single_source': sum('single-source' in r['marks'] for r in records),
        'conflicts': sum('conflict' in r['marks'] for r in records),
        'by_class': dict(sorted(Counter(r['class'] for r in records).items())),
        'by_verdict': dict(sorted(Counter(r['verdict'] for r in records).items())),
        'flags': dict(sorted(Counter(flag_kind(f) for r in records for f in r['flags']).items())),
        'validations': {c: len(h) for c, h in hits.items()},
    }


def build(records, excluded, hits, reigns_in, timelines):
    """{timeline: table, 'total': table}; hits are {check: {"<timeline>/<uuid>": detail}}, split by the timeline."""
    out = {}
    for tl in timelines:
        mine = [r for r in records if r['timeline'] == tl]
        out[tl] = table(mine, [x for x in excluded if x['timeline'] == tl], {c: {k: d for k, d in h.items() if k.split('/')[0] == tl} for c, h in hits.items()}, reigns_in.get(tl, 0))
    out['total'] = table(records, excluded, hits, sum(reigns_in.values()))
    return out


TRACKED = ('reigns', 'classified', 'excluded', 'decided_code', 'decided_human', 'needs_ruling', 'unclassified', 'single_source', 'conflicts')


def deltas(scores, baseline):
    """[(timeline, field, before, now)] for every tracked count and validation count that moved since the baseline."""
    out = []
    for tl, t in scores.items():
        b = (baseline or {}).get(tl, {})
        for k in TRACKED:
            if t.get(k) != b.get(k):
                out.append((tl, k, b.get(k), t.get(k)))
        for c, v in t['validations'].items():
            if v != b.get('validations', {}).get(c):
                out.append((tl, f'validation {c}', b.get('validations', {}).get(c), v))
    return out


def summary(scores, moved):
    """The short text report: one line per timeline, the validation counts, and what moved since the baseline."""
    lines = []
    for tl, t in scores.items():
        s = t['share']
        lines.append(f"{tl}: {t['classified']} reigns classified ({t['excluded']} excluded): code {t['decided_code']} ({s['decided_code']:.1%}), "
                     f"ruling {t['decided_human']} ({s['decided_human']:.1%}), needs a ruling {t['needs_ruling']} ({s['needs_ruling']:.1%}), "
                     f"unclassified {t['unclassified']} ({s['unclassified']:.1%}); single-source {t['single_source']}, conflicts {t['conflicts']}")
        lines.append('  validations: ' + ', '.join(f'{c} {v}' for c, v in t['validations'].items()))
    lines.append(f'since the baseline: {len(moved)} change(s)' + ('' if moved else ' (none)'))
    lines += [f'  {tl} {k}: {a} -> {b}' for tl, k, a, b in moved[:20]]
    if len(moved) > 20:
        lines.append(f'  … and {len(moved) - 20} more (scores.json)')
    return '\n'.join(lines)
