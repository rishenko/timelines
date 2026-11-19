// Checks reflow (WCAG 1.4.10) and 200% zoom (1.4.4): at each width, opens the app's views and panels and reports
// content that runs past the screen's edges or is cut off by a box that hides its overflow. 640 px is 200% zoom on a
// 1280 px screen; 320 px is the reflow test's width. The chart and data tables may scroll in two directions (WCAG
// exempts content that needs a two-dimensional layout), so they are skipped; a box that scrolls sideways is reported.
//   node scripts/reflow.ts [--url http://localhost:4317/] [--timeline ancient-near-east] [--width 320]... [--details]
//        [--browser chrome|msedge]
// Defaults: widths 320 and 640. Run `npm run build` and `npx vite preview --port 4317` first. Exits with 1 if anything
// is reported.
import { chromium, type Page } from 'playwright-core';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timeline = one('--timeline', 'ancient-near-east');
const widths = all('--width').length ? all('--width').map(Number) : [320, 640];
const details = args.includes('--details');

/** Each state to check: a name, and what to do after the page opens. */
const STATES: [string, (p: Page) => Promise<unknown>][] = [
  ['timeline', async () => {}],
  ['Dating', (p) => clickText(p, 'Dating')],
  ['Filters', (p) => clickText(p, 'Filters')],
  ['Legend', (p) => clickText(p, 'Legend')],
  ['Customize: Appearance', (p) => clickText(p, 'Customize')],
  ['Customize: Edit', async (p) => (await clickText(p, 'Customize'), clickRole(p, 'tab', 'Edit'))],
  ['Customize: Timelines', async (p) => (await clickText(p, 'Customize'), clickRole(p, 'tab', 'Timelines'))],
  ['search results', async (p) => (await p.locator('input[type=search], .search input').first().fill('egypt'), p.waitForTimeout(300))],
  ['event details', (p) => click(p, '.tl-mark:not(.cluster)')],
  ['table view', (p) => p.goto(url('&view=table'))],
  ['edit mode', (p) => editMode(p)],
  ['event editor', async (p) => (await editMode(p), clickText(p, '+ Event'))],
  ['track editor', async (p) => (await editMode(p), clickText(p, '+ Track'))],
  ['source editor', async (p) => (await editMode(p), clickText(p, '+ Source'))],
  ['tour', async (p) => (await p.evaluate(() => localStorage.clear()), p.reload(), p.waitForTimeout(1200))],
];

const url = (extra = '') => `${base}${base.includes('?') ? '&' : '?'}timeline=${timeline}${extra}`;
async function click(p: Page, css: string) {
  await p.locator(css).first().click({ timeout: 3000 });
  await p.waitForTimeout(300);
}
async function clickText(p: Page, text: string) {
  await p.locator('button', { hasText: new RegExp(`^\\s*${text.replace(/[+]/g, '\\+')}`) }).first().click({ timeout: 3000 });
  await p.waitForTimeout(300);
}
async function clickRole(p: Page, role: 'tab', name: string) {
  await p.getByRole(role, { name }).click({ timeout: 3000 });
  await p.waitForTimeout(300);
}
async function editMode(p: Page) {
  await clickText(p, 'Customize');
  await clickRole(p, 'tab', 'Edit');
  await p.getByRole('button', { name: 'Turn on edit mode' }).click({ timeout: 3000 });
  await p.waitForTimeout(300);
}

const browser = await chromium.launch({
  channel: one('--browser', process.platform === 'win32' ? 'msedge' : 'chrome'),
});
let problems = 0;
for (const width of widths) {
  for (const [name, act] of STATES) {
    const page = await browser.newPage({ viewport: { width, height: Math.round(Math.max(600, width * 1.6)) } });
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('reflow-tour')) localStorage.setItem('timelines:legend-seen', '1');
    });
    await page.goto(url());
    await page.waitForTimeout(1200);
    await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 500 }).catch(() => {});
    if (name === 'tour') await page.evaluate(() => sessionStorage.setItem('reflow-tour', '1'));
    try {
      await act(page);
    } catch (e) {
      console.log(`?     ${width}px ${name}: couldn't open (${(e as Error).message.split('\n')[0]})`);
      await page.close();
      continue;
    }
    const found = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const exempt = (el: Element) => !!el.closest('.tl-scroller, table, .tl-lanes');
      const visible = (el: Element) => {
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
