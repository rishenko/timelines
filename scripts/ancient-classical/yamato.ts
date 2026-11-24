// The Yamato Kingship as an Ancient row (2026-11-24; a DRAFT for Kevin's call on a new row, like the Rashidun row in #143).
// Ancient had Japan only as periods (Kofun, Asuka), which are not polities, so the rulers pass found no emperors before
// Medieval's window: the known-counts spec "Emperors of Japan" misses the historical emperors before 650. The row holds 11, from
// Buretsu (499) to Kōtoku (645–654); Empress Kōgyoku (642–645) is not found yet (see the frozen file's note).
// This adds the row, dated from its article's lead ("from the 4th century to the 7th century"), and
// the reigns that pipelines/extract/rulers.py finds on it, frozen in pipelines/ancient/yamato-reigns.json.
// The article carries a machine-translation clean-up notice (not an AI-text notice); its row says so.
// Re-runnable.
//   node scripts/ancient-classical/yamato.ts && npm run data -- build ancient-classical
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { C, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-24');
ed.wikipedia('wp-yamato-kingship', 'Yamato Kingship', 'Yamato_Kingship');
const NOTICE = "Wikipedia's Yamato Kingship carries a notice that parts were machine-translated and need clean-up (not an AI-text notice).";
// the row's reigns start at Buretsu (499): the nine earlier emperors have traditional dates only and are off (TRADITIONAL)
const EMPTY = ' Its reigns start in 499 (Buretsu): the nine earlier emperors, with traditional dates only, are left out pending a decision.';
const LEAD = 'lead: "a tribal alliance centered on the Yamato region (Nara Prefecture) from the 4th century to the 7th century"';

ed.track(
  {
    id: 'yamato',
    name: 'Yamato Kingship',
    color: '#b0464f',
    parent: 'korea-japan',
    span: {
      start: 'c. 350 CE',
      end: 'c. 650 CE',
      startDates: [C('350 CE', 'wp-yamato-kingship', LEAD, { margin: 50, note: NOTICE + EMPTY })],
      endDates: [C('650 CE', 'wp-yamato-kingship', LEAD, { margin: 50, note: NOTICE })],
    },
  },
  { after: 'asuka' },
);

const FROZEN = 'pipelines/ancient/yamato-reigns.json';
// The emperors before Buretsu (499) have traditional dates only ("(traditional)" in their infobox): Kevin's call whether
// they belong. Off by default, so the row holds the historical emperors the known-counts spec misses.
const TRADITIONAL = false;
if (existsSync(FROZEN)) {
  const frozen = JSON.parse(readFileSync(FROZEN, 'utf8'));
  type Ev = { sources: { sourceKey: string; sourceLocation: string }[] };
  const keep = (frozen.events as Ev[]).filter((e) => TRADITIONAL || !e.sources.some((r) => r.sourceLocation.includes('(traditional)')));
  const cited = new Set(keep.flatMap((e) => e.sources.map((r) => r.sourceKey)));
  for (const [k, v] of Object.entries(frozen.sources)) if (cited.has(k)) ed.data.sources[k] ??= v;
  for (const e of keep) ed.event({ ...(e as object) } as Parameters<typeof ed.event>[0]);
}
ed.save();
// its region, in the memberships plan (applied after this script), from the same lead sentence
const PLAN = 'data-src/ancient-classical-memberships.json';
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
plan.rows.yamato = [{ facet: 'geography', value: 'japan', sources: [{ sourceKey: 'wp-yamato-kingship', sourceLocation: LEAD }] }];
writeFileSync(PLAN, JSON.stringify(plan, null, 2) + '\n');
console.log('yamato: row' + (existsSync(FROZEN) ? ' + frozen reigns' + (TRADITIONAL ? ' (with the traditional ones)' : '') : ' only (no frozen reigns yet)'));
