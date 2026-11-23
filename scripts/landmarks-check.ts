// Landmarks coverage check: are the world's notable events, religions, documents and leaders in the timelines' data, with
// a fitting category and importance? Read-only: it changes no data. The lists are draft files in scripts/landmarks/
// (events.json, religions.json, documents.json, leaders.json), written for Kevin and regional readers to adjust; each
// item has a title regex, a year (with a tolerance) and the kinds a good match should have.
//   npm run landmarks:check [-- --data <dir>] [--out report.md] [--json report.json] [--only events|religions|documents|leaders]
//        [--max-missing N] [--warn-importance]
// --data: a folder holding ancient-classical.json, medieval.json and modern-states.json (default public/timelines; point
//   it at another worktree's public/timelines to check a branch). Prints a Markdown report: a table per list, the
//   regional balance of the lists and of the data, the gaps and the tally. Exits with 1 only if --max-missing N is
//   given and more than N items are absent. --warn-importance prints a warning line (to stderr) for each listed leader
//   whose reign event is below importance 1: the list is a check that the data's ranking puts them high, not a ranking
//   to copy into it (Kevin, 2026-11-23).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const dataDir = opt('--data') ?? 'public/timelines';
const only = opt('--only');
const warnImportance = args.includes('--warn-importance');
const maxMissing = opt('--max-missing') === undefined ? undefined : Number(opt('--max-missing'));

const TIMELINES = [
  ['ancient-classical', 'Ancient'],
  ['medieval', 'Medieval'],
  ['modern-states', 'Modern'],
] as const;

interface Ev {
  uuid: string;
  title: string;
  start: number;
  end?: number;
  importance?: number;
  tracks?: string[];
  memberships?: { facet: string; value: string }[];
  startDates?: { year: number }[];
}
interface Facet {
  name: string;
  values: Record<string, { name: string; broader?: string[] }>;
}
interface Track {
  id: string;
  name: string;
  parent?: string;
  memberships?: { facet: string; value: string }[];
}
interface Loaded {
  id: string;
  label: string;
  events: Ev[];
  tracks: Map<string, Track>;
  cat: Facet['values'];
  geo: Facet['values'] | undefined;
}
const data: Loaded[] = TIMELINES.map(([id, label]) => {
  const ds = JSON.parse(readFileSync(join(dataDir, `${id}.json`), 'utf8'));
  const facets = (ds.meta.facets ?? {}) as Record<string, Facet>;
  return {
    id,
    label,
    events: ds.events as Ev[],
    tracks: new Map((ds.tracks as Track[]).map((t) => [t.id, t])),
    cat: facets.category?.values ?? {},
    geo: facets.geography?.values,
  };
});

/** A category value's chain, kind first: "place › capital-moved" is [`place`, `capital-moved`]. */
const chain = (cat: Loaded['cat'], v: string): string[] => {
  const out = [v];
  for (let p = cat[v]?.broader?.[0]; p; p = cat[p]?.broader?.[0]) out.unshift(p);
  return out;
};
const catText = (l: Loaded, e: Ev) => {
  const ms = (e.memberships ?? []).filter((m) => m.facet === 'category').map((m) => m.value);
  return ms.length ? ms.map((v) => chain(l.cat, v).map((x) => l.cat[x]?.name ?? x).join(' › ')).join('; ') : '(none)';
};
const kinds = (l: Loaded, e: Ev) => (e.memberships ?? []).filter((m) => m.facet === 'category').map((m) => chain(l.cat, m.value)[0]);

/** A title regex that must start at a word's start (so `Edo` doesn't match "Macedonian", nor `Mani` "Omani"). */
const titleRe = (m: string) => new RegExp(`(?<![\\p{L}])(?:${m})`, 'iu');
const fmtYear = (y: number) => (y < 0 ? `${-y} BCE` : `${y}`);
const ERAS = ['before 500 BCE', '500 BCE–500 CE', '500–1500', '1500–1800', '1800 on'] as const;
const era = (y: number) => ERAS[y < -500 ? 0 : y < 500 ? 1 : y < 1500 ? 2 : y < 1800 ? 3 : 4];

// ---- items ----
interface Item {
  id: string;
  name: string;
  year: number;
  tol: number;
  region: string;
  expect: string[];
  match: string;
  type?: string;
  traditional?: number;
  represent?: string;
  dateOf?: string;
  dateNote?: string;
}
interface Leader {
  id: string;
  name: string;
  start: number;
  end: number;
  region: string;
  role: string;
  own: string;
  ownTokens: string[];
  match: string;
}
const lists = (['events', 'religions', 'documents'] as const)
  .filter((n) => !only || only === n)
  .map((n) => [n, (JSON.parse(readFileSync(`scripts/landmarks/${n}.json`, 'utf8')).events as Item[])] as const);
const leaders: Leader[] = !only || only === 'leaders' ? JSON.parse(readFileSync('scripts/landmarks/leaders.json', 'utf8')).leaders : [];

interface Result {
  item: Item;
  status: 'present' | 'elsewhere in time' | 'absent';
  where?: string;
  hit?: { l: Loaded; e: Ev };
  flags: string[];
  others: string[];
}
const out: string[] = [];
const say = (s = '') => out.push(s);
const cell = (s: string) => s.replace(/\|/g, '/');

function checkItem(item: Item): Result {
  const re = titleRe(item.match);
  const near: { l: Loaded; e: Ev }[] = [];
  const far: { l: Loaded; e: Ev }[] = [];
  for (const l of data)
    for (const e of l.events) {
      if (!re.test(e.title)) continue;
      const end = e.end ?? e.start;
      const inside = Math.abs(e.start - item.year) <= item.tol || (e.start <= item.year + item.tol && end >= item.year - item.tol);
      (inside ? near : far).push({ l, e });
    }
  const score = (h: { e: Ev }) => (h.e.importance === 1 ? 0 : 1000) + Math.abs(h.e.start - item.year);
  near.sort((a, b) => score(a) - score(b));
  const flags: string[] = [];
  if (!near.length)
    return { item, status: far.length ? 'elsewhere in time' : 'absent', flags, others: far.slice(0, 3).map((h) => `${h.l.label}: ${h.e.title} (${fmtYear(h.e.start)})`) };
  const hit = near[0];
  if (hit.e.importance !== 1) flags.push(hit.e.importance === 3 ? 'importance 3' : 'no importance');
  const ks = kinds(hit.l, hit.e);
  if (!ks.length) flags.push('no category');
  else if (item.expect.length && !ks.some((k) => item.expect.includes(k))) flags.push(`category ${ks.join('/')}, expected ${item.expect.join('/')}`);
  const claims = new Set((hit.e.startDates ?? []).map((c) => c.year));
  if (item.traditional !== undefined) {
    const has = [...claims].some((y) => Math.abs(y - item.traditional!) <= 3) || Math.abs(hit.e.start - item.traditional) <= 3;
    if (!has) flags.push(`no claim for the traditional date ${fmtYear(item.traditional)}`);
  }
  const track = hit.e.tracks?.[0];
  return { item, status: 'present', hit, flags, where: track ? `${hit.l.label} · ${hit.l.tracks.get(track)?.name ?? track}` : hit.l.label, others: near.slice(1, 3).map((h) => `${h.l.label}: ${h.e.title}`) };
}

// ---- report ----
const tally = { present: 0, flagged: 0, differs: 0, absent: 0, total: 0 };
const balance = new Map<string, Map<string, { listed: number; present: number }>>();
const addBalance = (region: string, y: number, present: boolean) => {
  const row = balance.get(region) ?? new Map();
  const c = row.get(era(y)) ?? { listed: 0, present: 0 };
  c.listed++;
  if (present) c.present++;
  row.set(era(y), c);
  balance.set(region, row);
};

say(`# Landmarks coverage check`);
say();
say(`Data: \`${dataDir}\` (${data.map((l) => `${l.label} ${l.events.length} events`).join(', ')}). Lists: scripts/landmarks/*.json (drafts for Kevin to adjust).`);
const bySection: string[] = [];
for (const [name, items] of lists) {
  const results = items.map(checkItem);
  bySection.push(name);
  say();
  say(`## ${name[0].toUpperCase()}${name.slice(1)} (${items.length})`);
  say();
  const extra = name === 'religions' ? ' Type |' : name === 'documents' ? ' Date of |' : '';
  say(`| # | Item | Year | Region | Status | Where | Category | Imp. | Flags |${extra}`);
  say(`|---|---|---|---|---|---|---|---|---|${extra ? '---|' : ''}`);
  results.forEach((r, i) => {
    tally.total++;
    addBalance(r.item.region, r.item.year, r.status === 'present');
    if (r.status === 'present') {
      tally.present++;
      if (r.flags.length) tally.flagged++;
    } else if (r.status === 'elsewhere in time') tally.differs++;
    else tally.absent++;
    const h = r.hit;
    const x = name === 'religions' ? ` ${r.item.type} |` : name === 'documents' ? ` ${r.item.dateOf} |` : '';
    say(
      `| ${i + 1} | ${cell(r.item.name)} | ${fmtYear(r.item.year)} | ${r.item.region.split(' (')[0]} | ${r.status}${r.status === 'elsewhere in time' ? ` (${cell(r.others[0] ?? '')})` : ''} | ${r.where ? cell(r.where) : ''} | ${h ? cell(catText(h.l, h.e)) : ''} | ${h ? (h.e.importance ?? '–') : ''} | ${r.flags.join('; ')} |${x}`,
    );
  });
  const notes = results.filter((r) => r.item.represent || r.item.dateNote);
  if (notes.length) {
    say();
    say(`Notes on dates and representation:`);
    for (const r of notes) say(`- **${r.item.name}**: ${r.item.represent ?? ''}${r.item.dateNote ? `dates: ${r.item.dateNote}` : ''}`);
  }
}

if (leaders.length) {
  say();
  say(`## Leaders (${leaders.length})`);
  say();
  say(`"reign" = an event on a ruler row naming the leader, in the leader's years (title starting Reign, Presidency, Premiership…, or a \`reign\` category). "named only" = events name the leader but none is a reign.`);
  say();
  say(`| # | Leader | Years | Region | Role | Status | Where (first) | Imp. | Name in own tradition | Data uses it? |`);
  say(`|---|---|---|---|---|---|---|---|---|---|`);
  const ruleish = /^(Reign|Presidency|Premiership|Chancellorship|Dictatorship|Regency|Rule|Tenure|Kingship|Emirate|Caliphate|Papacy|Pontificate|Shogunate|Sultanate|Chairmanship|Leadership)\b/i;
  const counts = { reign: 0, named: 0, absent: 0, lowImp: 0 };
  const partial: string[] = [];
  leaders.forEach((ld, i) => {
    tally.total++;
    const re = titleRe(ld.match);
    const reigns: { l: Loaded; e: Ev }[] = [];
    const named: { l: Loaded; e: Ev }[] = [];
    for (const l of data)
      for (const e of l.events) {
        if (!re.test(e.title)) continue;
        const end = e.end ?? e.start;
        if (e.start > ld.end + 5 || end < ld.start - 5) continue;
        const isReign = ruleish.test(e.title) || e.uuid.startsWith('reign-') || kinds(l, e).includes('rule') && chain(l.cat, (e.memberships ?? []).find((m) => m.facet === 'category')?.value ?? '').includes('reign');
        (isReign ? reigns : named).push({ l, e });
      }
    const status = reigns.length ? 'reign' : named.length ? 'named only' : 'absent';
    counts[status === 'reign' ? 'reign' : status === 'named only' ? 'named' : 'absent']++;
    if (reigns.length) tally.present++;
    else if (named.length) tally.differs++;
    else tally.absent++;
    addBalance(ld.region, ld.start, reigns.length > 0);
    // the reign that covers most of the leader's years (a leader with several rows or terms: the longest overlap)
    const overlap = (h: { e: Ev }) => Math.max(0, Math.min(h.e.end ?? h.e.start, ld.end) - Math.max(h.e.start, ld.start));
    const best = reigns.sort((a, b) => overlap(b) - overlap(a))[0];
    const imp = best ? (reigns.some((r) => r.e.importance === 1) ? '1' : (best.e.importance ?? '–')) : '';
    const covered = best ? overlap(best) / Math.max(1, ld.end - ld.start) : 0;
    if (best && imp !== '1') {
      counts.lowImp++;
      if (warnImportance) console.error(`warning: listed leader below importance 1: ${ld.name} (${best.l.label}: ${best.e.title}, importance ${best.e.importance ?? 'none'})`);
    }
    const titles = [...reigns, ...named].map((h) => h.e.title);
    const uses = !ld.ownTokens.length ? '' : titles.some((t) => ld.ownTokens.some((tok) => new RegExp(tok, 'i').test(t))) ? 'yes' : titles.length ? 'English form only' : '';
    if (best && covered < 0.6 && ld.end - ld.start > 3) partial.push(`${ld.name} (${Math.round(covered * 100)}% of ${fmtYear(ld.start)}–${fmtYear(ld.end)})`);
    say(
      `| ${i + 1} | ${cell(ld.name)} | ${fmtYear(ld.start)}–${fmtYear(ld.end)} | ${ld.region.split(' (')[0]} | ${ld.role} | ${status}${reigns.length > 1 ? ` (${reigns.length} rows)` : ''} | ${best ? cell(`${best.l.label}: ${best.e.title} ${fmtYear(best.e.start)}–${best.e.end === undefined ? '' : fmtYear(best.e.end)}`) : named[0] ? cell(`${named[0].l.label}: ${named[0].e.title}`) : ''} | ${imp} | ${cell(ld.own)} | ${uses} |`,
    );
  });
  say();
  say(`Leaders: ${counts.reign} with a reign event (${counts.lowImp} of them not key events, importance 1), ${counts.named} named only, ${counts.absent} absent.`);
  if (partial.length) say(`\nReign events that cover under 60% of the leader's years in the list: ${partial.join('; ')}.`);
}

// ---- regional balance ----
say();
say(`## Regional balance of the lists (items listed, and how many the data holds)`);
say();
say(`| Region | ${ERAS.join(' | ')} | Total |`);
say(`|---|${ERAS.map(() => '---|').join('')}---|`);
const regions = [...balance.keys()].sort();
const sums = ERAS.map(() => ({ listed: 0, present: 0 }));
for (const r of regions) {
  const row = balance.get(r)!;
  let lt = 0;
  let pt = 0;
  const cells = ERAS.map((e, i) => {
    const c = row.get(e) ?? { listed: 0, present: 0 };
    lt += c.listed;
    pt += c.present;
    sums[i].listed += c.listed;
    sums[i].present += c.present;
    return c.listed ? `${c.present}/${c.listed}` : '·';
  });
  say(`| ${r} | ${cells.join(' | ')} | ${pt}/${lt} |`);
}
say(`| **All** | ${sums.map((c) => `${c.present}/${c.listed}`).join(' | ')} | ${sums.reduce((a, c) => a + c.present, 0)}/${sums.reduce((a, c) => a + c.listed, 0)} |`);

// the data's own tilt: events per world region, by the first row's geography (Ancient, Medieval) or its top-level row (Modern)
say();
say(`## Regional balance of the data (events per world region)`);
say();
const GEO: Record<string, string> = {
  'near-east': 'West Asia',
  africa: 'Africa',
  europe: 'Europe',
  mediterranean: 'Mediterranean (mixed)',
  'eurasian-steppe': 'Central Asia and the steppe',
  'central-asia': 'Central Asia and the steppe',
  siberia: 'Central Asia and the steppe',
  'south-asia': 'South Asia',
  'east-asia': 'East Asia',
  'southeast-asia': 'Southeast Asia and Oceania',
  oceania: 'Southeast Asia and Oceania',
  'north-america': 'The Americas',
  mesoamerica: 'The Americas',
  'south-america': 'The Americas',
};
/** Modern States has no region facet; its top-level rows are continents. */
const MODERN_TOP: Record<string, string> = {
  Africa: 'Africa',
  Americas: 'The Americas',
  Europe: 'Europe',
  Oceania: 'Southeast Asia and Oceania',
  Asia: 'Asia (West, South, East, Southeast and Central together)',
};
const dataBalance = new Map<string, Record<string, number>>();
for (const l of data) {
  const counts: Record<string, number> = {};
  const topOf = (v: string) => {
    let c = v;
    for (let p = l.geo?.[c]?.broader?.[0]; p; p = l.geo?.[c]?.broader?.[0]) c = p;
    return c;
  };
  for (const e of l.events) {
    const t = l.tracks.get(e.tracks?.[0] ?? '');
    let region = 'no region data';
    if (t && l.geo) {
      const m = (t.memberships ?? []).find((x) => x.facet === 'geography');
      if (m) region = GEO[topOf(m.value)] ?? topOf(m.value);
    } else if (t) {
      let top = t;
      while (top.parent && l.tracks.get(top.parent)) top = l.tracks.get(top.parent)!;
      region = MODERN_TOP[top.name] ?? `${top.name} (top row)`;
    }
    counts[region] = (counts[region] ?? 0) + 1;
  }
  dataBalance.set(l.label, counts);
}
const allRegions = [...new Set([...dataBalance.values()].flatMap((c) => Object.keys(c)))].sort();
say(`| Region | ${data.map((l) => l.label).join(' | ')} |`);
say(`|---|${data.map(() => '---|').join('')}`);
for (const r of allRegions) say(`| ${r} | ${data.map((l) => dataBalance.get(l.label)![r] ?? 0).join(' | ')} |`);
say();
say(`Ancient and Medieval are counted by their first row's geography; Modern States has no region facet, so its events are counted by their top-level row (its continents; "Asia" there covers West, South, East, Southeast and Central Asia together).`);

// ---- tally ----
say();
say(`## Tally`);
say();
say(`${tally.total} items across ${bySection.length + (leaders.length ? 1 : 0)} lists: ${tally.present} present (${tally.flagged} of them with a flag: importance, category or dates), ${tally.differs} elsewhere or named only (the title matches an event at another date, or no reign event), ${tally.absent} absent.`);

const text = out.join('\n') + '\n';
if (opt('--out')) writeFileSync(opt('--out')!, text);
else process.stdout.write(text);
if (opt('--json')) writeFileSync(opt('--json')!, JSON.stringify({ tally }, null, 1));
if (maxMissing !== undefined && tally.absent > maxMissing) {
  console.error(`landmarks-check: ${tally.absent} items absent (more than ${maxMissing})`);
  process.exit(1);
}
