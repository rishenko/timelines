// Fetches the map facts the build needs from Wikipedia (and Wikidata), for every row of a timeline:
// - the row's location: the coordinates of its Wikipedia article, or else its Wikidata coordinate (P625);
// - the article's infobox map image (image_map / map_image / map …), with its caption, licence and author from
//   Wikimedia Commons, for rows the map can't draw from Cliopatria.
// Pages with an AI-generated-text template are recorded as flagged and give nothing (docs/development.md, sources).
//
//   npm run map:fetch                    writes data-src/ancient-classical-places.json
//
// The output is committed, so `npm run map:build` works offline. Re-run this to refresh it.
import { readFileSync, writeFileSync } from 'node:fs';
import { AI_TEMPLATES, UA, api, sleep, titleFromUrl } from '../lib/row-links.ts';
import { sourceTimeline } from '../lib/timelines.ts';

type Json = Record<string, any>;
export interface MapImage {
  file: string;
  caption?: string;
  thumb: string;
  width: number;
  height: number;
  descriptionUrl: string;
  license?: string;
  licenseUrl?: string;
  artist?: string;
}
export interface RowPlace {
  page?: string;
  /** wikipedia: the article's coordinates; wikipedia-map: the first mark on its infobox location map; wikidata: P625 */
  point?: { lat: number; lon: number; from: 'wikipedia' | 'wikipedia-map' | 'wikidata' };
  map?: MapImage;
  /** AI-generated-text templates on the page; a flagged page gives no point or map. */
  ai?: string[];
}

const MAP_PARAMS = ['image_map', 'map_image', 'image_map1', 'map', 'image_map2', 'territory_map', 'overlay_image'];
const CAPTION_PARAMS = ['image_map_caption', 'map_caption', 'image_map1_caption'];
const IMAGE_FILE = /\.(png|svg|jpe?g|gif|webp)$/i;
/** Marker icons used inside location maps, not maps. */
const MARKER = /^(red|blue|green|black)?\s*(circle|dot|pog|marker|pin)\b|\b(dot|circle|marker)\s*\d*%?\.svg$/i;
const round = (n: number) => Math.round(n * 1e4) / 1e4;
const plain = (html?: string) =>
  html?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim() || undefined;

/** The value of an infobox parameter, or undefined. Stops at the next parameter or the end of the line. */
function param(wikitext: string, names: string[]): string | undefined {
  for (const n of names) {
    const m = new RegExp(`\\|\\s*${n}\\s*=([^\\n]*)`, 'i').exec(wikitext);
    const v = m?.[1].trim();
    if (v) return v;
  }
}
/** A file name from an infobox value: a bare name, or the first [[File:…]] inside it. */
function fileName(v: string | undefined): string | undefined {
  if (!v) return;
  const link = /\[\[\s*(?:File|Image)\s*:\s*([^|\]]+)/i.exec(v);
  // {{!}} is an escaped | (e.g. "Map.svg{{!}}class=skin-invert")
  const name = (link ? link[1] : v.replace(/\{\{!\}\}/g, '|').split('|')[0]).replace(/^(File|Image):/i, '').trim();
  return IMAGE_FILE.test(name) && !MARKER.test(name.replace(/_/g, ' ')) ? name.replace(/_/g, ' ') : undefined;
}
/**
 * The mark on an infobox location map ({{Location map …}} / {{Location map+ …}}), when the map has exactly one:
 * lat/long in decimal degrees, or lat_deg/lat_min/lat_dir and lon_deg/lon_min/lon_dir. Maps with several marks
 * (sites, neighbours, labels) are skipped, since nothing says which one is the row.
 */
function locationMapMark(wikitext: string): { lat: number; lon: number } | undefined {
  const at = wikitext.search(/\{\{\s*Location map/i);
  if (at === -1) return;
  // the whole template, by matching braces
  let depth = 0, end = at;
  for (; end < wikitext.length; end++) {
    if (wikitext.startsWith('{{', end)) {
      depth++;
      end++;
    }
    else if (wikitext.startsWith('}}', end)) {
      depth--;
      end++;
      if (depth === 0) break;
    }
  }
  const block = wikitext.slice(at, end + 1);
  if ((block.match(/\|\s*(lat|lat_deg)\s*=\s*-?[\d.]/gi) ?? []).length !== 1) return;
  const num = (name: string) => {
    const m = new RegExp(`\\|\\s*${name}\\s*=\\s*(-?[\\d.]+)`, 'i').exec(block);
    return m ? Number(m[1]) : undefined;
  };
  const dir = (name: string) => /^\s*[SW]/i.test(new RegExp(`\\|\\s*${name}\\s*=\\s*([NSEW])`, 'i').exec(block)?.[1] ?? '') ? -1 : 1;
  let lat = num('lat'), lon = num('long') ?? num('lon');
  if (lat === undefined || lon === undefined) {
    const ld = num('lat_deg'), od = num('lon_deg');
    if (ld === undefined || od === undefined) return;
    lat = dir('lat_dir') * (Math.abs(ld) + (num('lat_min') ?? 0) / 60);
    lon = dir('lon_dir') * (Math.abs(od) + (num('lon_min') ?? 0) / 60);
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
  return { lat: round(lat), lon: round(lon) };
}

/** Caption text without wiki markup. */
function caption(v: string | undefined): string | undefined {
  if (!v) return;
  const s = v
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s || undefined;
}

async function wikidataCoords(ids: string[]): Promise<Map<string, { lat: number; lon: number }>> {
  const out = new Map<string, { lat: number; lon: number }>();
  for (let i = 0; i < ids.length; i += 50) {
    const q = new URLSearchParams({ action: 'wbgetentities', format: 'json', props: 'claims', ids: ids.slice(i, i + 50).join('|') });
    let r: Json | undefined;
    for (let attempt = 0; !r; attempt++) {
      const res = await fetch(`https://www.wikidata.org/w/api.php?${q}`, { headers: { 'User-Agent': UA } });
      if (res.ok) r = await res.json();
      else if (attempt === 5) throw new Error(`Wikidata API: ${res.status}`);
      else await sleep(Number(res.headers.get('retry-after')) * 1000 || 5000 * (attempt + 1));
    }
    for (const e of Object.values(r!.entities ?? {}) as Json[]) {
      const v = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if (v) out.set(e.id, { lat: round(v.latitude), lon: round(v.longitude) });
    }
    await sleep(1000);
  }
  return out;
}

async function imageInfo(files: string[]): Promise<Map<string, Omit<MapImage, 'caption'>>> {
  const out = new Map<string, Omit<MapImage, 'caption'>>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const r = await api({
      action: 'query',
      titles: batch.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '800',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist',
    });
    const to = new Map<string, string>((r.query?.normalized ?? []).map((n: Json) => [n.to, n.from]));
    for (const p of r.query?.pages ?? []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const asked = (to.get(p.title) ?? p.title).replace(/^File:/, '');
      const m = ii.extmetadata ?? {};
      out.set(asked, {
        file: p.title.replace(/^File:/, ''),
        thumb: String(ii.thumburl ?? ii.url).replace(/\?.*$/, ''), // without the utm_ tracking query
        width: ii.thumbwidth ?? ii.width,
        height: ii.thumbheight ?? ii.height,
        descriptionUrl: ii.descriptionurl,
        ...(plain(m.LicenseShortName?.value) ? { license: plain(m.LicenseShortName?.value) } : {}),
        ...(m.LicenseUrl?.value ? { licenseUrl: m.LicenseUrl.value } : {}),
        ...(plain(m.Artist?.value) ? { artist: plain(m.Artist?.value) } : {}),
      });
    }
    await sleep(500);
  }
  return out;
}

{
  const t = sourceTimeline(process.argv[2] ?? 'ancient-classical');
  const out = `data-src/${t.short}-places.json`;
  const tracks: Json[] = JSON.parse(readFileSync(t.compiled, 'utf8')).tracks;
  const rows: Record<string, RowPlace> = {};
  const byTitle = new Map<string, string[]>();
  for (const tr of tracks) {
    const title = tr.url ? titleFromUrl(tr.url) : null;
    rows[tr.id] = {};
    if (title) byTitle.set(title, [...(byTitle.get(title) ?? []), tr.id]);
  }

  const titles = [...byTitle.keys()];
  const wanted = new Map<string, { rows: string[]; caption?: string }>();
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const r = await api({
      action: 'query',
      titles: batch.join('|'),
      redirects: '1',
      prop: 'coordinates|templates|revisions',
      tltemplates: AI_TEMPLATES.join('|'),
      tllimit: 'max',
      rvprop: 'content',
      rvslots: 'main',
    });
    const to = new Map<string, string>();
    for (const n of r.query?.normalized ?? []) to.set(n.from, n.to);
    for (const d of r.query?.redirects ?? []) to.set(d.from, d.to);
    const pages = new Map<string, Json>((r.query?.pages ?? []).map((p: Json) => [p.title, p]));
    for (const asked of batch) {
      let x = asked;
      for (let k = 0; k < 3 && to.has(x); k++) x = to.get(x)!;
      const p = pages.get(x);
      if (!p || p.missing) continue;
      for (const id of byTitle.get(asked)!) {
        const row = rows[id];
        row.page = p.title;
        if (p.templates?.length) {
          row.ai = p.templates.map((tt: Json) => tt.title);
          continue;
        }
        const c = p.coordinates?.[0];
        const text: string = p.revisions?.[0]?.slots?.main?.content ?? '';
        const mark = c ? undefined : locationMapMark(text);
        if (c) row.point = { lat: round(c.lat), lon: round(c.lon), from: 'wikipedia' };
        else if (mark) row.point = { ...mark, from: 'wikipedia-map' };
        const file = fileName(param(text, MAP_PARAMS));
        if (file) {
          const w = wanted.get(file) ?? { rows: [] };
          w.rows.push(id);
          w.caption ??= caption(param(text, CAPTION_PARAMS));
          wanted.set(file, w);
        }
      }
    }
    await sleep(1000);
  }

  const needWd = tracks.filter((tr) => !rows[tr.id].point && !rows[tr.id].ai && tr.ids?.wikidata);
  const wd = await wikidataCoords([...new Set(needWd.map((tr) => tr.ids.wikidata as string))]);
  for (const tr of needWd) {
    const c = wd.get(tr.ids.wikidata);
    if (c) rows[tr.id].point = { ...c, from: 'wikidata' };
  }

  const images = await imageInfo([...wanted.keys()]);
  for (const [file, w] of wanted) {
    const img = images.get(file);
    if (img) for (const id of w.rows) rows[id].map = { ...img, ...(w.caption ? { caption: w.caption } : {}) };
  }

  const lines = Object.entries(rows).map(([id, r]) => `    ${JSON.stringify(id)}: ${JSON.stringify(r)}`);
  writeFileSync(out, `{\n  "fetched": "${new Date().toISOString().slice(0, 10)}",\n  "rows": {\n${lines.join(',\n')}\n  }\n}\n`);
  const v = Object.values(rows);
  console.log(
    `${out}: ${v.length} rows; points ${v.filter((r) => r.point).length} (wikipedia ${v.filter((r) => r.point?.from === 'wikipedia').length}), ` +
      `maps ${v.filter((r) => r.map).length}, AI-flagged ${v.filter((r) => r.ai).length}`,
  );
}
