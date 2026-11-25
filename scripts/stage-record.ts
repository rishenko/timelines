// The committed record of a stage whose data is too big or too slow for the Mac route (host: 'pc' in scripts/regen-stages.ts).
//   node scripts/stage-record.ts write rulers <inputs-dir>   write data-src/provenance/stages/rulers.record.json from the rulers inputs
//                                                            (the regression-inputs branch's kc3-inputs, or ~/data/stages/L2/rulers/current)
//   node scripts/stage-record.ts check rulers <inputs-dir>   gate: the inputs' sha256s and row counts equal the committed record (exit 1 if not)
// The record holds what makes the stage's output reproducible and checkable without the data: dump names, the code that makes it (a sha256
// per file; the list is coarse), the interpreter, and each output's sha256 and row count. Evidence columns (route, cited, flags) travel inside
// the csv; the record pins the csv, so they cannot change unseen, and `check` also proves the evidence reached the shipped provenance: every
// data-src/provenance/<timeline>-reigns.json entry has a csv row (same row and person) with the same `route` and `cited`. A change to the code since the record only warns (the output may be stale).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './lib/csv.ts';
import { dumpNames } from './lib/dump-names.ts';

const ROOT = join(import.meta.dirname, '..');
const TIMELINES = ['ancient-classical', 'medieval', 'modern-states'];
const CODE: Record<string, string[]> = {
  rulers: ['pipelines/extract/rulers.py', 'pipelines/extract/list_rulers.py', 'pipelines/extract/list-rulers.json', 'pipelines/extract/table_specs.py', 'pipelines/extract/build_index.py', 'pipelines/extract/wd_join.py', 'pipelines/extract/dates.py', 'pipelines/extract/head_spans.py', 'pipelines/common/wp_dump.py', 'pipelines/common/settings.py'],
};
const recordPath = (stage: string) => join(ROOT, 'data-src/provenance/stages', `${stage}.record.json`);
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const rows = (path: string) => readFileSync(path, 'utf8').split('\n').filter(Boolean).length - 1; // csv header excluded (no embedded newline guard needed: the row count is a fingerprint, the sha is the proof)

type Record_ = { stage: string; layer: string; dumps: Record<string, string>; code: Record<string, string>; outputs: Record<string, { sha256: string; rows?: number }> };

function measure(stage: string, dir: string): Record_ {
  const outputs: Record_['outputs'] = {};
  for (const t of TIMELINES) {
    outputs[`${t}/rulers.csv`] = { sha256: sha(join(dir, t, 'rulers.csv')), rows: rows(join(dir, t, 'rulers.csv')) };
    outputs[`${t}/rulers-events.json`] = { sha256: sha(join(dir, t, 'rulers-events.json')) };
  }
  outputs['term-labels.json'] = { sha256: sha(join(dir, 'term-labels.json')) };
  return { stage, layer: 'L2', dumps: dumpNames(ROOT), code: Object.fromEntries(CODE[stage].map((f) => [f, sha(join(ROOT, f))])), outputs };
}

const [cmd, stage, dir] = process.argv.slice(2);
if (!['write', 'check'].includes(cmd) || !CODE[stage] || !dir || !existsSync(dir)) {
  console.error('usage: node scripts/stage-record.ts <write|check> rulers <inputs-dir>');
  process.exit(2);
}
const now = measure(stage, dir);
if (cmd === 'write') {
  writeFileSync(recordPath(stage), JSON.stringify(now, null, 1) + '\n');
  console.log(`wrote ${recordPath(stage).slice(ROOT.length + 1)} (${Object.keys(now.outputs).length} outputs)`);
} else {
  const saved = JSON.parse(readFileSync(recordPath(stage), 'utf8')) as Record_;
  const bad = Object.keys({ ...saved.outputs, ...now.outputs }).filter((f) => saved.outputs[f]?.sha256 !== now.outputs[f]?.sha256 || saved.outputs[f]?.rows !== now.outputs[f]?.rows);
  for (const f of Object.keys(now.code)) if (saved.code[f] !== now.code[f]) console.log(`stage record: warning: ${f} changed since the ${stage} record was written (the rulers output may need re-running on the PC)`);
  if (bad.length) {
    console.log(`stage record: ${bad.length} output(s) differ from data-src/provenance/stages/${stage}.record.json:\n  ${bad.join('\n  ')}\nRe-record with \`node scripts/stage-record.ts write ${stage} <dir>\` in the same pull request as the refresh.`);
    process.exit(1);
  }
  const lost: string[] = [];
  for (const t of TIMELINES) {
    const csv = new Map<string, { route: string; cited: string }[]>();
    for (const r of parseCsv(readFileSync(join(dir, t, 'rulers.csv'), 'utf8'))) csv.set(`${r.row}\t${r.person}`, [...(csv.get(`${r.row}\t${r.person}`) ?? []), { route: r.route, cited: r.cited }]);
    const prov = JSON.parse(readFileSync(join(ROOT, 'data-src/provenance', `${t}-reigns.json`), 'utf8')) as Record<string, { row: string; person: string; route?: string; cited?: string }>;
    for (const [id, e] of Object.entries(prov)) {
      if (!(csv.get(`${e.row}\t${e.person}`) ?? []).some((c) => c.route === (e.route ?? '') && c.cited === (e.cited ?? ''))) lost.push(`${t}: ${id}`);
    }
  }
  if (lost.length) {
    console.log(`stage record: ${lost.length} provenance entr${lost.length === 1 ? 'y has' : 'ies have'} no rulers row with the same route and cited (evidence lost or changed on the way):\n  ${lost.slice(0, 20).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`stage record: ok (${Object.keys(now.outputs).length} ${stage} outputs match the committed record; every provenance entry's route and cited are in the rulers csv)`);
}
