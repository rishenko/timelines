// Row links: each row's Wikipedia article and Wikidata id. The proposal step (scripts/row-links.ts) looks pages up
// on the Wikipedia API; the plan (data-src/<short>-row-links.json) records the decisions, and applyRowLinks puts them
// on the rows (run by \`npm run data -- importance\` and \`run-all\`, after the content scripts).

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'timelines-data-script/1.0 (https://github.com/rishenko/timelines)';
/** Templates that mark AI-generated text (or sources found by AI) on a page. */
const AI_TEMPLATES = [
  'Template:AI-generated',
  'Template:AI-generated section',
  'Template:AI-generated span',
  'Template:AI-generated inline',
  'Template:AI-retrieved source',
];

type Json = Record<string, any>;
export interface PageInfo {
  title: string;
  wikidata?: string;
  missing?: boolean;
  disambiguation?: boolean;
  ai?: string[];
  description?: string;
}
/** Decisions per row id: the article (and its Wikidata id), or null for a row that gets no link. */
export type RowLinkPlan = Record<string, { page: string; wikidata?: string } | null>;

export const pageUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/')}`;
export const titleFromUrl = (url: string) => {
  const m = /^https?:\/\/en\.wikipedia\.org\/wiki\/([^#?]+)/.exec(url);
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<Json> {
  const q = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}?${q}`, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (attempt === 3) throw new Error(`Wikipedia API: ${res.status} ${res.statusText}`);
    await sleep(2000 * (attempt + 1));
  }
}

const info = (p: Json): PageInfo => ({
  title: p.title,
  ...(p.pageprops?.wikibase_item ? { wikidata: p.pageprops.wikibase_item } : {}),
  ...(p.missing ? { missing: true } : {}),
  ...(p.pageprops && 'disambiguation' in p.pageprops ? { disambiguation: true } : {}),
  ...(p.templates?.length ? { ai: p.templates.map((t: Json) => t.title) } : {}),
  ...(p.description ? { description: p.description } : {}),
});
const pageParams = {
  prop: 'pageprops|templates|description',
  ppprop: 'wikibase_item|disambiguation',
  tltemplates: AI_TEMPLATES.join('|'),
  tllimit: 'max',
};

/** Looks up pages by title (following redirects). Returns a map from each asked title to its page. */
export async function lookUp(titles: string[]): Promise<Map<string, PageInfo>> {
  const out = new Map<string, PageInfo>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const r = await api({ action: 'query', titles: batch.join('|'), redirects: '1', ...pageParams });
    const to = new Map<string, string>();
    for (const n of r.query?.normalized ?? []) to.set(n.from, n.to);
    for (const d of r.query?.redirects ?? []) to.set(d.from, d.to);
    const pages = new Map<string, PageInfo>((r.query?.pages ?? []).map((p: Json) => [p.title, info(p)]));
    for (const t of batch) {
      let x = t;
      for (let k = 0; k < 3 && to.has(x); k++) x = to.get(x)!;
      out.set(t, pages.get(x) ?? { title: t, missing: true });
    }
    await sleep(200);
  }
  return out;
}

/** The top few search results for a row name. */
export async function search(text: string): Promise<PageInfo[]> {
  const r = await api({ action: 'query', generator: 'search', gsrsearch: text, gsrlimit: '3', gsrnamespace: '0', ...pageParams });
  await sleep(150);
  return ((r.query?.pages ?? []) as Json[]).sort((a, b) => a.index - b.index).map(info);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/^the /, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
/** True when a page title plainly names the row (ignoring case, accents, "the" and parentheses). */
export const sameName = (row: string, title: string) => norm(row) === norm(title);

/** The plan in row order, so its diffs read well. */
export function sortPlan(plan: RowLinkPlan, tracks: Json[]): RowLinkPlan {
  return Object.fromEntries(tracks.filter((t) => t.id in plan).map((t) => [t.id, plan[t.id]]));
}


/** The plan file's text: one row per line, in row order. */
export function planText(plan: RowLinkPlan, tracks: Json[]): string {
  const lines = Object.entries(sortPlan(plan, tracks)).map(([id, v]) => `  ${JSON.stringify(id)}: ${v ? JSON.stringify(v).replace(/^\{/, '{ ').replace(/\}$/, ' }').replace(/,"/g, ', "').replace(/":/g, '": ') : 'null'}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

/** Puts the plan's links on the rows (in place): `url` and `ids.wikidata`, or neither for a row planned as null. */
export function applyRowLinks(tracks: Json[], plan: RowLinkPlan) {
  tracks.forEach((t, i) => {
    if (!(t.id in plan)) return;
    const p = plan[t.id];
    const { url: _url, ids: oldIds, span, phases, ...rest } = t;
    const ids = { ...oldIds };
    delete ids.wikidata;
    if (p?.wikidata) ids.wikidata = p.wikidata;
    // url and ids sit with the row's name and colour, before its lifespan and phases
    tracks[i] = {
      ...rest,
      ...(p ? { url: pageUrl(p.page) } : {}),
      ...(Object.keys(ids).length ? { ids } : {}),
      ...(span !== undefined ? { span } : {}),
      ...(phases !== undefined ? { phases } : {}),
    };
  });
}
