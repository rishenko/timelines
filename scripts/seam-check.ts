// Checks the seams between neighbouring timelines: a row that crosses from one timeline into the next must have the
// same dates on both sides, so the timelines line up where `meta.continues` joins them.
//
//   npm run seam-check                          compares data-src/seams.json's timelines (compiled files)
//   npm run seam-check -- --with <file.json>    adds a timeline file from elsewhere (e.g. another branch's build)
//
// Each file carries the phases that overlap its own range, so a shared row's lifespan worked out from phases differs
// between files by design (Medieval knows the Margraviate of Brandenburg, Modern States knows the Free State). What
// both files must agree on, for a row id found in both:
// - a typed lifespan: if both type one, the same stretches; if only one does, it's listed (the other side may need
//   to type it too);
// - phases with the same name: the same dates;
// - the seam: a phase that contains the seam year (where one timeline's range ends and the next begins) must be in
//   both files, when both give the row phases.
// Pairs (data-src/seams.json) cover a row in one timeline that is a set of phases in the other (Ancient's `tang` row =
// the Tang phases of Medieval's `china`): the row's lifespan must match the first phase's start and the last one's end.
// Start and end events and memberships are not compared. Exits 1 on any difference.
import { existsSync, readFileSync } from 'node:fs';

type Json = Record<string, any>;

const plan: Json = JSON.parse(readFileSync('data-src/seams.json', 'utf8'));
const files: string[] = plan.timelines.map((id: string) => `public/timelines/${id}.json`).filter((f: string) => existsSync(f));
const w = process.argv.indexOf('--with');
if (w > 0) {
  const extra = process.argv.slice(w + 1);
  const ids = new Set(extra.map((f) => JSON.parse(readFileSync(f, 'utf8')).meta.id));
  files.splice(0, files.length, ...files.filter((f) => !ids.has(JSON.parse(readFileSync(f, 'utf8')).meta.id)), ...extra);
}
const tls: Json[] = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));

const typed = (t: Json): Json[] | null => (t.span ? (Array.isArray(t.span) ? t.span : [t.span]) : null);
const dates = (x: Json) => `${x.start}–${x.ongoing ? 'ongoing' : x.end}`;
const same = (x: Json, y: Json) => x.start === y.start && (x.end ?? null) === (y.end ?? null) && !!x.ongoing === !!y.ongoing;
const contains = (p: Json, y: number) => p.start <= y && (p.ongoing || p.end >= y);
/** The year where a's range ends and b's begins, if they are neighbours. */
const seamYear = (a: Json, b: Json) =>
  a.meta.range && b.meta.range
    ? a.meta.range.end === b.meta.range.start ? a.meta.range.end : b.meta.range.end === a.meta.range.start ? b.meta.range.end : null
    : null;

const problems: string[] = [];
const notes: string[] = [];
for (let i = 0; i < tls.length; i++) {
  for (let j = i + 1; j < tls.length; j++) {
    const a = tls[i], b = tls[j], A = a.meta.id, B = b.meta.id;
    const seam = seamYear(a, b);
    const bRows = new Map<string, Json>(b.tracks.map((t: Json) => [t.id, t]));
    for (const ta of a.tracks) {
      const tb = bRows.get(ta.id);
      if (!tb) continue;
      const sa = typed(ta), sb = typed(tb);
      if (!sa && !sb && !ta.phases && !tb.phases) continue; // a group row in both
      const errs: string[] = [];
      if (sa && sb) {
        if (sa.length !== sb.length || sa.some((x, k) => !same(x, sb[k])))
          errs.push(`typed lifespan: ${A} ${sa.map(dates).join(', ')} vs ${B} ${sb.map(dates).join(', ')}`);
      } else if (sa || sb) {
        notes.push(`  ${ta.id}: lifespan typed only in ${sa ? A : B} (${(sa ?? sb)!.map(dates).join(', ')})`);
      }
      const pa: Json[] = ta.phases ?? [], pb: Json[] = tb.phases ?? [];
      for (const p of pa) {
        const q = pb.find((x) => x.name === p.name);
        if (q && !same(p, q)) errs.push(`phase "${p.name}": ${A} ${dates(p)} vs ${B} ${dates(q)}`);
      }
      if (seam !== null && pa.length && pb.length) {
        for (const [ps, qs, X, Y] of [[pa, pb, A, B], [pb, pa, B, A]] as [Json[], Json[], string, string][])
          for (const p of ps.filter((x) => contains(x, seam)))
            if (!qs.some((q) => q.name === p.name)) errs.push(`phase "${p.name}" (${dates(p)}) spans ${seam} but is only in ${X}, not ${Y}`);
      } else if (seam !== null && (pa.length || pb.length)) {
        notes.push(`  ${ta.id}: phases only in ${pa.length ? A : B}`);
      }
      if (errs.length) problems.push(...errs.map((e) => `${ta.id} (${A}/${B}): ${e}`));
      else notes.push(`ok ${ta.id} (${A}/${B})`);
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
  const s = typed(r);
  const start = ps[0].start, end = ps[ps.length - 1].end;
  const where = `${pair.timeline} ${pair.row} ${s ? s.map(dates).join(', ') : 'no lifespan'} vs ${pair.phasesIn} ${pair.phasesOf} [${pair.phases.join(', ')}] ${start}–${end}`;
  if (!s || s[0].start !== start || s[s.length - 1].end !== end) problems.push(`pair differs: ${where}`);
  else notes.push(`ok pair ${where}`);
}
console.log(`Seams across ${tls.map((t) => t.meta.id).join(', ')}`);
for (const n of notes) console.log(n);
for (const p of problems) console.log(`DIFFERS ${p}`);
console.log(problems.length ? `${problems.length} difference(s)` : 'no differences');
process.exit(problems.length ? 1 : 0);
