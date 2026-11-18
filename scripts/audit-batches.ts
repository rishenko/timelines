// Groups a dataset's event descriptions by the Wikipedia pages they cite, so fetch agents can
// check each description against its pages (an audit for phrases the sources don't say).
//
//   node scripts/audit-batches.ts <data-src json> <out dir> [--pages 8] [--only id,id]
//
// Writes <out dir>/batch-NN.md, one per agent: the pages to read, then each event's title,
// description and cited sections. Events that cite several pages are kept in one batch
// where possible (connected components of the event–page graph, packed into batches).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [file, outDir, ...rest] = process.argv.slice(2);
if (!file || !outDir) {
  console.error('usage: node scripts/audit-batches.ts <data-src json> <out dir> [--pages 8] [--only id,id]');
  process.exit(1);
}
const opt = (name: string) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const maxPages = Number(opt('--pages') ?? 8);
const only = opt('--only')?.split(',');

type Src = { sourceKey: string; sourceLocation?: string };
type Ev = { uuid: string; title: string; descr?: string; sources?: Src[] };
const data = JSON.parse(readFileSync(file, 'utf8')) as {
  sources: Record<string, { name: string; url?: string }>;
  events: Ev[];
};

const isWiki = (key: string) => /wikipedia\.org/.test(data.sources[key]?.url ?? '');
const events = data.events.filter((e) => e.descr && (!only || only.includes(e.uuid)));
const pagesOf = (e: Ev) => [...new Set((e.sources ?? []).map((s) => s.sourceKey).filter(isWiki))];

// Union-find over pages: events join the pages they cite.
const parent = new Map<string, string>();
const find = (k: string): string => {
  if (!parent.has(k)) parent.set(k, k);
  const p = parent.get(k)!;
  if (p === k) return k;
  const r = find(p);
  parent.set(k, r);
  return r;
};
const noPages: Ev[] = [];
for (const e of events) {
  const ps = pagesOf(e);
  if (!ps.length) noPages.push(e);
  ps.forEach((p) => find(p));
  for (let i = 1; i < ps.length; i++) parent.set(find(ps[i]), find(ps[0]));
}
const comps = new Map<string, { pages: Set<string>; events: Ev[] }>();
for (const e of events) {
  const ps = pagesOf(e);
  if (!ps.length) continue;
  const root = find(ps[0]);
  if (!comps.has(root)) comps.set(root, { pages: new Set(), events: [] });
  const c = comps.get(root)!;
  ps.forEach((p) => c.pages.add(p));
  c.events.push(e);
}

// Pack components into batches of up to maxPages pages; a bigger component gets its own batches.
const batches: { pages: Set<string>; events: Ev[] }[] = [];
const sorted = [...comps.values()].sort((a, b) => b.pages.size - a.pages.size);
for (const c of sorted) {
  if (c.pages.size > maxPages) {
    // Split by event: fill a batch until adding the next event's pages would overflow it.
    let cur = { pages: new Set<string>(), events: [] as Ev[] };
    for (const e of c.events) {
      const add = pagesOf(e).filter((p) => !cur.pages.has(p));
      if (cur.pages.size + add.length > maxPages && cur.events.length) {
        batches.push(cur);
        cur = { pages: new Set(), events: [] };
      }
      pagesOf(e).forEach((p) => cur.pages.add(p));
      cur.events.push(e);
    }
    batches.push(cur);
    continue;
  }
  const fit = batches.find((b) => b.pages.size + c.pages.size <= maxPages);
  if (fit) {
    c.pages.forEach((p) => fit.pages.add(p));
    fit.events.push(...c.events);
  } else batches.push({ pages: new Set(c.pages), events: [...c.events] });
}

mkdirSync(outDir, { recursive: true });
batches.forEach((b, i) => {
  const lines = ['## Pages', ''];
  for (const p of b.pages) lines.push(`- ${p}: ${data.sources[p].url}`);
  lines.push('', '## Descriptions', '');
  for (const e of b.events) {
    lines.push(`### ${e.uuid}: ${e.title}`, '', e.descr!, '');
    for (const s of e.sources ?? []) {
      lines.push(`- cites ${s.sourceKey}${isWiki(s.sourceKey) ? '' : ' (not Wikipedia)'}${s.sourceLocation ? `: ${s.sourceLocation}` : ''}`);
    }
    lines.push('');
  }
  writeFileSync(join(outDir, `batch-${String(i + 1).padStart(2, '0')}.md`), lines.join('\n'));
});
console.log(`${events.length} descriptions, ${batches.length} batches of up to ${maxPages} pages`);
if (noPages.length) console.log(`no Wikipedia source: ${noPages.map((e) => e.uuid).join(', ')}`);
