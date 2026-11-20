// Helpers for scripted additions to a timeline source file (data-src/*.json). Everything is an
// upsert keyed by id: re-running an additions script replaces what it added before, so the script
// can be edited and run again. Placement (before/after) applies only when a row is first added.
//
//   import { open } from './lib/dataset-edit.ts';
//   const ed = open('data-src/ancient-classical.json');
//   ed.wikipedia('wp-stonehenge', 'Stonehenge', 'Stonehenge');
//   ed.track({ id: 'europe', name: 'Europe', color: '#…' }, { before: 'aegean' });
//   ed.event({ uuid: 'stonehenge', title: '…', start: 'c. 3100 BCE', tracks: ['megaliths'], descr: '…',
//              sources: [S('wp-stonehenge', 'lead')], startDates: [C(3100, 'wp-stonehenge', 'lead')] });
//   ed.save();
import { readSource, writeSource } from './source-format.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

/** A citation: { sourceKey, sourceLocation }. */
export const S = (sourceKey: string, sourceLocation: string) => ({ sourceKey, sourceLocation });

/** Years as numbers are BCE; pass a string ("150 CE", "c. 1200 BCE") for anything else. */
export const yr = (y: number | string) => (typeof y === 'number' ? `${y} BCE` : y);

/**
 * A date claim: what one source says a date is. `margin` is ± years (a range "1627–1600" is 1614 ± 14);
 * `chron` names the chronology the claim belongs to.
 */
export const C = (y: number | string, sourceKey: string, loc: string, o: { margin?: number; chron?: string; note?: string } = {}) => ({
  year: yr(y),
  ...(o.margin ? { margin: o.margin } : {}),
  ...(o.chron ? { chronology: o.chron } : {}),
  source: S(sourceKey, loc),
  ...(o.note ? { note: o.note } : {}),
});

/** A claim for a range on the page: stored as its midpoint ± half the width. */
export const R = (from: number, to: number, sourceKey: string, loc: string, o: { chron?: string; note?: string } = {}) => {
  const mid = Math.round((from + to) / 2);
  return C(mid, sourceKey, loc, { ...o, margin: Math.abs(from - mid) });
};

/** A CE range on the page (years after the epoch), stored as its midpoint ± half the width. */
export const RCE = (from: number, to: number, sourceKey: string, loc: string, o: { chron?: string; note?: string } = {}) => {
  const mid = Math.round((from + to) / 2);
  return C(`${mid} CE`, sourceKey, loc, { ...o, margin: Math.abs(from - mid) });
};

export function open(file: string, accessed = new Date().toISOString().slice(0, 10)) {
  const d: Json = readSource(file);
  const log: string[] = [];
  const trackIdx = (id: string) => d.tracks.findIndex((t: Json) => t.id === id);

  const ed = {
    data: d,
    /** Adds or replaces a Wikipedia source. `slug` is the part after /wiki/. */
    wikipedia(key: string, title: string, slug: string) {
      const had = !!d.sources[key];
      d.sources[key] = { name: `Wikipedia: ${title}`, url: `https://en.wikipedia.org/wiki/${slug}`, tags: ['wikipedia'], accessed };
      if (!had) log.push(`+ source ${key}`);
    },
    /** Adds or replaces a row. New rows go before/after the given row, else at the end. */
    track(t: Json, where: { before?: string; after?: string } = {}) {
      const i = trackIdx(t.id);
      if (i >= 0) {
        // keep a parent set by a later script (as archive/scripts/additions/groups.ts did, nesting regions into groups)
        if (t.parent === undefined && d.tracks[i].parent !== undefined) t = { ...t, parent: d.tracks[i].parent };
        d.tracks[i] = t;
        return;
      }
      const anchor = where.before ?? where.after;
      let at = d.tracks.length;
      if (anchor) {
        const j = trackIdx(anchor);
        if (j < 0) throw new Error(`track ${t.id}: no row "${anchor}" to place it next to`);
        at = where.before ? j : j + 1;
      }
      d.tracks.splice(at, 0, t);
      log.push(`+ track ${t.id}`);
    },
    /**
     * Adds a list of rows in order: the first goes before/after `where`, each next one after the
     * previous. Existing rows are replaced in place.
     */
    tracks(list: Json[], where: { before?: string; after?: string }) {
      let prev: string | undefined;
      for (const t of list) {
        ed.track(t, prev ? { after: prev } : where);
        prev = t.id;
      }
    },
    /** Adds or replaces an event. */
    event(e: Json) {
      const i = d.events.findIndex((x: Json) => x.uuid === e.uuid);
      if (i >= 0) {
        // keep importance set by the importance plan
        if (d.events[i].importance && e.importance === undefined) e.importance = d.events[i].importance;
        d.events[i] = e;
      } else {
        d.events.push(e);
        log.push(`+ event ${e.uuid}`);
      }
    },
    /** Puts an existing event on another row too. */
    addRow(uuid: string, trackId: string) {
      const e = d.events.find((x: Json) => x.uuid === uuid);
      if (!e) throw new Error(`no event ${uuid}`);
      if (!e.tracks.includes(trackId)) e.tracks.push(trackId);
    },
    save() {
      writeSource(file, d);
      console.log(log.length ? log.join('\n') : 'no new items (existing ones updated in place)');
    },
  };
  return ed;
}
