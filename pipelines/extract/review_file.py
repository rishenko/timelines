"""
One review-file format for bulk data passes (rulers, conflicts, later row passes), so Kevin skims every pass the same
way. A pass builds a `Review` and calls `write()`; the file is Markdown:

    # <Pass> review: <Timeline>
    <one summary paragraph: totals, median coverage, to-check rate, the AI-flag check, "nothing is in data-src yet">
    <how to read it: what "to check" means for this pass, and the pass's own terms>
    | Row | <Items> | Coverage | To check | <extra columns> |      one line per row with items
    **Rows with nothing found (N):** …
    ## <Row>                                                       one section per row
    <count> · coverage <n>% of <years> · <k> to check · <notes>
    **To check**     every item with a reason (⚠ line under it)
    **Sample**       up to SAMPLE of the rest, spread evenly

The file opens with a small front-matter header the dashboard reads (dataset, timeline, generated, items, to_check,
rows, ai_flagged_citations), and `write()` adds or updates the file's entry in MANIFEST (JSON: {"reviews": {path: {…}}}).

Items are plain dicts the pass formats itself (`text`, optional `why`: [reasons], optional `group`: a key of
Review.groups, for a class Kevin decides in one go; the group gets its own section after the table); the module owns layout, ordering,
sampling and the summary, so the passes can't drift apart.

    from review_file import Review, Row
    rv = Review(kind='Rulers', timeline='Modern States', item='reigns', check_means='…', glossary='…')
    rv.rows.append(Row(name='France', items=[...], coverage=0.93, years=(1500, 2025), extra={'Unchecked': 4},
                       notes='2 not placed'))
    rv.ai_check = (0, 412)  # (citations of AI-flagged pages, pages checked)
    rv.write(path)
"""
import datetime
from collections import Counter
import json
import os
import tempfile
from dataclasses import dataclass, field

SAMPLE = 5
# Every review file gets an entry here, for the Kevin Dashboard to list. Keyed by the file's absolute path;
# entries are updated by key, never rewritten whole. Override with REVIEW_MANIFEST.
MANIFEST = os.environ.get('REVIEW_MANIFEST') or os.path.expanduser('~/Documents/GitHub/timelines-bakeoff-results/review-manifest.json')


@dataclass
class Row:
    name: str
    items: list  # [{'text': str, 'why': [str] | None}]
    coverage: float | None = None  # share of the row's years the items cover; None: not a span pass
    years: tuple | None = None  # (first, last) year of the row in the window
    extra: dict = field(default_factory=dict)  # pass-specific counts, shown as columns in this order
    notes: str = ''  # one line after the counts ("2 not placed (1 an AI-flagged article, never cited)")

    @property
    def to_check(self):
        return [i for i in self.items if i.get('why')]

    @property
    def rest(self):
        return [i for i in self.items if not i.get('why')]


@dataclass
class Review:
    kind: str  # "Rulers", "Conflicts"
    timeline: str
    item: str  # plural noun: "reigns", "wars"
    check_means: str  # one sentence: what puts an item in "to check"
    glossary: str = ''  # the pass's own terms ("Visible" = …)
    rows: list = field(default_factory=list)
    empty: list = field(default_factory=list)  # names of rows with nothing found
    ai_check: tuple | None = None  # (citations of AI-flagged pages, pages checked)
    total_rows: int | None = None  # rows the pass looked at (default: rows + empty)
    # classes Kevin decides in one go ("Ruled from another row"): {name: about}; items join one with a 'group' key and
    # are listed together after the table as well as under their row
    groups: dict = field(default_factory=dict)
    # items left out that Kevin should still see ("Generic office, unplaced"): {title: (about, {row name: [lines]})},
    # each a section after the groups; not counted in the totals
    left_out: dict = field(default_factory=dict)

    def summary(self):
        n = sum(len(r.items) for r in self.rows)
        nf = sum(len(r.to_check) for r in self.rows)
        looked = self.total_rows or len(self.rows) + len(self.empty)
        s = f"{n} {self.item} on {len(self.rows)} of {looked} rows."
        covs = sorted(r.coverage for r in self.rows if r.coverage is not None)
        if covs:
            s += f" Median coverage {100 * covs[len(covs) // 2]:.0f}% (share of a row's years with one)."
        s += f" {nf} to check ({100 * nf / max(1, n):.0f}%)."
        if self.ai_check:
            bad, pages = self.ai_check
            s += (f" AI-flag check: {bad} citations of AI-flagged pages" if bad else
                  f" AI-flag check: none of the {pages} cited pages is AI-flagged") + '.'
        return s + ' Nothing is in data-src yet.', n, nf

    def header(self, n, nf):
        return {'dataset': self.kind.lower(), 'timeline': self.timeline, 'title': f"{self.kind} review: {self.timeline}",
                'generated': datetime.datetime.now().astimezone().isoformat(timespec='minutes'),
                'items': n, 'item': self.item, 'to_check': nf, 'rows': len(self.rows),
                'ai_flagged_citations': self.ai_check[0] if self.ai_check else None,
                'groups': {g: sum(i.get('group') == g for r in self.rows for i in r.items) for g in self.groups},
                'left_out': {t: sum(map(len, rows.values())) for t, (_, rows) in self.left_out.items()},
                'status': 'review'}

    def write(self, path, manifest=MANIFEST):
        text, n, nf = self.summary()
        meta = self.header(n, nf)
        cols = list(dict.fromkeys(k for r in self.rows for k in r.extra))
        spans = any(r.coverage is not None for r in self.rows)
        head = ['Row', self.item.capitalize()] + (['Coverage'] if spans else []) + ['To check'] + cols
        md = ['---'] + [f"{k}: {json.dumps(v, ensure_ascii=False)}" for k, v in meta.items()] + ['---',
              f"# {self.kind} review: {self.timeline}", '', text, '',
              f"Each row lists {self.item} to check first ({self.check_means}), then a sample of the rest."
              + (f" {self.glossary}" if self.glossary else ''), '',
              '| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)]
        for r in self.rows:
            cells = [r.name, str(len(r.items))] + ([f"{100 * r.coverage:.0f}%" if r.coverage is not None else ''] if spans else []) \
                + [str(len(r.to_check))] + [str(r.extra.get(c, '')) for c in cols]
            md.append('| ' + ' | '.join(cells) + ' |')
        md += ['', f"**Rows with nothing found ({len(self.empty)}):** " + ', '.join(self.empty), '']
        for g, about in self.groups.items():
            members = [(r.name, i) for r in self.rows for i in r.items if i.get('group') == g]
            md += [f"## {g} ({len(members)})", '', about, '']
            for name in dict.fromkeys(n for n, _ in members):
                md += [f"**{name}**", ''] + [i['text'] for n, i in members if n == name] + ['']
        for t, (about, rows) in self.left_out.items():
            md += [f"## {t} ({sum(map(len, rows.values()))})", '', about, '']
            for name, lines in rows.items():
                md += [f"**{name}**", ''] + lines + ['']
        for r in self.rows:
            line = [f"{len(r.items)} {self.item}"]
            if r.coverage is not None:
                line.append(f"coverage {100 * r.coverage:.0f}%" + (f" of {r.years[0]}–{r.years[1]}" if r.years else ''))
            line.append(f"{len(r.to_check)} to check")
            line += [f"{v} {k.lower()}" for k, v in r.extra.items() if k != 'To check']
            if r.notes:
                line.append(r.notes)
            grouped = Counter(i['group'] for i in r.items if i.get('group'))
            line += [f"{k} {g.lower()}" for g, k in grouped.items()]
            md += [f"## {r.name}", '', ' · '.join(line), '']
            if r.to_check:
                md += ['**To check**', ''] + [f"{i['text']}\n  - ⚠ {'; '.join(i['why'])}" for i in r.to_check] + ['']
            rest = r.rest
            step = max(1, len(rest) // SAMPLE)
            sample = rest[::step][:SAMPLE]
            if sample:
                md += [f"**Sample** ({len(sample)} of {len(rest)} others)", ''] + [i['text'] for i in sample] + ['']
        open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(md) + '\n')
        if manifest:
            register(manifest, os.path.abspath(path), meta)
        return n, nf


def register(manifest, path, entry):
    """Add or update one review file's entry in the manifest (atomic replace; other entries untouched)."""
    os.makedirs(os.path.dirname(manifest), exist_ok=True)
    try:
        data = json.load(open(manifest, encoding='utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        data = {}
    data.setdefault('reviews', {})[path] = dict(entry, path=path)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(manifest), suffix='.tmp')
    with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    os.replace(tmp, manifest)
