// Builds the map file the app loads when a reader opens an event's map: public/maps/<short>.json.
//
//   npm run map:build
//
// Inputs:
// - data-src/<short>-map.json, the plan: which Cliopatria polities draw each row (see its "about");
// - data-src/<short>-places.json, each row's Wikipedia location and map image (written by `npm run map:fetch`);
// - Cliopatria (Seshat Global History Databank, CC BY 4.0) and Natural Earth land (public domain), downloaded once
//   into .cache/map/ from the pinned URLs in the plan (Cliopatria's zip is checked against its sha256).
//
// Output: the land, then for each row its borders (Cliopatria polygons with the years they hold, cut to the row's
// lifespan and simplified), its point and its map image. Polygons repeated across years are stored once.
// Also writes docs/<short>-map.md, the coverage report: which rows get borders, a point, an image, or nothing.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { sourceTimeline } from '../lib/timelines.ts';
import { titleFromUrl } from '../lib/row-links.ts';
import type { RowPlace } from './fetch-places.ts';

type Json = Record<string, any>;
type Ring = [number, number][];
const CACHE = '.cache/map';
/** Simplification tolerance in degrees (about 5 km), and the precision kept (0.01°, about 1 km). */
const TOLERANCE = 0.05;
const r2 = (n: number) => Math.round(n * 100) / 100;

async function download(url: string, file: string, sha256?: string) {
  if (!existsSync(file)) {
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  if (sha256) {
    const got = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (got !== sha256) throw new Error(`${file}: sha256 ${got}, expected ${sha256} (delete it to download again)`);
  }
}

/** Douglas–Peucker on a closed ring; keeps the first point. */
function simplify(ring: Ring, tol: number): Ring {
  if (ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [[0, ring.length - 1]];
  // A closed ring's first and last points are the same, so split it at the point farthest from the first.
  let far = 0, farD = -1;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  keep[far] = 1;
  stack.pop();
  stack.push([0, far], [far, ring.length - 1]);
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = ring[a], [bx, by] = ring[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let best = -1, bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = ring[i];
      const d = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== -1) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

/** A geometry's rings, simplified, rounded and flattened ([x1, y1, x2, y2, …]); tiny rings dropped. */
function rings(g: Json): number[][] {
  const polys: Ring[][] = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  const out: number[][] = [];
  for (const poly of polys)
    for (const ring of poly) {
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      if (Math.max(...xs) - Math.min(...xs) < TOLERANCE * 2 && Math.max(...ys) - Math.min(...ys) < TOLERANCE * 2) continue;
      const s = simplify(ring, TOLERANCE);
      const flat: number[] = [];
      for (const [x, y] of s) {
        const rx = r2(x), ry = r2(y);
        if (flat.length && flat[flat.length - 2] === rx && flat[flat.length - 1] === ry) continue;
        flat.push(rx, ry);
      }
      if (flat.length >= 8) out.push(flat);
    }
  return out;
}

/** Cliopatria years count BCE as negative with no year 0; the timeline stores astronomical years (1 BCE = 0). */
const astro = (y: number) => (y < 0 ? y + 1 : y);
const norm = (s: string) => s.replace(/_/g, ' ').trim().toLowerCase();

{
  const t = sourceTimeline(process.argv[2] ?? 'ancient-classical');
  const plan: Json = JSON.parse(readFileSync(`data-src/${t.short}-map.json`, 'utf8'));
  const places: Record<string, RowPlace> = JSON.parse(readFileSync(`data-src/${t.short}-places.json`, 'utf8')).rows;
  const tracks: Json[] = JSON.parse(readFileSync(t.compiled, 'utf8')).tracks;

  mkdirSync(CACHE, { recursive: true });
  const zip = `${CACHE}/cliopatria-${plan.cliopatria.version}.zip`;
  await download(plan.cliopatria.url, zip, plan.cliopatria.sha256);
  const dir = `${CACHE}/cliopatria-${plan.cliopatria.version}`;
  if (!existsSync(dir)) {
    mkdirSync(dir);
    const r = spawnSync('tar', ['-xf', zip, '-C', dir], { encoding: 'utf8' });
    if (r.status !== 0) {
      const u = spawnSync('unzip', ['-o', '-q', zip, '-d', dir], { encoding: 'utf8' });
      if (u.status !== 0) throw new Error(`could not unzip ${zip}: ${r.stderr}${u.stderr}`);
    }
  }
  const geo = spawnSync('ls', [dir], { encoding: 'utf8' }).stdout.split('\n').find((f) => f.endsWith('.geojson'));
  if (!geo) throw new Error(`no .geojson in ${dir}`);
  const clio: Json[] = JSON.parse(readFileSync(`${dir}/${geo}`, 'utf8')).features;
  const landFile = `${CACHE}/land.geojson`;
  await download(plan.land.url, landFile);
  const land: Json[] = JSON.parse(readFileSync(landFile, 'utf8')).features;

  const known = new Set(clio.map((f) => f.properties.Name));
  for (const [id, names] of Object.entries({ ...plan.add, ...plan.skip }) as [string, string[]][]) {
    if (!tracks.some((tr) => tr.id === id)) throw new Error(`plan: no row "${id}"`);
    for (const n of names) if (!known.has(n)) throw new Error(`plan: no Cliopatria polity "${n}" (row ${id})`);
  }

  const shapes: number[][][] = [];
  const shapeIndex = new Map<string, number>();
  const shapeOf = (g: Json) => {
    const key = JSON.stringify(g.coordinates);
    let i = shapeIndex.get(key);
    if (i === undefined) {
      const rs = rings(g);
      i = rs.length ? shapes.push(rs) - 1 : -1;
      shapeIndex.set(key, i);
    }
    return i;
  };

  const rows: Record<string, Json> = {};
  const report: { id: string; name: string; borders: string[]; years: number; span: number; point?: string; image?: string; ai?: boolean }[] = [];
  // The plan's "rows" limits the build to those rows (the pilot); without it every row is built.
  const only: Set<string> | null = plan.rows ? new Set(plan.rows) : null;
  for (const tr of tracks) {
    if (!tr.span || (only && !only.has(tr.id))) continue;
    const start = tr.span.start, end = tr.span.end ?? tr.span.start;
    const wd = tr.ids?.wikidata;
    const title = tr.url ? norm(titleFromUrl(tr.url) ?? '') : '';
    const add = new Set<string>(plan.add[tr.id] ?? []), skip = new Set<string>(plan.skip[tr.id] ?? []);
    const borders: Json[] = [];
    const names = new Set<string>();
    for (const f of clio) {
      const p = f.properties;
      if (!f.geometry || p.Name.startsWith('(') || skip.has(p.Name)) continue;
      if (!(add.has(p.Name) || (wd && p.Wikidata === wd) || (title && norm(p.Wikipedia ?? '') === title))) continue;
      const from = Math.max(astro(p.FromYear), start), to = Math.min(astro(p.ToYear), end);
      if (from > to) continue;
      const shape = shapeOf(f.geometry);
      if (shape === -1) continue;
      borders.push({ from, to, name: p.Name, shape });
      names.add(p.Name);
    }
    borders.sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
    const place = places[tr.id] ?? {};
    const row: Json = {};
    if (borders.length) row.borders = borders;
    if (place.point) row.point = [place.point.lon, place.point.lat];
    if (place.map) row.map = place.map;
    if (Object.keys(row).length) rows[tr.id] = row;
    const covered = new Set<number>();
    for (const b of borders) for (let y = b.from; y <= b.to; y++) covered.add(y);
    report.push({
      id: tr.id, name: tr.name, borders: [...names], years: covered.size, span: end - start + 1,
      ...(place.point ? { point: place.point.from } : {}), ...(place.map ? { image: place.map.file } : {}), ...(place.ai ? { ai: true } : {}),
    });
  }

  const landRings = land.flatMap((f) => rings(f.geometry));
  const credits = [
    { text: `Borders: Cliopatria ${plan.cliopatria.version}, Seshat Global History Databank (CC BY 4.0); simplified and cut to each row's lifespan`, url: 'https://github.com/Seshat-Global-History-Databank/cliopatria' },
    { text: 'Land: Natural Earth (public domain)', url: 'https://www.naturalearthdata.com/' },
    { text: 'Locations and map images: Wikipedia and Wikimedia Commons (each image credits its author and licence)', url: 'https://commons.wikimedia.org/' },
  ];
  const out = `public/maps/${t.short}.json`;
  mkdirSync('public/maps', { recursive: true });
  const rowLines = Object.entries(rows).map(([id, r]) => `    ${JSON.stringify(id)}: ${JSON.stringify(r)}`);
  writeFileSync(
    out,
    `{\n  "credits": ${JSON.stringify(credits)},\n  "land": ${JSON.stringify(landRings)},\n  "shapes": [\n${shapes.map((s) => `    ${JSON.stringify(s)}`).join(',\n')}\n  ],\n  "rows": {\n${rowLines.join(',\n')}\n  }\n}\n`,
  );

  // Coverage report.
  const withBorders = report.filter((r) => r.borders.length);
  const pointOnly = report.filter((r) => !r.borders.length && r.point);
  const imageOnly = report.filter((r) => !r.borders.length && !r.point && r.image);
  const nothing = report.filter((r) => !r.borders.length && !r.point && !r.image);
  const pct = (r: (typeof report)[number]) => Math.round((100 * r.years) / r.span);
  const md = [
    `# Map coverage: ${t.short}`,
    '',
    `Generated by \`npm run map:build\` from \`data-src/${t.short}-map.json\` and \`data-src/${t.short}-places.json\`; don't edit by hand.`,
    '',
    `Rows with a lifespan: ${report.length}. Borders from Cliopatria: ${withBorders.length}. A Wikipedia location only: ${pointOnly.length}. A map image only: ${imageOnly.length}. Nothing: ${nothing.length}.`,
    `Map images (shown in an event's map when its row has no borders that year): ${report.filter((r) => r.image).length} rows.`,
    '',
    '## Rows with borders',
    '',
    '| Row | Cliopatria polities | Years of the lifespan with borders |',
    '|---|---|---|',
    ...withBorders.map((r) => `| ${r.name} (\`${r.id}\`) | ${r.borders.join(', ')} | ${pct(r)}% |`),
    '',
    '## Rows with a location only',
    '',
    pointOnly.map((r) => `${r.name}${r.image ? ' (+ map image)' : ''}`).join('; ') + '.',
    '',
    '## Rows with a map image only',
    '',
    (imageOnly.map((r) => r.name).join('; ') || 'None') + '.',
    '',
    '## Rows with nothing',
    '',
    nothing.map((r) => `${r.name}${r.ai ? ' (page flagged for AI text)' : ''}`).join('; ') + '.',
    '',
  ].join('\n');
  writeFileSync(`docs/${t.short}-map.md`, md);

  const size = readFileSync(out).length;
  console.log(
    `${out}: ${(size / 1024).toFixed(0)} KB, ${shapes.length} shapes, ${landRings.length} land rings; rows: ${withBorders.length} borders, ` +
      `${pointOnly.length} location only, ${imageOnly.length} image only, ${nothing.length} nothing; wrote docs/${t.short}-map.md`,
  );
}
