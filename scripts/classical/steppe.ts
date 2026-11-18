// The Classical World, fourth region pass (2026-11-18): the Steppe — the Xiongnu and their wars with Han, the Yuezhi
// and Wusun, the Xianbei, the Rouran, the Göktürks and their split, the Kidarites and Hephthalites, the Sarmatians and
// Alans, the Huns and Attila, and the Pannonian Avars. Every date was quoted verbatim from the cited Wikipedia page by
// a fetch agent; values seen only in a page summary are not used. No page carried an AI-text or LLM-translation
// banner. See docs/classical-sources.md, fourth pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts.
//   node scripts/classical/steppe.ts && npm run data:classical
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-xiongnu', 'Xiongnu', 'Xiongnu'],
  ['wp-modu', 'Modu Chanyu', 'Modu_Chanyu'],
  ['wp-baideng', 'Battle of Baideng', 'Battle_of_Baideng'],
  ['wp-han-xiongnu', 'Han–Xiongnu wars', 'Han%E2%80%93Xiongnu_wars'],
  ['wp-yuezhi', 'Yuezhi', 'Yuezhi'],
  ['wp-wusun', 'Wusun', 'Wusun'],
  ['wp-sarmatians', 'Sarmatians', 'Sarmatians'],
  ['wp-huns', 'Huns', 'Huns'],
  ['wp-attila', 'Attila', 'Attila'],
  ['wp-catalaunian', 'Battle of the Catalaunian Plains', 'Battle_of_the_Catalaunian_Plains'],
  ['wp-avars', 'Pannonian Avars', 'Pannonian_Avars'],
  ['wp-xianbei', 'Xianbei', 'Xianbei'],
  ['wp-rouran', 'Rouran Khaganate', 'Rouran_Khaganate'],
  ['wp-hephthalites', 'Hephthalites', 'Hephthalites'],
  ['wp-kidarites', 'Kidarites', 'Kidarites'],
  ['wp-first-turkic', 'First Turkic Khaganate', 'First_Turkic_Khaganate'],
  ['wp-western-turkic', 'Western Turkic Khaganate', 'Western_Turkic_Khaganate'],
  ['wp-eastern-turkic', 'Eastern Turkic Khaganate', 'Eastern_Turkic_Khaganate'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows (east to west) ----------
ed.tracks(
  [
    {
      id: 'xiongnu', name: 'Xiongnu', color: '#7a5a3a', parent: 'steppe',
      span: {
        start: 'c. 250 BCE', end: 'c. 150 CE',
        startDates: [R(300, 201, 'wp-xiongnu', "infobox ('3rd century BC')")],
        endDates: [C('150 CE', 'wp-xiongnu', "infobox ('2nd century AD')", { margin: 50 }), C('90 CE', 'wp-xiongnu', "lead ('late 1st century AD')", { margin: 10 })],
      },
    },
    {
      id: 'xianbei', name: 'Xianbei', color: '#6a7a5a', parent: 'steppe',
      span: { start: 'c. 208 BCE', end: 'c. 250 CE', endDates: [C('250 CE', 'wp-xianbei', "infobox ('3rd century AD')", { margin: 50 })] },
    },
    { id: 'rouran', name: 'Rouran Khaganate', color: '#5a6a7a', parent: 'steppe', span: { start: '330 CE', end: '555 CE', endDates: [C('555 CE', 'wp-rouran', 'infobox'), C('550 CE', 'wp-rouran', 'short description')] } },
    { id: 'first-turkic', name: 'First Turkic Khaganate (Göktürks)', color: '#3a6a8a', parent: 'steppe', span: { start: '552 CE', end: '603 CE' } },
    {
      id: 'eastern-turkic', name: 'Eastern Turkic Khaganate', color: '#4a7a9a', parent: 'steppe',
      span: {
        start: '581 CE', end: '645 CE',
        startDates: [C('581 CE', 'wp-eastern-turkic', 'infobox'), C('603 CE', 'wp-eastern-turkic', 'navbox (603–645)')],
        endDates: [C('645 CE', 'wp-eastern-turkic', 'infobox'), C('630 CE', 'wp-eastern-turkic', 'infobox (conquest by Tang)')],
      },
    },
    {
      id: 'western-turkic', name: 'Western Turkic Khaganate', color: '#2a5a7a', parent: 'steppe',
      span: { start: '581 CE', end: '657 CE', startDates: [C('581 CE', 'wp-western-turkic', 'infobox'), C('603 CE', 'wp-eastern-turkic', 'navbox (603–742)')] },
    },
    { id: 'kidarites', name: 'Kidarites', color: '#8a6a4a', parent: 'steppe', span: { start: '320 CE', end: '467 CE' } },
    {
      id: 'hephthalites', name: 'Hephthalites', color: '#7a4a6a', parent: 'steppe',
      span: { start: 'c. 445 CE', end: '560 CE', startDates: [C('445 CE', 'wp-hephthalites', "infobox ('440s')", { margin: 5 }), C('450 CE', 'wp-hephthalites', 'lead')] },
    },
    {
      id: 'sarmatians', name: 'Sarmatians and Alans', color: '#9a6a3a', parent: 'steppe',
      span: {
        start: 'c. 450 BCE', end: 'c. 350 CE',
        startDates: [R(500, 401, 'wp-sarmatians', "lead ('from around the 5th century BCE')")],
        endDates: [C('350 CE', 'wp-sarmatians', "lead ('to the 4th century CE')", { margin: 50 })],
      },
    },
    { id: 'huns', name: 'Huns', color: '#6a3a3a', parent: 'steppe', span: { start: 'c. 375 CE', end: '469 CE', startDates: [C('375 CE', 'wp-huns', "infobox ('370s')", { margin: 5 })] } },
    { id: 'avars', name: 'Avar Khaganate (Pannonian Avars)', color: '#5a4a6a', parent: 'steppe', span: { start: '567 CE', end: '822 CE' } },
  ],
  { after: 'steppe' },
);

// ---------- the eastern steppe ----------
ed.event({
  uuid: 'modu-xiongnu', title: 'Modu Chanyu founds the Xiongnu Empire', start: '209 BCE', end: '174 BCE', tracks: ['xiongnu'],
  descr: 'Modu kills his father Touman in 209 BCE and rules until 174 BCE. By 208 BCE the Donghu are defeated (they splinter into the Xianbei and Wuhuan), and in 203 BCE he defeats the Yuezhi.',
  sources: [S('wp-modu', 'infobox, lead and Rise of the Xiongnu Empire'), S('wp-xiongnu', 'lead'), S('wp-xianbei', 'History > Origin')],
});
ed.event({
  uuid: 'baideng', title: 'Battle of Baideng', start: '200 BCE', tracks: ['xiongnu', 'han'],
  descr: 'A Han dynasty vanguard, in an army led by Emperor Gaozu, is encircled at Mount Baideng near Pingcheng for seven days. In 198 BC a marriage alliance (heqin) is concluded between the Han and the Xiongnu.',
  sources: [S('wp-baideng', 'infobox and lead'), S('wp-han-xiongnu', 'Background')],
  links: [{ to: 'modu-xiongnu', kind: 'part-of' }],
});
ed.event({
  uuid: 'yuezhi-defeated', title: 'The Xiongnu defeat the Yuezhi', start: 'c. 176 BCE', tracks: ['xiongnu', 'steppe'],
  descr: 'After a major defeat, the Yuezhi split into two groups; the majority begin migrating west to the Ili valley in 165 BCE.',
  sources: [S('wp-yuezhi', 'lead and timeline table'), S('wp-wusun', 'lead')],
  startDates: [C(176, 'wp-yuezhi', 'lead and timeline table'), C(162, 'wp-wusun', 'Early history (final defeat)')],
});
ed.event({
  uuid: 'yuezhi-to-bactria', title: 'The Great Yuezhi settle in Bactria', start: '132 BCE', end: '130 BCE', tracks: ['steppe'],
  descr: 'The Wusun drive the Great Yuezhi out of the Ili valley; they migrate west, then south, and settle in northern Bactria, where the Han envoy Zhang Qian reaches them in 128 BCE. Around 30 CE one of their tribes, the Kushana, forms the basis of the Kushan Empire.',
  sources: [S('wp-yuezhi', 'timeline table and Exodus of the Great Yuezhi'), S('wp-wusun', 'lead and Migration to the Ili Valley')],
  startDates: [C(132, 'wp-yuezhi', 'timeline table'), R(133, 132, 'wp-wusun', 'lead')],
  links: [{ to: 'yuezhi-defeated', kind: 'related' }, { to: 'zhang-qian', kind: 'related' }, { to: 'kushan-founded', kind: 'related' }],
});
ed.event({
  uuid: 'han-xiongnu-wars', title: 'Han–Xiongnu wars', start: '133 BCE', end: '89 CE', tracks: ['xiongnu', 'han'],
  descr: 'The tension fully escalates in 133 BC; between 127 and 119 BC Han campaigns push into Mongolia, with a decisive campaign in 119 BC, and a regional protectorate is set up in 60 BC. Some date the conflicts as early as 200 BC and as late as 188 AD.',
  sources: [S('wp-han-xiongnu', 'infobox, lead and Early campaigns')],
  links: [{ to: 'emperor-wu-han', kind: 'related' }],
});
ed.event({
  uuid: 'xiongnu-split', title: 'The Xiongnu split in two', start: '48 CE', tracks: ['xiongnu'],
  descr: 'In 46 AD repeated natural disasters severely weaken the Xiongnu; they permanently split into two groups in 48 AD.',
  sources: [S('wp-han-xiongnu', 'lead')],
});
ed.event({
  uuid: 'altai-mountains', title: 'Defeat of the Northern Xiongnu', start: '89 CE', end: '91 CE', tracks: ['xiongnu', 'han', 'xianbei'],
  descr: 'In 89 AD Dou Xian leads 50,000 cavalry against them; in 91 AD the Northern Chanyu is defeated in the Battle of the Altai Mountains, and the Xianbei take over the Mongolian Plateau, absorbing 100,000 Xiongnu tribes.',
  sources: [S('wp-han-xiongnu', 'lead'), S('wp-xianbei', 'History > Origin')],
  links: [{ to: 'han-xiongnu-wars', kind: 'part-of' }],
});
ed.event({
  uuid: 'tanshihuai', title: 'Tanshihuai unifies the Xianbei', start: 'c. 156 CE', end: '181 CE', tracks: ['xianbei', 'han'],
  descr: 'He unifies the Xianbei in the mid-2nd century and raids the Han dynasty’s northern borders, with a first recorded raid in 156; after his death in 181 the Xianbei splinter.',
  sources: [S('wp-xianbei', 'infobox, lead and Xianbei Confederation')],
});

// ---------- Turks and the Rouran ----------
ed.event({
  uuid: 'first-turkic-founded', title: 'Bumin overthrows the Rouran: the Turkic Khaganate', start: '552 CE', tracks: ['first-turkic', 'rouran'],
  descr: 'In 552 Bumin defeats Anagui north of Huaihuang, effectively ending the Rouran, which had dominated the eastern steppe for a century and a half; Muqan Qaghan finishes off the remaining Rouran, who resist until 555.',
  sources: [S('wp-first-turkic', 'infobox, lead and History > Origin'), S('wp-eastern-turkic', 'History > Nominal unity')],
});
ed.event({
  uuid: 'turk-byzantine-embassies', title: 'Turkic and Byzantine embassies', start: '568 CE', end: '569 CE', tracks: ['first-turkic', 'eastern-roman'],
  descr: 'First contact is believed to have happened in 563; a Turkic embassy arrives in 568, and in 569 an embassy led by Zemarchus follows.',
  sources: [S('wp-first-turkic', 'History > Relations with the Byzantine Empire')],
});
ed.event({
  uuid: 'turkic-split', title: 'The Turkic Khaganate splits', start: '581 CE', end: '603 CE', tracks: ['first-turkic', 'eastern-turkic', 'western-turkic'],
  descr: 'A civil war follows Taspar Qaghan’s death in 581, the year the Sui dynasty is founded. Tardu briefly reunifies the empire (599–603); after him it splits again in 603 into Eastern and Western khaganates.',
  sources: [S('wp-first-turkic', 'infobox and lead'), S('wp-eastern-turkic', 'History > East-West split and Independence')],
});
ed.event({
  uuid: 'tang-conquers-eastern-turks', title: 'Tang conquers the Eastern Turks', start: '630 CE', tracks: ['eastern-turkic', 'tang'],
  descr: 'Illig Qaghan, the last independent ruler, who had reached the gates of Chang’an in 626, is captured. Tang conquers the Western Turkic Khaganate in 657.',
  sources: [S('wp-eastern-turkic', 'infobox and Independence'), S('wp-first-turkic', 'lead')],
});

// ---------- Central Asia ----------
ed.event({
  uuid: 'kidarite-kingdom', title: 'Kidarite kingdom in Bactria', start: '360 CE', end: '370 CE', tracks: ['kidarites'],
  descr: 'A Kidarite kingdom replaces the Kushano-Sasanians in Bactria; by 365 Kidara I puts his name on the coinage as Kushanshah. Circa 390–410 the Kidarites invade north-western India.',
  sources: [S('wp-kidarites', 'lead and First appearance')],
});
ed.event({
  uuid: 'hephthalites-rise', title: 'The Hephthalites defeat the Kidarites', start: '450 CE', tracks: ['hephthalites', 'kidarites'],
  descr: 'From 450 the Hephthalites are militarily important; by 479 they have conquered Sogdia and driven the Kidarites eastwards, and by 493 they hold parts of Dzungaria and the Tarim Basin.',
  sources: [S('wp-hephthalites', 'lead')],
});
ed.event({
  uuid: 'hephthalites-destroyed', title: 'Turks and Sasanians destroy the Hephthalites', start: '557 CE', end: '560 CE', tracks: ['hephthalites', 'western-turkic', 'sasanian'],
  descr: 'In 557 Istämi allies with Khosrow I of the Sasanian Empire; their combined forces defeat the Hephthalites in 560, who then survive as principalities in Tokharistan until 710.',
  sources: [S('wp-first-turkic', 'History > Western expansion'), S('wp-hephthalites', 'infobox and lead')],
});

// ---------- the western steppe and Europe ----------
ed.event({
  uuid: 'alans-caucasus', title: 'The Alans appear in the Caucasus', start: '50 CE', end: '60 CE', tracks: ['sarmatians'],
  descr: 'Between 50 and 60 CE the Alans appear in the foothills of the Caucasus. In the 3rd century the Goths break Sarmatian dominance of the Pontic Steppe.',
  sources: [S('wp-sarmatians', 'lead and In the Pontic Steppe and Europe')],
});
ed.event({
  uuid: 'huns-arrive', title: 'The Huns reach the Volga', start: 'c. 370 CE', tracks: ['huns', 'sarmatians'],
  descr: 'By 370 the Huns have arrived on the Volga, causing the westward movement of Goths and Alans; in 376 the Goths cross the Danube. By 430 the Huns have a vast but short-lived empire on the Danubian frontier.',
  sources: [S('wp-huns', 'lead and infobox'), S('wp-attila', 'Early life and background')],
  links: [{ to: 'adrianople', kind: 'causes' }],
});
ed.event({
  uuid: 'attila', title: 'Attila rules the Huns', start: '434 CE', end: '453 CE', tracks: ['huns'],
  descr: 'He rules jointly with his brother Bleda until Bleda’s death in 445; in 441 he invades the Eastern Roman Empire. He dies in early 453.',
  sources: [S('wp-attila', 'infobox and lead'), S('wp-huns', 'infobox')],
  startDates: [C('434 CE', 'wp-attila', 'infobox and lead'), C('435 CE', 'wp-attila', 'lead (with Bleda)'), C('437 CE', 'wp-huns', 'infobox (co-rulers)')],
});
ed.event({
  uuid: 'catalaunian-plains', title: 'Battle of the Catalaunian Plains', start: '451 CE', tracks: ['huns', 'roman-empire'],
  descr: 'On 20 June 451, after Attila crosses the Rhine and invades Gaul, Aetius and Theodoric (who is killed) meet him in battle; the result is inconclusive. In 452 the Huns invade Italy.',
  sources: [S('wp-catalaunian', 'infobox, lead and Prelude'), S('wp-huns', 'lead and infobox')],
  links: [{ to: 'attila', kind: 'part-of' }],
});
ed.event({
  uuid: 'nedao', title: 'Battle of Nedao: the Hunnic empire breaks up', start: 'c. 454 CE', tracks: ['huns'],
  descr: 'After Attila’s death in 453 the Huns lose much of their empire. Attila’s son Dengizich dies in 469.',
  sources: [S('wp-huns', 'lead and infobox'), S('wp-catalaunian', 'lead')],
  links: [{ to: 'attila', kind: 'related' }],
});
ed.event({
  uuid: 'avar-khaganate', title: 'The Avar Khaganate', start: '567 CE', tracks: ['avars'],
  descr: 'The Pannonian Avars enter the historical scene in the mid-6th century; their khaganate is established in 567 and lasts until 822.',
  sources: [S('wp-avars', 'infobox and lead')],
});
ed.event({
  uuid: 'avar-byzantine-wars', title: 'Avar–Byzantine wars', start: '568 CE', end: '626 CE', tracks: ['avars', 'eastern-roman'],
  descr: 'The wars run from 568 to 626, the year the Avars are defeated by Samo.',
  sources: [S('wp-avars', 'lead and infobox')],
});

ed.save();
