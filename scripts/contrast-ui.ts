// Checks non-text contrast (WCAG 1.4.11, AA) in a real browser: the parts of the page a reader needs to see to
// recognise a thing must stand out from what is next to them by 3:1. Three passes, in every theme preset:
//   marks    event diamonds and bars and "+N" pills on the chart. A screenshot with the marks is compared with one
//            without them, pixel by pixel, so the background is whatever is really behind each mark (row bands,
//            phases, range bands). A mark passes if its fill (the median of its inner pixels) or its edge (the median
//            of its outermost ring of pixels) reaches 3:1. Labels are hidden in both screenshots (text is
//            contrast.ts's job). Marks faded because another event is selected are reported apart, as "dimmed", and so
//            are "+N" pills: they are buttons named by their text, which WCAG accepts without a 3:1 edge.
//   focus    the focus outline (also 2.4.7): a sample of each kind of control is focused from the keyboard, and the
//            pixels that change must change by 3:1, over at least the control's perimeter (a 1 px ring).
//   fields   text fields and menus (input, select, textarea): their border, or else their fill, against the
//            background around them. Checkboxes and radio buttons keep the browser's look, which WCAG exempts.
//   node scripts/contrast-ui.ts [--url http://localhost:4317/] [--timeline ancient-classical]
//        [--preset parchment|dark|light|contrast]... [--check marks|focus|fields]... [--state rest|focus]...
//        [--sweep] [--details] [--browser chrome|msedge]
// Defaults: every preset, every check, both states (state only matters to marks). --sweep checks the marks on every
// screen of the chart (slow); without it, the opening view with every row expanded. Known exceptions, left on purpose
// (--sweep lists them): bars only a few pixels wide that sit on a vertical line of the same color (a phase edge or a
// thread), where what's measured behind them is that line, not the row. Run `npm run build` and
// `npx vite preview --port 4317` first. Exits with 1 if anything fails.
import { chromium, type Page } from 'playwright-core';
import { PRESETS } from '../src/lib/theme.ts';
import { uiStates } from './lib/ui-states.ts';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timeline = one('--timeline', 'ancient-classical');
const presets = all('--preset').length ? all('--preset') : Object.keys(PRESETS);
const checks = all('--check').length ? all('--check') : ['marks', 'focus', 'fields'];
const states = all('--state').length ? all('--state') : ['rest', 'focus'];
const sweep = args.includes('--sweep');
const details = args.includes('--details');
const NEED = 3;

interface Finding {
  /** What kind of thing, for grouping: "bar", "diamond, key", "focus: search box", "field: select"… */
  kind: string;
  ratio: number;
  what: string;
  dimmed?: boolean;
}

const browser = await chromium.launch({ channel: one('--browser', process.platform === 'win32' ? 'msedge' : 'chrome') });
let failed = 0;

async function themedPage(preset: string, width = 1700, height = 1000, query = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(
    ([colors, p]) => {
      localStorage.setItem('timeline:theme', JSON.stringify({ preset: p, colors }));
      localStorage.setItem('timelines:legend-seen', '1');
    },
    [PRESETS[preset].colors, preset] as const,
  );
  const url = new URL(base);
  url.searchParams.set('timeline', timeline);
  await page.goto(url.toString() + query);
  await page.waitForTimeout(1500);
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 500 }).catch(() => {});
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 500 }).catch(() => {});
  return page;
}

function report(label: string, found: Finding[]) {
  const bad = found.filter((f) => f.ratio < NEED);
  const ok = found.length - bad.length;
  if (!bad.length) {
    console.log(`ok    ${label} (${found.length} checked)`);
    return;
  }
  failed++;
  console.log(`FAIL  ${label}: ${bad.length} of ${found.length} below ${NEED}:1 (${ok} pass)`);
  const groups = new Map<string, Finding[]>();
  for (const f of bad) groups.set(f.kind, [...(groups.get(f.kind) ?? []), f]);
  for (const [kind, fs] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const worst = fs.reduce((a, b) => (b.ratio < a.ratio ? b : a));
    console.log(`        ${fs.length} × ${kind}: worst ${worst.ratio}:1 (${worst.what})`);
    if (details) for (const f of fs) console.log(`          ${f.ratio}:1 ${f.what}`);
  }
}

// ---- shared pixel helpers, run in the page ----

/** Puts two screenshots in the page as pixel arrays, for the in-page comparisons below. */
async function loadShots(page: Page, a: Buffer, b: Buffer) {
  await page.evaluate(
    async ([a, b]) => {
      const load = async (src: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${src}`;
        await img.decode();
        const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return { w: img.width, h: img.height, px: ctx.getImageData(0, 0, img.width, img.height).data };
      };
      (window as unknown as { __shots: unknown }).__shots = [await load(a), await load(b)];
    },
    [a.toString('base64'), b.toString('base64')],
  );
}

// ---- marks ----

async function checkMarks(page: Page): Promise<Finding[]> {
  const hideText = await page.addStyleTag({
    // the selected event's outline is a state indicator around the mark, not the mark's own edge
    content: '.tl-mark .label, .tl-mark.cluster { color: transparent !important; text-shadow: none !important; } .tl-mark { transition: none !important; } .tl-mark .label::after { visibility: hidden !important; } .tl-mark .diamond, .tl-mark .bar { outline: none !important; }',
  });
  await page.waitForTimeout(100);
  const items = await page.evaluate(() => {
    const s = document.querySelector('.tl-scroller')!.getBoundingClientRect();
    const area = {
      left: document.querySelector('.tl-lane-label')?.getBoundingClientRect().right ?? s.left,
      right: s.right,
      top: document.querySelector('.tl-ruler')?.getBoundingClientRect().bottom ?? s.top,
      bottom: s.bottom,
    };
    return [...document.querySelectorAll<HTMLElement>('.tl-mark .diamond, .tl-mark .bar, .tl-mark.cluster')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      if (r.left < area.left + 1 || r.right > area.right - 1 || r.top < area.top + 1 || r.bottom > area.bottom - 1) return [];
      if (r.width < 3 || r.height < 3) return [];
      const mark = el.closest('.tl-mark')!;
      let opacity = 1;
      for (let n: HTMLElement | null = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
      const shape = el.classList.contains('diamond') ? 'diamond' : el.classList.contains('bar') ? 'bar' : '+N pill';
      const lane = mark.closest('.tl-lane')?.getAttribute('aria-label') ?? '';
      return [
        {
          box: [Math.floor(r.left) - 1, Math.floor(r.top) - 1, Math.ceil(r.right) + 1, Math.ceil(r.bottom) + 1],
          kind: shape + (mark.classList.contains('key') ? ', key' : '') + (mark.classList.contains('uncertain') ? ', uncertain' : ''),
          dimmed: opacity < 0.99,
          what: `${(mark.getAttribute('aria-label') ?? '').split(',')[0].slice(0, 50)} [${lane.slice(0, 30)}]`,
        },
      ];
    });
  });
  const withMarks = await page.screenshot();
  const hide = await page.addStyleTag({ content: '.tl-mark .diamond, .tl-mark .bar, .tl-mark.cluster { visibility: hidden !important; }' });
  await page.waitForTimeout(100);
  const without = await page.screenshot();
  await hide.evaluate((e) => (e as Element).remove());
  await hideText.evaluate((e) => (e as Element).remove());
  await loadShots(page, withMarks, without);
  return page.evaluate((items) => {
    const [A, B] = (window as unknown as { __shots: { w: number; h: number; px: Uint8ClampedArray }[] }).__shots;
    const lum = (p: Uint8ClampedArray, i: number) => {
      const [r, g, b] = [p[i], p[i + 1], p[i + 2]].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const median = (v: number[]) => (v.sort((a, b) => a - b), v[v.length >> 1]);
    return items.flatMap((it) => {
      const [x0, y0, x1, y1] = it.box;
      const W = x1 - x0, H = y1 - y0;
      const inMask = new Uint8Array(W * H);
      const ratio = new Float64Array(W * H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const gx = x0 + x, gy = y0 + y;
          if (gx < 0 || gy < 0 || gx >= A.w || gy >= A.h) continue;
          const i = (gy * A.w + gx) * 4;
          const diff = Math.max(...[0, 1, 2].map((k) => Math.abs(A.px[i + k] - B.px[i + k])));
          if (diff <= 6) continue;
          inMask[y * W + x] = 1;
          const [hi, lo] = [lum(A.px, i), lum(B.px, i)].sort((a, b) => b - a);
          ratio[y * W + x] = (hi + 0.05) / (lo + 0.05);
        }
      const m = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && inMask[y * W + x] === 1;
      const ring: number[] = [], ring2: number[] = [], inner: number[] = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!m(x, y)) continue;
          const edge = !m(x - 1, y) || !m(x + 1, y) || !m(x, y - 1) || !m(x, y + 1);
          const near = (d: number) => !m(x - d, y) || !m(x + d, y) || !m(x, y - d) || !m(x, y + d);
          if (edge) ring.push(ratio[y * W + x]);
          // the next ring in: on a slanted edge (a diamond) the outermost ring is all anti-aliasing, and the border
          // proper is here
          else if (near(2)) ring2.push(ratio[y * W + x]);
          // inner: three pixels in from any edge, past the border and its anti-aliasing
          else inner.push(ratio[y * W + x]);
        }
      if (ring.length < 4) return [];
      const edgeR = Math.max(median(ring), ring2.length >= 4 && it.kind.startsWith('diamond') ? median(ring2) : 0);
      const fillR = inner.length >= 4 ? median(inner) : 0;
      const best = Math.max(edgeR, fillR);
      return [{ kind: it.kind + (it.dimmed ? ', dimmed' : ''), ratio: Math.round(best * 100) / 100, what: `${it.what}: edge ${edgeR.toFixed(2)}, fill ${fillR.toFixed(2)}`, dimmed: it.dimmed }];
    });
  }, items);
}

// ---- focus outline ----

/** One control of each kind, found in the opening view, with a name for the report. */
const FOCUS_SAMPLES: [string, string][] = [
  ['toolbar button', '.toolbar .group button'],
  ['title menu', '.timeline-picker'],
  ['search box', 'input.search'],
  ['event mark', '.tl-mark:not(.cluster)'],
  ['+N pill', '.tl-mark.cluster'],
  ['row fold button', '.tl-lane-label .collapse'],
  ['row name link', '.tl-lane-label a.name'],
  ['panel button', '.toolbar > button'],
];

async function checkFocus(page: Page): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const [name, css] of FOCUS_SAMPLES) {
    const el = page.locator(css).first();
    if (!(await el.count())) continue;
    await page.keyboard.press('Shift'); // keyboard modality, so :focus-visible applies
    await el.evaluate((e) => (e as HTMLElement).focus());
    await page.waitForTimeout(250);
    const box = await el.boundingBox();
    if (!box) continue;
    const pad = 6;
    const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
    const focused = await page.screenshot({ clip });
    await el.evaluate((e) => (e as HTMLElement).blur());
    await page.waitForTimeout(250);
    const plain = await page.screenshot({ clip });
    await loadShots(page, focused, plain);
    const r = await page.evaluate((perimeter) => {
      const [A, B] = (window as unknown as { __shots: { w: number; h: number; px: Uint8ClampedArray }[] }).__shots;
      const lum = (p: Uint8ClampedArray, i: number) => {
        const [r, g, b] = [p[i], p[i + 1], p[i + 2]].map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const changed: number[] = [];
      for (let i = 0; i < A.px.length; i += 4) {
        const diff = Math.max(...[0, 1, 2].map((k) => Math.abs(A.px[i + k] - B.px[i + k])));
        if (diff <= 6) continue;
        const [hi, lo] = [lum(A.px, i), lum(B.px, i)].sort((a, b) => b - a);
        changed.push((hi + 0.05) / (lo + 0.05));
      }
      changed.sort((a, b) => b - a);
      // the ratio reached by the perimeter's worth of most-changed pixels: at least a 1 px ring at that contrast
      return changed.length >= perimeter ? changed[perimeter - 1] : 0;
    }, Math.round(2 * (box.width + box.height)));
    out.push({ kind: `focus: ${name}`, ratio: Math.round(r * 100) / 100, what: css });
  }
  return out;
}

// ---- form fields ----

const FIELD_VIEWS = ['timeline', 'Customize: Timelines', 'event editor', 'track editor', 'source editor', 'Dating'];

async function checkFields(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const parse = (c: string) => {
      const n = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
      const srgb = c.startsWith('color(');
      return { rgb: n.slice(0, 3).map((v) => (srgb ? v * 255 : v)), a: c.includes('/') || c.startsWith('rgba') || srgb ? (n[3] ?? 1) : 1 };
    };
    const over = (fg: { rgb: number[]; a: number }, bg: number[]) => fg.rgb.map((v, k) => v * fg.a + bg[k] * (1 - fg.a));
    /** The solid colour behind an element: its ancestors' backgrounds, composited from the page down. */
    const behind = (el: Element | null): number[] => {
      const stack: { rgb: number[]; a: number }[] = [];
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.a > 0) stack.push(c);
        if (c.a >= 1) break;
      }
      return stack.reverse().reduce((bg, c) => over(c, bg), [255, 255, 255]);
    };
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const cr = (a: number[], b: number[]) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const fields = [...document.querySelectorAll<HTMLElement>('input, select, textarea')].filter((el) => {
      if (el instanceof HTMLInputElement && /^(checkbox|radio|hidden|color|file|range)$/.test(el.type)) return false;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
    });
    return fields.map((el) => {
      const st = getComputedStyle(el);
      const outside = behind(el.parentElement);
      const fill = over(parse(st.backgroundColor), outside);
      const bw = parseFloat(st.borderTopWidth) || 0;
      const border = bw > 0 && st.borderTopStyle !== 'none' ? over(parse(st.borderTopColor), fill) : fill;
      const best = Math.max(cr(border, outside), cr(fill, outside));
      const tag = el.tagName.toLowerCase() + (el instanceof HTMLInputElement ? `[${el.type}]` : '');
      const name = el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? (el.closest('label')?.textContent ?? '').trim().slice(0, 30);
      return { kind: `field: ${tag}`, ratio: Math.round(best * 100) / 100, what: `${name || el.className} (border ${cr(border, outside).toFixed(2)}, fill ${cr(fill, outside).toFixed(2)})` };
    });
  });
}

// ---- run ----

for (const preset of presets) {
  if (checks.includes('marks')) {
    for (const state of states) {
      const page = await themedPage(preset);
      await page.locator('button', { hasText: 'Expand all' }).first().click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(500);
      if (state === 'focus') {
        const key = page.locator('.tl-mark.key');
        await ((await key.count()) ? key : page.locator('.tl-mark:not(.cluster)')).first().click();
        await page.waitForTimeout(400);
      }
      const positions = await page.evaluate((sweep) => {
        const el = document.querySelector('.tl-scroller') as HTMLElement;
        if (!sweep) return [[el.scrollLeft, el.scrollTop]];
        const steps = (size: number, view: number, overlap: number) => {
          const step = Math.max(100, view - overlap);
          return Array.from({ length: Math.max(1, Math.ceil((size - view) / step) + 1) }, (_, i) => Math.min(i * step, Math.max(0, size - view)));
        };
        return steps(el.scrollWidth, el.clientWidth, 300).flatMap((x) => steps(el.scrollHeight, el.clientHeight, 60).map((y) => [x, y]));
      }, sweep);
      const found = new Map<string, Finding>();
      for (const [x, y] of positions) {
        await page.evaluate(([x, y]) => (document.querySelector('.tl-scroller') as HTMLElement).scrollTo(x, y), [x, y]);
        await page.waitForTimeout(350);
        for (const f of await checkMarks(page)) {
          const prev = found.get(f.what.split(':')[0] + f.kind);
          // a mark seen on several screens counts once, at its best (it may sit on a band in one)
          if (!prev || f.ratio > prev.ratio) found.set(f.what.split(':')[0] + f.kind, f);
        }
      }
      await page.close();
      const all = [...found.values()];
      const pills = all.filter((f) => f.kind.startsWith('+N'));
      const marks = all.filter((f) => !f.kind.startsWith('+N'));
      const lowPills = pills.filter((f) => f.ratio < NEED).length;
      if (pills.length) console.log(`info  marks / ${preset} / ${state}, +N pills: ${lowPills} of ${pills.length} edges below ${NEED}:1 (named by their text, checked by contrast.ts)`);
      const views = `${positions.length} view${positions.length > 1 ? 's' : ''}`;
      if (state === 'focus') {
        report(`marks / ${preset} / ${state}, selected and related (${views})`, marks.filter((f) => !f.dimmed));
        const dimmed = marks.filter((f) => f.dimmed);
        const low = dimmed.filter((f) => f.ratio < NEED).length;
        console.log(`info  marks / ${preset} / ${state}, dimmed: ${low} of ${dimmed.length} below ${NEED}:1 (faded on purpose while another event is selected)`);
      } else report(`marks / ${preset} / ${state} (${views})`, marks);
    }
  }
  if (checks.includes('focus')) {
    const page = await themedPage(preset);
    report(`focus / ${preset}`, await checkFocus(page));
    await page.close();
  }
  if (checks.includes('fields')) {
    const found: Finding[] = [];
    for (const state of uiStates(base, timeline).filter(([n]) => FIELD_VIEWS.includes(n))) {
      const page = await themedPage(preset, 1280, 900);
      try {
        await state[1](page);
        for (const f of await checkFields(page)) found.push({ ...f, what: `${state[0]}: ${f.what}` });
      } catch (e) {
        console.log(`?     fields / ${preset} / ${state[0]}: couldn't open (${(e as Error).message.split('\n')[0]})`);
      }
      await page.close();
    }
    report(`fields / ${preset}`, found);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
