// Polynesian Plain Ware lined up with the other Pacific events (2026-11-20, at the author's request). The merge
// kept Ancient's version of this event, on the Lapita row (which ends c. 500 BCE). Its text repeated two Classical
// events beside it: "The long pause in Polynesian settlement" (Fiji, Samoa and Tonga stay the furthest extent for
// some 1,500 years) and "Samoa's unrecorded centuries" (pottery-making stops suddenly in Samoa). Classical wrote
// all three in one pass, so its version is used here, word for word, on its rows (Tonga and Samoa, Fiji). Kept from
// Ancient's version: the start claim from the Tonga page's heading, and "c." on the start, as that heading gives
// the period in years before present.
// Re-runnable.
//   node scripts/ancient-classical/plain-ware.ts && npm run data -- build ancient-classical
import { C, S, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-20');
ed.event({
  uuid: 'plain-ware',
  title: 'Polynesian Plain Ware, and the end of pottery',
  start: 'c. 700 BCE',
  end: '400 CE',
  tracks: ['tonga-samoa', 'fiji'],
  descr:
    'In Tonga, settlers stop decorating their pots two hundred years after arriving and make plain ware until about 400 AD, when they stop making pottery at all; the same happens in Fiji and Samoa. A Lapita hamlet grows into a village over a kilometre long.',
  sources: [S('wp-tonga-history', 'The Lapita Period and The Polynesian Plain Ware Period'), S('wp-lapita', 'Artifact dating')],
  startDates: [C(700, 'wp-tonga-history', "heading ('2650–1550 BP (700 BC – 400 AD)')")],
  endDates: [
    C('400 CE', 'wp-tonga-history', "Plain Ware Period ('By 1550 BP (400 AD)')"),
    C('1 CE', 'wp-lapita', "Artifact dating (Tonga 'by about 2,000 years ago')", { margin: 100 }),
  ],
});
ed.save();
