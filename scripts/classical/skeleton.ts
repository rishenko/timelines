// The Classical World timeline (c. 500 BCE – 650 CE), skeleton (2026-11-18). The author chose a second timeline
// rather than extending Ancient Civilizations past 330 BCE, so long-gone civilizations don't crowd it; it starts
// at 500 BCE to overlap the ancient timeline and ends around 650 CE (the fall of the Sasanians, the founding of
// Tang, the early Islamic conquests).
//
// This script (re)writes the timeline's settings, its groups and regions, and seeds it with every event from the
// ancient timeline that starts in 500–330 BCE (the overlap), copied with its sources and placed on the matching
// region. Later region scripts add civilization rows and events. Re-runnable: it rebuilds what it owns and keeps
// anything later scripts added.
// The overlap events belong to the ancient timeline: a re-run copies them again, so new ancient events in the
// period and fixes to their text arrive here, and edits made only to the Classical copy are lost. Fix their wording
// in data-src/ancient-near-east.json (or its defining script), then `npm run data -- run-all classical`.
//   node scripts/classical/skeleton.ts && npm run data:classical
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { open } from '../lib/dataset-edit.ts';

const FILE = 'data-src/classical.json';
if (!existsSync(FILE)) writeFileSync(FILE, JSON.stringify({ schemaVersion: 3, meta: {}, tags: {}, sources: {}, tracks: [], events: [] }, null, 2) + '\n');

const ancientSrc = JSON.parse(readFileSync('data-src/ancient-near-east.json', 'utf8'));
const ancient = JSON.parse(readFileSync('src/timelines/ancient-near-east.json', 'utf8')); // stored years
const ed = open(FILE, '2026-11-18');
const d = ed.data;

d.meta = {
  ...d.meta,
  id: 'classical',
  title: 'The Classical World',
  subtitle: 'From the Persian Wars to the rise of Islam: Europe, Africa, the Near East, Asia and the Americas, c. 500 BCE – 650 CE',
  description:
    'Empires and cultures of the classical and late antique world, from the Persian Wars and Warring States China to the fall of the Sasanians and the founding of Tang. It overlaps Ancient Civilizations from 500 to 330 BCE.',
  credits: ancientSrc.meta.credits,
  calendar: ancientSrc.meta.calendar,
  increments: [10, 50, 100, 500],
  defaultIncrement: 100,
  defaultTheme: 'parchment',
  circaFade: 0,
  continues: [{ timeline: 'ancient-near-east', at: '500 BCE', side: 'before' }],
  // the ruler covers this period even where rows (e.g. the Eastern Roman Empire) run on past it
  range: { start: '500 BCE', end: '650 CE' },
};
d.tags = { ...ancientSrc.tags, ...d.tags };

// ---------- groups and regions (west to east, as in the ancient timeline) ----------
const groups: { id: string; name: string; color: string; regions: [string, string][] }[] = [
  { id: 'africa', name: 'Africa', color: '#b8862a', regions: [['north-africa', 'North Africa and Carthage'], ['nubia', 'Kush and Nubia'], ['horn', 'Aksum and the Horn of Africa'], ['sub-saharan', 'Africa south of the Sahara']] },
  { id: 'europe-med', name: 'Europe & Mediterranean', color: '#3f6aa8', regions: [['europe', 'Europe'], ['west-med', 'Western Mediterranean'], ['rome', 'Rome'], ['greece', 'Greece and the Hellenistic world']] },
  { id: 'near-east', name: 'Near East & Iran', color: '#a8483a', regions: [['egypt', 'Egypt'], ['levant', 'Levant and Judea'], ['anatolia', 'Anatolia'], ['caucasus', 'Caucasus'], ['persia', 'Iran and Mesopotamia'], ['arabia', 'Arabia']] },
  { id: 'steppe-south-asia', name: 'Steppe & South Asia', color: '#7a8a2a', regions: [['steppe', 'Steppe peoples'], ['south-asia', 'South Asia']] },
  { id: 'east-asia', name: 'East & Southeast Asia', color: '#6a4a9a', regions: [['se-asia', 'Southeast Asia'], ['tibet', 'Tibet'], ['china', 'China'], ['korea-japan', 'Korea and Japan']] },
  { id: 'austronesia', name: 'Island Southeast Asia & Oceania', color: '#2a8a8a', regions: [['island-sea', 'Island Southeast Asia'], ['oceania', 'Oceania']] },
  { id: 'americas', name: 'Americas', color: '#2f7a5a', regions: [['arctic', 'North American Arctic'], ['north-america', 'North America'], ['mesoamerica', 'Mesoamerica'], ['south-america', 'South America'], ['caribbean', 'Caribbean']] },
];
for (const g of groups) {
  ed.track({ id: g.id, name: g.name, color: g.color });
  ed.tracks(g.regions.map(([id, name]) => ({ id, name, color: g.color, parent: g.id })), { after: g.id });
}

// ---------- the overlap: ancient events starting 500–330 BCE, placed on the matching region ----------
// Ancient region (second level of its row tree) → Classical region. Some ancient rows map more finely.
const regionMap: Record<string, string> = {
  'north-africa': 'north-africa', 'sub-saharan': 'sub-saharan', egypt: 'egypt', levant: 'levant', anatolia: 'anatolia',
  mesopotamia: 'persia', iran: 'persia', caucasus: 'caucasus', arabia: 'arabia', dilmun: 'arabia',
  europe: 'europe', 'west-med': 'west-med', aegean: 'greece', 'sea-peoples': 'greece',
  steppe: 'steppe', siberia: 'steppe', indus: 'south-asia', 'se-asia': 'se-asia', tibet: 'tibet', china: 'china',
  'korea-japan': 'korea-japan', 'island-sea': 'island-sea', oceania: 'oceania',
  arctic: 'arctic', 'north-america': 'north-america', mesoamerica: 'mesoamerica', 'south-america': 'south-america', caribbean: 'caribbean',
};
const rowMap: Record<string, string> = { rome: 'rome', carthage: 'north-africa', nubia: 'nubia', dmt: 'horn', punt: 'horn' };
const byId = new Map<string, { id: string; parent?: string }>(ancient.tracks.map((t: { id: string; parent?: string }) => [t.id, t]));
const classicalRegion = (trackId: string): string => {
  const path: string[] = [];
  for (let t = byId.get(trackId); t; t = t.parent ? byId.get(t.parent) : undefined) path.unshift(t.id);
  for (const id of [...path].reverse()) if (rowMap[id]) return rowMap[id];
  const r = regionMap[path[1]];
  if (!r) throw new Error(`no Classical region for ancient row "${trackId}" (${path.join(' > ')})`);
  return r;
};

const OVERLAP_START = -499; // 500 BCE as a stored year
const seed = ancient.events.filter((e: { start: number }) => e.start >= OVERLAP_START);
const seedIds = new Set(seed.map((e: { uuid: string }) => e.uuid));
const srcEvents = new Map(ancientSrc.events.map((e: { uuid: string }) => [e.uuid, e]));
for (const e of seed) {
  const src = structuredClone(srcEvents.get(e.uuid)) as Record<string, unknown> & { tracks: string[]; sources: { sourceKey: string }[]; links?: { to: string }[] };
  src.tracks = [...new Set(src.tracks.map(classicalRegion))];
  if (src.links) {
    src.links = src.links.filter((l) => seedIds.has(l.to));
    if (!src.links.length) delete src.links;
  }
  for (const s of src.sources) if (!d.sources[s.sourceKey]) d.sources[s.sourceKey] = ancientSrc.sources[s.sourceKey];
  for (const c of [...((src.startDates as { source: { sourceKey: string } }[]) ?? []), ...((src.endDates as { source: { sourceKey: string } }[]) ?? [])])
    if (!d.sources[c.source.sourceKey]) d.sources[c.source.sourceKey] = ancientSrc.sources[c.source.sourceKey];
  ed.event(src);
}
console.log(`seeded ${seed.length} overlap events`);

ed.save();

// the ancient timeline links forward to this one, at its end (330 BCE)
const anc = open('data-src/ancient-near-east.json', '2026-11-18');
anc.data.meta.continues = [{ timeline: 'classical', at: '330 BCE', side: 'after' }];
anc.save();
