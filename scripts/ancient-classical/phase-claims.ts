// Date claims for the Ancient phases that had none (2026-11-22, at the author's request; piloted on Rome, Minoan Crete
// and the Southern dynasties, then all 36). They were typed in by hand when the timeline was put together, with dates
// but no claims; derived-lifespans later moved the rows' edge claims onto first and last phases only, so most stayed
// uncited. This script adds start and end claims quoted from Wikipedia (read from the 2026-11-01 dump; none of the
// pages carries an AI or translation notice), or from the scholar Wikipedia cites, "via Wikipedia" as elsewhere.
//
// It never changes a stored date. Every claim must give the phase's stored year, except those marked alt(): a
// source that gives another year (Eastern Zhou from 770, the Hittite Empire from c. 1430) is kept as a second claim,
// and the script lists each one for review. An edge with only alt() claims must have its stored year inside them.
//
// Re-runnable: each listed phase's startDates and endDates are replaced.
//   node scripts/ancient-classical/phase-claims.ts && npm run data -- build ancient-classical
import { C, RCE, open } from '../lib/dataset-edit.ts';

type Claim = ReturnType<typeof C>;
type Plan = Record<string, Record<string, { start: Claim[]; end: Claim[] }>>;

const ed = open('data-src/ancient-classical.json', '2026-11-22');
ed.wikipedia('wp-protodynastic', 'Protodynastic Period of Egypt', 'Protodynastic_Period_of_Egypt');
ed.wikipedia('wp-early-dynastic-egypt', 'Early Dynastic Period (Egypt)', 'Early_Dynastic_Period_(Egypt)');
ed.wikipedia('wp-roman-egypt', 'Egypt (Roman province)', 'Egypt_(Roman_province)');
ed.wikipedia('wp-eastern-zhou', 'Eastern Zhou', 'Eastern_Zhou');
ed.data.sources['hallager-2012'] = {
  name: 'Crete, in The Oxford Handbook of the Bronze Age Aegean', author: 'Hallager, Erik', year: '2012', tags: ['cited-via-wikipedia'],
};

/** A source that gives a year other than the stored one: kept as a second claim and listed for review. */
const ALT = new WeakSet<object>();
const alt = <T extends object>(c: T) => (ALT.add(c), c);

const ROME = "lead: 'It encompasses the Roman Kingdom (753–509 BC), the Roman Republic (509–27 BC), and the Roman Empire (27 BC – 476 AD)'";
const MINOAN = (row: string, prose: string) =>
  `Minoan chronology table, ${row} (via Wikipedia: Minoan civilization, Chronology and history: '${prose}')`;
const SOUTH = "Southern dynasties: 'The Jin were succeeded by a series of short-lived dynasties: Liu Song (420–479), Southern Qi (479–502), Liang (502–557) and Chen (557–589).'";
const H = { chron: 'aegean-high' };
const MONO = '(via Wikipedia: Minoan chronology, Minoan history > Late Minoan:';

const PROTO = 'lead: Depending on the sources, it is dated';
const MK = "lead: 'Some scholars also include the Thirteenth Dynasty of Egypt wholly into this period, in which case'";
const LATE = "lead: 'The Late Period existed from 664 BC until 332 BC'";
const KNODELL = "Early Mycenaean 'c. 1750–1400 BC' (via Wikipedia: Mycenaean Greece, Chronology: 'divides the whole Mycenaean time into three cultural periods: Early Mycenaean (c. 1750–1400 BC)')";
const ARCHAIC = "lead: 'Archaic Greece was the period in Greek history lasting from c. 800 BC to the second Persian invasion of Greece in 480 BC'";
const CANAAN = 'History and archaeology > Overview (one periodisation):';
const HITT_MK = 'History > Middle Kingdom:';
const MIDAS = "lead: 'The Middle Assyrian Empire was the third stage of Assyrian history, covering the history of Assyria'";
const ELAM = 'History (list of periods):';
const IVC = "lead: 'lasting from 3300 BCE to 1300 BCE, and in its mature form from 2600 BCE to 1900 BCE'";
const ZHOU = "lead: 'Even as Zhou suzerainty became increasingly ceremonial over the following Eastern Zhou period (771–256 BC)'";
const NWEI = "lead: 'The first of the Northern dynasties, it ruled northern China from 386 to 535 AD'";
const NZHOU = "lead: 'known in historiography as the Northern Zhou, was a Xianbei-led dynasty of China … that lasted from 557 to 581 AD'";

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
    // The name: Minoan civilization's table puts LM II under Postpalatial; Minoan chronology names the period.
    'Monopalatial (LM II)': {
      start: [
        C(1470, 'manning-2012', MINOAN("LM II '1470–1420 BC'", 'Late Minoan II (c. 1470-1420 BC) is sparsely represented in the archaeological record'), H),
        C(1470, 'hallager-2012', `${MONO} LM II 'c. 1470–1420 BC': 'It marks the beginning of the Monopalatial period, as the palace at Knossos was the only one remaining in use.')`, H),
      ],
      end: [
        C(1420, 'manning-2012', MINOAN("LM II '1470–1420 BC'", 'Late Minoan II (c. 1470-1420 BC) is sparsely represented in the archaeological record'), H),
        C(1420, 'hallager-2012', `${MONO} LM II 'c. 1470–1420 BC'; LM III follows)`, H),
      ],
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
  'pharaonic-egypt': {
    'Late Predynastic (Dynasty 0)': {
      // No source gives 3300 itself; the Protodynastic Period's three datings bracket it.
      start: [
        alt(C(3325, 'wp-protodynastic', `${PROTO} ('approximately from 3325 to 3000 BC')`)),
        alt(C(3350, 'wp-protodynastic', `${PROTO} ('from c. 3350 BC to c. 2920 BC')`)),
        alt(C(3200, 'wp-protodynastic', `${PROTO} ('or from 3200 to 3000 BC')`)),
      ],
      end: [C(3150, 'wp-early-dynastic-egypt', "lead: 'the era of ancient Egypt that immediately follows the unification of Upper and Lower Egypt in c. 3150 BC'")],
    },
    'Middle Kingdom': {
      start: [C(2055, 'wp-middle-kingdom', "Political history > Reunification under Mentuhotep II: 'The struggle was to be concluded by Mentuhotep II, who ascended the Theban throne in 2055 BC.'")],
      end: [
        C(1650, 'wp-middle-kingdom', `${MK} 'the Middle Kingdom would end around 1650 BC'`),
        alt(C(1700, 'wp-middle-kingdom', `${MK} 'while others only include it until Merneferre Ay around 1700 BC'`)),
      ],
    },
    'Late Period': {
      start: [C(664, 'wp-late-period', `${LATE}`)],
      end: [C(332, 'wp-late-period', `${LATE}`)],
    },
  },
  'ptolemaic-roman-egypt': {
    'Roman and Byzantine Egypt': {
      start: [C(30, 'wp-roman-egypt', "History > Early Roman Egypt: 'The province was established in 30 BC after Octavian (the future Roman emperor Augustus) defeated his rival Mark Antony'")],
      // No source gives 641 as the end; the Arab conquest ran 639–642 and Egypt left the empire in 642.
      end: [
        alt(RCE(639, 642, 'wp-arab-egypt', "lead: 'The Arab conquest of Egypt … took place between 639 and 642 AD.'")),
        alt(C('642 CE', 'wp-roman-egypt', "lead: 'Egypt ceased to be a part of the Roman Empire in 642, when it became part of the Rashidun Caliphate following the Muslim conquest of Egypt.'")),
      ],
    },
  },
  mycenaean: {
    'Early Mycenaean (Shaft Grave era)': {
      start: [C(1750, 'knodell-2021', `${KNODELL}`, H)],
      end: [C(1400, 'knodell-2021', `${KNODELL}`, H)],
    },
  },
  greece: {
    'Archaic period': {
      start: [C(800, 'wp-archaic-greece', `${ARCHAIC}`)],
      end: [C(480, 'wp-archaic-greece', `${ARCHAIC}`)],
    },
  },
  canaan: {
    'Early Bronze Age': {
      start: [C(3500, 'wp-canaan', `${CANAAN} '3500–2000 BC (Early Bronze): prior to written records in the area'`)],
      end: [C(2000, 'wp-canaan', `${CANAAN} '3500–2000 BC (Early Bronze)'`)],
    },
    'Middle Bronze Age': {
      start: [C(2000, 'wp-canaan', `${CANAAN} '2000–1550 BC (Middle Bronze): city-states'`)],
      end: [C(1550, 'wp-canaan', `${CANAAN} '2000–1550 BC (Middle Bronze)'`)],
    },
    'Late Bronze Age': {
      start: [C(1550, 'wp-canaan', `${CANAAN} '1550–1200 BC (Late Bronze): Egyptian hegemony'`)],
      end: [C(1200, 'wp-canaan', `${CANAAN} '1550–1200 BC (Late Bronze)'`)],
    },
  },
  hittites: {
    'Old Kingdom': {
      start: [
        C(1650, 'wp-hittites', "lead: 'and an empire centered on their capital, Hattusa (around 1650 BC)'"),
        C(1650, 'wp-hittites', "Law: 'The tablets and monuments date from the Old Hittite Kingdom (1650–1500 BC)'"),
      ],
      end: [C(1500, 'wp-hittites', `${HITT_MK} 'The last monarch of the Old Kingdom, Telepinu, reigned until about 1500 BC.'`)],
    },
    'Middle Kingdom': {
      start: [C(1500, 'wp-hittites', `${HITT_MK} 'Telepinu's reign marked the end of the "Old Kingdom" and the beginning of the lengthy weak phase known as the "Middle Kingdom".' (Telepinu 'until about 1500 BC')`)],
      end: [
        C(1400, 'wp-hittites', "History > Old Kingdom: 'Only in the later period from 1400 BC until 1200 BC did the Hittite kingship become more centralized and powerful.'"),
        alt(C(1430, 'wp-hittites', `${HITT_MK} 'It segues into the "Hittite Empire period" proper, which dates from the reign of Tudhaliya I from c. 1430 BC.'`)),
      ],
    },
  },
  assyria: {
    'Old Assyrian period': {
      start: [C(2025, 'wp-old-assyria', "lead: 'covering the history of the city of Assur from its rise as an independent city-state under Puzur-Ashur I c. 2025 BC'")],
      end: [C(1364, 'wp-old-assyria', "lead: '…to the foundation of a larger Assyrian territorial state after the accession of Ashur-uballit I c. 1363 BC'", { note: 'The year before Ashur-uballit I’s accession, c. 1363 BC, when the Middle Assyrian Empire begins.' })],
    },
    'Middle Assyrian Empire': {
      start: [C(1363, 'wp-middle-assyria', `${MIDAS} 'from the accession of Ashur-uballit I c. 1363 BC'`)],
      end: [C(912, 'wp-middle-assyria', `${MIDAS} 'to the death of Ashur-dan II in 912 BC'`)],
    },
    'Neo-Assyrian Empire': {
      start: [C(911, 'wp-neo-assyria', "lead: 'Beginning with the accession of Adad-nirari II in 911 BCE, the Neo-Assyrian Empire grew to dominate the ancient Near East'")],
      end: [C(609, 'wp-neo-assyria', "History > Collapse and fall of the empire: 'Aššur-uballiṭ's rule at Harran lasted until late 610 or early 609 BCE, when the city was captured by the Babylonians and the Medes.'")],
    },
  },
  babylonia: {
    'Neo-Babylonian Empire': {
      start: [C(626, 'wp-neo-bab', "History > Foundation and the fall of Assyria: 'In November 626 BC, Nabopolassar was crowned King of Babylon'")],
      end: [C(539, 'wp-neo-bab', "lead: 'the Neo-Babylonian Empire was conquered by the Achaemenid Persian Empire in 539 BC'")],
    },
  },
  elam: {
    'Old Elamite': {
      start: [C(2700, 'wp-elam', `${ELAM} 'Old Elamite period: c. 2700 – c. 1500 BC (earliest documents until the Sukkalmah Dynasty)'`)],
      end: [C(1500, 'wp-elam', `${ELAM} 'Old Elamite period: c. 2700 – c. 1500 BC'`)],
    },
    'Middle Elamite': {
      start: [C(1500, 'wp-elam', `${ELAM} 'Middle Elamite period: c. 1500 – c. 1100 BC (Anzanite dynasty until the Babylonian invasion of Susa)'`)],
      end: [C(1100, 'wp-elam', `${ELAM} 'Middle Elamite period: c. 1500 – c. 1100 BC'`)],
    },
  },
  harappan: {
    'Mature Harappan': {
      start: [C(2600, 'wp-ivc', `${IVC}`)],
      end: [C(1900, 'wp-ivc', `${IVC}`)],
    },
    'Late Harappan': {
      start: [C(1900, 'wp-ivc', `${IVC} (the late phase follows the mature form)`)],
      end: [C(1300, 'wp-ivc', `${IVC}`)],
    },
  },
  zhou: {
    'Eastern Zhou': {
      start: [
        C(771, 'wp-zhou', `${ZHOU}`),
        alt(C(770, 'wp-eastern-zhou', "lead: 'The Eastern Zhou (c. 770–256 BC) is a period in Chinese history comprising the latter half of the Zhou dynasty'")),
      ],
      end: [
        C(256, 'wp-zhou', `${ZHOU}`),
        C(256, 'wp-eastern-zhou', "lead: 'The Eastern Zhou (c. 770–256 BC)'"),
      ],
    },
  },
  'northern-dynasties': {
    'Northern Wei': {
      start: [C('386 CE', 'wp-northern-wei', `${NWEI}`)],
      end: [C('535 CE', 'wp-northern-wei', `${NWEI}`)],
    },
    'Eastern Wei': {
      start: [C('534 CE', 'wp-eastern-wei', "lead: 'the Eastern Wei ruled the eastern part of northern China from 534 to 550 AD.'")],
      end: [C('550 CE', 'wp-eastern-wei', "History: 'but in 550 Gao Yang deposed Yuan Shanjian and founded his dynasty, the Northern Qi.'")],
    },
    'Northern Qi': {
      start: [
        C('550 CE', 'wp-northern-qi', "lead: 'It ruled the eastern part of northern China from 550 to 577 AD.'"),
        alt(C('551 CE', 'wp-row-southern-dynasties', "Northern dynasties > Northern Qi (550–577) and Northern Zhou (557–581): 'establishing the Northern Qi dynasty (551–577)'")),
      ],
      end: [C('577 CE', 'wp-northern-qi', "lead: 'and was eventually conquered by the Xianbei-led Northern Zhou dynasty in 577 AD.'")],
    },
    'Northern Zhou': {
      start: [C('557 CE', 'wp-northern-zhou', `${NZHOU}`)],
      end: [C('581 CE', 'wp-northern-zhou', "History > Transit to Sui: 'On 4 March 581, Emperor Jing of Northern Zhou abdicated the throne in favor of Yang Jian'")],
    },
  },
};

/** "c. 753 BCE" / "476 CE" / 753 → the year as written in claims ("753 BCE", "476 CE"). */
const bare = (y: string | number) => String(typeof y === 'number' ? `${y} BCE` : y).replace(/^c\.\s*/, '');
/** "753 BCE" → -753, "476 CE" → 476 (for comparing years only). */
const toNum = (y: string) => (y.endsWith('BCE') ? -parseInt(y, 10) : parseInt(y, 10));

const mismatches: string[] = [];
const review: string[] = [];
for (const [rowId, phases] of Object.entries(PLAN)) {
  const row = ed.data.tracks.find((t: { id: string }) => t.id === rowId);
  if (!row) throw new Error(`no row ${rowId}`);
  for (const [name, { start, end }] of Object.entries(phases)) {
    const p = row.phases?.find((x: { name: string }) => x.name === name);
    if (!p) throw new Error(`${rowId}: no phase "${name}"`);
    for (const [edge, claims] of [['start', start], ['end', end]] as const) {
      const stored = bare(p[edge]);
      for (const c of claims) {
        if (ALT.has(c)) review.push(`${rowId} / ${name} ${edge}: stored ${stored}; ${c.source.sourceKey} gives ${c.year}${c.margin ? ` ± ${c.margin}` : ''}`);
        else if (bare(c.year) !== stored) mismatches.push(`${rowId} / ${name} ${edge}: stored ${stored}, ${c.source.sourceKey} says ${c.year}`);
      }
      if (!claims.some((c) => !ALT.has(c))) {
        const ys = claims.flatMap((c) => { const y = toNum(c.year); return [y - (c.margin ?? 0), y + (c.margin ?? 0)]; });
        const s = toNum(stored);
        if (s < Math.min(...ys) || s > Math.max(...ys)) mismatches.push(`${rowId} / ${name} ${edge}: stored ${stored} lies outside its alternative claims`);
      }
    }
    p.startDates = start;
    p.endDates = end;
  }
}
if (mismatches.length) throw new Error(`claims that differ from stored years (review, don't write):\n${mismatches.join('\n')}`);
ed.save();
console.log(`second claims for review (${review.length}):\n  ${review.join('\n  ')}`);
