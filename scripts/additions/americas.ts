// The Americas, second pass (2026-11-18): the Americas become a group with five regions (North America,
// the North American Arctic, Mesoamerica, South America, the Caribbean); the six existing rows move into
// them, and new rows are added. Every date was quoted verbatim from the cited Wikipedia page by a fetch
// agent. Not found (404): Casimiroid (its dates come from *Ortoiroid people*), Sechín Bajo, and the US
// Southwest early-maize pages. See docs/ancient-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after eastern-europe.ts and before groups.ts.
//   node scripts/additions/americas.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-adena', 'Adena culture', 'Adena_culture'],
  ['wp-old-copper', 'Old Copper complex', 'Old_Copper_complex'],
  ['wp-indian-knoll', 'Indian Knoll', 'Indian_Knoll'],
  ['wp-pre-dorset', 'Pre-Dorset', 'Pre-Dorset'],
  ['wp-saqqaq', 'Saqqaq culture', 'Saqqaq_culture'],
  ['wp-independence-i', 'Independence I culture', 'Independence_I_culture'],
  ['wp-dorset', 'Dorset culture', 'Dorset_culture'],
  ['wp-mokaya', 'Mokaya', 'Mokaya_culture'],
  ['wp-tlatilco', 'Tlatilco culture', 'Tlatilco_culture'],
  ['wp-san-jose-mogote', 'San José Mogote', 'San_Jos%C3%A9_Mogote'],
  ['wp-zapotec', 'Zapotec civilization', 'Zapotec_civilization'],
  ['wp-monte-alban', 'Monte Albán', 'Monte_Alb%C3%A1n'],
  ['wp-kotosh', 'Kotosh', 'Kotosh'],
  ['wp-cupisnique', 'Cupisnique', 'Cupisnique'],
  ['wp-paracas', 'Paracas culture', 'Paracas_culture'],
  ['wp-chinchorro', 'Chinchorro culture', 'Chinchorro_culture'],
  ['wp-ortoiroid', 'Ortoiroid people', 'Ortoiroid_people'],
  ['wp-saladoid', 'Saladoid', 'Saladoid'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- regions, and the existing rows moved into them ----------
const regions = [
  { id: 'north-america', name: 'North America', color: '#4a7a4a' },
  { id: 'arctic', name: 'North American Arctic', color: '#5a8a9a' },
  { id: 'mesoamerica', name: 'Mesoamerica', color: '#3a7a5a' },
  { id: 'south-america', name: 'South America', color: '#5a7a3a' },
  { id: 'caribbean', name: 'Caribbean', color: '#3a8a7a' },
];
for (const r of regions) ed.track({ ...r, parent: 'americas' }, { after: 'americas' });
const move: Record<string, string> = {
  'mound-builders': 'north-america', olmec: 'mesoamerica', maya: 'mesoamerica',
  valdivia: 'south-america', 'caral-supe': 'south-america', chavin: 'south-america',
};
for (const [row, parent] of Object.entries(move)) {
  const t = ed.data.tracks.find((x: { id: string }) => x.id === row);
  if (!t) throw new Error(`no row ${row}`);
  t.parent = parent;
}

ed.tracks(
  [
    {
      id: 'old-copper', name: 'Old Copper complex (Great Lakes)', color: '#a0603a', parent: 'north-america',
      span: {
        start: 'c. 4000 BCE', end: 'c. 1000 BCE',
        startDates: [C(4000, 'wp-old-copper', 'Oconto Site (used between around 4,000 and 2,000 BCE)'), C(6500, 'wp-old-copper', 'infobox and Western Great Lakes')],
        endDates: [C(1000, 'wp-old-copper', 'infobox'), C(1580, 'wp-old-copper', "lead ('dated from 6500 to 1580 BCE')")],
      },
    },
    { id: 'eastern-archaic', name: 'Eastern Woodlands (Indian Knoll)', color: '#6a7a4a', parent: 'north-america' },
    { id: 'adena', name: 'Adena culture', color: '#5a6a3a', parent: 'north-america', span: { start: 'c. 500 BCE', end: 'c. 100 CE' } },
  ],
  { after: 'mound-builders' },
);
ed.tracks(
  [
    {
      id: 'pre-dorset', name: 'Pre-Dorset (Eastern Canadian Arctic)', color: '#6a8aaa', parent: 'arctic',
      span: { start: 'c. 3200 BCE', end: 'c. 850 BCE', startDates: [C(3200, 'wp-pre-dorset', 'lead'), R(3350, 2950, 'wp-pre-dorset', 'Chronology (Early Pre-Dorset, cal BCE)')] },
    },
    { id: 'saqqaq', name: 'Saqqaq culture (Greenland)', color: '#5a7a9a', parent: 'arctic', span: { start: 'c. 2500 BCE', end: 'c. 800 BCE' } },
    {
      id: 'independence-i', name: 'Independence I (Greenland)', color: '#7a8aaa', parent: 'arctic',
      span: { start: 'c. 2500 BCE', end: 'c. 1900 BCE', startDates: [C(2500, 'wp-independence-i', 'History and origin'), R(2400, 1900, 'wp-independence-i', 'lead')], endDates: [C(1900, 'wp-independence-i', 'History and origin'), R(1900, 1700, 'wp-independence-i', 'lead (disappeared)')] },
    },
    { id: 'dorset', name: 'Dorset culture', color: '#4a6a8a', parent: 'arctic', span: { start: 'c. 500 BCE', end: 'c. 1500 CE', endDates: [C('1500 CE', 'wp-dorset', 'lead'), C('1000 CE', 'wp-dorset', 'lead (perhaps as early as 1000)')] } },
  ],
  { after: 'arctic' },
);
ed.tracks(
  [
    { id: 'mokaya', name: 'Mokaya (Mazatán)', color: '#4a8a5a', parent: 'mesoamerica' },
    { id: 'tlatilco', name: 'Tlatilco culture (Valley of Mexico)', color: '#5a8a6a', parent: 'mesoamerica', span: { start: 'c. 1250 BCE', end: 'c. 800 BCE', startDates: [C(1250, 'wp-tlatilco', 'lead'), C(1450, 'wp-tlatilco', 'Notes (Pool)')] } },
    { id: 'zapotec', name: 'Zapotecs (Valley of Oaxaca)', color: '#6a7a5a', parent: 'mesoamerica' },
  ],
  { before: 'olmec' },
);
ed.tracks(
  [
    { id: 'kotosh', name: 'Kotosh', color: '#7a6a4a', parent: 'south-america' },
    {
      id: 'cupisnique', name: 'Cupisnique culture', color: '#8a6a3a', parent: 'south-america',
      span: { start: 'c. 1500 BCE', end: 'c. 500 BCE', startDates: [C(1500, 'wp-cupisnique', 'lead'), C(1000, 'wp-cupisnique', 'The Cupisnique and the Chavin (Cordy-Collins)')], endDates: [C(500, 'wp-cupisnique', 'lead'), C(200, 'wp-cupisnique', 'Cordy-Collins')] },
    },
    { id: 'paracas', name: 'Paracas culture (Peru)', color: '#9a5a3a', parent: 'south-america', span: { start: 'c. 800 BCE', end: 'c. 100 BCE' } },
    { id: 'chinchorro', name: 'Chinchorro culture (coasts of northern Chile and southern Peru)', color: '#6a5a4a', parent: 'south-america', span: { start: 'c. 7000 BCE', end: 'c. 1500 BCE' } },
  ],
  { after: 'chavin' },
);
ed.tracks(
  [
    { id: 'archaic-caribbean', name: 'Archaic Caribbean (Casimiroid, Ortoiroid)', color: '#4a7a7a', parent: 'caribbean' },
    { id: 'saladoid', name: 'Saladoid culture', color: '#3a6a6a', parent: 'caribbean', span: { start: 'c. 500 BCE', end: '545 CE' } },
  ],
  { after: 'caribbean' },
);

// ---------- North America ----------
ed.event({
  uuid: 'old-copper', title: 'Old Copper complex: copper tools around the Great Lakes', start: 'c. 4000 BCE', end: 'c. 2000 BCE', tracks: ['old-copper'],
  descr: 'Widespread copper tools, weapons and ornaments, worked from 99% pure copper found near Lake Superior; by about 1,000 BCE copper is increasingly restricted to jewelry and status items. The Oconto site, with mostly flexed and bundle burials, was used between around 4,000 and 2,000 BCE.',
  sources: [S('wp-old-copper', 'lead, Western Great Lakes and Oconto Site')],
});
ed.event({
  uuid: 'indian-knoll', title: 'Indian Knoll shell midden', start: 'c. 3000 BCE', end: 'c. 2000 BCE', tracks: ['eastern-archaic'],
  descr: 'Most heavily occupied in this period (the midden formed between 5500 and 2000 BC); trade reaches as far north as Lake Superior. By 1000 BC status differences show in grave goods.',
  sources: [S('wp-indian-knoll', 'Background, Burials and grave goods and Social complexity')],
});
ed.event({
  uuid: 'adena-mounds', title: 'Adena burial mounds', start: 'c. 500 BCE', end: 'c. 100 CE', tracks: ['adena'],
  descr: 'Mounds built from hundreds of thousands of baskets of graded earth serve as burial and ceremonial sites; trade runs from Great Lakes copper to Gulf Coast shells. The Great Serpent Mound has been attributed to the culture, without conclusive evidence.',
  sources: [S('wp-adena', 'lead, infobox, Mounds and Importance')],
});

// ---------- Arctic ----------
ed.event({
  uuid: 'paleo-eskimo', title: 'Paleo-Eskimo ancestors arrive from Siberia', start: 'c. 4000 BCE', tracks: ['pre-dorset', 'saqqaq'],
  descr: 'Genetic studies point to a single migration from Siberia around 4000 BC by the ancestors of the Saqqaq, Pre-Dorset and Dorset peoples.',
  sources: [S('wp-pre-dorset', 'Genetics'), S('wp-saqqaq', 'Genetics'), S('wp-dorset', 'Genetics')],
});
ed.event({
  uuid: 'saqqaq', title: 'The Saqqaq culture settles Greenland', start: 'c. 2500 BCE', end: 'c. 800 BCE', tracks: ['saqqaq'],
  descr: 'The longest-residing culture in Greenland’s history: small tents, seals, seabirds and other marine animals, and tools of silicified slate, agate, quartzite and rock crystal.',
  sources: [S('wp-saqqaq', 'infobox, lead, Timeframe and Archaeological findings')],
});
ed.event({
  uuid: 'independence-i', title: 'Independence I hunters in Greenland', start: 'c. 2500 BCE', end: 'c. 1900 BCE', tracks: ['independence-i'],
  descr: 'Muskoxen are a key part of their diet; microblades make up a large share of their tools. They disappear around 1900–1700 BC for unknown reasons.',
  sources: [S('wp-independence-i', 'lead, History and origin, Lifestyle and Tools')],
});
ed.event({
  uuid: 'dorset-begins', title: 'The Dorset culture begins', start: 'c. 500 BCE', tracks: ['dorset'],
  descr: 'They hunt seals from holes in the ice and make soapstone lamps (qulliq) burning seal oil; unlike earlier cultures they lack bow and arrow.',
  sources: [S('wp-dorset', 'lead, Origins and Technology')],
});

// ---------- Mesoamerica ----------
ed.event({
  uuid: 'mokaya-pottery', title: 'Mokaya: the first pottery in Mesoamerica', start: 'c. 1900 BCE', end: 'c. 1700 BCE', tracks: ['mokaya'],
  descr: 'The Barra phase. A Mokaya site gives evidence of cacao beverages; the following Locona phase (1700–1500 BC) may have given the stimulus for the Gulf Olmec, and during the Cuadros period the area is believed to have come under Olmec hegemony.',
  sources: [S('wp-mokaya', 'Chronology, Barra, Locona and Ocós to Jocotal')],
  startDates: [C(1900, 'wp-mokaya', 'Chronology'), R(1850, 1650, 'wp-mokaya', 'Barra (ceramic phase)')],
  links: [{ to: 'san-lorenzo', kind: 'related' }],
});
ed.event({
  uuid: 'san-jose-mogote', title: 'San José Mogote, the first farming village of the Valley of Oaxaca', start: 'c. 1500 BCE', end: 'c. 500 BCE', tracks: ['zapotec'],
  descr: 'Ceremonial buildings by 1300 B.C.; mirrors made here were traded to the Olmec Gulf Coast. Its dominance ends around 500 BCE with the rise of Monte Albán.',
  sources: [S('wp-san-jose-mogote', 'infobox, lead, Development of civilization and Monument 3')],
});
ed.event({
  uuid: 'tlatilco', title: 'Tlatilco chiefdoms in the Valley of Mexico', start: 'c. 1250 BCE', end: 'c. 800 BCE', tracks: ['tlatilco'],
  descr: 'Chiefdom centres at Tlatilco and Tlapacoya; Olmec-style objects are ubiquitous in early high-status burials. By 700 BCE Cuicuilco is the largest city in the valley.',
  sources: [S('wp-tlatilco', 'lead, Defining the Tlatilco culture and Phases')],
  links: [{ to: 'san-lorenzo', kind: 'related' }],
});
ed.event({
  uuid: 'zapotec-writing', title: 'Earliest Zapotec writing', start: 'c. 600 BCE', tracks: ['zapotec'],
  descr: 'Monument 3 at San José Mogote carries the earliest Zapotec glyphs known, though its dating has been doubted. Zapotec writing is a predecessor of Maya, Mixtec and Aztec writing; whether Olmec symbols of 650 BC came first is debated.',
  sources: [S('wp-san-jose-mogote', 'lead and Monument 3'), S('wp-zapotec', 'Technology and Writing')],
  startDates: [C(600, 'wp-san-jose-mogote', "lead ('the first evidence of Zapotec hieroglyphic writing (600 B.C.)')"), R(600, 500, 'wp-zapotec', 'Writing (Monument 3)'), C(500, 'wp-zapotec', "Technology ('the oldest Zapotec writing dated to about 500 BC')")],
});
ed.event({
  uuid: 'monte-alban', title: 'Monte Albán founded', start: 'c. 500 BCE', tracks: ['zapotec'],
  descr: 'Built on a mountaintop in a previously uninhabited no-man’s-land; about 5,200 people live there by around 300 BCE. The Danzantes carvings date from its earliest period and show traits of Olmec culture.',
  sources: [S('wp-monte-alban', 'lead, Site history and Monuments'), S('wp-zapotec', 'History')],
  links: [{ to: 'san-jose-mogote', kind: 'related' }],
});

// ---------- South America ----------
ed.event({
  uuid: 'kotosh-pottery', title: 'Kotosh: the Wairajirca period and first pottery', start: 'c. 1750 BCE', end: 'c. 1150 BCE', tracks: ['kotosh'],
  descr: 'One of three phases at Kotosh that preceded the Chavín culture; the earlier Mito period was preceramic.',
  sources: [S('wp-kotosh', 'Stratigraphy, Wairajirca period and Mito period')],
});
ed.event({
  uuid: 'cupisnique', title: 'Cupisnique adobe temples', start: 'c. 1500 BCE', end: 'c. 500 BCE', tracks: ['cupisnique'],
  descr: 'A distinctive adobe architecture; Cupisnique and Chavín share gods and artistic forms, and the Chavín built a temple beside Collud about three hundred years later. A mural of a spider god found in 2020 is about 3,200 years old.',
  sources: [S('wp-cupisnique', 'lead, Spider deity temple and Other Cupisnique sites')],
  links: [{ to: 'chavin-old-temple', kind: 'related' }],
});
ed.event({
  uuid: 'paracas', title: 'Paracas textiles and mummy bundles', start: 'c. 800 BCE', end: 'c. 100 BCE', tracks: ['paracas'],
  descr: 'Known chiefly for its textile arts. Early Paracas communities were within the Chavín sphere, whose influence dwindled in 500–380 BCE; about 420 mummy bundles date to around 300–200 BCE, and the culture shows the earliest trepanations in the Americas.',
  sources: [S('wp-paracas', 'infobox, lead, Political and social organization, Mummy bundles and Trepanation')],
  links: [{ to: 'chavin-old-temple', kind: 'related' }],
});
ed.event({
  uuid: 'chinchorro-tattoo', title: 'Earliest tattoo in the Americas (Chinchorro)', start: 'c. 2300 BCE', tracks: ['chinchorro'],
  descr: 'The Chinchorro were famous for detailed mummification, practised from 7,000 BC; around 2000 BC their mummies change from black manganese to red.',
  sources: [S('wp-chinchorro', 'lead, Chinchorro mummies and Early tattoo')],
});
ed.event({
  uuid: 'chinchorro-end', title: 'The Chinchorro culture ends', start: 'c. 1550 BCE', tracks: ['chinchorro'],
  descr: 'Set around 3500 BP. Influences from the Andean Plateau lead to farming around 3,000 BP, and later groups no longer mummify their dead.',
  sources: [S('wp-chinchorro', 'lead, Chinchorro mummies and Later developments')],
});

// ---------- Caribbean ----------
ed.event({
  uuid: 'casimiroid', title: 'The Casimiroid peoples settle the Caribbean', start: 'c. 4190 BCE', end: 'c. 2165 BCE', tracks: ['archaic-caribbean'],
  descr: 'They precede the Ortoiroid peoples.',
  sources: [S('wp-ortoiroid', "lead ('the Casimiroid peoples (~4190-2165 BC)')")],
});
ed.event({
  uuid: 'ortoiroid', title: 'Ortoiroid peoples move into the Antilles', start: 'c. 2000 BCE', end: 'c. 400 BCE', tracks: ['archaic-caribbean'],
  descr: 'Known for stone tools but without ceramics; they bury their dead beneath shell middens. They settle Saint Kitts from 2000 BC to 400 BC and in most places disappear by about 400 BC (the Coroso culture survives until 200 AD).',
  sources: [S('wp-ortoiroid', 'lead, Settlement patterns, Culture and Decline')],
});
ed.event({
  uuid: 'saladoid', title: 'Saladoid potters reach the Lesser Antilles and Puerto Rico', start: 'c. 500 BCE', end: 'c. 280 BCE', tracks: ['saladoid', 'archaic-caribbean'],
  descr: 'Farmers and potters living in settled villages, believed to have spoken an Arawakan language; they displace the pre-ceramic Ortoiroid culture.',
  sources: [S('wp-saladoid', 'lead, Migrations and Culture')],
  links: [{ to: 'ortoiroid', kind: 'related' }],
});

const meta = ed.data.meta;
meta.collapsed = meta.collapsed.filter((id: string) => id !== 'americas');

ed.save();
