/**
 * Link versions (see viewState.ts): each step turns a link of one version into the next, the same pattern as the data
 * migrator (src/data/migrate.ts). v0 (no `v`) and v1 share a parser, so there is no step yet. A future v2 that changes
 * a parameter's meaning adds `1: (q) => …` here, rewriting the v1 parameters it changes and setting `v=2`.
 */
type Step = (q: URLSearchParams) => URLSearchParams;

const STEPS: Record<number, Step> = {};

/** Brings a link's parameters up to the version this app reads, step by step. A newer version is left as it is. */
export function migrateView(q: URLSearchParams): URLSearchParams {
  let v = Number(q.get('v') ?? 0);
  let out = q;
  while (Number.isInteger(v) && STEPS[v]) {
    out = STEPS[v](out);
    v += 1;
  }
  return out;
}
