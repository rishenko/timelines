// Date claims for the edges of four Ancient rows that had a span but no claim for it (2026-11-24; found by Dev C's
// Wikidata cross-check, "2026-11-23 Timelines Wikidata cross-check triage"): Nuragic Sardinia, the Kingdom of Pergamon,
// the Kidarites, and the end of Alodia. Each claim quotes the row's own Wikipedia article (read from the 2026-11-01
// dump; none of the four pages carries an AI or translation notice).
//
// It never changes a stored date. Every claim gives the row's stored year, except Pergamon's 133 BC bequest, kept as a
// second claim for the end (the stored end is the 129 BC incorporation; the end shows as a 133–129 window).
//
// Re-runnable: each listed row's startDates and endDates are replaced.
//   node scripts/ancient-classical/edge-claims.ts && npm run data -- build ancient-classical
import { C, open } from '../lib/dataset-edit.ts';

type Claim = ReturnType<typeof C>;
const ed = open('data-src/ancient-classical.json', '2026-11-24');

const NURAGIC = "lead: 'Nuragic civilization lasted from the 18th century BC (Middle Bronze Age), up to the Iron Age or until the beginning of Roman colonization in 238 BC.'";
const PLAN: Record<string, { start?: Claim[]; end?: Claim[] }> = {
  nuragic: {
    start: [
      C(1800, 'wp-nuragic', NURAGIC, { margin: 50, note: '"18th century BC" (1800–1701): the row starts at its beginning.' }),
      C(1800, 'wp-nuragic', "lead: 'the nuraghe, a tower-fortress type of construction the ancient Sardinians built in large numbers starting from about 1800 BC'"),
    ],
    // the lead goes on: "Others date the culture as lasting at least until the 2nd century AD". That is a floor, not a date,
    // so it is a note and not a second claim (a claim would draw a 440-year uncertain end)
    end: [C(238, 'wp-nuragic', NURAGIC, { note: 'The same lead adds: "Others date the culture as lasting at least until the 2nd century AD" (the Barbagia to the 6th).' })],
  },
  pergamon: {
    start: [C(282, 'wp-pergamon', "infobox year_start: 'approx. 282 BC'")],
    end: [
      C(129, 'wp-pergamon', "infobox year_end: '129 BC'; event_end: 'Incorporated into Roman province of Asia after the defeat of Eumenes III Aristonicus'"),
      C(133, 'wp-pergamon', "lead: 'bequeathed his realm to the Roman Republic in his will with his death in 133 BC'", { note: 'Attalus III\'s bequest: the kingdom passed to Rome in 133 BC and was incorporated in 129 BC.' }),
    ],
  },
  kidarites: {
    start: [C('320 CE', 'wp-kidarites', "infobox year_start: '320 CE'")],
    end: [C('467 CE', 'wp-kidarites', "infobox year_end: '467 CE'")],
  },
  // the start already has its claims
  alodia: {
    end: [
      C('1500 CE', 'wp-alodia', "infobox year_end: 'c. 1500'"),
      C('1500 CE', 'wp-alodia', "lead: 'By around 1500 Soba had fallen to either Arabs or the Funj.'"),
    ],
  },
};

for (const [id, claims] of Object.entries(PLAN)) {
  const row = ed.data.tracks.find((t: { id: string }) => t.id === id);
  if (!row?.span) throw new Error(`no row "${id}" with a span`);
  if (claims.start) row.span.startDates = claims.start;
  if (claims.end) row.span.endDates = claims.end;
}
ed.save();
