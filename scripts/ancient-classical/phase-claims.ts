// Date claims for Ancient phases that had none (2026-11-22, at the author's request; PILOT: Rome, Minoan Crete and
// the Southern dynasties). 36 phases were typed in by hand when the timeline was put together, with dates but no
// claims; derived-lifespans later moved the rows' edge claims onto first and last phases only, so most stayed
// uncited. This script adds start and end claims quoted from Wikipedia (read from the 2026-11-01 dump; none of the
// pages carries an AI or translation notice). It never changes a stored date: a claim whose year differs from the
// phase's stored year stops the script, so a mismatch is reviewed rather than written.
//
// Sources: Ancient Rome's lead gives all three Roman phases in one sentence, and each phase's own article dates its
// edges. Minoan civilization's chronology table (radiocarbon dates after Manning 2012, as its note says; the row's
// High Aegean chronology) dates the pottery phases that make up Platon's palatial periods. Northern and Southern
// dynasties lists the four southern dynasties with their years, and each dynasty's article dates its founding or end.
//
// Re-runnable: each listed phase's startDates and endDates are replaced.
//   node scripts/ancient-classical/phase-claims.ts && npm run data -- build ancient-classical
import { C, open } from '../lib/dataset-edit.ts';

type Claim = ReturnType<typeof C>;
type Plan = Record<string, Record<string, { start: Claim[]; end: Claim[] }>>;

const ed = open('data-src/ancient-classical.json', '2026-11-22');

const ROME = "lead: 'It encompasses the Roman Kingdom (753–509 BC), the Roman Republic (509–27 BC), and the Roman Empire (27 BC – 476 AD)'";
const MINOAN = (row: string, prose: string) =>
  `Minoan chronology table, ${row} (via Wikipedia: Minoan civilization, Chronology and history: '${prose}')`;
const SOUTH = "Southern dynasties: 'The Jin were succeeded by a series of short-lived dynasties: Liu Song (420–479), Southern Qi (479–502), Liang (502–557) and Chen (557–589).'";
const H = { chron: 'aegean-high' };

const PLAN: Plan = {
  'rome-republic-empire': {
    'Roman Kingdom (traditional)': {
      start: [
        C(753, 'wp-roman-kingdom', "lead: 'According to tradition, the Roman Kingdom began with the city's founding c. 753 BC'"),
        C(753, 'wp-row-rome-republic-empire', ROME),
      ],
      end: [
        C(509, 'wp-roman-kingdom', "lead: '…and ended with the overthrow of the kings and the establishment of the Roman Republic c. 509 BC.'"),
        C(509, 'wp-row-rome-republic-empire', ROME),
      ],
    },
    'Roman Republic': {
      start: [
        C(509, 'wp-roman-republic', "lead: 'beginning with the overthrow of the Roman Kingdom (traditionally dated to 509 BC)'"),
        C(509, 'wp-row-rome-republic-empire', ROME),
      ],
      end: [
        C(27, 'wp-roman-republic', "lead: 'and ending in 27 BC with the establishment of the Roman Empire following the War of Actium'"),
        C(27, 'wp-row-rome-republic-empire', ROME),
      ],
    },
    'Roman Empire (and the Western Empire)': {
      start: [
        C(27, 'wp-roman-empire', "lead: 'In 27 BC, the Roman Senate granted Octavian overarching military power (imperium) and the new title of Augustus, marking his accession as the first Roman emperor.'"),
        C(27, 'wp-row-rome-republic-empire', ROME),
      ],
      end: [
        C('476 CE', 'wp-roman-empire', "lead: 'The Western Roman Empire collapsed in 476 AD'"),
        C('476 CE', 'wp-row-rome-republic-empire', ROME),
      ],
    },
  },
  minoan: {
    'Prepalatial (EM I–MM IA)': {
      start: [C(3100, 'manning-2012', MINOAN("EM I '3100–2650 BC'", 'EM I (c. 3100-2650 BC) is marked by the appearance of the first painted ceramics.'), H)],
      end: [C(1925, 'manning-2012', MINOAN("MM IA '2100–1925 BC'", 'During MM IA (c. 2100-1925 BC), populations increased dramatically'), H)],
    },
    'Protopalatial (MM IB–II)': {
      start: [C(1925, 'manning-2012', MINOAN("MM IB '1925–1875 BC'", 'During MM IB (c. 1925-1875 BC), the first palaces were built at these sites'), H)],
      end: [C(1750, 'manning-2012', MINOAN("MM II '1875–1750 BC'", 'MM II (c. 1875–1750 BC) saw the development of the Minoan writing systems'), H)],
    },
    'Neopalatial (MM III–LM IB)': {
      start: [C(1750, 'manning-2012', MINOAN("MM III '1750–1700 BC'", 'MM III (c. 1750–1700 BC) marks the beginning of the Neopalatial period.'), H)],
      end: [C(1470, 'manning-2012', MINOAN("LM IB '1625–1470 BC'", 'Late Minoan IB (c. 1625-1470 BC) ended with severe destructions throughout the island, marking the end of Neopalatial society.'), H)],
    },
    'Monopalatial (LM II)': {
      start: [C(1470, 'manning-2012', MINOAN("LM II '1470–1420 BC'", 'Late Minoan II (c. 1470-1420 BC) is sparsely represented in the archaeological record'), H)],
      end: [C(1420, 'manning-2012', MINOAN("LM II '1470–1420 BC'", 'Late Minoan II (c. 1470-1420 BC) is sparsely represented in the archaeological record'), H)],
    },
    'Postpalatial (LM III)': {
      start: [C(1420, 'manning-2012', MINOAN("LM IIIA '1420–1330 BC'", 'Late Minoan III (c. 1420-1075 BC) shows profound social and political changes.'), H)],
      end: [C(1075, 'manning-2012', MINOAN("LM IIIC '1200–1075 BC'", 'Late Minoan III (c. 1420-1075 BC) shows profound social and political changes.'), H)],
    },
  },
  'southern-dynasties': {
    'Liu Song': {
      start: [
        C('420 CE', 'wp-liu-song', "History > Campaigns of Liu Yu: 'Finally, in 420, Sima Dewen abdicated in favour of Liu Yu, who declared himself the ruler of the new Song dynasty.'"),
        C('420 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
      end: [
        C('479 CE', 'wp-liu-song', "Fall of Liu Song: 'In 479, Xiao took the throne himself and declared himself Emperor of Qi, ending Liu Song.'"),
        C('479 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
    },
    'Southern Qi': {
      start: [
        C('479 CE', 'wp-southern-qi', "History: 'The dynasty began in 479, when Xiao Daocheng forced the Emperor Shun of Liu Song into yielding the throne to him'"),
        C('479 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
      end: [
        C('502 CE', 'wp-liang-dynasty', "Rule: 'The Liang dynasty began when Xiao Yan, a Southern Qi royal and general usurped the throne of Emperor He in 502.'"),
        C('502 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
    },
    Liang: {
      start: [
        C('502 CE', 'wp-liang-dynasty', "Rule: 'The Liang dynasty began when Xiao Yan, a Southern Qi royal and general usurped the throne of Emperor He in 502.'"),
        C('502 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
      end: [
        C('557 CE', 'wp-liang-dynasty', "Rule: 'In 557, Chen Baxian established the new powerful Chen dynasty.'"),
        C('557 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
    },
    Chen: {
      start: [
        C('557 CE', 'wp-chen-dynasty', "History > Founding and expansion: Chen Baxian: 'In 557, Chen Baxian a former high-ranked Liang general, took the initiative to establish a new empire in Southern China: the Chen dynasty.'"),
        C('557 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
      end: [
        C('589 CE', 'wp-chen-dynasty', "lead: 'It was conquered by the Sui dynasty in 589 AD, marking an end to the Northern and Southern dynasties period in Chinese history.'"),
        C('589 CE', 'wp-row-southern-dynasties', SOUTH),
      ],
    },
  },
};

/** "c. 753 BCE" / "476 CE" / 753 → the year as written in claims ("753 BCE", "476 CE"). */
const bare = (y: string | number) => String(typeof y === 'number' ? `${y} BCE` : y).replace(/^c\.\s*/, '');

const mismatches: string[] = [];
for (const [rowId, phases] of Object.entries(PLAN)) {
  const row = ed.data.tracks.find((t: { id: string }) => t.id === rowId);
  if (!row) throw new Error(`no row ${rowId}`);
  for (const [name, { start, end }] of Object.entries(phases)) {
    const p = row.phases?.find((x: { name: string }) => x.name === name);
    if (!p) throw new Error(`${rowId}: no phase "${name}"`);
    for (const [edge, claims] of [['start', start], ['end', end]] as const) {
      for (const c of claims) if (bare(c.year) !== bare(p[edge])) mismatches.push(`${rowId} / ${name} ${edge}: stored ${p[edge]}, ${c.source.sourceKey} says ${c.year}`);
    }
    p.startDates = start;
    p.endDates = end;
  }
}
if (mismatches.length) throw new Error(`claims that differ from stored years (review, don't write):\n${mismatches.join('\n')}`);
ed.save();
