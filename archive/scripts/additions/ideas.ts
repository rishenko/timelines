// Ideas, literature and landmarks, before 330 BCE (2026-11-18): the backlog's "more ancient content" (Lagash,
// Gudea, Hazor, Tushratta) plus the history of ideas a general reader looks for — Gilgamesh, Ashurbanipal's
// library, the return from exile, the Cyrus Cylinder, Persepolis, Zoroaster; Homer and Hesiod, Thales,
// Pythagoras, Thermopylae, Pericles, the Parthenon, Socrates, Plato's Academy, Aristotle's Lyceum, the Mausoleum,
// Herodotus; Confucius, Laozi, Sun Tzu, Mozi, the Hundred Schools, Shang Yang, Pāṇini. All on existing rows.
// Every date was quoted verbatim from the cited Wikipedia page by a fetch agent. Not used: *Tao Te Ching* and
// *Warring States period*, whose banners cite the LLM translation guideline; the Upanishads (their dates were
// read only in summary). See docs/ancient-sources.md, thirteenth pass.
// Re-runnable: it replaces what it added before. Run after neolithic-3.ts and before groups.ts.
//   node scripts/additions/ideas.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-eannatum', 'Eannatum', 'Eannatum'],
  ['wp-stele-vultures', 'Stele of the Vultures', 'Stele_of_the_Vultures'],
  ['wp-urukagina', 'Urukagina', 'Urukagina'],
  ['wp-gudea', 'Gudea', 'Gudea'],
  ['wp-tushratta', 'Tushratta', 'Tushratta'],
  ['wp-tel-hazor', 'Tel Hazor', 'Tel_Hazor'],
  ['wp-gilgamesh', 'Epic of Gilgamesh', 'Epic_of_Gilgamesh'],
  ['wp-ashurbanipal-library', 'Library of Ashurbanipal', 'Library_of_Ashurbanipal'],
  ['wp-babylonian-captivity', 'Babylonian captivity', 'Babylonian_captivity'],
  ['wp-cyrus-cylinder', 'Cyrus Cylinder', 'Cyrus_Cylinder'],
  ['wp-persepolis', 'Persepolis', 'Persepolis'],
  ['wp-zoroaster', 'Zoroaster', 'Zoroaster'],
  ['wp-homer', 'Homer', 'Homer'],
  ['wp-hesiod', 'Hesiod', 'Hesiod'],
  ['wp-thales', 'Thales of Miletus', 'Thales_of_Miletus'],
  ['wp-pythagoras', 'Pythagoras', 'Pythagoras'],
  ['wp-thermopylae', 'Battle of Thermopylae', 'Battle_of_Thermopylae'],
  ['wp-pericles', 'Pericles', 'Pericles'],
  ['wp-parthenon', 'Parthenon', 'Parthenon'],
  ['wp-trial-socrates', 'Trial of Socrates', 'Trial_of_Socrates'],
  ['wp-academy', 'Platonic Academy', 'Platonic_Academy'],
  ['wp-lyceum', 'Lyceum (classical)', 'Lyceum_(classical)'],
  ['wp-mausoleum', 'Mausoleum at Halicarnassus', 'Mausoleum_at_Halicarnassus'],
  ['wp-herodotus', 'Herodotus', 'Herodotus'],
  ['wp-confucius', 'Confucius', 'Confucius'],
  ['wp-laozi', 'Laozi', 'Laozi'],
  ['wp-sun-tzu', 'Sun Tzu', 'Sun_Tzu'],
  ['wp-mozi', 'Mozi', 'Mozi'],
  ['wp-hundred-schools', 'Hundred Schools of Thought', 'Hundred_Schools_of_Thought'],
  ['wp-shang-yang', 'Shang Yang', 'Shang_Yang'],
  ['wp-panini', 'Pāṇini', 'P%C4%81%E1%B9%87ini'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- Mesopotamia, the Levant and Iran ----------
ed.event({
  uuid: 'stele-vultures', title: 'Eannatum of Lagash defeats Umma: the Stele of the Vultures', start: 'c. 2450 BCE', tracks: ['sum-ed'],
  descr: 'The earliest known war monument. Eannatum established one of the first verifiable empires in history, subduing Elam and destroying Susa.',
  sources: [S('wp-eannatum', 'infobox, lead and Stele of the Vultures'), S('wp-stele-vultures', 'infobox, lead and Description')],
  startDates: [C(2450, 'wp-eannatum', 'Stele of the Vultures'), C(2475, 'wp-stele-vultures', 'infobox'), C(2460, 'wp-stele-vultures', 'Description')],
});
ed.event({
  uuid: 'urukagina', title: 'Urukagina of Lagash', start: 'c. 2378 BCE', end: 'c. 2368 BCE', tracks: ['sum-ed'],
  descr: 'King of Lagash and Girsu, described by one study as the first social reformer in history, though there is no solid evidence for a single "reform of Urukagina".',
  sources: [S('wp-urukagina', 'infobox, lead and Reforms')],
  links: [{ to: 'lugalzagesi', kind: 'related' }],
});
ed.event({
  uuid: 'gudea', title: 'Gudea of Lagash', start: 'c. 2144 BCE', end: 'c. 2124 BCE', tracks: ['sumer'],
  descr: 'Best known for the many statues of him; about 600 tablets survive from his dynasty. Exactly when in the 22nd century BC he reigned cannot be determined.',
  sources: [S('wp-gudea', 'infobox, lead, Sources and Chronology')],
  startDates: [C(2144, 'wp-gudea', 'infobox'), R(2150, 2130, 'wp-gudea', 'lead')],
  endDates: [C(2124, 'wp-gudea', 'infobox'), R(2120, 2110, 'wp-gudea', 'lead')],
});
ed.event({
  uuid: 'gilgamesh', title: 'The Epic of Gilgamesh (Old Babylonian version)', start: 'c. 1800 BCE', tracks: ['bab-old'],
  descr: 'The world’s oldest surviving narrative literature. Sumerian Gilgamesh poems may date to the Third Dynasty of Ur (c. 2100 BCE); the Standard Babylonian version was compiled by Sîn-lēqi-unninni between 1300 and 1000 BCE.',
  sources: [S('wp-gilgamesh', 'infobox, lead and Versions')],
});
ed.event({
  uuid: 'tushratta', title: 'Tushratta of Mitanni', start: 'c. 1358 BCE', end: 'c. 1335 BCE', tracks: ['mitanni'],
  descr: 'King of Mitanni at the end of the reign of Amenhotep III, to whom he wrote letters.',
  sources: [S('wp-tushratta', 'infobox and lead')],
  links: [{ to: 'amarna-letters', kind: 'related' }, { to: 'suppiluliuma-i', kind: 'related' }],
});
ed.event({
  uuid: 'hazor-burned', title: 'Hazor, the great Canaanite city, burns', start: 'c. 1250 BCE', tracks: ['can-lba'],
  descr: 'A stratum from around 1200 BCE (13th century) shows catastrophic fire and a scorched palace; the cause is disputed. Hazor had been a major city since the Middle Bronze Age (around 1750 BCE).',
  sources: [S('wp-tel-hazor', 'lead and Biblical archaeology')],
  startDates: [R(1300, 1200, 'wp-tel-hazor', "Biblical archaeology ('13th century BCE')")],
});
ed.event({
  uuid: 'hazor-732', title: 'Assyria captures Hazor', start: '732 BCE', tracks: ['israel-judah', 'as-neo'],
  descr: 'Despite its defences the city is captured and its population deported.',
  sources: [S('wp-tel-hazor', 'infobox and Israelite Hazor')],
  links: [{ to: 'tiglath-pileser-iii', kind: 'related' }],
});
ed.event({
  uuid: 'ashurbanipal-library', title: 'The Library of Ashurbanipal', start: '668 BCE', end: '627 BCE', tracks: ['as-neo'],
  descr: 'More than 30,000 clay tablets and fragments from the 7th century BCE, among them the Epic of Gilgamesh. Nineveh is destroyed in 612 BCE.',
  sources: [S('wp-ashurbanipal-library', 'lead, Contents and Discovery')],
  links: [{ to: 'ashurbanipal', kind: 'part-of' }, { to: 'gilgamesh', kind: 'related' }],
});
ed.event({
  uuid: 'exile-return', title: 'Exiles return from Babylon', start: '539 BCE', tracks: ['israel-judah', 'persia'],
  descr: 'After the deportations of 597, 587 and 582 BCE, the exiled Judeans are permitted by the Persians to return after the Battle of Opis; the Second Temple is begun c. 537 BCE.',
  sources: [S('wp-babylonian-captivity', 'lead')],
  links: [{ to: 'cyrus-takes-babylon', kind: 'related' }, { to: 'jerusalem-587', kind: 'related' }],
});
ed.event({
  uuid: 'cyrus-cylinder', title: 'The Cyrus Cylinder', start: 'c. 539 BCE', tracks: ['persia'],
  descr: 'An Achaemenid royal inscription in the name of Cyrus the Great, made after the Persian conquest of Babylon; the British Museum dates it between 539 and 530 BC.',
  sources: [S('wp-cyrus-cylinder', 'infobox, lead and Description')],
  links: [{ to: 'cyrus-takes-babylon', kind: 'part-of' }],
});
ed.event({
  uuid: 'persepolis', title: 'Persepolis built', start: 'c. 515 BCE', tracks: ['persia'],
  descr: 'The ceremonial capital of the Achaemenid Empire. Cyrus may have chosen the site, but Darius I built the terrace and palaces (André Godard); a broad stairway was begun around 519 BC.',
  sources: [S('wp-persepolis', 'infobox, lead and Construction')],
  startDates: [C(515, 'wp-persepolis', 'lead and Construction'), C(519, 'wp-persepolis', 'Construction (stairway)')],
  links: [{ to: 'darius-i', kind: 'part-of' }],
});
ed.event({
  uuid: 'zoroaster', title: 'Zoroaster (date unknown)', start: 'c. 1000 BCE', tracks: ['iran'],
  descr: 'An Iranian religious reformer. There is no consensus on his date: many scholars consider around 1000 BC most likely, others a range of 1500 to 500 BC; tradition places him in the 7th and 6th centuries BC.',
  sources: [S('wp-zoroaster', 'infobox, lead and Date')],
  startDates: [C(1000, 'wp-zoroaster', 'Date (many scholars)', { margin: 500 }), R(624, 599, 'wp-zoroaster', 'infobox (traditional birth)')],
});

// ---------- Greece ----------
ed.event({
  uuid: 'homer', title: 'The Iliad and the Odyssey', start: 'c. 700 BCE', tracks: ['greece-archaic'],
  descr: 'Traditionally credited to Homer; the poems are thought to have been composed around the late eighth or early seventh century BC.',
  sources: [S('wp-homer', 'lead')],
  startDates: [R(750, 650, 'wp-homer', "lead ('the late eighth or early seventh century BC')")],
});
ed.event({
  uuid: 'hesiod', title: 'Hesiod’s Works and Days', start: 'c. 700 BCE', tracks: ['greece-archaic'],
  descr: 'Hesiod is generally thought to have been active between 750 and 650 BC; Works and Days describes the five Ages of Man.',
  sources: [S('wp-hesiod', 'infobox, lead and Dating')],
  startDates: [R(750, 650, 'wp-hesiod', 'infobox and lead')],
});
ed.event({
  uuid: 'thales-eclipse', title: 'Thales predicts a solar eclipse', start: '585 BCE', tracks: ['greece-archaic'],
  descr: 'According to Herodotus. Thales (c. 626/623 – c. 548/545 BC) was one of the Seven Sages.',
  sources: [S('wp-thales', 'lead and Life')],
});
ed.event({
  uuid: 'pythagoras', title: 'Pythagoras founds a school at Croton', start: 'c. 530 BCE', tracks: ['greece-archaic', 'magna-graecia'],
  descr: 'The philosopher and polymath (c. 570 – c. 495 BC), eponymous founder of Pythagoreanism, travels to Croton in southern Italy.',
  sources: [S('wp-pythagoras', 'infobox and lead')],
});
ed.event({
  uuid: 'thermopylae', title: 'Battle of Thermopylae', start: '480 BCE', tracks: ['greece-classical', 'persia'],
  descr: 'Greek city-states led by Sparta under Leonidas I hold off Xerxes’ invasion force before the Persians win; the Greeks defeat the invaders at Salamis later that year.',
  sources: [S('wp-thermopylae', 'infobox and lead')],
  links: [{ to: 'salamis', kind: 'related' }],
});
ed.event({
  uuid: 'pericles', title: 'Pericles leads Athens', start: '461 BCE', end: '429 BCE', tracks: ['greece-classical'],
  descr: 'The statesman and general of the Golden Age of Athens dies of the Plague of Athens in 429 BC.',
  sources: [S('wp-pericles', 'infobox, lead and Ostracising Cimon')],
});
ed.event({
  uuid: 'parthenon', title: 'The Parthenon built', start: '447 BCE', end: '438 BCE', tracks: ['greece-classical'],
  descr: 'A temple on the Athenian Acropolis dedicated to Athena, begun when the Delian League was at the peak of its power; work on its decoration continued until 432 BC.',
  sources: [S('wp-parthenon', 'infobox and lead')],
  endDates: [C(438, 'wp-parthenon', 'lead'), C(432, 'wp-parthenon', 'infobox')],
  links: [{ to: 'pericles', kind: 'related' }],
});
ed.event({
  uuid: 'socrates', title: 'The trial and death of Socrates', start: '399 BCE', tracks: ['greece-classical'],
  descr: 'Athens tries the 70-year-old philosopher on two charges and he is put to death.',
  sources: [S('wp-trial-socrates', 'infobox, lead and Trial')],
});
ed.event({
  uuid: 'academy', title: 'Plato founds the Academy', start: 'c. 387 BCE', tracks: ['greece-classical'],
  descr: 'Aristotle studies there for twenty years (367–347 BC); the school lasts until 83 BC.',
  sources: [S('wp-academy', 'lead and Plato’s Academy')],
});
ed.event({
  uuid: 'lyceum', title: 'Aristotle founds the Lyceum', start: '335 BCE', tracks: ['greece-classical'],
  descr: 'Returning to Athens after it fell under Macedonian rule, Aristotle sets up his school at the Lyceum.',
  sources: [S('wp-lyceum', 'lead and The Lyceum')],
  startDates: [C(335, 'wp-lyceum', 'The Lyceum'), C(334, 'wp-lyceum', 'lead')],
});
ed.event({
  uuid: 'mausoleum', title: 'The Mausoleum at Halicarnassus', start: '353 BCE', end: '351 BCE', tracks: ['greece-classical'],
  descr: 'The tomb of Mausolus, built between 353 and 351 BC in Halicarnassus; one of the Seven Wonders of the Ancient World.',
  sources: [S('wp-mausoleum', 'infobox, lead and Conquest')],
});
ed.event({
  uuid: 'herodotus', title: 'Herodotus, historian of the Greco-Persian Wars', start: 'c. 484 BCE', end: 'c. 425 BCE', tracks: ['greece-classical'],
  descr: 'A Greek historian and geographer from Halicarnassus; nothing in his Histories can be dated with certainty after 430 BC.',
  sources: [S('wp-herodotus', 'infobox, lead and Later life')],
});

// ---------- China and India ----------
ed.event({
  uuid: 'confucius', title: 'Life of Confucius', start: 'c. 551 BCE', end: 'c. 479 BCE', tracks: ['zhou-eastern'],
  descr: 'Traditionally the paragon of Chinese sages; his teachings, Confucianism, emphasise personal and governmental morality.',
  sources: [S('wp-confucius', 'infobox and lead')],
});
ed.event({
  uuid: 'laozi', title: 'Laozi (traditional dates)', start: 'c. 550 BCE', tracks: ['zhou-eastern'],
  descr: 'Considered the author of the Tao Te Ching and the founder of Taoism. Tradition makes him a contemporary of Confucius; he is sometimes dated to the 4th century BC, and the oldest manuscript of his book dates to the late 4th century BC.',
  sources: [S('wp-laozi', 'infobox, lead and Identity')],
  startDates: [R(600, 501, 'wp-laozi', "infobox ('trad. 6th century BC')"), R(400, 301, 'wp-laozi', "infobox ('sometimes dated 4th century BC')")],
  links: [{ to: 'confucius', kind: 'related' }],
});
ed.event({
  uuid: 'sun-tzu', title: 'Sun Tzu (traditional dates)', start: '544 BCE', end: '496 BCE', tracks: ['zhou-eastern'],
  descr: 'The general and strategist traditionally credited with The Art of War, though its earliest parts probably date at least a century after him.',
  sources: [S('wp-sun-tzu', 'infobox and lead')],
});
ed.event({
  uuid: 'mozi', title: 'Mozi founds Mohism', start: 'c. 470 BCE', end: 'c. 391 BCE', tracks: ['zhou-eastern'],
  descr: 'A philosophy emphasising universal love, social order, the will of Heaven, sharing and honouring the worthy.',
  sources: [S('wp-mozi', 'infobox and lead')],
});
ed.event({
  uuid: 'hundred-schools', title: 'The Hundred Schools of Thought', start: 'c. 500 BCE', end: '221 BCE', tracks: ['zhou-eastern'],
  descr: 'Confucianism, Taoism, Mohism, Legalism and others flourish in the late Spring and Autumn and Warring States periods; their ideas profoundly influence East Asian culture.',
  sources: [S('wp-hundred-schools', 'lead, Confucianism, Taoism, Mohism and Legalism')],
});
ed.event({
  uuid: 'shang-yang', title: 'Shang Yang’s reforms in Qin', start: '356 BCE', end: '338 BCE', tracks: ['zhou-eastern'],
  descr: 'The reformer takes office in Qin in 359 BCE; his first reforms (356 BC) assign land by military merit and favour agriculture, and a second set follows in 350 BC.',
  sources: [S('wp-shang-yang', 'infobox, lead and Reforms')],
});
ed.event({
  uuid: 'panini', title: 'Pāṇini’s Sanskrit grammar', start: 'c. 450 BCE', tracks: ['indus'],
  descr: 'The ancient Sanskrit grammarian flourished in the mid 1st millennium BCE, variously dated between the 6th–5th and the 4th century BCE.',
  sources: [S('wp-panini', 'infobox')],
  startDates: [R(600, 401, 'wp-panini', "infobox ('6th–5th century BCE')"), R(400, 301, 'wp-panini', "infobox ('4th century BCE')")],
});

ed.save();
