// `npm run data -- tree <timeline> <row> [--depth N] [--max N]`: a row's subtree as the app orders it, each row with
// its place among its siblings and the file that sets it (a generator module, a content script, or the source file
// itself), so finding where a row's parent or order comes from needs no reading of generators. Short by default: at
// most 20 lines, the rest summed up in one.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SourceTimeline } from './timelines.ts';

interface Row {
  id: string;
  name: string;
  parent?: string;
  kind?: string;
}

/** The subtree's lines: the row (with its parent and place), then its descendants depth-first, indented. */
export function treeLines(rows: Row[], id: string, o: { depth?: number; max?: number; origin?: (id: string) => string } = {}): string[] {
  const root = rows.find((r) => r.id === id);
  if (!root) throw new Error(`no row "${id}"`);
  const kids = (p: string | undefined) => rows.filter((r) => r.parent === p);
  const place = (r: Row) => {
    const sibs = kids(r.parent);
    return `#${sibs.indexOf(r) + 1}/${sibs.length}`;
  };
  const describe = (r: Row) => `${r.id} "${r.name}"${r.kind ? ` [${r.kind}]` : ''} ${place(r)}${o.origin ? ` · ${o.origin(r.id)}` : ''}`;
  const all: string[] = [`${describe(root)} · parent ${root.parent ?? '(top level)'}`];
  const walk = (p: string, depth: number) => {
    for (const k of kids(p)) {
      if (o.depth !== undefined && depth > o.depth) continue;
      all.push(`${'  '.repeat(depth)}${describe(k)}`);
      walk(k.id, depth + 1);
    }
  };
  walk(root.id, 1);
  const max = o.max ?? 20;
  return all.length <= max ? all : [...all.slice(0, max - 1), `… ${all.length - max + 1} more rows (--depth N or --max N)`];
}

/**
 * Where a row comes from: "set in" the first of the timeline's generator modules or content scripts that defines it
 * (`'id': 'x'`, `id: 'x'`, or the first item of a call or tuple, e.g. grp('x', …) or (('x', 'Name', …), …)); else "named in" the
 * first that mentions the id in quotes (a script that moves or edits it); else its source file (a row made by hand, or
 * by a script archived since).
 */
export function originFinder(t: SourceTimeline): (id: string) => string {
  const files = t.generator
    ? readdirSync(t.generator)
        .filter((f) => f.endsWith('.py'))
        .sort()
        .map((f) => join(t.generator!, f))
    : t.scripts;
  const text = files.map((f) => [f, readFileSync(f, 'utf8')] as const);
  return (id) => {
    const q = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const defines = new RegExp(`['"]?id['"]?\\s*:\\s*['"]${q}['"]|\\(\\s*['"]${q}['"]\\s*,`);
    const set = text.find(([, s]) => defines.test(s));
    if (set) return `set in ${set[0]}`;
    const named = text.find(([, s]) => s.includes(`'${id}'`) || s.includes(`"${id}"`));
    return named ? `named in ${named[0]}` : t.source;
  };
}
