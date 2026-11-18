// The Classical World, eighth region pass (2026-11-18): Southeast Asia and Tibet — Đông Sơn, Âu Lạc, Nanyue and the
// Han conquest, the Trưng sisters and Lady Triệu, the Early Lý, Champa, Funan and Óc Eo, Chenla, the Pyu; the Yarlung
// kings, Zhangzhung, the Tuyuhun, Songtsen Gampo and Princess Wencheng. Every date was quoted verbatim from the cited
// Wikipedia page by a fetch agent; values seen only in a page summary are not used. No page carried an AI-text or
// LLM-translation banner. See docs/classical-sources.md, eighth pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts and east-asia.ts.
//   node scripts/classical/se-asia-tibet.ts && npm run data:classical
import { open, C, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-au-lac', 'Âu Lạc', '%C3%82u_L%E1%BA%A1c'],
  ['wp-nanyue', 'Nanyue', 'Nanyue'],
  ['wp-first-domination', 'First Era of Northern Domination', 'First_Chinese_domination_of_Vietnam'],
  ['wp-trung-sisters', 'Trưng sisters', 'Tr%C6%B0ng_sisters'],
  ['wp-lady-trieu', 'Lady Triệu', 'Lady_Tri%E1%BB%87u'],
  ['wp-early-ly', 'Early Lý dynasty', 'Early_L%C3%BD_dynasty'],
  ['wp-dong-son', 'Đông Sơn culture', 'Dong_Son_culture'],
  ['wp-sa-huynh', 'Sa Huỳnh culture', 'Sa_Hu%E1%BB%B3nh_culture'],
  ['wp-champa', 'Champa', 'Champa'],
  ['wp-funan', 'Funan', 'Funan'],
  ['wp-oc-eo', 'Óc Eo', '%C3%93c_Eo'],
  ['wp-chenla', 'Chenla', 'Chenla'],
  ['wp-isanapura', 'Isanapura', 'Isanapura'],
  ['wp-pyu', 'Pyu city-states', 'Pyu_city-states'],
  ['wp-sri-ksetra', 'Sri Ksetra kingdom', 'Sri_Ksetra_kingdom'],
  ['wp-tibetan-empire', 'Tibetan Empire', 'Tibetan_Empire'],
  ['wp-songtsen-gampo', 'Songtsen Gampo', 'Songtsen_Gampo'],
  ['wp-yarlung', 'Yarlung dynasty', 'Yarlung_dynasty'],
  ['wp-zhangzhung', 'Zhangzhung', 'Zhangzhung'],
  ['wp-namri-songtsen', 'Namri Songtsen', 'Namri_Songtsen'],
  ['wp-wencheng', 'Princess Wencheng', 'Princess_Wencheng'],
  ['wp-tibetan-script', 'Tibetan script', 'Tibetan_script'],
  ['wp-jokhang', 'Jokhang', 'Jokhang'],
  ['wp-tuyuhun', 'Tuyuhun', 'Tuyuhun'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows (west to east) ----------
ed.tracks(
  [
    { id: 'pyu', name: 'Pyu city-states', color: '#8a6a3a', parent: 'se-asia', span: { start: 'c. 200 BCE', end: 'c. 1050 CE' } },
    {
      id: 'funan', name: 'Funan', color: '#4a7a6a', parent: 'se-asia',
      span: { start: '50 CE', end: '627 CE', startDates: [C('50 CE', 'wp-funan', 'infobox (establishment)'), C('68 CE', 'wp-funan', 'History of Vietnam navbox (Funan 68–627)')] },
    },
    { id: 'chenla', name: 'Chenla', color: '#3a6a5a', parent: 'se-asia', span: { start: '550 CE', end: '802 CE' } },
    { id: 'champa', name: 'Champa (Lâm Ấp)', color: '#9a5a4a', parent: 'se-asia', span: { start: '192 CE', end: '1832 CE' } },
    {
      id: 'dong-son', name: 'Đông Sơn culture', color: '#6a6a3a', parent: 'se-asia',
      span: { start: 'c. 1000 BCE', end: 'c. 50 CE', endDates: [C('50 CE', 'wp-dong-son', "lead ('until the first century AD')", { margin: 50 }), C(1, 'wp-dong-son', "lead ('from about 1000 BC to 1 BC')")] },
    },
    {
      id: 'au-lac', name: 'Âu Lạc', color: '#7a5a3a', parent: 'se-asia',
      span: {
        start: 'c. 257 BCE', end: '179 BCE',
        startDates: [C(257, 'wp-au-lac', 'lead and infobox'), C(208, 'wp-au-lac', "infobox ('257/208 BCE')")],
        endDates: [C(179, 'wp-au-lac', 'lead and infobox'), C(208, 'wp-au-lac', "infobox ('208/179 BCE')")],
      },
    },
    { id: 'nanyue', name: 'Nanyue', color: '#8a4a3a', parent: 'se-asia', span: { start: '204 BCE', end: '111 BCE' } },
    { id: 'jiaozhi', name: 'Northern Vietnam under Chinese rule', color: '#6a4a4a', parent: 'se-asia' },
    { id: 'early-ly', name: 'Early Lý (Vạn Xuân)', color: '#9a6a3a', parent: 'se-asia', span: { start: '544 CE', end: '602 CE' } },
  ],
  { after: 'se-asia' },
);
ed.tracks(
  [
    {
      id: 'zhangzhung', name: 'Zhangzhung', color: '#6a5a7a', parent: 'tibet',
      span: {
        start: 'c. 500 BCE', end: '645 CE',
        endDates: [C('645 CE', 'wp-tibetan-empire', 'History > Songtsen Gampo'), C('625 CE', 'wp-zhangzhung', 'infobox and lead')],
      },
    },
    {
      id: 'yarlung', name: 'Yarlung kings and the Tibetan Empire', color: '#8a3a4a', parent: 'tibet',
      span: {
        start: 'c. 127 BCE', end: '842 CE',
        startDates: [C(127, 'wp-yarlung', "lead ('127 BCE … according to traditional Tibetan historiography')"), C(127, 'wp-tibetan-empire', 'lead'), C(414, 'wp-tibet-history', 'Nyatri Tsenpo')],
        endDates: [C('842 CE', 'wp-yarlung', 'lead'), C('848 CE', 'wp-tibetan-empire', 'infobox (842/848)')],
      },
    },
    {
      id: 'tuyuhun', name: 'Tuyuhun (Qinghai)', color: '#5a6a5a', parent: 'tibet',
      span: { start: '284 CE', end: '670 CE', endDates: [C('670 CE', 'wp-tuyuhun', 'infobox'), C('663 CE', 'wp-tibetan-empire', 'History > Mangsong Mangtsen')] },
    },
  ],
  { after: 'tibet' },
);
ed.data.events.find((e: { uuid: string }) => e.uuid === 'nyatri-tsenpo').tracks = ['yarlung'];

// ---------- Vietnam ----------
ed.event({
  uuid: 'au-lac-founded', title: 'Thục Phán founds Âu Lạc', start: 'c. 257 BCE', tracks: ['au-lac', 'dong-son'],
  descr: 'King An Dương annexes Văn Lang; the middle phase of building at his citadel of Cổ Loa falls between 300 and 100 BCE. The infobox also allows a span of 208–179 BCE.',
  sources: [S('wp-au-lac', 'infobox, lead, Foundation and Cổ Loa')],
});
ed.event({
  uuid: 'nanyue-founded', title: 'Zhao Tuo founds Nanyue', start: '204 BCE', tracks: ['nanyue'],
  descr: 'The Chinese general Zhao Tuo establishes the kingdom at Panyu (now Guangzhou). He sends tribute to the Han in 196 BC, proclaims himself emperor in 183 BC, and rules until 137 BC.',
  sources: [S('wp-nanyue', 'short description, infobox and lead'), S('wp-first-domination', 'Han conquest'), S('wp-au-lac', 'Collapse')],
});
ed.event({
  uuid: 'nanyue-takes-au-lac', title: 'Nanyue conquers Âu Lạc', start: '179 BCE', tracks: ['nanyue', 'au-lac'],
  descr: 'Zhao Tuo annexes the kingdom of King An Dương.',
  sources: [S('wp-nanyue', 'infobox'), S('wp-first-domination', 'Formation of Nanyue'), S('wp-trung-sisters', 'Background')],
  startDates: [C(179, 'wp-nanyue', 'infobox'), C(179, 'wp-first-domination', 'Formation of Nanyue'), C(180, 'wp-trung-sisters', 'Background')],
  links: [{ to: 'nanyue-founded', kind: 'related' }],
});
ed.event({
  uuid: 'han-conquers-nanyue', title: 'Han conquers Nanyue', start: '112 BCE', end: '111 BCE', tracks: ['nanyue', 'han', 'jiaozhi'],
  descr: 'In 113 BC the Nanyue court proposes joining the Han; in 112 BC the opposition kills the Queen Dowager, and Emperor Wu sends 100,000 troops. In 111 BC the Han generals advance on Panyu, and Jiaozhi province is established, beginning the first era of Chinese rule.',
  sources: [S('wp-nanyue', 'infobox and lead'), S('wp-first-domination', 'infobox, lead and Han conquest')],
  links: [{ to: 'emperor-wu-han', kind: 'part-of' }],
});
ed.event({
  uuid: 'trung-sisters', title: 'The Trưng sisters’ rebellion', start: '40 CE', end: '43 CE', tracks: ['jiaozhi', 'han'],
  descr: 'In March 40 AD Trưng Trắc and Trưng Nhị lead the Lạc Việt in rebellion and rule for three years. In 42 AD Emperor Guangwu sends Ma Yuan with 20,000 troops; in the summer of 43 he devastates Jiaozhi and the sisters are defeated.',
  sources: [S('wp-trung-sisters', 'infobox, lead, Biography and Book of the Later Han'), S('wp-first-domination', 'lead and Trưng section')],
});
ed.event({
  uuid: 'lady-trieu', title: 'Lady Triệu’s revolt', start: '248 CE', tracks: ['jiaozhi', 'three-kingdoms-china'],
  descr: 'The people of Jiaozhi and Jiuzhen rebel against Eastern Wu; after several months of fighting the Wu general Lu Yin puts Lady Triệu to death.',
  sources: [S('wp-lady-trieu', 'infobox, lead, Biography and Modern account')],
});
ed.event({
  uuid: 'van-xuan', title: 'Lý Bí founds Vạn Xuân', start: '544 CE', tracks: ['early-ly', 'jiaozhi'],
  descr: 'Having revolted against the Liang dynasty with his brother in 543 (541 in the infobox), Lý Bí defeats the Liang, proclaims himself emperor and names the country Vạn Xuân. Liang troops return in 545, and he is assassinated in 547.',
  sources: [S('wp-early-ly', 'infobox, lead, Lý Bí and Resistance against the Liang')],
});
ed.event({
  uuid: 'sui-ends-early-ly', title: 'The Sui end the Early Lý', start: '602 CE', tracks: ['early-ly', 'sui'],
  descr: 'Having defeated the Chen in 589, the Sui receive the surrender of Lý Phật Tử (r. 571–602).',
  sources: [S('wp-early-ly', 'infobox and Sui invasion')],
  links: [{ to: 'sui-reunifies', kind: 'related' }],
});

// ---------- Champa, Funan, Chenla and the Pyu ----------
ed.event({
  uuid: 'champa-founded', title: 'Lâm Ấp: the first Cham polity', start: '192 CE', tracks: ['champa', 'jiaozhi'],
  descr: 'The first Cham polities are established around the 2nd to 3rd centuries AD, in the wake of Khu Liên’s rebellion. The Old Cham Đông Yên Châu inscription dates to around c. 350 AD.',
  sources: [S('wp-champa', 'short description, infobox and lead')],
});
ed.event({
  uuid: 'oc-eo-rome', title: 'Roman goods at Óc Eo', start: '166 CE', tracks: ['funan', 'roman-empire'],
  descr: 'Funan’s port yields Roman gold medallions from the reign of Antoninus Pius and possibly Marcus Aurelius; Chinese texts tell of Romans arriving to conduct diplomacy in 166.',
  sources: [S('wp-oc-eo', 'lead and Remains')],
});
ed.event({
  uuid: 'chenla-conquers-funan', title: 'Chenla takes Funan', start: '550 CE', end: '627 CE', tracks: ['chenla', 'funan'],
  descr: 'The Funan infobox gives a Chenla secession in 550 and a Chenla conquest in 627; the Chenla infobox calls 550 vassalage to Funan and 627 independence. Chenla sends an embassy to China in 616/617.',
  sources: [S('wp-funan', 'infobox'), S('wp-chenla', 'infobox')],
});
ed.event({
  uuid: 'isanapura', title: 'Isanavarman I founds Isanapura', start: 'c. 618 CE', tracks: ['chenla'],
  descr: 'The Chenla capital at Sambor Prei Kuk; a linga inscription there is dated 627 AD.',
  sources: [S('wp-isanapura', 'infobox, lead and Archaeology')],
});
ed.event({
  uuid: 'beikthano', title: 'Beikthano founded', start: 'c. 180 BCE', tracks: ['pyu'],
  descr: 'The Pyu begin to enter the Irrawaddy valley in about the 2nd century BCE; Beikthano’s remains date from 200 BCE to 100 CE, and its walls are radiocarbon dated between 180 BCE and 610 CE. Halin is founded in the 1st century AD.',
  sources: [S('wp-pyu', 'infobox, lead, Background and Beikthano')],
});
ed.event({
  uuid: 'pyu-calendar', title: 'The Burmese calendar begins', start: '638 CE', tracks: ['pyu'],
  descr: 'The Pyu calendar is launched with an epoch of 22 March 638. Xuanzang (648) and Yijing (675) mention Sri Ksetra.',
  sources: [S('wp-pyu', 'infobox'), S('wp-sri-ksetra', 'infobox, lead and royal names table')],
  startDates: [C('638 CE', 'wp-pyu', 'infobox (22 March 638)'), C('640 CE', 'wp-sri-ksetra', 'infobox (21 March 640)')],
});

// ---------- Tibet ----------
ed.event({
  uuid: 'tuyuhun-founded', title: 'The Tuyuhun kingdom', start: '284 CE', tracks: ['tuyuhun'],
  descr: 'Established by Murong Tuyuhun, who crosses the Yellow River between 307 and 313 and dies in 317.',
  sources: [S('wp-tuyuhun', 'infobox and History')],
});
ed.event({
  uuid: 'namri-songtsen', title: 'Namri Songtsen unites the Yarlung clans', start: 'c. 600 CE', end: '618 CE', tracks: ['yarlung', 'sui'],
  descr: 'Around 600 CE he becomes the uncontested leader of the Yarlung clans; he conquers the Kingdom of Sumpa in the early 7th century and sends the first missions to China in 608 and 609. He is poisoned in 618 (or 629/630).',
  sources: [S('wp-namri-songtsen', 'infobox and lead'), S('wp-tibetan-empire', 'History > Namri Songtsen')],
  endDates: [C('618 CE', 'wp-namri-songtsen', 'infobox and lead'), C('629 CE', 'wp-namri-songtsen', "lead ('618 or 629/630')", { margin: 1 })],
});
ed.event({
  uuid: 'songtsen-gampo', title: 'Songtsen Gampo founds the Tibetan Empire', start: '618 CE', end: '650 CE', tracks: ['yarlung'],
  descr: 'The 33rd king moves the capital from the Yungbulakang Palace to Lhasa and defeats the Sumpa (c. 627); the Tibetan script is created during his reign. He dies in 650.',
  sources: [S('wp-songtsen-gampo', 'infobox and lead'), S('wp-tibetan-empire', 'infobox, lead and History > Songtsen Gampo'), S('wp-tibetan-script', 'infobox')],
  startDates: [C('618 CE', 'wp-songtsen-gampo', "infobox and lead ('618 or 629')"), C('629 CE', 'wp-songtsen-gampo', "infobox and lead ('618 or 629')"), C('614 CE', 'wp-yarlung', 'lead (empire from 614)')],
  links: [{ to: 'namri-songtsen', kind: 'related' }],
});
ed.event({
  uuid: 'tang-tuyuhun', title: 'Tang campaigns against the Tuyuhun', start: '634 CE', end: '636 CE', tracks: ['tuyuhun', 'tang'],
  descr: 'The Tuyuhun become a vassal of the Tang in 634; in 635–636 Emperor Taizong attacks and defeats them.',
  sources: [S('wp-tuyuhun', 'infobox and captions'), S('wp-tibetan-empire', 'History > Songtsen Gampo')],
});
ed.event({
  uuid: 'wencheng', title: 'Princess Wencheng marries Songtsen Gampo', start: '641 CE', tracks: ['yarlung', 'tang'],
  descr: 'In 634 Songtsen Gampo sends an envoy to the Tang; in 638 the Tibetans attack Songzhou but withdraw after Tang counterattacks. In 640 the Tang accept his marriage proposal, and the princess leaves for Tibet with Gar Tongtsen.',
  sources: [S('wp-wencheng', 'infobox and lead'), S('wp-tibetan-empire', 'History > Songtsen Gampo'), S('wp-jokhang', 'History')],
  startDates: [C('641 CE', 'wp-wencheng', 'lead'), C('641 CE', 'wp-tibetan-empire', "History ('She arrived a year later')")],
  links: [{ to: 'songtsen-gampo', kind: 'part-of' }],
});
ed.event({
  uuid: 'jokhang', title: 'The Jokhang', start: 'c. 640 CE', tracks: ['yarlung'],
  descr: 'Songtsen Gampo builds the temple in Lhasa to house the Jowo Mikyo Dorje.',
  sources: [S('wp-jokhang', 'infobox, lead and History'), S('wp-songtsen-gampo', 'lead')],
  startDates: [C('640 CE', 'wp-jokhang', "lead ('built in c.640')"), C('652 CE', 'wp-jokhang', 'infobox and History (oldest part built in 652)')],
});
ed.event({
  uuid: 'zhangzhung-conquered', title: 'Tibet overruns Zhangzhung', start: '645 CE', tracks: ['zhangzhung', 'yarlung'],
  descr: 'Per the Tang Annals, Zhangzhung and various Qiang tribes “altogether submitted” to Songtsen Gampo in 634; R. A. Stein places the conquest in 645. The Zhangzhung infobox gives 625.',
  sources: [S('wp-tibetan-empire', 'History > Songtsen Gampo'), S('wp-zhangzhung', 'infobox, lead and Conquest')],
  startDates: [C('645 CE', 'wp-zhangzhung', 'Conquest (Stein)'), C('645 CE', 'wp-tibetan-empire', 'History > Songtsen Gampo'), C('625 CE', 'wp-zhangzhung', 'infobox'), C('634 CE', 'wp-zhangzhung', 'Conquest (Tang Annals)')],
  links: [{ to: 'songtsen-gampo', kind: 'part-of' }],
});

ed.save();
