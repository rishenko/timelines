// Checks text contrast (WCAG 1.4.3) in a real browser, which jsdom can't do: it needs layout and painted backgrounds.
// Two passes:
//   - axe-core's color-contrast rule for the page's ordinary text (toolbar, ruler, row labels, panels);
//   - a pixel check for the text axe can't judge because it sits on gradients and see-through layers: event labels,
//     phase names and "+N" clusters. It hides that text, screenshots what is behind it, and compares the text's own
//     color (with any dimming opacity applied) against each background pixel in the middle 60% of its line box (where
//     the letters are). Thin vertical lines crossing the text (threads, phase edges) are left out as overlays rather
//     than background, and a label's ratio is its 5th-percentile pixel of the rest. Text shadows are ignored, which
//     errs on the strict side.
// For each timeline and theme preset it checks two states:
//   rest     the timeline with every row expanded;
//   focus    the same with a key event selected, so unrelated events are dimmed.
//   node scripts/contrast.ts [--url http://localhost:4317/] [--timeline ancient-classical]...
//        [--preset parchment|dark|light|contrast]... [--state rest|focus]... [--width 1700] [--height 1000]
//        [--zoom 100] [--quick] [--details] [--browser chrome|msedge]
// Defaults: Ancient only, every preset, both states, the whole chart (see --quick). --details lists each failing
// element; without it,// failures are grouped by kind (the worst one shown). Exits with 1 if any check fails.
// Run `npm run build` and `npx vite preview --port 4317` first. Microsoft Edge on Windows, Google Chrome elsewhere.
// Only what's drawn is checked. The timeline draws the events within about a screen of the view, so this scrolls
// through the whole chart a screen at a time and checks each one (screens overlap by more than a label's width, and a
// label is only checked where it's wholly on screen). --quick checks the opening view only (the a11y report's run);
// a theme or colour change needs the sweep at a fine --zoom on every timeline (one --timeline each, with that
// timeline's own zoom step), since the opening view passed a retune
// that broke labels further along (#90). --sweep is still accepted (it's the default).
// The colours are the served build's own: the page is opened with only the preset's name saved, so the app loads that
// preset's current colours (theme.ts sanitize). A main baseline run from a PR's worktree therefore tests main's
// colours. A preset the served build doesn't have is reported and skipped. At the
// coarsest zoom only key events are drawn and crowded ones fold into "+N"; --zoom picks a finer increment (the
// toolbar's button text, e.g. 100) so the others are drawn too. The selected event (state focus) is the first key
// event in the opening view.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium, type Page } from 'playwright-core';
import { PRESETS } from '../src/lib/theme.ts'; // preset names only; the colours come from the served build

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timelines = all('--timeline').length ? all('--timeline') : ['ancient-classical'];
const presets = all('--preset').length ? all('--preset') : Object.keys(PRESETS);
const states = all('--state').length ? all('--state') : ['rest', 'focus'];
const zoom = all('--zoom')[0];
const sweep = !args.includes('--quick');
const details = args.includes('--details');
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

interface Failure {
  target: string;
  html: string;
  ratio: number;
  fg: string;
  bg: string;
  expected: string;
}
/** Text the pixel check covers: on the timeline's layered backgrounds. */
const LAYERED = '.tl-mark .label, .tl-phase-name, .tl-mark.cluster';

const browser = await chromium.launch({
  channel: one('--browser', process.platform === 'win32' ? 'msedge' : 'chrome'),
});
let failed = 0;
let checked = 0;
let skipped = 0;

for (const timeline of timelines) {
  for (const preset of presets) {
    for (const state of states) {
      const page = await browser.newPage({
        viewport: { width: Number(one('--width', '1700')), height: Number(one('--height', '1000')) },
      });
      // the preset's name only (the served build fills in its colours), and the tour marked as seen so it doesn't open
      // over the timeline
      await page.addInitScript((p) => {
        localStorage.setItem('timeline:theme', JSON.stringify({ preset: p }));
        localStorage.setItem('timelines:legend-seen', '1');
      }, preset);
      const url = new URL(base);
      url.searchParams.set('timeline', timeline);
      await page.goto(url.toString());
      await page.waitForTimeout(1500);
      // the served build may not have this preset (an older build, or a preset added in this worktree only)
      const loaded = await page.evaluate(() => document.documentElement.dataset.preset);
      if (loaded !== preset) {
        console.log(`skip  ${timeline} / ${preset} / ${state}: the served build has no "${preset}" preset (it loaded ${loaded ?? 'none'})`);
        await page.close();
        skipped++;
        continue;
      }
      checked++;
      await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 500 }).catch(() => {});
      await page.locator('.legend-panel header button.icon').first().click({ timeout: 500 }).catch(() => {});
      await page.locator('button', { hasText: 'Expand all' }).first().click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(500);
      if (state === 'focus') {
        const key = page.locator('.tl-mark.key');
        await ((await key.count()) ? key : page.locator('.tl-mark:not(.cluster)')).first().click();
        await page.waitForTimeout(400);
      }
      if (zoom) {
        // a timeline without that zoom step is skipped (each timeline has its own steps)
        const step = page.locator('button', { hasText: new RegExp('^\\s*' + zoom + '\\s*$') }).first();
        if (!(await step.count())) {
          console.log(`skip  ${timeline} / ${preset} / ${state}: no "${zoom}" zoom step on this timeline`);
          await page.close();
          checked--;
          skipped++;
          continue;
        }
        await step.click();
        await page.waitForTimeout(600);
      }
      await page.addScriptTag({ content: axeSource });

      // the scroll positions to check: every screen of the chart, overlapping by more than the widest label (240 px) and
      // a few lines of events (--quick: the opening view only)
      const positions = await page.evaluate((sweep) => {
        const el = document.querySelector('.tl-scroller') as HTMLElement;
        if (!sweep) return [[el.scrollLeft, el.scrollTop]];
        const steps = (size: number, view: number, overlap: number) => {
          const step = Math.max(100, view - overlap);
          return Array.from({ length: Math.max(1, Math.ceil((size - view) / step) + 1) }, (_, i) =>
            Math.min(i * step, Math.max(0, size - view)),
          );
        };
        const xs = steps(el.scrollWidth, el.clientWidth, 520);
        const ys = steps(el.scrollHeight, el.clientHeight, 120);
        return xs.flatMap((x) => ys.map((y) => [x, y]));
      }, sweep);
      const violations: Failure[] = [];
      const seen = new Set<string>();
      for (const [x, y] of positions) {
        await page.evaluate(([x, y]) => (document.querySelector('.tl-scroller') as HTMLElement).scrollTo(x, y), [x, y]);
        await page.waitForTimeout(350);
        for (const v of await checkView(page)) {
          const id = v.html + v.ratio;
          if (!seen.has(id)) {
            seen.add(id);
            violations.push(v);
          }
        }
      }
      await page.close();

      const views = `${positions.length} view${positions.length > 1 ? 's' : ''}`;
      const label = `${timeline} / ${preset} / ${state}${zoom ? ` / zoom ${zoom}` : ''} (${views})`;
      if (!violations.length) {
        console.log(`ok    ${label}`);
        continue;
      }
      failed++;
      console.log(`FAIL  ${label}: ${violations.length} elements`);
      if (details) {
        for (const n of violations) console.log(`        ${n.ratio}:1 (needs ${n.expected}) ${n.fg} on ${n.bg}  ${n.html}`);
        continue;
      }
      // grouped by the element's classes, with the worst ratio in each group
      const groups = new Map<string, Failure[]>();
      for (const n of violations) {
        const key = n.target.startsWith('layered:')
          ? n.target.slice(8)
          : (n.html.match(/^<(\w+)[^>]*?class="([^"]*)"/)?.slice(1).join('.') ?? n.html.slice(0, 40));
        groups.set(key, [...(groups.get(key) ?? []), n]);
      }
      for (const [key, nodes] of groups) {
        const worst = nodes.reduce((a, b) => (b.ratio < a.ratio ? b : a));
        console.log(`        ${nodes.length} × ${key}: worst ${worst.ratio}:1 (needs ${worst.expected}), ${worst.fg} on ${worst.bg}`);
      }
    }
  }
}
await browser.close();
// a run that checked nothing (every preset missing from the served build) is a failure, not a pass
if (!checked) console.log(`nothing checked: ${skipped} run${skipped === 1 ? '' : 's'} skipped`);
process.exit(failed || !checked ? 1 : 0);

/** Both passes over what's on screen now. */
async function checkView(page: Page): Promise<Failure[]> {
  const fromAxe: Failure[] = await page.evaluate(async (layered) => {
    const axe = (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<any> } }).axe;
    const r = await axe.run(
      { exclude: [...document.querySelectorAll(layered)].map((e) => [e]) },
      { runOnly: { type: 'rule', values: ['color-contrast'] } },
    );
    return r.violations
      .flatMap((v: any) => v.nodes)
      .map((n: any) => {
        const d = n.any[0]?.data ?? {};
        return {
          target: String(n.target[0]),
          html: n.html.slice(0, 120),
          ratio: d.contrastRatio,
          fg: d.fgColor,
          bg: d.bgColor,
          expected: d.expectedContrastRatio,
        };
      });
  }, LAYERED);
  return [...fromAxe, ...(await layeredText(page))];
}

/** The pixel check for text on layered backgrounds (see the header). */
async function layeredText(page: Page): Promise<Failure[]> {
  const items = await page.evaluate((layered) => {
    // the chart area: inside the scroller, right of the sticky row labels and below the sticky ruler
    const s = document.querySelector('.tl-scroller')!.getBoundingClientRect();
    const scroller = {
      left: document.querySelector('.tl-lane-label')?.getBoundingClientRect().right ?? s.left,
      right: s.right,
      top: document.querySelector('.tl-ruler')?.getBoundingClientRect().bottom ?? s.top,
      bottom: s.bottom,
    };
    const parse = (c: string) => {
      const n = c.match(/[\d.]+/g)!.map(Number);
      const srgb = c.startsWith('color(');
      return { rgb: n.slice(0, 3).map((v) => (srgb ? v * 255 : v)), a: n[3] ?? 1 };
    };
    return [...document.querySelectorAll<HTMLElement>(layered)].flatMap((el) => {
      // the content box (inside padding and border), where the text is
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      const px = (p: string) => parseFloat(st.getPropertyValue(p)) || 0;
      const b = {
        left: r.left + px('border-left-width') + px('padding-left'),
        right: r.right - px('border-right-width') - px('padding-right'),
        top: r.top + px('border-top-width') + px('padding-top'),
        bottom: r.bottom - px('border-bottom-width') - px('padding-bottom'),
      };
      // only text wholly in the chart area; a label cut off at the screen's edge is checked from another screen
      // (phase names are sticky, so they're always whole)
      if (b.left < scroller.left - 1 || b.right > scroller.right + 1 || b.top < scroller.top - 1) return [];
      if (b.bottom > scroller.bottom + 1) return [];
      const [x0, x1, y0, y1] = [b.left, b.right, b.top, b.bottom];
      if (x1 - x0 < 4 || y1 - y0 < 4 || !el.textContent?.trim()) return [];
      let opacity = 1;
      for (let n: HTMLElement | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
      const fg = parse(st.color);
      const mark = el.closest('.tl-mark');
      const kind = el.matches('.tl-phase-name') ? 'phase name' : el.matches('.cluster') ? '+N cluster' : 'event label';
      const dimmed = opacity < 1 ? ' (dimmed)' : '';
      return [
        {
          box: [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)],
          fg: fg.rgb,
          a: fg.a * opacity,
          large: parseFloat(st.fontSize) >= 24 || (parseFloat(st.fontSize) >= 18.66 && Number(st.fontWeight) >= 700),
          kind: kind + (mark?.classList.contains('key') ? ', key' : '') + dimmed,
          html: el.outerHTML.slice(0, 120),
        },
      ];
    });
  }, LAYERED);
  const hide = await page.addStyleTag({
    content: `${LAYERED} { color: transparent !important; text-shadow: none !important; transition: none !important; }`,
  });
  await page.waitForTimeout(100);
  const shot = (await page.screenshot()).toString('base64');
  await hide.evaluate((e) => (e as Element).remove());
  return page.evaluate(
    async ({ items, shot }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${shot}`;
      await img.decode();
      const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, img.width, img.height).data;
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const hex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      return items.flatMap((it) => {
        const [x0, top, x1, bottom] = it.box;
        // the middle band of the line box, where the letters are (not the leading above and below them)
        const y0 = Math.round(top + (bottom - top) * 0.2), y1 = Math.round(bottom - (bottom - top) * 0.2);
        // thin vertical lines that cross the text (threads, phase edges) are overlays, not its background: a column
        // whose brightness differs from the columns 3 px either side, while those two agree, is left out with its
        // neighbours (for anti-aliasing)
        const at = (x: number, y: number) => {
          const i = (y * img.width + x) * 4;
          return lum([px[i], px[i + 1], px[i + 2]]);
        };
        const col = (x: number) => {
          const v: number[] = [];
          for (let y = y0; y < y1; y++) v.push(at(Math.min(img.width - 1, Math.max(0, x)), y));
          return v.sort((a, b) => a - b)[v.length >> 1] ?? 0;
        };
        const skip = new Set<number>();
        for (let x = x0; x < x1; x++) {
          const [l, c, r] = [col(x - 3), col(x), col(x + 3)];
          const tol = 0.02 + 0.08 * Math.max(l, r);
          if (Math.abs(l - r) < tol && Math.abs(c - l) > 2 * tol && Math.abs(c - r) > 2 * tol)
            for (let d = -1; d <= 1; d++) skip.add(x + d);
        }
        const ratios: { r: number; bg: number[]; fg: number[] }[] = [];
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            if (skip.has(x)) continue;
            const i = (y * img.width + x) * 4;
            const bg = [px[i], px[i + 1], px[i + 2]];
            const fg = it.fg.map((v, k) => v * it.a + bg[k] * (1 - it.a));
            const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
            ratios.push({ r: (hi + 0.05) / (lo + 0.05), bg, fg });
          }
        if (!ratios.length) return [];
        ratios.sort((a, b) => a.r - b.r);
        const p = ratios[Math.floor(ratios.length * 0.05)];
        const need = it.large ? 3 : 4.5;
        if (p.r >= need) return [];
        return [
          {
            target: `layered:${it.kind}`,
            html: it.html,
            ratio: Math.round(p.r * 100) / 100,
            fg: hex(p.fg),
            bg: hex(p.bg),
            expected: `${need}:1`,
          },
        ];
      });
    },
    { items, shot },
  );
}
