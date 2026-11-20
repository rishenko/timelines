// Smaller gaps, c. 3500–330 BCE (first pass, 2026-11-18): South India and Sri Lanka and the Gandhara grave
// culture (South Asia), the drying of the Sahara (North Africa), East African herders (Sub-Saharan
// Africa), and Palau (Oceania). Every date was quoted verbatim from the cited Wikipedia page by a fetch
// agent. Not found (404): Southern Neolithic, Ash mound, Megalithic culture of South India, Kintampo
// complex. Disputed early iron dates in South India (Sivagalai, Mayiladumparai) are mentioned, not used
// as claims. See docs/ancient-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after north-asia.ts and before groups.ts.
//   node scripts/additions/fill-gaps.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-iron-age-india', 'Iron Age in India', 'Iron_Age_in_India'],
  ['wp-adichanallur', 'Adichanallur', 'Adichanallur'],
  ['wp-sri-lanka-prehistory', 'Prehistory of Sri Lanka', 'Prehistory_of_Sri_Lanka'],
  ['wp-gandhara-grave', 'Gandhara grave culture', 'Gandhara_grave_culture'],
  ['wp-humid-period', 'African humid period', 'African_humid_period'],
  ['wp-pastoral-neolithic', 'Pastoral Neolithic', 'Pastoral_Neolithic'],
  ['wp-savanna-pn', 'Savanna Pastoral Neolithic', 'Savanna_Pastoral_Neolithic'],
  ['wp-palau', 'Palau', 'Palau'],
] as const)
  ed.wikipedia(key, title, slug);

ed.track(
  {
    id: 'gandhara-grave', name: 'Gandhara grave culture (Swat)', color: '#9a7a5a', parent: 'indus',
    span: { start: 'c. 1400 BCE', end: 'c. 800 BCE' },
  },
  { after: 'vedic' },
);
ed.track({ id: 'south-india', name: 'South India and Sri Lanka', color: '#8a5a3a', parent: 'indus' }, { after: 'magadha' });
ed.track({ id: 'sahara', name: 'Sahara (climate)', color: '#c0a060', parent: 'north-africa' }, { before: 'libyans' });
ed.track(
  {
    id: 'pastoral-neolithic', name: 'East African herders (Pastoral Neolithic)', color: '#8a6a4a', parent: 'sub-saharan',
    span: { start: 'c. 3050 BCE', end: 'c. 750 CE', startDates: [C(3050, 'wp-pastoral-neolithic', "lead ('5000 BP')"), C(3000, 'wp-savanna-pn', "Overview ('c. 3,000 BC-700 AD')")] },
  },
  { after: 'punt' },
);
ed.track({ id: 'palau', name: 'Palau (Micronesia)', color: '#3a7aaa', parent: 'oceania' }, { after: 'marianas' });

// ---------- South Asia ----------
ed.event({
  uuid: 'gandhara-graves', title: 'Gandhara grave culture: the Swat graveyards', start: 'c. 1400 BCE', end: 'c. 800 BCE', tracks: ['gandhara-grave'],
  descr: 'Large graveyards appear in northern Gandhara close to the end of the second millennium BCE; the inhumations of c. 1200–900 BCE come from a period in which iron technology was introduced. Parpola links it with the Cemetery H culture in Punjab.',
  sources: [S('wp-gandhara-grave', 'infobox, lead, Location and Indo-Aryan migrations')],
  endDates: [C(800, 'wp-gandhara-grave', 'lead (no burials of this kind after 800 BCE)')],
  links: [{ to: 'indo-aryan-migrations', kind: 'related' }],
});
ed.event({
  uuid: 'south-india-iron', title: 'Early Iron Age in South India', start: 'c. 1000 BCE', tracks: ['south-india'],
  descr: 'Sites such as Hallur and Adichanallur are generally dated to around 1000 BCE; the Iron Age partly corresponds with the megalithic cultures of South India. Much earlier radiocarbon dates from Sivagalai and Mayiladumparai are disputed.',
  sources: [S('wp-iron-age-india', 'lead and Southern India'), S('wp-adichanallur', 'lead and Present Excavations')],
  startDates: [C(1000, 'wp-iron-age-india', 'Southern India'), R(1000, 600, 'wp-adichanallur', 'lead'), R(905, 696, 'wp-adichanallur', 'Present Excavations (2019 report)')],
});
ed.event({
  uuid: 'cinnamon-egypt', title: 'Sri Lankan cinnamon in Egypt', start: 'c. 1500 BCE', tracks: ['south-india', 'eg-new'],
  descr: 'Cinnamon, native to Sri Lanka, was in use in Ancient Egypt, suggesting trading links with the island.',
  sources: [S('wp-sri-lanka-prehistory', 'Mesolithic–Iron Age transition')],
});
ed.event({
  uuid: 'anuradhapura', title: 'A large settlement at Anuradhapura', start: 'c. 900 BCE', tracks: ['south-india'],
  descr: 'Founded before 900 BC at about 15 hectares, it expands to 50 ha within a couple of centuries. In the protohistoric period (1000–500 BCE) Sri Lanka is culturally united with southern India.',
  sources: [S('wp-sri-lanka-prehistory', 'Iron Age'), S('wp-iron-age-india', 'Sri Lanka')],
});

// ---------- Africa ----------
ed.event({
  uuid: 'green-sahara-ends', title: 'The African humid period ends: the Sahara dries', start: 'c. 3550 BCE', tracks: ['sahara'],
  descr: 'Considered the greatest environmental transition of the Holocene in northern Africa; people move to places such as the Nile Valley and Mesopotamia, and the change is linked to the birth of Ancient Egyptian civilization. The end comes in several steps; by 2,700 years ago the central Sahara is a desert.',
  sources: [S('wp-humid-period', 'lead, End and Chronology')],
  startDates: [C(3550, 'wp-humid-period', "End ('an ending date of 5,500 years before present is often used')"), R(4050, 3050, 'wp-humid-period', "lead ('ended 6,000–5,000 years ago')")],
});
ed.event({
  uuid: 'drought-4200', title: 'Pan-tropical drought about 4,000 years ago', start: 'c. 2050 BCE', tracks: ['sahara'],
  descr: 'A major environmental change accompanied by the collapse of ancient civilizations and severe drought in Africa, Asia and the Middle East; some count this step (the 4.2-kiloyear event) as the true end of the humid period. Nile discharge decreases noticeably.',
  sources: [S('wp-humid-period', 'End and Chronology')],
});
ed.event({
  uuid: 'herding-turkana', title: 'Herding reaches East Africa', start: 'c. 3050 BCE', tracks: ['pastoral-neolithic'],
  descr: 'Livestock arrived in northern Africa around 8000 BP; as the Green Sahara dried, herders spread into the Nile Valley and reached the Turkana Basin around 5000 BP (3000 BC).',
  sources: [S('wp-pastoral-neolithic', 'lead, Origins and Migratory patterns')],
  links: [{ to: 'green-sahara-ends', kind: 'related' }],
});
ed.event({
  uuid: 'savanna-pn', title: 'Herders reach the highlands of Kenya and Tanzania', start: 'c. 1350 BCE', tracks: ['pastoral-neolithic'],
  descr: 'South Cushitic-speaking pastoralists who buried their dead in cairns settled first in the Kenyan lowlands (5,200–3,300 ybp). These early Cushitic speakers largely disappeared after the Bantu expansion.',
  sources: [S('wp-savanna-pn', 'lead, Overview and Language')],
  links: [{ to: 'bantu-500', kind: 'related' }],
});

// ---------- Oceania ----------
ed.event({
  uuid: 'palau-settled', title: 'First settlement of Palau', start: 'c. 1000 BCE', tracks: ['palau'],
  descr: 'Settled by Austronesian peoples, most likely from what is now the Philippines or Indonesia. The page’s history section places it between the 3rd and 2nd millennia BCE.',
  sources: [S('wp-palau', 'lead and Early history')],
  startDates: [C(1000, 'wp-palau', "lead ('approximately 1,000 BCE')"), R(3000, 1000, 'wp-palau', "Early history ('between the 3rd and 2nd millennia BCE')")],
  links: [{ to: 'out-of-taiwan', kind: 'part-of' }],
});

// The timeline's description, now that the ninth pass is in (this is the last additions script before groups.ts).
const meta = ed.data.meta;
meta.subtitle = 'Europe, Africa, the Near East, Arabia and the Caucasus, the Steppe and Siberia, South and East Asia, Oceania, and the Americas, c. 3500–330 BCE';
meta.description =
  'Bronze Age and early Iron Age civilizations: Europe, the western Mediterranean, North Africa and the Sahara, Nubia, Africa south of the Sahara, the Aegean and Greece, Anatolia, the Levant, Egypt, Mesopotamia and Assyria, the Caucasus, Iran, Arabia, the Eurasian Steppe, Siberia and Mongolia, South Asia and Sri Lanka, mainland Southeast Asia, Tibet, China, Korea and Japan, Taiwan and Island Southeast Asia, Oceania, and the Americas from the Arctic to the Caribbean and the Andes.';

ed.save();
