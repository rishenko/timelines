// APPLIED 2026-11-18. Kept as a template for dropping a source whose page gained an AI/LLM-text banner.
// *Norte Chico civilization* (wp-caral-supe) now says it appears to include LLM-generated text, so every value
// taken from it goes: the Caral–Supe row's span (3500/3100 BCE start, c. 1800 end; the row is now events-only),
// Caral's 2020 BCE end claim and its citation, and the source entry itself.
//   node scripts/archive/2026-11-18-drop-norte-chico.ts data-src/ancient-near-east.json
import { readSource, writeSource } from '../lib/source-format.ts';

const file = process.argv[2] ?? 'data-src/ancient-near-east.json';
const KEY = 'wp-caral-supe';
const data = readSource(file);
const track = data.tracks.find((t: { id: string }) => t.id === 'caral-supe');
delete track.span;
for (const e of data.events) {
  if (e.sources) e.sources = e.sources.filter((s: { sourceKey: string }) => s.sourceKey !== KEY);
  for (const k of ['startDates', 'endDates']) {
    if (!e[k]) continue;
    e[k] = e[k].filter((c: { source?: { sourceKey: string } }) => c.source?.sourceKey !== KEY);
    if (!e[k].length) delete e[k];
  }
}
delete data.sources[KEY];
const left = JSON.stringify(data).split(KEY).length - 1;
if (left) throw new Error(`${left} references to ${KEY} remain`);
writeSource(file, data);
console.log('dropped', KEY);
