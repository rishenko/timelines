// Traditions with no single founder (Kevin, 2026-11-23): the "Religions and traditions" group and its rows, from the
// shared list pipelines/common/traditions.json, which the Medieval and Modern States generators read too
// (pipelines/common/traditions.py: same ids, same claims, so the rows meet at the seams). This timeline gets every
// tradition whose dates reach before 650 CE, and the events that start before 650 CE. Every claim quotes its article;
// `pipelines/.venv/bin/python -I pipelines/common/traditions.py --check` verifies the quotes against the dump.
// Re-runnable. PILOT: 4 traditions.
//   node scripts/ancient-classical/traditions.ts && npm run data -- build ancient-classical
import { readFileSync } from 'node:fs';
import { C, open } from '../lib/dataset-edit.ts';

type Claim = { year: number; margin?: number; source?: string; section?: string; quote?: string; note?: string };
type Ev = { uuid: string; title: string; start: number; end?: number; circa?: boolean; descr: string; source: string; section: string; quote: string; claims?: Claim[] };
type Tradition = {
  id: string; name: string; wikidata: string; article: string; color: string; start: number; circa?: boolean;
  startDates: Claim[]; ongoing: { source: string; section: string; quote: string }; events: Ev[]; shared: { timeline: string; uuid: string }[];
};
const L: { group: { id: string; name: string; color: string }; sources: Record<string, string>; traditions: Tradition[] } = JSON.parse(
  readFileSync('pipelines/common/traditions.json', 'utf8'),
);

const END = 650; // this timeline's range ends at 650 CE (the seam with Medieval World)
// a historical year (negative = BCE) as readable text
const yr = (y: number, circa = false) => `${circa ? 'c. ' : ''}${y < 0 ? `${-y} BCE` : `${y} CE`}`;
const loc = (c: { section?: string; quote?: string }) => `${c.section}: "${c.quote}"`;
const claim = (c: Claim, source?: string, where?: string) =>
  C(yr(c.year), c.source ?? source!, c.quote ? loc(c) : where!, { margin: c.margin, note: c.note });
const earliest = (t: Tradition) => Math.min(t.start, ...t.startDates.map((c) => c.year - (c.margin ?? 0)));

const ed = open('data-src/ancient-classical.json', '2026-11-23');
const used = new Set<string>();
const rows = L.traditions.filter((t) => earliest(t) < END);
ed.track({ id: L.group.id, name: L.group.name, color: L.group.color });
let prev = L.group.id;
for (const t of rows) {
  ed.track(
    {
      id: t.id,
      name: t.name,
      kind: 'theme',
      color: t.color,
      parent: L.group.id,
      url: `https://en.wikipedia.org/wiki/${t.article.replaceAll(' ', '_')}`,
      ids: { wikidata: t.wikidata },
      span: {
        start: yr(t.start, t.circa),
        ongoing: true,
        startDates: t.startDates.map((c) => claim(c)),
        ongoingSources: [{ sourceKey: t.ongoing.source, sourceLocation: loc(t.ongoing) }],
      },
    },
    { after: prev },
  );
  prev = t.id;
  t.startDates.forEach((c) => used.add(c.source!));
  used.add(t.ongoing.source);
  for (const e of t.events.filter((x) => x.start < END)) {
    ed.event({
      uuid: e.uuid,
      title: e.title,
      descr: e.descr,
      start: yr(e.start, e.circa),
      ...(e.end !== undefined ? { end: yr(e.end) } : {}),
      tracks: [t.id],
      sources: [{ sourceKey: e.source, sourceLocation: loc(e) }],
      ...(e.claims ? { startDates: e.claims.map((c) => claim(c, e.source, loc(e))) } : {}),
    });
    used.add(e.source);
  }
  for (const s of t.shared.filter((x) => x.timeline === 'ancient-classical')) ed.addRow(s.uuid, t.id);
}
for (const k of [...used].sort()) ed.wikipedia(k, L.sources[k], L.sources[k].replaceAll(' ', '_'));
ed.save();
