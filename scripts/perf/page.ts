// The page side of scripts/perf/profile.ts: the counters installed before the app loads, reading and resetting them,
// waiting for the DOM to settle, CDP metrics, heap and the CPU profile's top functions.
import type { CDPSession, Page } from 'playwright-core';

/** Installed before the app loads: counters the steps read and reset. */
export function instrument(withReact: boolean) {
  type Stat = { n: number; ms: number };
  const w = window as unknown as Record<string, unknown>;
  const st = {
    longTasks: [] as number[],
    lastMutation: 0,
    firstLane: 0,
    commits: 0,
    renderMs: 0,
    renders: 0,
    mounts: 0,
    byName: {} as Record<string, Stat>,
  };
  w.__perf = st;
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => st.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
  } catch {
    // no long-task timing
  }
  const mo = new MutationObserver(() => {
    st.lastMutation = performance.now();
    if (!st.firstLane && document.querySelector('.tl-lane')) st.firstLane = st.lastMutation;
  });
  document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true }));
  if (!withReact) return;
  // fiber tags of components (React 19): function 0, class 1, forwardRef 11, memo 14, simple memo 15
  const COMPONENT = new Set([0, 1, 11, 14, 15]);
  type Fiber = {
    tag: number;
    type: unknown;
    elementType: unknown;
    flags: number;
    child: Fiber | null;
    sibling: Fiber | null;
    alternate: Fiber | null;
    actualDuration?: number;
    selfBaseDuration?: number;
  };
  const nameOf = (f: Fiber): string => {
    const t = (f.elementType ?? f.type) as { displayName?: string; name?: string; render?: { name?: string }; type?: { name?: string; displayName?: string } } | null;
    if (!t) return '?';
    return t.displayName || t.name || t.render?.name || t.type?.displayName || t.type?.name || (f.tag === 14 || f.tag === 15 ? 'Memo' : '?');
  };
  // a component rendered in this commit if it is new or did work (PerformedWork = 1); a subtree whose child pointer
  // is unchanged was skipped by React, so it isn't walked (the devtools' own rule)
  const visit = (next: Fiber, prev: Fiber | null) => {
    if (COMPONENT.has(next.tag) && (!prev || (next.flags & 1) === 1)) {
      st.renders++;
      if (!prev) st.mounts++;
      const s = (st.byName[nameOf(next)] ??= { n: 0, ms: 0 });
      s.n++;
      s.ms += next.selfBaseDuration ?? 0;
    }
    if (prev && next.child === prev.child) return;
    for (let c = next.child; c; c = c.sibling) visit(c, c.alternate);
  };
  let id = 0;
  w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    isDisabled: false,
    renderers: new Map(),
    checkDCE() {},
    inject(r: unknown) {
      (this as { renderers: Map<number, unknown> }).renderers.set(++id, r);
      return id;
    },
    onScheduleFiberRoot() {},
    onCommitFiberRoot(_id: number, root: { current: Fiber }) {
      st.commits++;
      st.renderMs += root.current.actualDuration ?? 0;
      const cur = root.current;
      visit(cur, cur.alternate);
    },
    onPostCommitFiberRoot() {},
    onCommitFiberUnmount() {},
    setStrictMode() {},
  };
}

type ProfileNode = { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number };
export type CpuProfile = { nodes: ProfileNode[]; samples: number[]; timeDeltas: number[] };
/** The top functions by self time (sample counts × interval) in a step's CPU profile. */
export function topSelf(profile: CpuProfile): string {
  const self = new Map<string, number>();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const f = byId.get(id)!.callFrame;
    if (['(idle)', '(program)', '(root)'].includes(f.functionName)) return;
    const file = f.url.split('/').pop()?.split('?')[0] ?? '';
    const key = `${f.functionName || '(anon)'}@${file}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000);
  });
  return [...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => `${k} ${v.toFixed(1)}ms`)
    .join(', ');
}

export const metrics = async (cdp: CDPSession | null) =>
  cdp ? (Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value])) as Record<string, number>) : ({} as Record<string, number>);

export interface Step {
  step: string;
  paintMs?: number;
  settledMs?: number;
  frameMean?: number;
  frameP95?: number;
  over33?: number;
  longTaskMs: number;
  scriptMs: number;
  layoutMs: number;
  styleMs: number;
  layouts: number;
  elements: number;
  lanes: number;
  heapMB?: number;
  commits?: number;
  renders?: number;
  mounts?: number;
  renderMs?: number;
  top?: string;
  byCount?: string;
  cpuTop?: string;
}

export const resetPage = (page: Page) =>
  page.evaluate(() => {
    const st = (window as unknown as { __perf: Record<string, unknown> }).__perf;
    Object.assign(st, { longTasks: [], commits: 0, renderMs: 0, renders: 0, mounts: 0, byName: {} });
  });
export const readPage = (page: Page) =>
  page.evaluate(() => {
    const st = (window as unknown as {
      __perf: { longTasks: number[]; commits: number; renderMs: number; renders: number; mounts: number; byName: Record<string, { n: number; ms: number }> };
    }).__perf;
    const top = Object.entries(st.byName)
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 6)
      .map(([k, v]) => `${k} ${v.n}× ${v.ms.toFixed(0)}ms`)
      .join(', ');
    const byCount = Object.entries(st.byName)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 12)
      .map(([k, v]) => `${k} ${v.n}`)
      .join(', ');
    return {
      byCount,
      longTaskMs: Math.round(st.longTasks.reduce((a, b) => a + b, 0)),
      commits: st.commits,
      renders: st.renders,
      mounts: st.mounts,
      renderMs: Math.round(st.renderMs),
      top,
      byName: st.byName,
      elements: document.getElementsByTagName('*').length,
      lanes: document.querySelectorAll('.tl-lane').length,
    };
  });
// waits until the app's DOM has been quiet for `quiet` ms (or `max` ms pass); returns the last change's time
export const settle = (page: Page, t0: number, quiet = 300, max = 15000) =>
  page.evaluate(
    ({ t0, quiet, max }) =>
      new Promise<number>((resolve) => {
        const st = (window as unknown as { __perf: { lastMutation: number } }).__perf;
        const check = () => {
          const now = performance.now();
          const busy = document.querySelector('.tl-busy-strip *');
          if ((!busy && now - Math.max(st.lastMutation, t0) >= quiet) || now - t0 > max) resolve(Math.max(st.lastMutation, t0) - t0);
          else setTimeout(check, 50);
        };
        check();
      }),
    { t0, quiet, max },
  );
export const heap = async (cdp: CDPSession | null) => {
  if (!cdp) return undefined;
  await cdp.send('HeapProfiler.collectGarbage');
  return +((await cdp.send('Runtime.getHeapUsage')).usedSize / 2 ** 20).toFixed(1);
};
