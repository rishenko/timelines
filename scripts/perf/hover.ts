// Hover sweep: the pointer crosses many events quickly. Counts React commits and component renders (profiling build:
// scripts/perf/vite.profile.config.ts) and how often the chart's dimming class (`has-focus`) toggled; takes a screenshot
// with the pointer on one event, and records a video of the sweep.
//   node scripts/perf/hover.ts --url http://localhost:4311/ --label before --out <dir> [--timeline modern-states] [--marks 60]
import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (f: string, d: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const url = opt('--url', 'http://localhost:4311/');
const label = opt('--label', 'run');
const out = opt('--out', 'hover-out');
const timeline = opt('--timeline', 'modern-states');
const nMarks = Number(opt('--marks', '60'));
mkdirSync(out, { recursive: true });

function instrument() {
  const w = window as unknown as Record<string, unknown>;
  const st = { commits: 0, renders: 0, toggles: 0, byName: {} as Record<string, number> };
  w.__hov = st;
  type F = { tag: number; type: unknown; elementType: unknown; flags: number; child: F | null; sibling: F | null; alternate: F | null };
  const C = new Set([0, 1, 11, 14, 15]);
  const nameOf = (f: F) => {
    const t = (f.elementType ?? f.type) as { displayName?: string; name?: string; render?: { name?: string }; type?: { name?: string } } | null;
    return (t && (t.displayName || t.name || t.render?.name || t.type?.name)) || '?';
  };
  const visit = (n: F, p: F | null) => {
    if (C.has(n.tag) && (!p || (n.flags & 1) === 1)) {
      st.renders++;
      const k = nameOf(n);
      st.byName[k] = (st.byName[k] ?? 0) + 1;
    }
    if (p && n.child === p.child) return;
    for (let c = n.child; c; c = c.sibling) visit(c, c.alternate);
  };
  let id = 0;
  w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, isDisabled: false, renderers: new Map(), checkDCE() {}, onScheduleFiberRoot() {}, onPostCommitFiberRoot() {},
    onCommitFiberUnmount() {}, setStrictMode() {},
    inject() { return ++id; },
    onCommitFiberRoot(_: number, root: { current: F }) { st.commits++; visit(root.current, root.current.alternate); },
  };
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((ms) => {
      for (const m of ms) if (m.attributeName === 'class' && (m.target as Element).classList?.contains('tl-scroller')) {
        const had = (m.oldValue ?? '').includes('has-focus');
        if (had !== (m.target as Element).classList.contains('has-focus')) st.toggles++;
      }
    }).observe(document.body, { attributes: true, attributeOldValue: true, subtree: true, attributeFilter: ['class'] });
  });
}

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
await ctx.addInitScript(instrument);
const page = await ctx.newPage();
await page.goto(`${url}?timeline=${timeline}`);
await page.waitForSelector('.tl-lane', { timeout: 60_000 });
await page.waitForTimeout(1500);
await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 2000 }).catch(() => {});
await page.mouse.move(5, 895);
await page.waitForTimeout(800);
// the label of each event mark on screen (its centre), left to right then top to bottom
const points: { x: number; y: number }[] = await page.evaluate((n) => {
  const ps = [...document.querySelectorAll<HTMLElement>('.tl-mark[data-event-id] .label')]
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 4 && r.top > 120 && r.bottom < 880 && r.left > 240 && r.right < 1430)
    .map((r) => ({ x: r.left + Math.min(r.width / 2, 30), y: r.top + r.height / 2 }));
  return ps.slice(0, n);
}, nMarks);
// a screenshot with the pointer resting on one event
await page.mouse.move(points[Math.floor(points.length / 2)].x, points[Math.floor(points.length / 2)].y);
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, `${label}-hover.png`) });
await page.mouse.move(5, 895);
await page.waitForTimeout(400);
await page.evaluate(() => Object.assign((window as unknown as { __hov: object }).__hov, { commits: 0, renders: 0, toggles: 0, byName: {} }));
// the sweep: one move per event, back and forth twice, as a hand moving fast does
for (let pass = 0; pass < 2; pass++) for (const p of pass ? [...points].reverse() : points) await page.mouse.move(p.x, p.y, { steps: 2 });
await page.mouse.move(5, 895);
await page.waitForTimeout(500);
const r = await page.evaluate(() => (window as unknown as { __hov: { commits: number; renders: number; toggles: number; byName: Record<string, number> } }).__hov);
const top = Object.entries(r.byName).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ');
console.log(`${label}: ${points.length} events, ${points.length * 2} hovers · commits ${r.commits} · component renders ${r.renders} · dimming toggles ${r.toggles} · top: ${top}`);
const video = page.video();
await ctx.close();
await browser.close();
if (video) renameSync(await video.path(), join(out, `${label}-sweep.webm`));
