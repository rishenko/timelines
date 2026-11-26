// Profiling baseline: a fixed script of interactions on one or more timelines, measured in installed Chrome.
// Steps: load (data fetched, first lane, settled), scroll down and sideways, cursor sweep, zoom through every
// increment and back, category filter on/off, row-region filter off/on, collapse/expand all.
// Per step: time to the next paint (double rAF) and to "settled" (no DOM change in the app for 300 ms), long tasks,
// Chrome's script/layout/style time and layout count (CDP Performance metrics), frame times for the continuous steps,
// element and lane counts, and JS heap after a forced GC at the end of load and of the run.
// With --react (use the profiling build, scripts/perf/vite.profile.config.ts): React commits, component renders and
// render time per step, from a stub of the devtools hook that walks each committed fiber tree.
//   node scripts/perf/profile.ts --url http://localhost:4310/ [--timeline modern-states]... [--profile desktop|chrome4]...
//        [--runs 3] [--react] [--cpu] [--only zoom,filters,scroll,cursor,rows] [--label main-614ec4f] [--out runs.jsonl]
// Profiles: desktop (Chrome, 1440×900 @2×), chromeN (the same with N× CPU throttling), ipad (Playwright's WebKit as an iPad Pro 11,
// the Safari stand-in; install once with `npx playwright-core install webkit`). WebKit has no CDP: the ipad profile records frame
// times, paint and settle only (no script/layout/style totals, heap or CPU profile).
// --cpu: a CPU profile around each step (CDP Profiler); prints the top functions by self time with file:line (use the
// unminified profiling build, so names survive).
// Run on a quiet machine; the load average is printed at start and end (Windows has none: "n/a").
// Every JSON line carries `started` (this call's start time), so a file built from repeated `--runs 1` calls still
// tells its runs apart (scripts/perf/summarize.ts).
import { appendFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { chromium, devices, webkit, type CDPSession, type Page } from 'playwright-core';
import { heap, instrument, metrics, readPage, resetPage, settle, topSelf, type CpuProfile, type Step } from './page.ts';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4310/');
const timelines = all('--timeline').length ? all('--timeline') : ['modern-states', 'combined-profile'];
const profiles = all('--profile').length ? all('--profile') : ['desktop', 'chrome4'];
const runs = Number(one('--runs', '3'));
const react = args.includes('--react');
const cpu = args.includes('--cpu');
/** --only zoom,filters,scroll,cursor,rows: run only these groups after load (default: all). */
const only = (all('--only')[0] ?? '').split(',').filter(Boolean);
const want = (g: string) => !only.length || only.includes(g);
const label = one('--label', '');
const out = one('--out', '');
const started = new Date().toISOString();
/** os.loadavg() is always 0 0 0 on Windows. */
const loadAverage = () => (process.platform === 'win32' ? 'n/a (Windows)' : loadavg().map((l) => l.toFixed(2)).join(' '));
const VIEWPORT = { width: 1440, height: 900 };
const FRAMES = 180;

const cpuStart = async (cdp: CDPSession | null) => {
  if (!cpu || !cdp) return;
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
};
const cpuStop = async (cdp: CDPSession | null): Promise<string | undefined> => {
  if (!cpu || !cdp) return undefined;
  return topSelf(((await cdp.send('Profiler.stop')) as { profile: CpuProfile }).profile);
};

/** Runs `action` in the page (it gets the document), then measures to the next paint and to settled. */
async function discrete(page: Page, cdp: CDPSession | null, name: string, action: string, arg?: string): Promise<Step | null> {
  await resetPage(page);
  const m0 = await metrics(cdp);
  await cpuStart(cdp);
  const r = await page.evaluate(
    ({ action, arg }) =>
      new Promise<{ t0: number; paint: number; ok: boolean }>((resolve) => {
        const fn = new Function('arg', action) as (a?: string) => boolean;
        const t0 = performance.now();
        const ok = fn(arg) !== false;
        requestAnimationFrame(() => requestAnimationFrame(() => resolve({ t0, paint: performance.now() - t0, ok })));
      }),
    { action, arg },
  );
  if (!r.ok) {
    await cpuStop(cdp);
    return null;
  }
  const settledMs = await settle(page, r.t0);
  const cpuTop = await cpuStop(cdp);
  const m1 = await metrics(cdp);
  const p = await readPage(page);
  return stepOf(name, m0, m1, p, { paintMs: +r.paint.toFixed(1), settledMs: Math.round(Math.max(settledMs, r.paint)), cpuTop });
}

function stepOf(name: string, m0: Record<string, number>, m1: Record<string, number>, p: Awaited<ReturnType<typeof readPage>>, extra: Partial<Step>): Step {
  const ms = (k: string) => (k in m1 ? Math.round(1000 * (m1[k] - m0[k])) : (undefined as unknown as number));
  return {
    step: name,
    ...extra,
    longTaskMs: p.longTaskMs,
    scriptMs: ms('ScriptDuration'),
    layoutMs: ms('LayoutDuration'),
    styleMs: ms('RecalcStyleDuration'),
    layouts: 'LayoutCount' in m1 ? m1.LayoutCount - m0.LayoutCount : (undefined as unknown as number),
    elements: p.elements,
    lanes: p.lanes,
    ...(react ? { commits: p.commits, renders: p.renders, mounts: p.mounts, renderMs: p.renderMs, top: p.top, byCount: p.byCount } : {}),
  };
}

/** A continuous step: `tick(i)` runs once per animation frame for FRAMES frames; frame times recorded. */
async function continuous(page: Page, cdp: CDPSession | null, name: string, tick: string): Promise<Step> {
  await resetPage(page);
  const m0 = await metrics(cdp);
  await cpuStart(cdp);
  const d = await page.evaluate(
    ({ tick, frames }) =>
      new Promise<number[]>((resolve) => {
        const fn = new Function('i', tick) as (i: number) => void;
        const deltas: number[] = [];
        let last = 0;
        let n = 0;
        const step = (t: number) => {
          deltas.push(t - last);
          last = t;
          fn(n);
          if (++n < frames) requestAnimationFrame(step);
          else resolve(deltas.slice(2));
        };
        requestAnimationFrame((t) => {
          last = t;
          requestAnimationFrame(step);
        });
      }),
    { tick, frames: FRAMES },
  );
  await page.waitForTimeout(400);
  const cpuTop = await cpuStop(cdp);
  const m1 = await metrics(cdp);
  const p = await readPage(page);
  const s = [...d].sort((a, b) => a - b);
  return stepOf(name, m0, m1, p, {
    frameMean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1),
    frameP95: +s[Math.floor(0.95 * (s.length - 1))].toFixed(1),
    over33: Math.round((100 * s.filter((x) => x > 33.4).length) / s.length),
    cpuTop,
  });
}

// page-side snippets (run with new Function; `arg` and `i` are their parameters)
const SCROLL = (axis: 'x' | 'y', step: number) => `
  const el = document.querySelector('.tl-scroller');
  const max = ${axis === 'y'} ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
  const k = '${axis === 'y' ? 'scrollTop' : 'scrollLeft'}';
  window.__dir ??= 1;
  if (el[k] + ${step} * __dir > max || el[k] + ${step} * __dir < 0) __dir = -__dir;
  el[k] += ${step} * __dir;`;
const CURSOR = `
  const el = document.querySelector('.tl-scroller');
  const r = el.getBoundingClientRect();
  const span = r.width - 260;
  const x = r.left + 240 + ((i * 7) % span);
  el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: r.top + r.height / 2, pointerType: 'mouse' }));`;
const CLICK_ZOOM = `
  const b = [...document.querySelectorAll('[role=group] button[aria-pressed]')].find((x) => x.getAttribute('aria-label') === arg);
  if (!b || b.disabled) return false;
  b.click();`;
// the first checkbox after the panel heading named arg ("Categories" or "Rows")
const CLICK_CHECK = `
  const h = [...document.querySelectorAll('h3')].find((x) => x.textContent.trim().startsWith(arg));
  if (!h) return false;
  const nodes = [...document.querySelectorAll('h3, input[type=checkbox]')];
  const box = nodes[nodes.indexOf(h) + 1];
  if (!box || box.tagName !== 'INPUT') return false;
  box.click();`;
const CLICK_TEXT = `
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(arg));
  if (!b) return false;
  b.click();`;

async function oneRun(profile: string, timeline: string, run: number): Promise<Step[]> {
  const ipad = profile === 'ipad';
  const rate = profile === 'desktop' || ipad ? 1 : Number(profile.replace('chrome', ''));
  const browser = ipad ? await webkit.launch() : await chromium.launch({ channel: 'chrome', args: ['--enable-precise-memory-info'] });
  const ctx = ipad ? await browser.newContext({ ...devices['iPad Pro 11'] }) : await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  await ctx.addInitScript(instrument, react);
  const page = await ctx.newPage();
  const cdp = ipad ? null : await ctx.newCDPSession(page);
  if (cdp) await cdp.send('Performance.enable');
  if (cpu && cdp) await cdp.send('Profiler.enable');
  if (cdp && rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await cpuStart(cdp);
  const steps: Step[] = [];
  const push = (s: Step | null) => {
    if (!s) return;
    steps.push(s);
    if (out) appendFileSync(out, JSON.stringify({ label, started, profile, timeline, run, react, ...s }) + '\n');
  };

  // load: navigation → data fetched → first lane → settled (the tour card is dismissed after settling)
  await page.goto(`${base}?timeline=${timeline}`, { waitUntil: 'commit' });
  await page.waitForSelector('.tl-lane', { timeout: 120_000 });
  const settledLoad = await settle(page, 0, 500, 60_000);
  const load = await page.evaluate(() => {
    const st = (window as unknown as { __perf: { firstLane: number } }).__perf;
    const data = performance.getEntriesByType('resource').find((e) => /timelines\/[^/]+\.json/.test(e.name) && !e.name.endsWith('index.json')) as
      | PerformanceResourceTiming
      | undefined;
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
    return { dataMs: data ? Math.round(data.responseEnd) : undefined, firstLaneMs: Math.round(st.firstLane), fcpMs: fcp ? Math.round(fcp) : undefined };
  });
  const loadCpu = await cpuStop(cdp);
  const m = await metrics(cdp);
  const p0 = await readPage(page);
  push({
    step: 'load',
    paintMs: load.firstLaneMs,
    settledMs: Math.round(settledLoad),
    longTaskMs: p0.longTaskMs,
    scriptMs: cdp ? Math.round(1000 * m.ScriptDuration) : (undefined as unknown as number),
    layoutMs: cdp ? Math.round(1000 * m.LayoutDuration) : (undefined as unknown as number),
    styleMs: cdp ? Math.round(1000 * m.RecalcStyleDuration) : (undefined as unknown as number),
    layouts: cdp ? m.LayoutCount : (undefined as unknown as number),
    elements: p0.elements,
    lanes: p0.lanes,
    heapMB: await heap(cdp),
    cpuTop: loadCpu,
    ...(react ? { commits: p0.commits, renders: p0.renders, mounts: p0.mounts, renderMs: p0.renderMs, top: p0.top } : {}),
  });
  if (run === 0 && out) appendFileSync(out, JSON.stringify({ label, started, profile, timeline, run, react, step: 'load-detail', ...load }) + '\n');
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 2000 }).catch(() => {});
  await page.mouse.move(0, (ipad ? devices['iPad Pro 11'].viewport.height : VIEWPORT.height) - 1);
  await page.waitForTimeout(800);

  if (want('scroll')) push(await continuous(page, cdp, 'scroll-y', SCROLL('y', 40)));
  if (want('scroll')) push(await continuous(page, cdp, 'scroll-x', SCROLL('x', 30)));
  if (want('cursor')) push(await continuous(page, cdp, 'cursor', CURSOR));
  await page.mouse.move(0, (ipad ? devices['iPad Pro 11'].viewport.height : VIEWPORT.height) - 1);

  // zoom: every increment from the finest... to the coarsest, then back to the default
  const incs: { label: string; pressed: boolean }[] = await page.evaluate(() =>
    [...document.querySelectorAll('[role=group] button[aria-pressed]')]
      .filter((b) => /per tick/.test(b.getAttribute('aria-label') ?? ''))
      .map((b) => ({ label: b.getAttribute('aria-label')!, pressed: b.getAttribute('aria-pressed') === 'true' })),
  );
  const def = incs.find((i) => i.pressed)?.label;
  for (const [k, inc] of [...incs.map((i) => i.label), def!].entries()) {
    if (!inc || !want('zoom')) continue;
    push(await discrete(page, cdp, k === incs.length ? 'zoom back to default' : `zoom ${inc.replace(' per tick', '')}`, CLICK_ZOOM, inc));
    await page.waitForTimeout(200);
  }

  // filters (the panel is opened first; opening it is a step of its own)
  if (want('filters')) {
  push(await discrete(page, cdp, 'open filters', CLICK_TEXT, 'Filters'));
  push(await discrete(page, cdp, 'category on', CLICK_CHECK, 'Categories'));
  push(await discrete(page, cdp, 'category off', CLICK_CHECK, 'Categories'));
  push(await discrete(page, cdp, 'region off', CLICK_CHECK, 'Rows'));
  push(await discrete(page, cdp, 'region on', CLICK_CHECK, 'Rows'));
  push(await discrete(page, cdp, 'close filters', CLICK_TEXT, 'Filters'));
  }
  // collapse/expand all (the button's label flips)
  const all1 = await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /(Collapse|Expand) all/.test(b.textContent ?? ''))?.textContent?.replace(/[^A-Za-z ]/g, '').trim());
  if (all1 && want('rows')) {
    push(await discrete(page, cdp, all1.toLowerCase(), CLICK_TEXT, all1));
    const all2 = all1.startsWith('Collapse') ? 'Expand all' : 'Collapse all';
    push(await discrete(page, cdp, all2.toLowerCase(), CLICK_TEXT, all2));
  }
  const end = steps[steps.length - 1];
  if (end) end.heapMB = await heap(cdp);
  await browser.close();
  return steps;
}

console.log(`load average at start: ${loadAverage()}`);
const results: (Step & { key: string })[] = [];
for (const profile of profiles)
  for (const timeline of timelines)
    for (let r = 0; r < runs; r++) {
      const steps = await oneRun(profile, timeline, r);
      for (const s of steps) results.push({ ...s, key: `${timeline}\t${profile}\t${s.step}` });
      console.error(`done ${profile} ${timeline} run ${r + 1}/${runs}`);
    }
console.log(`load average at end: ${loadAverage()}`);

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
const cols = ['paintMs', 'settledMs', 'frameMean', 'frameP95', 'over33', 'longTaskMs', 'scriptMs', 'layoutMs', 'styleMs', 'layouts', 'elements', 'lanes', 'heapMB', ...(react ? ['commits', 'renders', 'mounts', 'renderMs'] : [])] as const;
console.log(['timeline', 'profile', 'step', ...cols, ...(react ? ['top (last run)'] : []), ...(cpu ? ['cpu top (last run)'] : [])].join('\t'));
for (const key of [...new Set(results.map((r) => r.key))]) {
  const list = results.filter((r) => r.key === key);
  const vals = cols.map((c) => {
    const xs = list.map((r) => (r as unknown as Record<string, number | undefined>)[c]).filter((x): x is number => x !== undefined);
    return xs.length ? median(xs) : '';
  });
  console.log([key, ...vals, ...(react ? [list[list.length - 1].top ?? ''] : []), ...(cpu ? [list[list.length - 1].cpuTop ?? ''] : [])].join('\t'));
}
