// A timeline's map file (public/maps/<id>.json, built by scripts/map/build-map.ts): the land, and per row its
// borders through time, its location and a map image. Loaded only when a reader opens an event, once per file.

/** A polygon ring as [lon1, lat1, lon2, lat2, …]. */
export type FlatRing = number[];

export interface Border {
  /** Astronomical years, inclusive. */
  from: number;
  to: number;
  /** The polity's name in the source (Cliopatria). */
  name: string;
  /** Index into MapData.shapes. */
  shape: number;
}

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

export interface RowMap {
  borders?: Border[];
  /** [lon, lat] */
  point?: [number, number];
  map?: MapImage;
}

export interface MapData {
  credits: { text: string; url?: string }[];
  land: FlatRing[];
  shapes: FlatRing[][];
  rows: Record<string, RowMap>;
}

const cache = new Map<string, Promise<MapData>>();

/** Loads a map file once; a failed load is forgotten, so the next event tries again. */
export function loadMap(url: string): Promise<MapData> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json() as Promise<MapData>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** Map images are shown only from Wikimedia's servers (the build writes nothing else). */
export const isWikimediaImage = (u: string) => /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(u);

/** The row's borders that hold in a year. */
export const bordersIn = (row: RowMap | undefined, year: number) => (row?.borders ?? []).filter((b) => b.from <= year && year <= b.to);

/**
 * The year to map an event in: the first year of its range (start to end, inclusive) in which one of its rows has
 * borders; the start when none does (the map then shows the rows' locations).
 */
export function mapYear(data: MapData, rowIds: string[], start: number, end = start): number {
  let first = Infinity;
  for (const id of rowIds)
    for (const b of data.rows[id]?.borders ?? []) if (b.to >= start && b.from <= end && b.from < first) first = b.from;
  return first === Infinity ? start : Math.max(start, first);
}

/** What the map shows for an event's rows in a year: borders where there are some, else a location, else an image. */
export function rowsAt(data: MapData, rowIds: string[], year: number) {
  return rowIds.map((id) => {
    const row = data.rows[id];
    const borders = bordersIn(row, year);
    return { id, borders, point: borders.length ? undefined : row?.point, image: borders.length ? undefined : row?.map };
  });
}

type Box = [number, number, number, number]; // west, south, east, north

/** The bounding box of flat rings. */
export function ringsBox(rings: FlatRing[], box?: Box): Box {
  let [w, s, e, n] = box ?? [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings)
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < w) w = r[i];
      if (r[i] > e) e = r[i];
      if (r[i + 1] < s) s = r[i + 1];
      if (r[i + 1] > n) n = r[i + 1];
    }
  return [w, s, e, n];
}

/**
 * The view around a box: padded, at least `minSpan` degrees tall, widened or heightened to the aspect ratio
 * (width / height, in projected units where a degree of longitude is cos(latitude) of a degree of latitude).
 */
export function viewAround(box: Box, aspect: number, minSpan = 14): { box: Box; k: number } {
  let [w, s, e, n] = box;
  const cx = (w + e) / 2, cy = (s + n) / 2;
  const k = Math.cos((Math.max(-70, Math.min(70, cy)) * Math.PI) / 180);
  let h = Math.max((n - s) * 1.5, minSpan);
  let wd = Math.max((e - w) * 1.5, minSpan / k);
  if ((wd * k) / h > aspect) h = (wd * k) / aspect;
  else wd = (h * aspect) / k;
  h = Math.min(h, 160);
  wd = Math.min(wd, 360);
  [w, e, s, n] = [cx - wd / 2, cx + wd / 2, cy - h / 2, cy + h / 2];
  return { box: [w, s, e, n], k };
}

/** An SVG path for flat rings, in raw lon/lat (the view flips and scales it). */
export function ringsPath(rings: FlatRing[]): string {
  let d = '';
  for (const r of rings) {
    d += `M${r[0]},${r[1]}`;
    for (let i = 2; i < r.length; i += 2) d += `L${r[i]},${r[i + 1]}`;
    d += 'Z';
  }
  return d;
}
