// Science and discoveries pilot, Ancient and Classical (Kevin, 2026-11-23/24): the events of pipelines/common/science.json
// that start before 650 CE, in the existing `science` kind (their sub-kinds are in pipelines/ancient/categories.json), plus
// their Wikipedia sources. Every date and place is a quoted sentence from the dump (checked by
// `pipelines/.venv/bin/python -I pipelines/common/science.py --check`). The Medieval and Modern States generators read the
// same list (pipelines/common/science.py).
// Re-runnable. Plan: Workbench "2026-11-24 Timelines science and discoveries pilot plan".
//   node scripts/ancient-classical/science.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { C, open } from '../lib/dataset-edit.ts';

type Q = { article: string; section: string; quote: string };
type Claim = Q & { year: number; margin?: number; note?: string };
type Ev = {
  uuid: string; title: string; descr: string; start: number; end?: number; circa?: boolean; kind: string; tracks: string[];
  source: Q; more?: Q[]; claims?: Claim[];
};
const L: { sources: Record<string, string>; events: Ev[] } = JSON.parse(readFileSync('pipelines/common/science.json', 'utf8'));

const END = 650; // this timeline's range ends at 650 CE (the seam with Medieval World)
// a historical year (negative = BCE) as readable text
const yr = (y: number, circa = false) => `${circa ? 'c. ' : ''}${y < 0 ? `${-y} BCE` : `${y} CE`}`;
const ref = (q: Q) => ({ sourceKey: L.sources[q.article], sourceLocation: `${q.section}: "${q.quote}"` });
const claim = (c: Claim) => C(yr(c.year), L.sources[c.article], `${c.section}: "${c.quote}"`, { margin: c.margin, note: c.note });

const ed = open('data-src/ancient-classical.json', '2026-11-24');
const here = new Set(ed.data.tracks.map((t: { id: string }) => t.id));
const used = new Set<string>();
for (const e of L.events.filter((x) => x.start < END)) {
  const tracks = e.tracks.filter((r) => here.has(r));
  if (!tracks.length) throw new Error(`science.json: ${e.uuid}: none of its rows ${e.tracks} is in this timeline`);
  // the headline date has its own claim unless one of the claims already gives that year
  const claims = (e.claims ?? []).map(claim);
  if (claims.length && !(e.claims ?? []).some((c) => c.year === e.start)) claims.unshift(C(yr(e.start), L.sources[e.source.article], `${e.source.section}: "${e.source.quote}"`));
  ed.event({
    uuid: e.uuid,
    title: e.title,
    descr: e.descr,
    start: yr(e.start, e.circa),
    ...(e.end !== undefined ? { end: yr(e.end) } : {}),
    tracks,
    sources: [ref(e.source), ...(e.more ?? []).map(ref)],
    ...(claims.length ? { startDates: claims } : {}),
  });
  for (const q of [e.source, ...(e.more ?? []), ...(e.claims ?? [])]) used.add(q.article);
}
for (const a of [...used].sort()) ed.wikipedia(L.sources[a], a, a.replaceAll(' ', '_'));
ed.save();
