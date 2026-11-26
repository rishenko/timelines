// Groups profile.ts JSON lines for scripts/perf/summarize.ts: one table per label, profile and timeline, medians over runs.
// A run is told apart by its invocation (`started`) as well as its index, so files built from repeated `--runs 1` calls
// (interleaved A/B rounds) count every round. Older files have no `started` and fall back to the index alone.

export type PerfRow = Record<string, string | number | boolean | undefined>;
export type PerfGroup = { label: string; profile: string; timeline: string; runs: number; rows: PerfRow[] };

/** The lower median (an even count takes the lower middle value), as the baseline tables have always used. */
export const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
const runKey = (r: PerfRow) => `${r.started ?? ''}#${r.run}`;

/** Drops load-detail rows. In older files (no `started`) a repeated zoom step within one run is renamed "zoom back to default":
 *  they named the last step like the sweep's own step. Newer files name it themselves, so their steps are kept as they are. */
export function normalize(rows: PerfRow[]): PerfRow[] {
  const seen = new Set<string>();
  return rows
    .filter((r) => r.step !== 'load-detail')
    .map((r) => {
      const k = `${r.label ?? ''}|${r.profile}|${r.timeline}|${runKey(r)}|${r.step}`;
      const out = r.started === undefined && seen.has(k) && String(r.step).startsWith('zoom') ? { ...r, step: 'zoom back to default' } : r;
      seen.add(k);
      return out;
    });
}

export function groups(rows: PerfRow[]): PerfGroup[] {
  const by = new Map<string, PerfRow[]>();
  for (const r of normalize(rows)) {
    const k = `${r.label ?? ''}|${r.profile}|${r.timeline}`;
    by.set(k, [...(by.get(k) ?? []), r]);
  }
  return [...by.values()].map((list) => ({
    label: String(list[0].label ?? ''),
    profile: String(list[0].profile),
    timeline: String(list[0].timeline),
    runs: new Set(list.map(runKey)).size,
    rows: list,
  }));
}
