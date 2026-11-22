// Measures how smoothly the chart scrolls, vertically and sideways, in a production build. For each browser profile
// and timeline it opens the chart, skips the tour, then scrolls it a fixed step per animation frame (back and forth)
// and records the time between frames, plus the page's element count and rows drawn. Chrome profiles also record
// long tasks and Chrome's script, layout and style totals (CDP Performance metrics) under CPU throttling.
//   node scripts/profile-scroll.ts [--url http://localhost:4317/] [--timeline modern-states]...
//        [--profile webkit|chrome4|chrome6]... [--query "&rows=all"] [--runs 3] [--label main] [--out runs.jsonl]
// Profiles: webkit = Playwright's WebKit as an iPad Pro 11 (install it once: `npx playwright-core install webkit`);
// chromeN = installed Chrome at the iPad's viewport with N× CPU throttling. Defaults: webkit, chrome4 and chrome6,
// modern-states and ancient-classical, 3 runs. Prints the median of the runs per timeline, profile and direction
// (frame times in ms; "over33" is the share of frames slower than 30 fps); --out also writes every run as JSON lines,
// so two builds can be compared. Run `npm run build` and `npx vite preview --port 4317` first, on a quiet machine
// (other builds or test runs on it skew the numbers; note the load average with the results).
import { appendFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { chromium, devices, webkit, type CDPSession, type Page } from 'playwright-core';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timelines = all('--timeline').length ? all('--timeline') : ['modern-states', 'ancient-classical'];
const profiles = all('--profile').length ? all('--profile') : ['webkit', 'chrome4', 'chrome6'];
const query = one('--query', '');
const runs = Number(one('--runs', '3'));
const label = one('--label', '');
const out = one('--out', '');
const ipad = devices['iPad Pro 11'];
/** Frames per direction, and the step per frame (px): about three seconds of brisk scrolling. */
const FRAMES = 180;
const STEP = { y: 40, x: 30 };

interface Run {
  timeline: string;
  profile: string;
  axis: 'x' | 'y';
  mean: number;
  p95: number;
  over33: number;
  longTaskMs?: number;
  scriptMs?: number;
  layoutMs?: number;
  styleMs?: number;
  elements: number;
  rows: number;
}

async function scroll(page: Page, axis: 'x' | 'y'): Promise<number[]> {
  return page.evaluate(
    ({ axis, frames, step }) =>
      new Promise<number[]>((resolve) => {
        const el = document.querySelector('.tl-scroller')!;
        const max = axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
        const deltas: number[] = [];
        let last = 0;
        let n = 0;
        let dir = 1;
        const tick = (t: number) => {
          deltas.push(t - last);
          last = t;
          const cur = axis === 'y' ? el.scrollTop : el.scrollLeft;
          if (cur + step * dir > max || cur + step * dir < 0) dir = -dir;
          if (axis === 'y') el.scrollTop = cur + step * dir;
          else el.scrollLeft = cur + step * dir;
          if (++n < frames) requestAnimationFrame(tick);
          else resolve(deltas.slice(2));
        };
        requestAnimationFrame((t) => {
          last = t;
          requestAnimationFrame(tick);
        });
      }),
    { axis, frames: FRAMES, step: STEP[axis] },
  );
}

const metrics = async (cdp: CDPSession) =>
  Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

const results: Run[] = [];
console.log(`load average at start: ${loadavg().map((l) => l.toFixed(2)).join(' ')}`);
for (const profile of profiles) {
  const rate = profile.startsWith('chrome') ? Number(profile.slice('chrome'.length)) : 0;
  for (const timeline of timelines)
    for (let r = 0; r < runs; r++) {
      const browser = rate ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
      const ctx = rate ? await browser.newContext({ viewport: ipad.viewport, deviceScaleFactor: 2 }) : await browser.newContext({ ...ipad });
      const page = await ctx.newPage();
      const cdp = rate ? await ctx.newCDPSession(page) : null;
      if (cdp) await cdp.send('Performance.enable');
      await page.goto(`${base}?timeline=${timeline}${query}`);
      await page.waitForSelector('.tl-lane', { timeout: 60_000 });
      await page.waitForTimeout(1500);
      await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(800);
      if (cdp) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await page.evaluate(() => {
        const w = window as unknown as { longTasks: number[] };
        w.longTasks = [];
        try {
          new PerformanceObserver((l) => l.getEntries().forEach((e) => w.longTasks.push(e.duration))).observe({ type: 'longtask' });
        } catch {
          // WebKit has no long-task timing
        }
      });
      const size = await page.evaluate(() => ({
        elements: document.getElementsByTagName('*').length,
        rows: document.querySelectorAll('.tl-lane').length,
      }));
      for (const axis of ['y', 'x'] as const) {
        const m0 = cdp && (await metrics(cdp));
        await page.evaluate(() => ((window as unknown as { longTasks: number[] }).longTasks = []));
        const d = (await scroll(page, axis)).sort((a, b) => a - b);
        const longTasks = await page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks);
        const m1 = cdp && (await metrics(cdp));
        const ms = (k: string) => (m0 && m1 ? Math.round(1000 * (m1[k] - m0[k])) : undefined);
        const run: Run = {
          timeline,
          profile,
          axis,
          mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1),
          p95: +d[Math.min(d.length - 1, Math.floor(0.95 * d.length))].toFixed(1),
          over33: Math.round((100 * d.filter((x) => x > 33.4).length) / d.length),
          longTaskMs: rate ? Math.round(longTasks.reduce((a, b) => a + b, 0)) : undefined,
          scriptMs: ms('ScriptDuration'),
          layoutMs: ms('LayoutDuration'),
          styleMs: ms('RecalcStyleDuration'),
          ...size,
        };
        results.push(run);
        if (out) appendFileSync(out, JSON.stringify({ label, query, ...run }) + '\n');
        await page.waitForTimeout(400);
      }
      await browser.close();
    }
}
console.log(`load average at end: ${loadavg().map((l) => l.toFixed(2)).join(' ')}`);

// the median of the runs, per timeline, profile and direction
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
const cols = ['mean', 'p95', 'over33', 'longTaskMs', 'scriptMs', 'layoutMs', 'styleMs', 'elements', 'rows'] as const;
console.log(['timeline', 'profile', 'axis', ...cols].join('\t'));
const keys = [...new Set(results.map((r) => `${r.timeline}\t${r.profile}\t${r.axis}`))];
for (const key of keys) {
  const list = results.filter((r) => `${r.timeline}\t${r.profile}\t${r.axis}` === key);
  console.log([key, ...cols.map((c) => (list[0][c] === undefined ? '' : median(list.map((r) => r[c]!))))].join('\t'));
}
