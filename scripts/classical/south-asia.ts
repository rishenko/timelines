// The Classical World, second region pass (2026-11-18): South Asia — the Maurya Empire and Ashoka, the Shungas,
// the Indo-Greeks and Indo-Scythians, the Satavahanas, the Kushans, the Guptas, the Alchon Huns, Harsha, the
// Pallavas, the Sangam period in Tamilakam and the Anuradhapura kingdom. Every date was quoted verbatim from the
// cited Wikipedia page by a fetch agent; values the agents saw only in a page summary are not used (see
// docs/classical-sources.md, second pass). No page carried an AI-text or LLM-translation banner.
// Re-runnable: it replaces what it added before. Run after skeleton.ts.
//   node scripts/classical/south-asia.ts && npm run data:classical
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-maurya', 'Maurya Empire', 'Maurya_Empire'],
  ['wp-chandragupta-maurya', 'Chandragupta Maurya', 'Chandragupta_Maurya'],
  ['wp-seleucid-mauryan-war', 'Seleucid–Mauryan war', 'Seleucid%E2%80%93Mauryan_war'],
  ['wp-ashoka', 'Ashoka', 'Ashoka'],
  ['wp-kalinga-war', 'Kalinga War', 'Kalinga_War'],
  ['wp-shunga', 'Shunga Empire', 'Shunga_Empire'],
  ['wp-indo-greek', 'Indo-Greek Kingdom', 'Indo-Greek_Kingdom'],
  ['wp-menander', 'Menander I', 'Menander_I'],
  ['wp-satavahana', 'Satavahana dynasty', 'Satavahana_dynasty'],
  ['wp-indo-scythians', 'Indo-Scythians', 'Indo-Scythians'],
  ['wp-kushan', 'Kushan Empire', 'Kushan_Empire'],
  ['wp-kanishka', 'Kanishka', 'Kanishka'],
  ['wp-sangam', 'Sangam literature', 'Sangam_literature'],
  ['wp-anuradhapura', 'Anuradhapura kingdom', 'Anuradhapura_Kingdom'],
  ['wp-gupta', 'Gupta Empire', 'Gupta_Empire'],
  ['wp-chandragupta-ii', 'Chandragupta II', 'Chandragupta_II'],
  ['wp-samudragupta', 'Samudragupta', 'Samudragupta'],
  ['wp-aryabhata', 'Aryabhata', 'Aryabhata'],
  ['wp-alchon', 'Alchon Huns', 'Alchon_Huns'],
  ['wp-ajanta', 'Ajanta Caves', 'Ajanta_Caves'],
  ['wp-harsha', 'Harsha', 'Harsha'],
  ['wp-pallava', 'Pallava dynasty', 'Pallava_dynasty'],
  ['wp-nalanda', 'Nalanda mahavihara', 'Nalanda_mahavihara'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows (north-west to south) ----------
ed.tracks(
  [
    { id: 'indo-greek', name: 'Indo-Greek Kingdom', color: '#5a7aa8', parent: 'south-asia', span: { start: 'c. 200 BCE', end: 'c. 10 CE' } },
    { id: 'indo-scythian', name: 'Indo-Scythians (Sakas)', color: '#7a6a5a', parent: 'south-asia', span: { start: 'c. 150 BCE', end: '400 CE' } },
    { id: 'kushan', name: 'Kushan Empire', color: '#a0703a', parent: 'south-asia', span: { start: 'c. 30 CE', end: 'c. 375 CE' } },
    { id: 'alchon', name: 'Alchon Huns', color: '#6a5a7a', parent: 'south-asia', span: { start: '370 CE', end: '670 CE' } },
    {
      id: 'maurya', name: 'Maurya Empire', color: '#b0603a', parent: 'south-asia',
      span: { start: 'c. 321 BCE', end: '185 BCE', startDates: [C(321, 'wp-maurya', 'infobox'), C(320, 'wp-maurya', 'navbox (c. 320–185 BCE)')] },
    },
    {
      id: 'shunga', name: 'Shunga Empire', color: '#9a5a4a', parent: 'south-asia',
      span: {
        start: '185 BCE', end: '73 BCE',
        startDates: [C(185, 'wp-shunga', 'infobox'), C(187, 'wp-shunga', 'lead (from around 187)'), C(184, 'wp-shunga', 'Origins')],
        endDates: [C(73, 'wp-shunga', 'infobox and lead'), C(75, 'wp-shunga', 'lead (to 75) and Name')],
      },
    },
    {
      id: 'gupta', name: 'Gupta Empire', color: '#c08a3a', parent: 'south-asia',
      span: {
        start: 'c. 240 CE', end: 'c. 579 CE',
        endDates: [C('579 CE', 'wp-gupta', 'infobox'), C('575 CE', 'wp-gupta', 'short description'), C('550 CE', 'wp-gupta', 'navbox (320–550)')],
      },
    },
    { id: 'harsha-kannauj', name: 'Harsha’s empire (Kannauj)', color: '#b07a5a', parent: 'south-asia', span: { start: '606 CE', end: '647 CE' } },
    {
      id: 'satavahana', name: 'Satavahana dynasty', color: '#7a8a4a', parent: 'south-asia',
      span: {
        start: 'c. 117 BCE', end: 'c. 224 CE',
        startDates: [R(133, 100, 'wp-satavahana', "infobox and lead ('late 2nd century BCE')"), R(300, 201, 'wp-satavahana', "lead ('as early as the 3rd century BCE')")],
      },
    },
    { id: 'pallava', name: 'Pallava dynasty', color: '#4a8a7a', parent: 'south-asia', span: { start: '275 CE', end: '897 CE' } },
    {
      id: 'tamilakam', name: 'Tamilakam: the Sangam period', color: '#5a9a6a', parent: 'south-asia',
      span: {
        start: 'c. 300 BCE', end: 'c. 300 CE',
        startDates: [C(300, 'wp-sangam', 'lead'), C(100, 'wp-sangam', 'lead (Zvelebil: 100 BCE to 250 CE)')],
        endDates: [C('300 CE', 'wp-sangam', 'lead'), C('250 CE', 'wp-sangam', 'lead (Zvelebil)')],
      },
    },
    {
      id: 'anuradhapura', name: 'Anuradhapura kingdom', color: '#8a6a9a', parent: 'south-asia',
      span: { start: '437 BCE', end: '1017 CE', startDates: [C(437, 'wp-anuradhapura', 'lead and infobox'), C(377, 'wp-anuradhapura', 'The city of Anuradhapura (made capital)')] },
    },
  ],
  { after: 'south-asia' },
);

// ---------- the Maurya Empire ----------
ed.event({
  uuid: 'chandragupta-maurya', title: 'Chandragupta Maurya founds the Maurya Empire', start: 'c. 321 BCE', tracks: ['maurya'],
  descr: 'His conquest of Magadha is generally dated to c. 322–319 BCE; an alternative chronology places these events in c. 311–305 BCE. He reigns until c. 297 BCE.',
  sources: [S('wp-maurya', 'infobox'), S('wp-chandragupta-maurya', 'lead and infobox')],
  startDates: [C(321, 'wp-maurya', 'infobox (Nanda–Mauryan War)'), R(322, 319, 'wp-chandragupta-maurya', 'lead'), R(311, 305, 'wp-chandragupta-maurya', 'lead (alternative chronology)')],
  links: [{ to: 'nanda', kind: 'related' }],
});
ed.event({
  uuid: 'seleucid-mauryan-war', title: 'Seleucid–Mauryan war', start: '305 BCE', end: '303 BCE', tracks: ['maurya', 'seleucid'],
  descr: 'Fought sometime between 305 and 303 BCE between Chandragupta and Seleucus I Nicator; it ends in a marriage alliance.',
  sources: [S('wp-seleucid-mauryan-war', 'infobox and lead'), S('wp-chandragupta-maurya', 'lead')],
  links: [{ to: 'chandragupta-maurya', kind: 'related' }],
});
ed.event({
  uuid: 'ashoka', title: 'Reign of Ashoka', start: 'c. 268 BCE', end: '232 BCE', tracks: ['maurya'],
  descr: 'Mauryan emperor from c. 268 BCE until his death in 232 BCE. His reputation grows after the 19th-century decipherment of sources written in the Brahmi script.',
  sources: [S('wp-ashoka', 'lead and infobox'), S('wp-maurya', 'infobox')],
  startDates: [C(268, 'wp-ashoka', 'infobox'), C(269, 'wp-ashoka', 'infobox (coronation) and short description'), C(273, 'wp-chandragupta-maurya', "infobox dynasty table ('273/268')")],
});
ed.event({
  uuid: 'kalinga-war', title: 'Kalinga War', start: 'c. 261 BCE', tracks: ['maurya'],
  descr: 'Ashoka conquers Kalinga in the eighth year of his reign, according to his own edicts. The war began an era of more than 40 years of relative peace.',
  sources: [S('wp-kalinga-war', 'infobox, Course of the war and Aftermath'), S('wp-ashoka', 'lead')],
  startDates: [C(261, 'wp-kalinga-war', 'infobox and Course of the war'), C(260, 'wp-ashoka', 'lead'), C(265, 'wp-kalinga-war', 'reference note 2')],
  links: [{ to: 'ashoka', kind: 'part-of' }],
});
ed.event({
  uuid: 'buddhism-sri-lanka', title: 'Buddhism reaches Sri Lanka', start: '267 BCE', tracks: ['anuradhapura'],
  descr: 'Theravada Buddhism is introduced during the reign of King Devanampiya Tissa.',
  sources: [S('wp-anuradhapura', 'infobox and lead')],
});
ed.event({
  uuid: 'shunga-coup', title: 'Pushyamitra Shunga kills the last Maurya', start: '185 BCE', tracks: ['shunga', 'maurya'],
  descr: 'The assassination of Brihadratha by Pushyamitra Shunga ends the Maurya Empire and begins the Shunga Empire.',
  sources: [S('wp-maurya', 'infobox'), S('wp-shunga', 'infobox and Origins')],
  startDates: [C(185, 'wp-shunga', 'infobox'), C(187, 'wp-shunga', 'lead'), C(184, 'wp-shunga', 'Origins')],
});

// ---------- the north-west: Greeks, Sakas, Kushans ----------
ed.event({
  uuid: 'indo-greek-founded', title: 'Demetrius I invades India: the Indo-Greek Kingdom', start: 'c. 200 BCE', tracks: ['indo-greek', 'greco-bactria'],
  descr: 'The Graeco-Bactrian king Demetrius I invades India from Bactria. The Indo-Greeks disappear as a political entity around 10 AD.',
  sources: [S('wp-indo-greek', 'lead and infobox')],
});
ed.event({
  uuid: 'menander', title: 'Menander I', start: 'c. 160 BCE', end: '130 BCE', tracks: ['indo-greek'],
  descr: 'Indo-Greek king; the precise dates of his reign remain elusive. Patanjali’s Mahabhashya, around 150 BC, describes a failed campaign of Menander as far as Mathura. According to tradition, he embraced the Buddhist faith.',
  sources: [S('wp-menander', 'infobox, lead, Reign and Menander and Buddhism')],
  startDates: [C(165, 'wp-menander', 'infobox and lead (165/155)'), C(155, 'wp-menander', 'infobox and lead (165/155)')],
});
ed.event({
  uuid: 'maues', title: 'Maues, the first Saka king in India', start: 'c. 85 BCE', end: 'c. 60 BCE', tracks: ['indo-scythian'],
  descr: 'The first rulers of the Indo-Scythian kingdom are Maues (c. 85–60 BCE) and Vonones (c. 75–65 BCE).',
  sources: [S('wp-indo-scythians', 'lead and infobox')],
});
ed.event({
  uuid: 'kushan-founded', title: 'Kujula Kadphises unites the Yuezhi: the Kushan Empire', start: 'c. 30 CE', tracks: ['kushan'],
  descr: 'Kujula Kadphises (25–85), the first ruler, unites the Yuezhi tribes into a confederation. The Kushan Empire fragments into semi-independent kingdoms in the 3rd century AD.',
  sources: [S('wp-kushan', 'lead and infobox')],
});
ed.event({
  uuid: 'ban-chao-khotan', title: 'A Kushan army fights Ban Chao near Khotan', start: '90 CE', tracks: ['kushan', 'china'],
  descr: 'Ban Chao fights battles near Khotan with a Kushan army of 70,000 men.',
  sources: [S('wp-kanishka', 'Conquests in India and Central Asia')],
});
ed.event({
  uuid: 'kanishka', title: 'Reign of Kanishka', start: 'c. 127 CE', end: '150 CE', tracks: ['kushan'],
  descr: 'The empire reaches its zenith. Around 127 CE he replaces Greek with Bactrian as the official language of administration. He never converts to Buddhism but gives it royal sponsorship, and heads the 4th Buddhist Council in Kashmir. Earlier scholars dated his accession to 78 CE.',
  sources: [S('wp-kanishka', 'lead, infobox and Kanishka and Buddhism'), S('wp-kushan', 'infobox (Bactrian official from c. 127)')],
  startDates: [C('127 CE', 'wp-kanishka', 'lead and infobox (Falk)'), C('78 CE', 'wp-kanishka', 'lead (earlier scholars)')],
  endDates: [C('150 CE', 'wp-kanishka', 'infobox'), C('151 CE', 'wp-kanishka', 'navbox')],
});

// ---------- the Deccan and the south ----------
ed.event({
  uuid: 'naneghat', title: 'Naneghat inscription of Satakarni I', start: '70 BCE', end: '60 BCE', tracks: ['satavahana'],
  descr: 'Dated to 70–60 BCE, in the reign of Satakarni I.',
  sources: [S('wp-satavahana', 'Naneghat inscription caption')],
});
ed.event({
  uuid: 'pallavas-rise', title: 'The Pallavas become a major southern power', start: '600 CE', end: '668 CE', tracks: ['pallava'],
  descr: 'During the reigns of Mahendravarman I (600–630) and Narasimhavarman I (630–668).',
  sources: [S('wp-pallava', 'lead and infobox')],
});
ed.event({
  uuid: 'sigiriya', title: 'Kashyapa I rules from Sigiriya', start: '473 CE', end: '491 CE', tracks: ['anuradhapura'],
  descr: 'Kashyapa I (473–491) chooses Sigiriya to be his capital.',
  sources: [S('wp-anuradhapura', 'The city of Anuradhapura')],
});

// ---------- the Guptas ----------
ed.event({
  uuid: 'chandragupta-i', title: 'Coronation of Chandragupta I', start: '320 CE', tracks: ['gupta'],
  descr: 'Crowned on 26 February 320. The Gupta Empire, established c. 240, exists from the mid 3rd century to the mid 6th century CE.',
  sources: [S('wp-gupta', 'infobox and lead')],
});
ed.event({
  uuid: 'samudragupta', title: 'Reign of Samudragupta', start: 'c. 335 CE', end: '375 CE', tracks: ['gupta'],
  descr: 'The second Gupta emperor. Modern scholars variously assign the start of his reign from c. 319 CE to c. 350 CE.',
  sources: [S('wp-samudragupta', 'lead, infobox and Period')],
  startDates: [C('335 CE', 'wp-samudragupta', 'infobox'), C('320 CE', 'wp-samudragupta', 'Period (c. 319–320)', { margin: 1 }), C('350 CE', 'wp-samudragupta', 'Period')],
  links: [{ to: 'chandragupta-i', kind: 'related' }],
});
ed.event({
  uuid: 'chandragupta-ii', title: 'Reign of Chandragupta II', start: 'c. 375 CE', end: 'c. 415 CE', tracks: ['gupta'],
  descr: 'Gupta emperor until his death in c. 415. The beginning of his reign can be dated to either 376–377 CE or 380–381 CE.',
  sources: [S('wp-chandragupta-ii', 'lead, infobox and Period of reign')],
  startDates: [C('375 CE', 'wp-chandragupta-ii', 'lead'), C('380 CE', 'wp-chandragupta-ii', 'infobox and ruler list')],
  links: [{ to: 'samudragupta', kind: 'related' }],
});
ed.event({
  uuid: 'western-satraps-end', title: 'Chandragupta II defeats the last Western Satrap', start: '395 CE', tracks: ['gupta', 'indo-scythian'],
  descr: 'Rudrasimha III, the last of the Western Satraps, is defeated by the Gupta emperor Chandragupta II.',
  sources: [S('wp-indo-scythians', 'lead')],
  links: [{ to: 'chandragupta-ii', kind: 'part-of' }],
});
ed.event({
  uuid: 'nalanda', title: 'Nalanda founded', start: 'c. 427 CE', tracks: ['gupta'],
  descr: 'Established by the Gupta emperor Kumaragupta I; it operates for almost a thousand years, until around 1400 CE.',
  sources: [S('wp-nalanda', 'infobox and lead')],
});
ed.event({
  uuid: 'gupta-hunnic-wars', title: 'Gupta–Hunnic Wars', start: 'c. 460 CE', end: 'c. 500 CE', tracks: ['gupta', 'alchon'],
  descr: 'Wars between the Gupta Empire and the Huns; the Alchon Huns invade India between the 4th and 6th centuries CE.',
  sources: [S('wp-gupta', 'infobox'), S('wp-alchon', 'lead')],
});
ed.event({
  uuid: 'ajanta', title: 'Ajanta Caves: the second phase', start: 'c. 470 CE', tracks: ['south-asia'],
  descr: 'Buddhist cave monuments dating from the second century BCE to about 480 CE. The second phase falls in a brief period of 460–480 CE according to later scholarship (400–650 CE in older accounts), circa 480 CE under King Harishena.',
  sources: [S('wp-ajanta', 'lead, History and map caption')],
  startDates: [C('470 CE', 'wp-ajanta', 'lead (460–480, later scholarship)', { margin: 10 }), C('525 CE', 'wp-ajanta', 'lead (400–650, older accounts)', { margin: 125 })],
});
ed.event({
  uuid: 'aryabhata', title: 'Aryabhata', start: '476 CE', end: '550 CE', tracks: ['gupta'],
  descr: 'Mathematician-astronomer of the Gupta era. He states he was 23 years old in 3600 Kali Yuga, 499 CE. His Aryabhatiya is translated into Arabic c. 820 CE.',
  sources: [S('wp-aryabhata', 'lead, infobox and Biography')],
});

// ---------- after the Guptas ----------
ed.event({
  uuid: 'harsha', title: 'Harsha, emperor of Kannauj', start: '606 CE', end: '647 CE', tracks: ['harsha-kannauj'],
  descr: 'Crowned at an assembly in April 606, after the downfall of the Gupta Empire in the middle of the 6th century; he rules until his death in 647. An invasion he leads is repelled on the banks of the Narmada in the winter of 618–619.',
  sources: [S('wp-harsha', 'lead, infobox, Early years and Reign')],
});
ed.event({
  uuid: 'wang-xuance', title: 'Tang Taizong sends Wang Xuance to India', start: '648 CE', tracks: ['harsha-kannauj', 'china'],
  descr: 'The Tang Chinese emperor Tang Taizong sends Wang Xuance to India.',
  sources: [S('wp-harsha', 'Reign')],
  links: [{ to: 'harsha', kind: 'related' }],
});

ed.save();
