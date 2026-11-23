/**
 * The "Colour-blind safe" preset's row colours. Row colours come from the data, and many of them (gold
 * Egypt, red-brown Kush) become the same olive for protan and deutan readers. While the preset is on, each row is drawn
 * in a colour from the Okabe-Ito palette (chosen to stay apart under protan, deutan and tritan) instead, chosen so
 * that no row shares a colour with the 3 rows above it in display order, nor looks like the 2 rows above it to a
 * colour-blind reader (CONFUSABLE), and otherwise as close in hue as possible to
 * its own colour, so the timeline stays familiar. Display only: the data's colours are unchanged.
 * Rows are spaced in the full display order (every track, collapsed and hidden ones too), so the colours stay put when
 * rows fold, filter or scroll; the cost is that two rows adjacent on screen, with hidden rows between them, can match.
 */
import type { Track } from '../types.ts';

/** Okabe & Ito (2008), without black (the Dark background), with a light grey for grey rows. */
export const CVD_PALETTE = ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#bbbbbb'];
const GREY = CVD_PALETTE.length - 1;
/** How many rows above a row must have a different colour. */
const SPREAD = 3;
/** How many rows above a row must also look different from it to a colour-blind reader (fallback: just the row above). */
const SEEN = 2;
/**
 * Palette pairs closer than ΔE 30 (CIELAB) under protan, deutan or tritan at full severity (Machado et al. 2009), so
 * they never sit within SEEN rows of each other: orange/yellow, orange/vermillion, sky/blue and so on. Computed with
 * that simulation.
 */
const CONFUSABLE = new Set(['0-3', '0-5', '0-6', '1-2', '1-4', '1-6', '2-4', '2-6', '2-7', '3-7', '4-6', '6-7']);
export const confusable = (a: number, b: number) => a === b || CONFUSABLE.has(a < b ? `${a}-${b}` : `${b}-${a}`);

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** How far a row colour is from a palette colour: hue distance, with greys only close to the grey. */
function distance(from: string, to: number): number {
  const [h1, s1] = hsl(from);
  if (s1 < 0.15) return to === GREY ? 0 : 200;
  if (to === GREY) return 200;
  const h2 = hsl(CVD_PALETTE[to])[0];
  const dh = Math.abs(h1 - h2);
  return Math.min(dh, 360 - dh);
}

/** Tracks in display order: each root, then its sub-rows depth first, in array order. */
export function displayOrder(tracks: Track[]): Track[] {
  const kids = new Map<string | undefined, Track[]>();
  const ids = new Set(tracks.map((t) => t.id));
  for (const t of tracks) {
    const p = t.parent && ids.has(t.parent) ? t.parent : undefined;
    kids.set(p, [...(kids.get(p) ?? []), t]);
  }
  const out: Track[] = [];
  const walk = (p: string | undefined) => {
    for (const t of kids.get(p) ?? []) {
      out.push(t);
      walk(t.id);
    }
  };
  walk(undefined);
  return out;
}

/** A colour from CVD_PALETTE for every track id. */
export function cvdColors(tracks: Track[]): Map<string, string> {
  const out = new Map<string, string>();
  const recent: number[] = [];
  for (const t of displayOrder(tracks)) {
    const ranked = CVD_PALETTE.map((_, i) => i).sort((a, b) => distance(t.color, a) - distance(t.color, b));
    const near = recent.slice(-SEEN);
    const pick =
      ranked.find((i) => !recent.includes(i) && near.every((j) => !confusable(i, j))) ??
      ranked.find((i) => !recent.includes(i) && (recent.length === 0 || !confusable(i, recent[recent.length - 1]))) ??
      ranked.find((i) => !recent.includes(i)) ??
      ranked[0];
    out.set(t.id, CVD_PALETTE[pick]);
    recent.push(pick);
    if (recent.length > SPREAD) recent.shift();
  }
  return out;
}

/** The data with its rows recoloured (same object when `on` is false). */
export function withCvdColors<D extends { tracks: Track[] }>(data: D, on: boolean): D {
  if (!on) return data;
  const map = cvdColors(data.tracks);
  return { ...data, tracks: data.tracks.map((t) => ({ ...t, color: map.get(t.id) ?? t.color })) };
}
