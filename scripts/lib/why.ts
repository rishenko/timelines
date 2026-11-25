// `npm run why` (wave 2 B2): why an event is in a timeline, read-only over the committed files. For an event: its dates, rows,
// categories and each source with its cited location; for a reign, its provenance entry (person, Wikidata item, the route
// that found it, the cited page, the open flags); and every ruling about it, its row or its timeline's row.
// The evidence records (B3) will add the who / where / when records here.

type Json = Record<string, any>;

export interface Timeline { id: string; data: Json; prov: Record<string, Json> }
export interface Hit { tl: Timeline; ev: Json }

const lower = (s: unknown) => String(s ?? '').toLowerCase();
const rowOf = (q: string) => (q.includes('/') ? { tl: q.split('/')[0], row: q.split('/')[1] } : { tl: '', row: q });
const covers = (ev: Json, y: number) => ev.start <= y && (ev.end ?? ev.start) >= y;
const isReign = (ev: Json) => (ev.memberships ?? []).some((m: Json) => m.facet === 'category' && /^reign\b/.test(m.value));

/** Events matching `<uuid>`, `<row> <year>` or `<row> <words of the title or the person>`; a row may be `<timeline>/<row>`. */
export function find(timelines: Timeline[], args: string[]): Hit[] {
  if (args.length === 1) {
    return timelines.flatMap((tl) => tl.data.events.filter((ev: Json) => ev.uuid === args[0]).map((ev: Json) => ({ tl, ev })));
  }
  const { tl: only, row } = rowOf(args[0]);
  const rest = args.slice(1).join(' ');
  const year = /^-?\d+$/.test(rest) ? Number(rest) : undefined;
  const hits = timelines.filter((tl) => !only || tl.id === only).flatMap((tl) =>
    tl.data.events.filter((ev: Json) => (ev.tracks ?? []).includes(row) && (year !== undefined
      ? covers(ev, year)
      : lower(ev.title).includes(lower(rest)) || lower(tl.prov[ev.uuid]?.person).includes(lower(rest))))
      .map((ev: Json) => ({ tl, ev })));
  return hits.sort((a, b) => Number(isReign(b.ev)) - Number(isReign(a.ev)) || a.ev.start - b.ev.start);
}

const date = (ev: Json, side: 'start' | 'end') =>
  ev[side] === undefined ? '' : [ev[side], ev[`${side}Month`], ev[`${side}Day`]].filter((x) => x !== undefined).join('-');

/**
 * The rulings behind an event: those about the event itself, and for a reign the office-scope rulings of a row it's on (they
 * decide which offices' holders count as the row's rulers). A row's date ruling is about the row's own dates, not its events.
 */
export function rulingsFor(rulings: Json[], tl: string, ev: Json): Json[] {
  const own = new Set([ev.uuid, `event:${ev.uuid}`]);
  const rows = new Set((ev.tracks ?? []).flatMap((r: string) => [`row:${r}`, `row:${tl}/${r}`]));
  return rulings.filter((r) => own.has(r.subject) || (isReign(ev) && r.kind === 'office-scope' && rows.has(r.subject)));
}

/** The lines `why` prints for one event. */
export function explain({ tl, ev }: Hit, rulings: Json[]): string[] {
  const out = [`${ev.uuid}  ${ev.title}`, `  timeline ${tl.id}, row ${(ev.tracks ?? []).join(', ')}`,
    `  dates ${date(ev, 'start')}${ev.end !== undefined ? ` to ${date(ev, 'end')}` : ''}${ev.circa ? ' (circa)' : ''}`];
  const cats = (ev.memberships ?? []).filter((m: Json) => m.facet === 'category').map((m: Json) => m.value);
  if (cats.length) out.push(`  category ${cats.join(', ')}`);
  for (const s of ev.sources ?? []) {
    const src = tl.data.sources?.[s.sourceKey] ?? {};
    out.push(`  source ${src.name ?? s.sourceKey}${src.url ? ` <${src.url}>` : ''}`, `    cites ${s.sourceLocation ?? '(no location)'}`);
  }
  const p = tl.prov[ev.uuid];
  if (p) {
    out.push(`  provenance person ${p.person}${p.qid ? ` (${p.qid})` : ''}`, `    route ${p.route ?? '-'}`, `    cited page ${p.cited ?? '-'}`);
    for (const f of p.toCheck ?? []) out.push(`    open flag ${f}`);
  }
  for (const r of rulingsFor(rulings, tl.id, ev)) out.push(`  ruling ${r.id} (${r.decided_by}, ${r.date}): ${r.headline}`);
  return out;
}

/** The kind of an open flag: its words before the first colon or parenthesis ("Wikidata differs", "office noun unclear"). */
export const flagKind = (f: string) => f.split(/[:(]/)[0].trim();

/** Reigns with open flags, optionally on one row or region (a row and every row under it) and of one flag kind. */
export function openFlags(timelines: Timeline[], region?: string, flag?: string): { tl: string; uuid: string; row: string; flag: string }[] {
  const out: { tl: string; uuid: string; row: string; flag: string }[] = [];
  for (const tl of timelines) {
    const parent = new Map<string, string>(tl.data.tracks.map((t: Json) => [t.id, t.parent]));
    const under = (row: string) => { for (let r: string | undefined = row; r; r = parent.get(r)) if (r === region) return true; return false; };
    for (const [uuid, p] of Object.entries(tl.prov)) {
      if (region && !under(p.row)) continue;
      for (const f of p.toCheck ?? []) if (!flag || lower(f).includes(lower(flag))) out.push({ tl: tl.id, uuid, row: p.row, flag: f });
    }
  }
  return out;
}
