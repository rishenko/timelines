// Checks reflow (WCAG 1.4.10) and 200% zoom (1.4.4): at each width, opens the app's views and panels and reports
// content that runs past the screen's edges or is cut off by a box that hides its overflow. 640 px is 200% zoom on a
// 1280 px screen; 320 px is the reflow test's width. The chart and data tables may scroll in two directions (WCAG
// exempts content that needs a two-dimensional layout), so they are skipped, and so is the sample plugin's row of bars
// (.cv .bars, a chart that scrolls on its own); any other box that scrolls sideways is reported.
//   node scripts/reflow.ts [--url http://localhost:4317/] [--timeline ancient-classical] [--width 320]... [--details]
//        [--browser chrome|msedge]
// Defaults: widths 320 and 640. Run `npm run build` and `npx vite preview --port 4317` first. Exits with 1 if anything
// is reported.
import { chromium } from 'playwright-core';
import { openState, uiStates } from './lib/ui-states.ts';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timeline = one('--timeline', 'ancient-classical');
const widths = all('--width').length ? all('--width').map(Number) : [320, 640];
const details = args.includes('--details');

const browser = await chromium.launch({
  channel: one('--browser', process.platform === 'win32' ? 'msedge' : 'chrome'),
});
let problems = 0;
for (const width of widths) {
  for (const state of uiStates(base, timeline)) {
    const name = state[0];
    const page = await openState(browser, base, timeline, width, state);
    if (!page) continue;
    const found = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const exempt = (el: Element) => !!el.closest('.tl-scroller, table, .tl-lanes, .cv .bars');
      const visible = (el: Element) => {
        // what a closed <details> holds is not shown (the browser skips its layout, so its boxes sit where they were)
        const d = el.closest('details');
        if (d && !d.open && !el.closest('summary')) return false;
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return st.visibility !== 'hidden' && st.display !== 'none' && r.width > 0 && r.height > 0;
      };
      const name = (el: Element) => {
        const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
        return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text}"` : ''}`;
      };
      const out: string[] = [];
      if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} px wide)`);
      // leaf-ish elements: controls, labels and text blocks
      const items = [...document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, label, h1, h2, h3, p, li, summary, [role=tab]')];
      for (const el of items) {
        if (exempt(el) || !visible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1) {
          // inside a box that scrolls sideways (reachable by scrolling, but scrolling in two directions)?
          let scroller: Element | null = el.parentElement;
          while (scroller && !(scroller.scrollWidth > scroller.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(scroller).overflowX))) scroller = scroller.parentElement;
          out.push(scroller && scroller !== document.documentElement ? `scrolls sideways in ${name(scroller)}: ${name(el)}` : `off screen: ${name(el)}`);
          continue;
        }
        // cut off by an ancestor that hides its overflow
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const st = getComputedStyle(a);
          if (st.overflowX === 'visible' && st.overflowY === 'visible') continue;
          const ar = a.getBoundingClientRect();
          if (r.right > ar.right + 2 || r.left < ar.left - 2) {
            if (/auto|scroll/.test(st.overflowX)) out.push(`scrolls sideways in ${name(a)}: ${name(el)}`);
            else out.push(`cut off by ${name(a)}: ${name(el)}`);
            break;
          }
        }
      }
      return out;
    });
    await page.close();
    // one line per kind and container; the elements themselves with --details
    const groups = new Map<string, string[]>();
    for (const f of found) {
      const [kind, el] = f.includes(': ') ? [f.slice(0, f.indexOf(': ')), f.slice(f.indexOf(': ') + 2)] : [f, ''];
      groups.set(kind, [...(groups.get(kind) ?? []), el]);
    }
    if (!groups.size) {
      console.log(`ok    ${width}px ${name}`);
      continue;
    }
    problems++;
    console.log(`FAIL  ${width}px ${name}`);
    for (const [kind, els] of groups) {
      console.log(`        ${kind}${els[0] ? ` (${els.length})` : ''}`);
      if (details) for (const e of els.filter(Boolean)) console.log(`          ${e}`);
    }
  }
}
await browser.close();
process.exit(problems ? 1 : 0);
