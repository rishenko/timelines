// The Eurasian Steppe, c. 3700–330 BCE: the most important events only (first pass, 2026-11-17).
// Every date was quoted verbatim from the cited Wikipedia page by a fetch agent; values that came
// only from page summaries are left out (see docs/ancient-sources.md, fifth pass). Re-runnable: it
// replaces what it added before. Run after europe.ts and mediterranean.ts.
//   node scripts/additions/steppe.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-17');

for (const [key, title, slug] of [
  ['wp-botai', 'Botai culture', 'Botai_culture'],
  ['wp-horse-domestication', 'Domestication of the horse', 'Domestication_of_the_horse'],
  ['wp-yamnaya', 'Yamnaya culture', 'Yamnaya_culture'],
  ['wp-afanasievo', 'Afanasievo culture', 'Afanasievo_culture'],
  ['wp-sintashta', 'Sintashta culture', 'Sintashta_culture'],
  ['wp-arkaim', 'Arkaim', 'Arkaim'],
  ['wp-chariot', 'Chariot', 'Chariot'],
  ['wp-andronovo', 'Andronovo culture', 'Andronovo_culture'],
  ['wp-srubnaya', 'Srubnaya culture', 'Srubnaya_culture'],
  ['wp-indo-aryan-migrations', 'Indo-Aryan migrations', 'Indo-Aryan_migrations'],
  ['wp-cimmerians', 'Cimmerians', 'Cimmerians'],
  ['wp-scythians', 'Scythians', 'Scythians'],
  ['wp-madyes', 'Madyes', 'Madyes'],
  ['wp-darius-scythia', 'Scythian campaign of Darius I', 'Scythian_campaign_of_Darius_I'],
  ['wp-ateas', 'Ateas', 'Ateas'],
  ['wp-saka', 'Saka', 'Saka'],
  ['wp-massagetae', 'Massagetae', 'Massagetae'],
  ['wp-tomyris', 'Tomyris', 'Tomyris'],
  ['wp-pazyryk', 'Pazyryk culture', 'Pazyryk_culture'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows ----------
// A new region, placed after Iran (the proximity test passes; see docs/ancient-sources.md, fifth pass).
ed.tracks(
  [
    { id: 'steppe', name: 'Eurasian Steppe', color: '#9a8a4a' },
    { id: 'botai', name: 'Botai culture', color: '#8a9a5a', parent: 'steppe', span: { start: 'c. 3700 BCE', end: 'c. 3100 BCE' } },
    {
      id: 'yamnaya', name: 'Yamnaya culture', color: '#a07a3a', parent: 'steppe',
      span: {
        start: 'c. 3300 BCE', end: 'c. 2600 BCE',
        startDates: [C(3300, 'wp-yamnaya', 'infobox and lead'), C(3400, 'wp-yamnaya', "Origins ('originated in the Don–Volga area at c. 3400 BC')")],
        endDates: [C(2600, 'wp-yamnaya', 'infobox and lead'), C(2500, 'wp-yamnaya', "Origins ('the Yamnaya culture (3300–2500 BC)')")],
      },
    },
    {
      id: 'afanasievo', name: 'Afanasievo culture (Altai)', color: '#b08a5a', parent: 'steppe',
      span: {
        start: 'c. 3300 BCE', end: 'c. 2500 BCE',
        endDates: [C(2500, 'wp-afanasievo', 'infobox, lead and Dating'), C(2000, 'wp-afanasievo', "Dating ('Conventional archaeological understanding … 2500–2000 BC')")],
      },
    },
    {
      id: 'sintashta', name: 'Sintashta culture', color: '#c07a3a', parent: 'steppe',
      span: {
        start: 'c. 2200 BCE', end: 'c. 1900 BCE',
        endDates: [C(1900, 'wp-sintashta', 'infobox and lead'), C(1770, 'wp-sintashta', "footnote (necropolises 'within c. 2200–1770 BCE')"), C(1750, 'wp-sintashta', "lead (Sintashta–Petrovka complex 'c. 2200–1750 BCE')")],
      },
    },
    {
      id: 'andronovo', name: 'Andronovo culture', color: '#b0703a', parent: 'steppe',
      span: {
        start: 'c. 2000 BCE', end: 'c. 1150 BCE',
        endDates: [C(1150, 'wp-andronovo', 'infobox and lead'), C(1450, 'wp-indo-aryan-migrations', "Archaeology ('Andronovo culture (2000–1450 BCE)')")],
      },
    },
    { id: 'srubnaya', name: 'Srubnaya (Timber-grave) culture', color: '#8a6a3a', parent: 'steppe', span: { start: 'c. 1900 BCE', end: 'c. 1200 BCE' } },
    { id: 'cimmerians', name: 'Cimmerians', color: '#7a5a4a', parent: 'steppe' },
    {
      id: 'scythians', name: 'Scythians', color: '#c09a3a', parent: 'steppe',
      span: {
        start: 'c. 800 BCE', end: 'c. 250 BCE',
        startDates: [C(900, 'wp-scythians', "header ('c. 9th/8th century BC'): start of the 9th century"), C(701, 'wp-scythians', 'header: end of the 8th century')],
        endDates: [C(300, 'wp-scythians', "header ('c. 3rd century BC'): start of century"), C(201, 'wp-scythians', 'header: end of century')],
      },
    },
    {
      id: 'saka', name: 'Saka', color: '#a0a04a', parent: 'steppe',
      span: {
        start: 'c. 850 BCE', end: 'c. 450 CE',
        startDates: [C(900, 'wp-saka', "infobox ('9th century BC'): start of century"), C(801, 'wp-saka', 'infobox: end of century')],
        endDates: [C('401 CE', 'wp-saka', "infobox ('5th century AD'): start of century"), C('500 CE', 'wp-saka', 'infobox: end of century')],
      },
    },
    {
      id: 'massagetae', name: 'Massagetae', color: '#8a8a3a', parent: 'steppe',
      span: {
        start: 'c. 750 BCE', end: 'c. 250 BCE',
        startDates: [C(800, 'wp-massagetae', "infobox ('Established c. 8th century BCE'): start of century"), C(701, 'wp-massagetae', 'infobox: end of century')],
        endDates: [C(300, 'wp-massagetae', "infobox ('Disestablished c. 3rd century BCE'): start of century"), C(201, 'wp-massagetae', 'infobox: end of century')],
      },
    },
    {
      id: 'pazyryk', name: 'Pazyryk culture (Altai)', color: '#9a7a5a', parent: 'steppe',
      span: {
        start: 'c. 550 BCE', end: 'c. 250 BCE',
        startDates: [C(600, 'wp-pazyryk', "infobox and lead ('6th to 3rd centuries BC'): start of the 6th century"), C(501, 'wp-pazyryk', 'infobox: end of the 6th century')],
        endDates: [C(300, 'wp-pazyryk', 'infobox: start of the 3rd century'), C(201, 'wp-pazyryk', 'infobox: end of the 3rd century')],
      },
    },
  ],
  { after: 'iran' },
);

// ---------- events: horses, wagons and migrations ----------
ed.event({
  uuid: 'botai-horses', title: 'Botai people herd horses', start: 'c. 3500 BCE', tracks: ['botai'],
  descr: "The Botai are major users of horses by about 3500 BCE. Genetics shows Przewalski's horses descend from Botai herds, while modern domestic horses are not closely related to them.",
  sources: [S('wp-botai', 'Archaeology'), S('wp-horse-domestication', 'lead and Genetic evidence')],
  startDates: [C(3500, 'wp-botai', "Archaeology ('by about 3,500 BC')"), R(3700, 3500, 'wp-horse-domestication', "lead ('Botai settlements (dated to 3700–3500 BCE)')")],
});
ed.event({
  uuid: 'afanasievo-migration', title: 'Steppe herders migrate to the Altai', start: 'c. 3300 BCE', tracks: ['afanasievo'],
  descr: 'People from the pre-Yamnaya Repin culture cross the Eurasian steppe to the Altai, founding the Afanasievo culture, which has been linked to the Proto-Tocharian language. The two populations are genetically very close.',
  sources: [S('wp-afanasievo', 'lead and Genetics (map caption)'), S('wp-yamnaya', 'lead')],
  startDates: [R(3700, 3300, 'wp-afanasievo', "lead ('migrated c. 3700–3300 BCE')"), C(3000, 'wp-afanasievo', "Genetics map caption ('3000 BC: Initial eastward migration')")],
});
ed.event({
  uuid: 'yamnaya-expansion', title: 'Yamnaya spreads across the Pontic–Caspian steppe', start: 'c. 3300 BCE', end: 'c. 3200 BCE', tracks: ['yamnaya'],
  descr: 'Herders with two-wheeled carts and four-wheeled wagons. Later Corded Ware, Bell Beaker, Sintashta and Andronovo populations derive large parts of their ancestry from the Yamnaya.',
  sources: [S('wp-yamnaya', 'Origins (map caption), lead and Characteristics')],
});
ed.event({
  uuid: 'yamnaya-danube', title: 'Yamnaya expansion into the Danube valley', start: 'c. 3100 BCE', end: 'c. 2600 BCE', tracks: ['yamnaya'],
  descr: '',
  sources: [S('wp-yamnaya', 'Origins (map caption)')],
});
ed.event({
  uuid: 'yamnaya-corded-ware', title: 'Yamnaya transforms into Corded Ware', start: 'c. 2700 BCE', tracks: ['yamnaya', 'corded-ware'],
  descr: "In the north, the Corded Ware culture follows the Yamnaya and carries much of its ancestry; how directly one descends from the other is debated. The same map dates the end of the Cucuteni–Trypillia culture to c. 2700 BCE.",
  sources: [S('wp-yamnaya', "Origins (map caption) and infobox ('Followed by')")],
  links: [{ to: 'yamnaya-expansion', kind: 'causes' }],
});
ed.event({
  uuid: 'dom2-horse', title: 'The modern domestic horse emerges', start: 'c. 2200 BCE', tracks: ['sintashta'],
  descr: 'Genomes trace the lineage of all modern domestic horses (DOM2) to the Volga–Don region around 2200 BCE. Its spread is linked with the peoples before Sintashta, and these horses are buried in Sintashta kurgans with early chariots.',
  sources: [S('wp-horse-domestication', 'lead and Genetic evidence')],
  startDates: [
    C(2200, 'wp-horse-domestication', "lead ('around 2200 BCE in the Volga–Don region')"),
    C(2000, 'wp-horse-domestication', "lead (Taylor: 'true domestication did not take place until around 2000 BCE')"),
    C(3000, 'wp-horse-domestication', "lead (Warmuth et al. 2012: 'around 3000 BCE')"),
  ],
  links: [{ to: 'botai-horses', kind: 'related' }],
});
ed.event({
  uuid: 'arkaim', title: 'Arkaim, a fortified Sintashta settlement', start: 'c. 2150 BCE', end: 'c. 1650 BCE', tracks: ['sintashta'],
  descr: 'A settlement of the Sintashta culture, attributed to early Proto-Indo-Iranian speakers. Discovered in 1987.',
  sources: [S('wp-arkaim', 'infobox and lead')],
});
ed.event({
  uuid: 'first-chariots', title: 'The oldest known chariots', start: 'c. 1915 BCE', tracks: ['sintashta'],
  descr: 'Spoke-wheeled vehicles buried with horses in Sintashta graves. Some scholars class them as carts rather than true chariots. Chariots appear on seals at Kültepe in Anatolia by about 1900 BCE, reach Egypt around 1650 BCE and are heavily used by the Mycenaeans around 1600 BCE.',
  sources: [S('wp-chariot', 'lead, Origins, Near East and Greece'), S('wp-sintashta', "infobox ('Earliest known chariots')")],
  startDates: [R(1950, 1880, 'wp-chariot', "lead ('dated to c. 1950–1880 BC')"), C(2000, 'wp-chariot', "Origins ('from around 2000 BC')")],
  links: [{ to: 'dom2-horse', kind: 'related' }],
});
ed.event({
  uuid: 'indo-aryan-migrations', title: 'Indo-Aryan migrations begin', start: 'c. 1800 BCE', tracks: ['andronovo', 'harappan'],
  descr: 'The Indo-Aryans split from the Indo-Iranians of the Sintashta and Andronovo cultures and migrate south, by way of the Bactria–Margiana culture, into northern Syria and the Punjab. In South Asia it begins as a slow diffusion in the Late Harappan period. Indo-Iranian loan words appear in Hurrian treaties of Mitanni in the mid-second millennium.',
  sources: [S('wp-indo-aryan-migrations', 'lead, Archaeology and Literary research')],
  startDates: [R(2000, 1600, 'wp-indo-aryan-migrations', "lead ('from approximately 2000 to 1600 BCE')")],
});
ed.addRow('indo-aryan-migrations', 'bmac');
ed.event({
  uuid: 'srubnaya-lola', title: 'Srubnaya replaces the Lola culture', start: 'c. 1800 BCE', tracks: ['srubnaya'],
  descr: 'The Timber-grave culture, probably Iranian-speaking, takes over the Lola lands; historical sources say the Scythians later succeeded it.',
  sources: [S('wp-srubnaya', 'lead and Distribution')],
  startDates: [C(1800, 'wp-srubnaya', "Distribution ('By 1800 BC')")],
});

// ---------- events: Cimmerians and Scythians ----------
ed.addRow('phrygia-falls', 'cimmerians');
ed.addRow('gyges-killed', 'cimmerians');
ed.event({
  uuid: 'dugdammi-dies', title: 'Death of the Cimmerian king Dugdammî', start: '640 BCE', tracks: ['cimmerians'],
  descr: 'Dugdammî, who led the attack on Lydia, kills himself in Cilicia.',
  sources: [S('wp-cimmerians', 'Death of Dugdammî')],
});
ed.event({
  uuid: 'cimmerians-defeated', title: 'Scythians and Lydians defeat the Cimmerians', start: 'c. 635 BCE', tracks: ['cimmerians', 'scythians', 'lydia'],
  descr: "Madyes's Scythians and the Lydians under Alyattes defeat the Cimmerians and Treres; Herodotus and Polyaenus say permanently.",
  sources: [S('wp-cimmerians', 'Final defeat')],
});
ed.event({
  uuid: 'scythian-assyrian-alliance', title: 'Scythian alliance with Assyria', start: 'c. 672 BCE', tracks: ['scythians', 'as-neo'],
  descr: '',
  sources: [S('wp-scythians', 'infobox (History)')],
});
ed.event({
  uuid: 'madyes', title: 'Madyes: Scythian rule over Media', start: 'c. 653 BCE', end: '625 BCE', tracks: ['scythians', 'medes'],
  descr: "King of the Scythians (c. 658/9–625 BCE). Helping Ashurbanipal suppress the revolt of 652 BCE, he invades Media and holds it for the Assyrians for twenty-eight years, until Cyaxares invites the Scythian rulers to a banquet in 625 BCE and murders them.",
  sources: [S('wp-madyes', "infobox, lead, Conquest of Media and Revolt of Media and death")],
  startDates: [C(653, 'wp-madyes', "Revolt of Media ('twenty-eight years' before 625)"), C(659, 'wp-madyes', 'infobox (reign c. 658/9)')],
  links: [{ to: 'cimmerians-defeated', kind: 'related' }],
});
ed.event({
  uuid: 'scythians-expelled', title: 'Medes expel the Scythians from West Asia', start: 'c. 600 BCE', tracks: ['scythians', 'medes'],
  descr: 'The Scythians retreat into the Pontic steppe.',
  sources: [S('wp-scythians', 'infobox (History)'), S('wp-madyes', 'lead and Aftermath')],
  links: [{ to: 'madyes', kind: 'succeeds' }],
});
ed.event({
  uuid: 'darius-scythia', title: "Darius I's Scythian campaign", start: '513 BCE', tracks: ['scythians', 'persia'],
  descr: 'Darius crosses the Bosphorus on a bridge of boats and then the Danube. The Persians damage the Scythians but suffer heavy losses; the page calls it little more than an expensive stalemate.',
  sources: [S('wp-darius-scythia', 'infobox, lead, The campaign and Aftermath'), S('wp-scythians', 'infobox (Persian invasion 513 BC)')],
  links: [{ to: 'darius-i', kind: 'part-of' }],
});
ed.event({
  uuid: 'ateas-killed', title: 'Philip II defeats Ateas', start: '339 BCE', tracks: ['scythians', 'macedon'],
  descr: 'The Scythian king Ateas is killed in battle against Philip II of Macedon in Dobruja, and his empire falls to pieces.',
  sources: [S('wp-ateas', 'lead and Conflict with Macedon')],
  links: [{ to: 'philip-ii', kind: 'part-of' }],
});

// ---------- events: Saka, Massagetae and the Altai ----------
ed.event({
  uuid: 'arzhan-1', title: 'Arzhan 1 kurgan', start: 'c. 800 BCE', tracks: ['saka'],
  descr: 'An early Saka burial mound.',
  sources: [S('wp-saka', "contents ('Arzhan 1 kurgan (c. 800 BC)')")],
});
ed.event({
  uuid: 'arzhan-2', title: 'Arzhan 2 kurgan', start: 'c. 650 BCE', tracks: ['saka'],
  descr: '',
  sources: [S('wp-saka', "contents ('Arzhan 2 (c. 650 BC)')")],
});
ed.event({
  uuid: 'death-of-cyrus', title: 'Tomyris of the Massagetae kills Cyrus the Great', start: '530 BCE', tracks: ['massagetae', 'persia'],
  descr: 'Cyrus dies in battle against the Massagetae, led by their queen Tomyris. Ctesias tells another version, in which he dies fighting the Derbices.',
  sources: [S('wp-tomyris', 'lead, Death of Cyrus and Aftermath'), S('wp-massagetae', "infobox ('c. 530 BCE' Tomyris)")],
});
ed.event({
  uuid: 'pazyryk-burials', title: 'Pazyryk burials', start: 'c. 450 BCE', tracks: ['pazyryk'],
  descr: 'Burials at Pazyryk and neighbouring sites in the Altai. A Saka (Central Asian Scythian) nomadic Iron Age culture.',
  sources: [S('wp-pazyryk', 'lead and Archaeology')],
  startDates: [C(500, 'wp-pazyryk', "Archaeology ('5th century BC'): start of century"), C(401, 'wp-pazyryk', 'Archaeology: end of century')],
});

const meta = ed.data.meta;
if (!meta.collapsed.includes('steppe')) meta.collapsed.push('steppe');
meta.subtitle = 'Europe, the Mediterranean, the Near East, Iran, the Steppe, the Indus, China and the Americas, c. 3500–330 BCE';
meta.description = meta.description.replace('Iran, the Indus Valley', 'Iran, the Eurasian Steppe, the Indus Valley');

ed.save();
