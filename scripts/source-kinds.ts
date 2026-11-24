// Checks that the reader-facing docs name every kind of source the shipped data uses, and the licence of quoted text:
// - each source in the timelines this site ships (data-src/site-timelines.json) has one known kind, its tag
//   (wikipedia, cited-via-wikipedia, periodo, cliopatria, ics, journal…); a source with an unknown or missing tag fails, so a new
//   kind has to be added here, with the names that describe it;
// - the event maps' own sources count too: their credits (Cliopatria, Natural Earth, Wikimedia Commons) and where each
//   row's map location came from (data-src/<timeline>-places.json: Wikipedia, Wikidata);
// - every kind in use must be named in the README's "Data sources and AI use" section and on the About page
//   (src/components/About.tsx);
// - when a source locator quotes 15 words or more of a page, LICENSE-DATA.md, the README and the About page must carry
//   the CC BY-SA carve-out for quoted text (Kevin, 2026-11-23: option A).
//   npm run sources:check
// Prints one line per kind (where it's used, how often) and one per gap; exits with 1 if there are any gaps.
import { existsSync, readFileSync } from 'node:fs';

/** Each kind: how to recognise it in a map credit (if it can appear there), and the words that name it in the docs. */
const KINDS: Record<string, { names: RegExp; credit?: RegExp }> = {
  wikipedia: { names: /English Wikipedia/ },
  'cited-via-wikipedia': { names: /Cited via Wikipedia/i },
  periodo: { names: /PeriodO/ },
  cliopatria: { names: /Cliopatria/, credit: /Cliopatria/ },
  ics: { names: /International Chronostratigraphic Chart|\bICS\b/ },
  // a paper cited directly (not via Wikipedia), e.g. a dating study in Earth and Life
  journal: { names: /\bjournal (articles?|papers?)\b|\bpeer-reviewed\b|\bpapers? cited directly\b/i },
  'natural-earth': { names: /Natural Earth/, credit: /Natural Earth/ },
  'wikimedia-commons': { names: /Wikimedia Commons/, credit: /Wikimedia Commons/ },
  // a museum's own page (the Smithsonian's Human Origins species pages, in Earth and Life)
  museum: { names: /Smithsonian/ },
  // a scholar's own essay, a university encyclopedia or library, or an academic's article, cited directly for a date
  // (the traditions rows: Jamison & Witzel, Kokugakuin University, the Posen Library, Ogundiran, the Biblical Archaeology Society)
  scholarly: { names: /scholarly (pages|works|sources)/i },
  wikidata: { names: /Wikidata/ },
};
/** Where a map location came from (places files, `point.from`) → its kind. */
const POINT_FROM: Record<string, string> = { wikidata: 'wikidata', wikipedia: 'wikipedia', 'wikipedia-map': 'wikipedia' };
const QUOTE_WORDS = 15;

type Obj = Record<string, unknown>;
const read = (f: string) => readFileSync(f, 'utf8');
const json = (f: string) => JSON.parse(read(f)) as Obj;

const gaps: string[] = [];
const used = new Map<string, Map<string, number>>(); // kind → where → count
const count = (kind: string, where: string, n = 1) => {
  const m = used.get(kind) ?? new Map<string, number>();
  m.set(where, (m.get(where) ?? 0) + n);
  used.set(kind, m);
};
let longQuotes = 0;
let quoteExample = '';

/** Every `sourceLocation` in a timeline file, wherever it sits (events, rows, claims, context spans). */
function locations(o: unknown, out: string[] = []): string[] {
  if (Array.isArray(o)) for (const v of o) locations(v, out);
  else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'sourceLocation' && typeof v === 'string') out.push(v);
      else locations(v, out);
    }
  }
  return out;
}

const shipped = (json('data-src/site-timelines.json').timelines as string[]) ?? [];
for (const id of shipped) {
  const ds = json(`public/timelines/${id}.json`);
  for (const [key, src] of Object.entries((ds.sources ?? {}) as Record<string, { tags?: string[] }>)) {
    const kinds = (src.tags ?? []).filter((t) => t in KINDS);
    if (kinds.length !== 1) gaps.push(`${id}: source ${key} has ${kinds.length ? `${kinds.length} kinds (${kinds.join(', ')})` : `no known kind (tags: ${JSON.stringify(src.tags ?? [])})`}; tag it with one of ${Object.keys(KINDS).join(', ')}, or add its kind to scripts/source-kinds.ts`);
    else count(kinds[0], id);
  }
  for (const loc of locations(ds)) {
    for (const q of loc.matchAll(/"([^"]+)"/g)) {
      if (q[1].trim().split(/\s+/).length >= QUOTE_WORDS) {
        longQuotes++;
        quoteExample ||= `${id}: "${q[1].slice(0, 60)}…"`;
      }
    }
  }
  const maps = `public/maps/${id}.json`;
  if (existsSync(maps)) {
    for (const c of (json(maps).credits ?? []) as { text: string }[]) {
      const hit = Object.entries(KINDS).filter(([, k]) => k.credit?.test(c.text));
      if (!hit.length) gaps.push(`${maps}: credit "${c.text.slice(0, 60)}…" names no known kind; add it to scripts/source-kinds.ts`);
      for (const [kind] of hit) count(kind, `${id} maps`);
    }
  }
  const places = `data-src/${id}-places.json`;
  if (existsSync(places)) {
    for (const r of Object.values((json(places).rows ?? {}) as Record<string, { point?: { from?: string } }>)) {
      const from = r.point?.from;
      if (!from) continue;
      const kind = POINT_FROM[from];
      if (!kind) gaps.push(`${places}: a map location comes from "${from}", which has no kind; add it to POINT_FROM in scripts/source-kinds.ts`);
      else count(kind, `${id} map locations`);
    }
  }
}

/** Text with every run of whitespace as one space (a name may wrap across lines). */
const flat = (t: string) => t.replace(/\s+/g, ' ');
const readmeSection = (() => {
  const md = read('README.md');
  const at = md.indexOf('## Data sources and AI use');
  if (at < 0) {
    gaps.push('README.md has no "## Data sources and AI use" section');
    return '';
  }
  const next = md.indexOf('\n## ', at + 1);
  return flat(md.slice(at, next < 0 ? undefined : next));
})();
// the About page's text: only its markup after `return (` (not comments or imports), with JSX's {' '} and line breaks
// collapsed, so a name split over two lines still matches
const about = (() => {
  const src = read('src/components/About.tsx');
  const at = src.indexOf('return (');
  if (at < 0) gaps.push('src/components/About.tsx has no `return (`: the check reads the page from there');
  return flat(src.slice(at < 0 ? 0 : at).replace(/\{' '\}/g, ' '));
})();

for (const [kind, where] of [...used].sort()) {
  const k = KINDS[kind];
  const missing = [!k.names.test(readmeSection) && 'README "Data sources and AI use"', !k.names.test(about) && 'the About page'].filter(Boolean);
  const line = [...where].map(([w, n]) => `${w} ${n}`).join(', ');
  console.log(`${missing.length ? 'GAP ' : 'ok  '}  ${kind.padEnd(20)} ${line}`);
  if (missing.length) gaps.push(`${kind} is used (${line}) but not named in ${missing.join(' or ')} (looked for ${k.names})`);
}

// quoted text: the CC BY-SA carve-out must be where readers look for the licence
if (longQuotes) {
  const carveOut = (t: string) => /CC BY-SA/.test(t) && /source locators/.test(t);
  const missing = [
    !carveOut(flat(read('LICENSE-DATA.md'))) && 'LICENSE-DATA.md',
    !carveOut(flat(read('README.md'))) && 'README.md',
    !carveOut(about) && 'the About page',
  ].filter(Boolean);
  console.log(`${missing.length ? 'GAP ' : 'ok  '}  ${'quoted text'.padEnd(20)} ${longQuotes} locators quote ${QUOTE_WORDS}+ words (e.g. ${quoteExample})`);
  if (missing.length) gaps.push(`${longQuotes} locators quote ${QUOTE_WORDS}+ words of a page, but ${missing.join(', ')} ${missing.length > 1 ? 'lack' : 'lacks'} the CC BY-SA carve-out for quoted text (both "CC BY-SA" and "source locators")`);
}

for (const g of gaps) console.log(`  ${g}`);
console.log(gaps.length ? `${gaps.length} gap${gaps.length > 1 ? 's' : ''}` : 'every source kind is named');
process.exit(gaps.length ? 1 : 0);
