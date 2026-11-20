// Khufu's reign ends under each dating system (2026-11-20, at the author's request). The event had a start claim per
// chronology (Shaw 2589, Hornung 2509, radiocarbon 2613–2577 BC, from the Great Pyramid page's table of "Khufu's
// first regnal year") but no end claims, so under Hornung its start passed its end (2566) and the bar shrank to one
// year. Wikipedia's *Khufu* (read 2026-11-20; no AI or translation notice) gives the whole reign in its infobox note
// "Proposed dates": "2589–2566 BC (23 years)" citing Shaw's Oxford History, and "2509–2483 BC (26 years)" citing
// Hornung, Krauss & Warburton. Those ends are added; the radiocarbon study gives only a start ("Khufu began his reign
// between 2629 and 2558 BC"), so there is no radiocarbon end. Also corrects where the Great Pyramid table is: under
// "Age", and it dates the first regnal year, not the reign.
// Re-runnable.
//   node scripts/ancient-classical/khufu-reign.ts && npm run data -- build ancient-classical
import { C, S, open } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-classical.json', '2026-11-20');
ed.wikipedia('wp-khufu', 'Khufu', 'Khufu');

const e = ed.data.events.find((x: { uuid: string }) => x.uuid === 'khufu');
if (!e) throw new Error('no event khufu');
const NOTE = "via Wikipedia: Khufu, infobox note 'Proposed dates'";
e.sources = [
  S('wp-old-kingdom', "Height of the Old Kingdom ('Khufu (2589–2566 BC)')"),
  S('wp-great-pyramid', "lead; Age (table 'Modern estimates of dating the Great Pyramid and Khufu's first regnal year')"),
  S('wp-khufu', "infobox, note 'Proposed dates'"),
];
e.endDates = [
  C(2566, 'shaw-2000', `${NOTE} ('2589–2566 BC (23 years)')`, { chron: 'shaw' }),
  C(2483, 'hornung-2006', `${NOTE} ('2509–2483 BC (26 years)')`, { chron: 'hornung' }),
];
ed.save();
