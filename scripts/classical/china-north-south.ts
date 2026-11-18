// The Classical World, ninth region pass (2026-11-18): China's Northern and Southern dynasties — Liu Song, Southern Qi,
// Liang and Chen in the south; Xiaowen's reforms, the Six Garrisons, Eastern and Western Wei, Northern Qi and Northern
// Zhou in the north; Yang Jian's seizure of power; and the culture of the period (Wang Xizhi, the Mogao, Yungang and
// Longmen caves, Faxian, Kumārajīva, Tao Yuanming, Zu Chongzhi, Xuanzang). The umbrella article *Northern and Southern
// dynasties* has a machine-translation notice, so each dynasty's own page is used. Every date was quoted verbatim from
// the cited Wikipedia page by a fetch agent; values seen only in a page summary are not used. No page read carried an
// AI-text or LLM-translation banner. See docs/classical-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after skeleton.ts and east-asia.ts.
//   node scripts/classical/china-north-south.ts && npm run data:classical
import { open, C, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/classical.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-liu-song', 'Liu Song dynasty', 'Liu_Song_dynasty'],
  ['wp-song-wudi', 'Emperor Wu of Song', 'Emperor_Wu_of_Liu_Song'],
  ['wp-southern-qi', 'Southern Qi', 'Southern_Qi'],
  ['wp-liang-dynasty', 'Liang dynasty', 'Liang_dynasty'],
  ['wp-liang-wudi', 'Emperor Wu of Liang', 'Emperor_Wu_of_Liang'],
  ['wp-hou-jing', 'Hou Jing', 'Hou_Jing_Disturbance'],
  ['wp-chen-dynasty', 'Chen dynasty', 'Chen_dynasty'],
  ['wp-eastern-wei', 'Eastern Wei', 'Eastern_Wei'],
  ['wp-western-wei', 'Western Wei', 'Western_Wei'],
  ['wp-northern-qi', 'Northern Qi', 'Northern_Qi'],
  ['wp-northern-zhou', 'Northern Zhou', 'Northern_Zhou'],
  ['wp-xiaowen', 'Emperor Xiaowen of Northern Wei', 'Emperor_Xiaowen_of_Northern_Wei'],
  ['wp-sui-wendi', 'Emperor Wen of Sui', 'Emperor_Wen_of_Sui'],
  ['wp-yuwen-tai', 'Yuwen Tai', 'Yuwen_Tai'],
  ['wp-yungang', 'Yungang Grottoes', 'Yungang_Grottoes'],
  ['wp-longmen', 'Longmen Grottoes', 'Longmen_Grottoes'],
  ['wp-mogao', 'Mogao Caves', 'Mogao_Caves'],
  ['wp-faxian', 'Faxian', 'Faxian'],
  ['wp-kumarajiva', 'Kumārajīva', 'Kum%C4%81raj%C4%ABva'],
  ['wp-wang-xizhi', 'Wang Xizhi', 'Wang_Xizhi'],
  ['wp-tao-yuanming', 'Tao Yuanming', 'Tao_Yuanming'],
  ['wp-zu-chongzhi', 'Zu Chongzhi', 'Zu_Chongzhi'],
  ['wp-xuanzang', 'Xuanzang', 'Xuanzang'],
] as const)
  ed.wikipedia(key, title, slug);

// ---------- rows: the south after the Jin, the north after the Northern Wei ----------
ed.tracks(
  [
    { id: 'liu-song', name: 'Liu Song (south)', color: '#7a5a8a', parent: 'china', span: { start: '420 CE', end: '479 CE' } },
    { id: 'southern-qi', name: 'Southern Qi', color: '#6a5a9a', parent: 'china', span: { start: '479 CE', end: '502 CE' } },
    { id: 'liang', name: 'Liang (south)', color: '#8a6a9a', parent: 'china', span: { start: '502 CE', end: '557 CE' } },
    { id: 'chen', name: 'Chen (south)', color: '#5a4a8a', parent: 'china', span: { start: '557 CE', end: '589 CE' } },
  ],
  { after: 'jin-china' },
);
ed.tracks(
  [
    { id: 'eastern-wei', name: 'Eastern Wei', color: '#4a6a7a', parent: 'china', span: { start: '534 CE', end: '550 CE' } },
    {
      id: 'western-wei', name: 'Western Wei', color: '#3a5a6a', parent: 'china',
      span: { start: '535 CE', end: '557 CE', startDates: [C('535 CE', 'wp-western-wei', 'infobox (18 February 535)'), C('534 CE', 'wp-western-wei', 'infobox (8 November 534, start of the division)')] },
    },
    { id: 'northern-qi', name: 'Northern Qi', color: '#5a7a8a', parent: 'china', span: { start: '550 CE', end: '577 CE' } },
    { id: 'northern-zhou', name: 'Northern Zhou', color: '#2a4a5a', parent: 'china', span: { start: '557 CE', end: '581 CE' } },
  ],
  { after: 'northern-wei' },
);

// ---------- Eastern Jin and the Sixteen Kingdoms: culture ----------
ed.event({
  uuid: 'lantingji', title: 'Wang Xizhi’s Orchid Pavilion gathering', start: '353 CE', tracks: ['jin-china'],
  descr: 'On 22 April 353 Wang Xizhi hosts 41 friends, relatives and pupils at the Orchid Pavilion on Mount Kuaiji; they compose 41 poems, and his preface, the Lantingji xu, becomes the most famous calligraphic work attributed to him.',
  sources: [S('wp-wang-xizhi', 'lead and Orchid Pavilion')],
});
ed.event({
  uuid: 'mogao', title: 'The first Mogao caves at Dunhuang', start: '366 CE', tracks: ['sixteen-kingdoms'],
  descr: 'The monk Le Zun has a vision of a thousand Buddhas at the site; the first caves are dug as places of meditation and worship. The earliest surviving decorated caves are built in the Northern Liang period (419–439), and caves continue to be built until the 14th century.',
  sources: [S('wp-mogao', 'lead and History')],
  startDates: [C('366 CE', 'wp-mogao', 'lead and History (Fokan Ji)'), C('353 CE', 'wp-mogao', 'History (Shazhou Tujing)')],
});
ed.event({
  uuid: 'faxian', title: 'Faxian’s pilgrimage to India', start: '399 CE', end: '412 CE', tracks: ['sixteen-kingdoms', 'jin-china', 'gupta'],
  descr: 'At about 60 he sets out from Chang’an, capital of the Later Qin; he spends ten years in India in the reign of Chandragupta II, leaves from Tamralipti about 409, stays two years in Sri Lanka, and returns in 412 to what is now Nanjing. He writes his travels around 414.',
  sources: [S('wp-faxian', 'lead, Biography and Works')],
});
ed.event({
  uuid: 'kumarajiva', title: 'Kumārajīva translates in Chang’an', start: '401 CE', end: '413 CE', tracks: ['sixteen-kingdoms'],
  descr: 'Born in Kucha in 344 and captured by a warlord in 386, he is brought to Chang’an in 401 under the Later Qin; within a dozen years his translation bureau renders about thirty-five sutras in 294 scrolls. He dies in 413.',
  sources: [S('wp-kumarajiva', 'infobox, lead, Early life, Capture and Arrival')],
});
ed.event({
  uuid: 'tao-yuanming', title: 'Tao Yuanming retires to his farm', start: '405 CE', tracks: ['jin-china'],
  descr: 'The poet (365–427; born 352 by one argument) resigns after some eighty days as magistrate of Pengze and spends the last 22 years of his life on his farmstead.',
  sources: [S('wp-tao-yuanming', 'infobox, Year of birth, Government stints and Return to the fields')],
});

// ---------- the south ----------
ed.event({
  uuid: 'liu-song-founded', title: 'Liu Yu ends the Eastern Jin: the Liu Song', start: '420 CE', tracks: ['liu-song', 'jin-china'],
  descr: 'Having led the rising against the usurper Huan Xuan in 404, Liu Yu ends Southern Yan (410) and takes Luoyang (416). On 10 July 420 Emperor Gong of Jin yields the throne to him; he dies on 26 June 422.',
  sources: [S('wp-liu-song', 'infobox and History'), S('wp-song-wudi', 'infobox, lead and As regent')],
});
ed.event({
  uuid: 'yuanjia', title: 'The Reign of Yuanjia', start: '425 CE', end: '453 CE', tracks: ['liu-song', 'northern-wei'],
  descr: 'Emperor Wen’s reign is known for political stability and capable administration; but he loses three commanderies to the Northern Wei in his first year, his campaigns against Wei fail in 450 and 452, and in 453 his son Liu Shao assassinates him.',
  sources: [S('wp-liu-song', 'lead and Reign of Emperor Wen')],
});
ed.event({
  uuid: 'zu-chongzhi', title: 'Zu Chongzhi’s Daming calendar and π', start: '464 CE', end: '465 CE', tracks: ['liu-song'],
  descr: 'At Louxian he compiles the Daming calendar (introduced in 465, with a year of 365.24281481 days) and calculates π as between 3.1415926 and 3.1415927, a precision not surpassed for nearly 900 years.',
  sources: [S('wp-zu-chongzhi', 'lead, Life and works and Mathematics')],
});
ed.event({
  uuid: 'southern-qi-founded', title: 'Xiao Daocheng founds the Southern Qi', start: '479 CE', tracks: ['southern-qi', 'liu-song'],
  descr: 'On 3 June 479 he forces Emperor Shun of Liu Song to yield the throne. Sieges and skirmishes with the Northern Wei follow until 481, and peace is signed in 490.',
  sources: [S('wp-southern-qi', 'infobox, History and War with Northern Wei'), S('wp-liu-song', 'infobox')],
});
ed.event({
  uuid: 'liang-wudi', title: 'Emperor Wu of Liang', start: '502 CE', end: '549 CE', tracks: ['liang', 'southern-qi'],
  descr: 'Xiao Yan, a Southern Qi royal and general, takes the throne on 30 April 502. By 517 Buddhist influence is plain in his policies; a Persian embassy brings tribute in 547. He dies on 12 June 549, during Hou Jing’s rebellion.',
  sources: [S('wp-liang-wudi', 'infobox, lead and Early reign'), S('wp-liang-dynasty', 'infobox and Rule')],
});
ed.event({
  uuid: 'hou-jing', title: 'The Hou Jing Disturbance', start: '548 CE', end: '552 CE', tracks: ['liang'],
  descr: 'The former Eastern Wei general rebels in the summer of 548 and besieges Jiankang that winter; the city falls in 549 (24 April in the Liang infobox). He makes and unmakes emperors, declares himself Emperor of Han on 1 January 552, and, defeated by Xiao Yi’s forces and Chen Baxian, is killed by his own men while fleeing, around 26 May 552.',
  sources: [S('wp-hou-jing', 'lead, infobox and Rebellion against Liang'), S('wp-liang-dynasty', 'infobox and Rule'), S('wp-chen-dynasty', 'Hou Jing')],
  links: [{ to: 'liang-wudi', kind: 'related' }],
});
ed.event({
  uuid: 'jiangling-sacked', title: 'Western Wei sacks Jiangling', start: '555 CE', tracks: ['liang', 'western-wei'],
  descr: 'The Liang capital falls; Western Wei installs Xiao Cha as emperor of a rump Western Liang at Jiangling, which lasts until the Sui conquer it in 587.',
  sources: [S('wp-liang-dynasty', 'infobox, lead and Rule'), S('wp-chen-dynasty', 'Rise')],
  startDates: [C('555 CE', 'wp-liang-dynasty', 'infobox (7 January 555)'), C('554 CE', 'wp-chen-dynasty', 'Rise')],
});
ed.event({
  uuid: 'chen-founded', title: 'Chen Baxian founds the Chen', start: '557 CE', tracks: ['chen', 'liang'],
  descr: 'On 16 November 557 the former Liang general has Emperor Jing yield the throne to him; he dies in 559.',
  sources: [S('wp-chen-dynasty', 'infobox, History and Emperor Wen'), S('wp-liang-dynasty', 'infobox')],
});
ed.addRow('sui-reunifies', 'chen');

// ---------- the north ----------
ed.event({
  uuid: 'xiaowen-reforms', title: 'Emperor Xiaowen’s reforms', start: '485 CE', end: '496 CE', tracks: ['northern-wei'],
  descr: 'The equal-field land system is enacted in 485; in 493–494 the capital moves from Pingcheng to Luoyang; edicts of 495 ban Xianbei clothing and language, and in 496 Xianbei family names are changed to Han ones.',
  sources: [S('wp-xiaowen', 'lead, Early personal reign and Late reign')],
});
ed.event({
  uuid: 'yungang', title: 'The imperial caves at Yungang', start: '471 CE', end: '494 CE', tracks: ['northern-wei'],
  descr: 'Near Pingcheng (Datong) the first period of carving ends in 465; a second phase under imperial supervision runs from around 471 to 494, when the court moves to Luoyang. Private patronage continues until 525.',
  sources: [S('wp-yungang', 'lead and History')],
});
ed.event({
  uuid: 'longmen', title: 'The Longmen Grottoes begun', start: '493 CE', tracks: ['northern-wei'],
  descr: 'Carving at Luoyang starts with the Northern Wei; the middle Binyang cave is said to have been made between 500 and 523. About 30% of the carvings date from the Northern Wei and 60% from the Tang.',
  sources: [S('wp-longmen', 'lead, History and Binyang')],
  startDates: [C('493 CE', 'wp-longmen', 'lead and History'), C('478 CE', 'wp-longmen', 'Guyangdong (earliest carving)')],
  links: [{ to: 'xiaowen-reforms', kind: 'related' }],
});
ed.event({
  uuid: 'six-garrisons', title: 'The Six Garrisons revolt', start: '524 CE', tracks: ['northern-wei'],
  descr: 'Agrarian rebels overrun the Northern Wei’s northern provinces.',
  sources: [S('wp-yuwen-tai', 'Early career')],
});
ed.event({
  uuid: 'wei-splits', title: 'The Northern Wei splits in two', start: '534 CE', end: '535 CE', tracks: ['northern-wei', 'eastern-wei', 'western-wei'],
  descr: 'In the fall of 534 Emperor Xiaowu flees west to Yuwen Tai; Gao Huan installs Yuan Shanjian as Eastern Wei emperor (8 November 534), and around the new year 535 Yuwen Tai poisons Xiaowu and enthrones Emperor Wen of Western Wei (18 February 535).',
  sources: [S('wp-yuwen-tai', 'lead and Alliance with Xiaowu'), S('wp-eastern-wei', 'infobox and History'), S('wp-western-wei', 'infobox')],
});
ed.event({
  uuid: 'shayuan', title: 'Battle of Shayuan', start: '537 CE', tracks: ['eastern-wei', 'western-wei'],
  descr: 'After the volcanic winter of 536 brings famine to the Guanzhong, Gao Huan launches a major attack on Western Wei in the spring of 537, met at Shayuan; that winter Dugu Xin captures Luoyang.',
  sources: [S('wp-yuwen-tai', 'Wen’s reign'), S('wp-western-wei', 'History')],
});
ed.event({
  uuid: 'northern-qi-founded', title: 'Gao Yang founds the Northern Qi', start: '550 CE', tracks: ['northern-qi', 'eastern-wei'],
  descr: 'Gao Huan’s son deposes Emperor Xiaojing of Eastern Wei; the Northern Qi is established on 9 June 550, with its capital at Yecheng.',
  sources: [S('wp-northern-qi', 'infobox and History'), S('wp-eastern-wei', 'infobox and History')],
});
ed.event({
  uuid: 'northern-zhou-founded', title: 'Yuwen Hu founds the Northern Zhou', start: '557 CE', tracks: ['northern-zhou', 'western-wei'],
  descr: 'After Yuwen Tai’s death in 556, his nephew Yuwen Hu forces Emperor Gong of Western Wei to yield the throne; the Northern Zhou is established at Chang’an on 15 February 557.',
  sources: [S('wp-northern-zhou', 'infobox and Establishment'), S('wp-western-wei', 'History')],
});
ed.event({
  uuid: 'zhou-conquers-qi', title: 'Northern Zhou conquers the Northern Qi', start: '577 CE', tracks: ['northern-zhou', 'northern-qi'],
  descr: 'Emperor Wu’s campaign of 576–577 destroys the Northern Qi; its last emperors are captured (28 February 577) and die in late 577.',
  sources: [S('wp-northern-zhou', 'Unified north China'), S('wp-northern-qi', 'infobox and History'), S('wp-sui-wendi', 'Early life')],
});
ed.event({
  uuid: 'yang-jian', title: 'Yang Jian takes power: the Sui', start: '580 CE', end: '581 CE', tracks: ['northern-zhou', 'sui'],
  descr: 'When Emperor Xuan dies in 580, his father-in-law Yang Jian seizes power as regent; his general Wei Xiaokuan defeats Yuchi Jiong within 68 days. On 4 March 581 Emperor Jing abdicates in his favour.',
  sources: [S('wp-sui-wendi', 'infobox, lead and Regency'), S('wp-northern-zhou', 'Transit to Sui')],
  links: [{ to: 'sui-reunifies', kind: 'related' }],
});

// ---------- Tang ----------
ed.event({
  uuid: 'xuanzang', title: 'Xuanzang’s journey to India', start: '629 CE', end: '645 CE', tracks: ['tang', 'harsha-kannauj'],
  descr: 'He sets out in 629 (627 in another version) and returns to Chang’an in the first month of 645, bringing some 657 Sanskrit texts; his Records of the Western Regions is completed in 646.',
  sources: [S('wp-xuanzang', 'lead, Dates, Return to China and Original works')],
  startDates: [C('629 CE', 'wp-xuanzang', "Dates ('Most sources … 629 CE')"), C('627 CE', 'wp-xuanzang', "Dates ('either 627 or 629')")],
});

ed.save();
