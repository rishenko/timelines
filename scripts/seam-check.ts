// Checks the seams between neighbouring timelines: a row that crosses from one timeline into the next must have the
// same dates on both sides, so the timelines line up where `meta.continues` joins them.
//
//   npm run seam-check                          compares data-src/seams.json's timelines (compiled files)
//   npm run seam-check -- --with <file.json>    adds a timeline file from elsewhere (e.g. another branch's build)
//
// Two kinds of check, both listed in data-src/seams.json:
// - shared rows: a row id found in both timelines. Its lifespan (typed, or worked out from its phases) must start
//   and end in the same years, and phases with the same name must have the same dates. Phases found on only one
//   side are listed, not errors: each file carries the phases that overlap its own range.
// - pairs: a row in one timeline that is a set of phases in the other (Ancient's `tang` row = the Tang phases of
//   Medieval's `china` row). The row's lifespan must match the first phase's start and the last phase's end.
// It reports differences and exits 1 if there are any; start and end events are not compared (each file names only
// its own events).
import { existsSync, readFileSync } from 'node:fs';

type Json = Record<string, any>;
interface Stretch { start: number; end?: number; ongoing?: boolean }

const plan: Json = JSON.parse(readFileSync('data-src/seams.json', 'utf8'));
const files: string[] = plan.timelines.map((id: string) => `public/timelines/${id}.json`).filter((f: string) => existsSync(f));
const w = process.argv.indexOf('--with');
if (w > 0) files.push(...process.argv.slice(w + 1));
const tls: Json[] = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));

const stretches = (t: Json): Stretch[] => {
  if (t.span) return Array.isArray(t.span) ? t.span : [t.span];
  return (t.phases ?? []).map((p: Json) => ({ start: p.start, end: p.end, ongoing: p.ongoing }));
};
const life = (t: Json) => {
  const s = stretches(t);
  if (!s.length) return null;
  const end = s.some((x) => x.ongoing) ? 'ongoing' : Math.max(...s.map((x) => x.end ?? x.start));
  return { start: Math.min(...s.map((x) => x.start)), end, typed: !!t.span };
};
const fmt = (l: Json | null) => (l ? `${l.start}–${l.end}${l.typed ? '' : ' (from phases)'}` : 'none');

const problems: string[] = [];
const notes: string[] = [];
for (let i = 0; i < tls.length; i++) {
  for (let j = i + 1; j < tls.length; j++) {
    const a = tls[i], b = tls[j];
    const bRows = new Map<string, Json>(b.tracks.map((t: Json) => [t.id, t]));
    for (const ta of a.tracks) {
      const tb = bRows.get(ta.id);
      if (!tb) continue;
      const la = life(ta), lb = life(tb);
      if (!la || !lb) continue; // a group row
      const where = `${ta.id}: ${a.meta.id} ${fmt(la)} vs ${b.meta.id} ${fmt(lb)}`;
      if (la.start !== lb.start || la.end !== lb.end) problems.push(`lifespan differs, ${where}`);
      else notes.push(`ok ${where}`);
      const pb = new Map<string, Json>((tb.phases ?? []).map((p: Json) => [p.name, p]));
      for (const p of ta.phases ?? []) {
        const q = pb.get(p.name);
        if (!q) continue;
        if (p.start !== q.start || p.end !== q.end || !!p.ongoing !== !!q.ongoing)
          problems.push(`phase "${p.name}" of ${ta.id} differs: ${a.meta.id} ${p.start}–${p.end ?? 'ongoing'} vs ${b.meta.id} ${q.start}–${q.end ?? 'ongoing'}`);
      }
      const only = (x: Json, y: Json) => (x.phases ?? []).filter((p: Json) => !(y.phases ?? []).some((q: Json) => q.name === p.name)).map((p: Json) => p.name);
      const oa = only(ta, tb), ob = only(tb, ta);
      if (oa.length || ob.length) notes.push(`  ${ta.id} phases only in ${a.meta.id}: ${oa.length}; only in ${b.meta.id}: ${ob.length}`);
    }
  }
}
for (const pair of plan.pairs ?? []) {
  const rowTl = tls.find((t) => t.meta.id === pair.timeline), phTl = tls.find((t) => t.meta.id === pair.phasesIn);
  if (!rowTl || !phTl) continue;
  const r = rowTl.tracks.find((t: Json) => t.id === pair.row), owner = phTl.tracks.find((t: Json) => t.id === pair.phasesOf);
  if (!r || !owner) { problems.push(`pair: missing row ${pair.row} or ${pair.phasesOf}`); continue; }
  const ps = pair.phases.map((n: string) => owner.phases?.find((p: Json) => p.name === n));
  if (ps.some((p: Json) => !p)) { problems.push(`pair: ${pair.phasesOf} lacks one of ${pair.phases.join(', ')}`); continue; }
  const lr = life(r)!;
  const start = ps[0].start, end = ps[ps.length - 1].end;
  const where = `${pair.timeline} ${pair.row} ${fmt(lr)} vs ${pair.phasesIn} ${pair.phasesOf} [${pair.phases.join(', ')}] ${start}–${end}`;
  if (lr.start !== start || lr.end !== end) problems.push(`pair differs, ${where}`);
  else notes.push(`ok pair ${where}`);
}
console.log(`Seams across ${tls.map((t) => t.meta.id).join(', ')}`);
for (const n of notes) console.log(n);
for (const p of problems) console.log(`DIFFERS ${p}`);
console.log(problems.length ? `${problems.length} difference(s)` : 'no differences');
process.exit(problems.length ? 1 : 0);
