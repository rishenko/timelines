// Applies text fixes to event titles and descriptions, in the data-src JSON and in whichever
// re-runnable script under scripts/ defines the event (so re-running that script keeps the fix).
//
//   node scripts/apply-text-fixes.ts <data-src json> <fixes json> [--dry]
//
// fixes json: [{ "uuid": "mursili-i", "field": "descr", "from": "takes Aleppo", "to": "invades Aleppo" }, …]
// `field` defaults to "descr"; `to: ""` deletes the phrase. Each `from` must occur exactly once in the
// event's field. A fix whose text isn't found is reported and skipped; nothing else is touched.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { writeSource } from './lib/source-format.ts';

const [file, fixesFile, ...rest] = process.argv.slice(2);
if (!file || !fixesFile) {
  console.error('usage: node scripts/apply-text-fixes.ts <data-src json> <fixes json> [--dry]');
  process.exit(1);
}
const dry = rest.includes('--dry');
type Fix = { uuid: string; field?: 'descr' | 'title'; from: string; to: string };
const fixes = JSON.parse(readFileSync(fixesFile, 'utf8')) as Fix[];
const data = JSON.parse(readFileSync(file, 'utf8'));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'archive' ? [] : walk(p);
    return /\.ts$/.test(f) ? [p] : [];
  });
const scripts = new Map(walk('scripts').map((p) => [p, readFileSync(p, 'utf8')]));

const count = (s: string, sub: string) => s.split(sub).length - 1;
let ok = 0;
const problems: string[] = [];
for (const fx of fixes) {
  const field = fx.field ?? 'descr';
  const ev = data.events.find((e: { uuid: string }) => e.uuid === fx.uuid);
  if (!ev) { problems.push(`${fx.uuid}: no such event`); continue; }
  const text: string = ev[field] ?? '';
  if (count(text, fx.from) !== 1) { problems.push(`${fx.uuid}.${field}: "${fx.from}" found ${count(text, fx.from)}×`); continue; }
  ev[field] = text.replace(fx.from, fx.to).replace(/ {2,}/g, ' ').replace(/ ([,.;])/g, '$1').trim();
  ok++;
  // The defining script, if any: the block from `uuid: '<id>'` to the next `uuid:`. An event no script defines
  // lives only in the source file, so the source edit is the whole fix.
  for (const [p, src] of scripts) {
    const at = src.indexOf(`uuid: '${fx.uuid}'`);
    if (at < 0) continue;
    const next = src.indexOf('uuid:', at + 6);
    const end = next < 0 ? src.length : next;
    const block = src.slice(at, end);
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const [from, to] = block.includes(esc(fx.from)) ? [esc(fx.from), esc(fx.to)] : [fx.from, fx.to];
    if (count(block, from) !== 1) { problems.push(`${fx.uuid}: not found once in ${p}`); continue; }
    scripts.set(p, src.slice(0, at) + block.replace(from, to) + src.slice(end));
  }
}
console.log(`${ok}/${fixes.length} fixes applied${dry ? ' (dry run)' : ''}`);
problems.forEach((p) => console.log('  ' + p));
if (!dry) {
  writeSource(file, data);
  for (const [p, src] of scripts) if (src !== readFileSync(p, 'utf8')) writeFileSync(p, src);
}
