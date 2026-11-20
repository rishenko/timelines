// Central and Eastern Europe, c. 3850–330 BCE: the most important events only (first pass, 2026-11-18).
// New rows in the Europe region: Funnelbeaker, Globular Amphora, Cucuteni–Trypillia, Usatove, Biskupin and
// the Getae. Every date was quoted verbatim from the cited Wikipedia page by a fetch agent. Not used:
// *Lusatian culture*, which carries an AI-generated-text warning (Biskupin's own page is used instead).
// See docs/ancient-sources.md, ninth pass.
// Re-runnable: it replaces what it added before. Run after arabia.ts and before groups.ts.
//   node scripts/additions/eastern-europe.ts && node scripts/additions/groups.ts && npm run importance:ancient
import { open, C, R, S } from '../lib/dataset-edit.ts';

const ed = open('data-src/ancient-near-east.json', '2026-11-18');

for (const [key, title, slug] of [
  ['wp-trypillia', 'Cucuteni–Trypillia culture', 'Cucuteni%E2%80%93Trypillia_culture'],
  ['wp-talianki', 'Talianki (archaeological site)', 'Talianki_(archaeological_site)'],
  ['wp-maidanetske', 'Maidanetske', 'Maidanetske'],
  ['wp-usatove', 'Usatove culture', 'Usatove_culture'],
  ['wp-funnelbeaker', 'Funnelbeaker culture', 'Funnelbeaker_culture'],
  ['wp-globular-amphora', 'Globular Amphora culture', 'Globular_Amphora_culture'],
  ['wp-biskupin', 'Biskupin', 'Biskupin'],
  ['wp-dacians', 'Dacians', 'Dacians'],
] as const)
  ed.wikipedia(key, title, slug);

ed.tracks(
  [
    { id: 'funnelbeaker', name: 'Funnelbeaker culture (north-central Europe)', color: '#5a7aa0', parent: 'europe', span: { start: 'c. 4100 BCE', end: 'c. 2800 BCE', startDates: [C(4100, 'wp-funnelbeaker', 'lead and infobox'), C(4300, 'wp-funnelbeaker', 'short description')] } },
    { id: 'globular-amphora', name: 'Globular Amphora culture', color: '#4a6a9a', parent: 'europe', span: { start: 'c. 3400 BCE', end: 'c. 2800 BCE' } },
    {
      id: 'trypillia', name: 'Cucuteni–Trypillia culture', color: '#8a6a4a', parent: 'europe',
      span: { start: 'c. 4800 BCE', end: 'c. 3000 BCE', startDates: [C(4800, 'wp-trypillia', 'infobox'), C(5050, 'wp-trypillia', 'lead')], endDates: [C(3000, 'wp-trypillia', 'infobox'), C(2950, 'wp-trypillia', 'lead')] },
    },
    {
      id: 'usatove', name: 'Usatove culture (northwest Pontic)', color: '#7a5a4a', parent: 'europe',
      span: {
        start: 'c. 3650 BCE', end: 'c. 2740 BCE',
        startDates: [C(3650, 'wp-usatove', 'infobox and lead'), R(3400, 2900, 'wp-usatove', 'Chronology (radiocarbon dates on pottery)'), R(4000, 3500, 'wp-usatove', 'Chronology (human remains)')],
      },
    },
  ],
  { before: 'corded-ware' },
);
ed.track({ id: 'biskupin', name: 'Biskupin (Lusatian culture, Poland)', color: '#6a7a8a', parent: 'europe' }, { after: 'urnfield' });
ed.track({ id: 'getae', name: 'Getae and Dacians (lower Danube)', color: '#8a7a5a', parent: 'europe' }, { after: 'odrysian' });

ed.event({
  uuid: 'trypillia-megasites', title: 'Trypillian mega-sites: Talianki and Maidanetske', start: 'c. 3850 BCE', end: 'c. 3600 BCE', tracks: ['trypillia'],
  descr: 'Talianki (around 3850–3700 BC) is the largest known settlement in Neolithic Europe, with 15,600 to 21,000 people; at Maidanetske up to 2,968 houses stood at once around 3700 BC. The culture is known for elaborately designed pottery fired in advanced kilns.',
  sources: [S('wp-talianki', 'lead'), S('wp-maidanetske', 'Archaeological remains'), S('wp-trypillia', 'lead')],
  endDates: [R(3700, 3600, 'wp-maidanetske', "Archaeological remains ('inhabited around 3700–3600 BC')")],
});
ed.event({
  uuid: 'usatove', title: 'Usatove culture: Trypillian farmers and steppe traditions', start: 'c. 3650 BCE', tracks: ['usatove', 'trypillia'],
  descr: 'Kurgan burials and shell-tempered coarse wares shared with steppe cultures; arsenical bronze and silver suggest contacts with the North Caucasus and Anatolia. Within the Kurgan hypothesis it represents the domination of Cucuteni–Trypillia farmers by Indo-European peoples from the steppe.',
  sources: [S('wp-usatove', 'lead and Chronology')],
  startDates: [C(3650, 'wp-usatove', 'lead'), R(3400, 2900, 'wp-usatove', 'Chronology (pottery)'), R(4000, 3500, 'wp-usatove', 'Chronology')],
});
ed.event({
  uuid: 'flintbek', title: 'Earliest wheeled vehicles: Flintbek and Bronocice', start: 'c. 3400 BCE', tracks: ['funnelbeaker'],
  descr: 'Cart tracks of about 3400 BCE under a long barrow at Flintbek are the earliest known direct evidence for wheeled vehicles in the world; the Bronocice pot (3636–3373 BCE) is the oldest evidence for covered carriages in Central Europe.',
  sources: [S('wp-funnelbeaker', 'Technology')],
});
ed.event({
  uuid: 'globular-amphora-east', title: 'Globular Amphora culture expands from Volhynia and Podolia', start: 'c. 2950 BCE', end: 'c. 2350 BCE', tracks: ['globular-amphora'],
  descr: 'It occupied much of the area of the earlier Funnelbeaker culture and preceded the Corded Ware culture in its central area; it is named for globular pots with two to four handles.',
  sources: [S('wp-globular-amphora', 'lead and Extent')],
});
ed.event({
  uuid: 'funnelbeaker-replaced', title: 'Corded Ware replaces the Funnelbeaker culture', start: 'c. 2800 BCE', end: 'c. 2650 BCE', tracks: ['funnelbeaker', 'corded-ware'],
  descr: 'In the early 3rd millennium BCE Corded Ware peoples of marked steppe-related ancestry appear in Northern Europe; defensive palisades mark violent conflict between Funnelbeakers, Corded Ware and Pitted Ware. By 2650 BCE the Funnelbeaker culture has been replaced.',
  sources: [S('wp-funnelbeaker', 'lead and History')],
  links: [{ to: 'yamnaya-corded-ware', kind: 'related' }],
});
ed.event({
  uuid: 'yamnaya-over-trypillia', title: 'Yamnaya burial mounds over the Trypillian mega-sites', start: 'c. 2500 BCE', tracks: ['yamnaya', 'trypillia'],
  descr: 'Yamnaya tumuli dating to the middle of the 3rd millennium BC stand on top of Talianki and near Maidanetske.',
  sources: [S('wp-talianki', 'lead'), S('wp-maidanetske', 'Archaeological remains')],
  startDates: [R(2600, 2400, 'wp-talianki', "lead ('the middle of the 3rd millennium BC')")],
});
ed.event({
  uuid: 'biskupin', title: 'Biskupin fortified settlement built', start: '747 BCE', tracks: ['biskupin'],
  descr: 'A Lusatian settlement of some 102–106 log houses inside a tall wooden palisade on an earth-and-timber rampart. Its oak was felled between 747 and 722 B.C., over half of it in the winter of 748/747.',
  sources: [S('wp-biskupin', 'infobox, lead, The site and Dating')],
  startDates: [C(747, 'wp-biskupin', 'Dating (dendrochronology)'), C(720, 'wp-biskupin', 'Dating (radiocarbon, first settlement)', { margin: 150 })],
});
ed.event({
  uuid: 'alexander-getae', title: 'Alexander the Great attacks the Getae', start: '335 BCE', tracks: ['getae', 'macedon'],
  descr: 'On the lower Danube. Herodotus first used the name Getae; the Dacians were influenced by the Scythians and by the La Tène Celts who arrived in the 4th century BC.',
  sources: [S('wp-dacians', 'lead, Name and Origins and ethnogenesis')],
});

ed.save();
