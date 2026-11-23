// Ma'in (the Minaeans), the fourth South Arabian kingdom beside Saba, Qataban and Ḥaḍramawt (2026-11-23). The ninth
// pass left Wikipedia's *Ma'in* out because its banner mentions the LLM translation guideline. Read again on
// 2026-11-23 (the 1 November dump and the live page): its only notice asks for text translated from the Arabic
// article, and the LLM mention is guidance for translators; no banner says the text is AI-written. Under the author's
// rule for translation notices (as for *Polynesians*), it is used, and every event citing it says so in its
// description. The call was delegated by the author to the coordinator (docs/BACKLOG.md). Every date is quoted
// verbatim from the page; the most important events only.
// Re-runnable.
//   node scripts/ancient-classical/main-minaeans.ts && npm run data -- build ancient-classical
import { C, R, RCE, S, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-23');
ed.wikipedia('wp-main', "Ma'in", 'Ma%27in');

const NOTICE = "One cited page, Wikipedia's Ma'in, carries a notice asking for text translated from the Arabic article.";

ed.track(
  {
    id: 'minaeans',
    name: "Ma'in (Minaeans)",
    color: '#b8905a',
    parent: 'arabia',
    span: {
      start: 'c. 750 BCE',
      end: 'c. 50 CE',
      startDates: [R(800, 701, 'wp-main', "lead ('appears in the historical record in the 8th century BCE')")],
      endDates: [RCE(1, 100, 'wp-main', "lead ('the most popular hypothesis places its demise in the 1st century CE')")],
    },
  },
  { after: 'qataban' },
);

ed.event({
  uuid: 'minaeans-kingdom',
  title: "Ma'in becomes a kingdom",
  start: 'c. 613 BCE',
  tracks: ['minaeans'],
  descr: `Ma'in, a city-state in the town of Qarnawu in the Jawf, grows into a kingdom: peace with Saba and Saba's defeat of the Nashshan kingdom let the Minaeans extend their power over nearby territories. Inscriptions from the Temple of Shaqab al-Manaṣṣa name many of its kings. ${NOTICE}`,
  sources: [S('wp-main', 'lead and History')],
  startDates: [R(625, 601, 'wp-main', "lead ('transition from a city-state to kingdom in the last quarter of the 7th century BCE')")],
});

ed.event({
  uuid: 'minaeans-yathill',
  title: "Ma'in breaks with Saba and joins Yathill",
  start: 'c. 600 BCE',
  tracks: ['minaeans'],
  descr: `The alliance with Saba breaks down. Ma'in forms a confederation with Yathill (Baraqish) and makes alliances with other South Arabian kingdoms, the basis of its later frankincense trade. ${NOTICE}`,
  sources: [S('wp-main', 'History')],
  startDates: [C(600, 'wp-main', "History ('As the seventh century BCE closed, and the sixth century BCE opened, the alliance with Saba broke down')", { margin: 25 })],
});

ed.event({
  uuid: 'minaeans-nashshan',
  title: "Ma'in absorbs Nashshan",
  start: 'c. 450 BCE',
  tracks: ['minaeans'],
  descr: `Nashshan, the most important city of the Jawf valley, comes under the Kingdom of Ma'in, and Ma'in's pantheon replaces its own; Nashshan restores its old gods when Ma'in falls. ${NOTICE}`,
  sources: [S('wp-main', 'History')],
  startDates: [R(600, 301, 'wp-main', "History ('absorbed under the dominion of the Kingdom of Ma'in between the 6th and 4th centuries BC')")],
});

ed.event({
  uuid: 'minaeans-trade',
  title: "Minaean caravans outdo Saba's trade",
  start: 'c. 500 BCE',
  tracks: ['minaeans'],
  descr: `By the middle of the 1st millennium BCE, Ma'in's trade in aromatics surpasses Saba's, and it takes over the caravan route along the Red Sea. Its caravans reach Egypt, the Levant, Mesopotamia and Greece; about seventy Minaic inscriptions mark its trading communities abroad, most at al-Ula, and one at Delos records an altar to its god Wadd. ${NOTICE}`,
  sources: [S('wp-main', 'History and International trade')],
  startDates: [C(500, 'wp-main', "International trade ('The Ma'in trade surpassed that of the Saba by the mid-1st millennium BCE')", { margin: 50 })],
});
ed.save();
