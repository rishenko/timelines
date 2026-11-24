// Checks target size (WCAG 2.5.8, AA): every control is at least 24 × 24 px, or a 24 px circle centred on it touches
// no other control (and no other small control's circle). Exempt, as WCAG allows: links inside a sentence, and
// native controls the app doesn't restyle (checkboxes, radio buttons). A control in sticky chrome (the ruler, the Ages
// strip, a row's label) isn't measured against one in the scrolled content, since scrolling moves any mark under the
// chrome; pairs within a layer, and between two sticky layers, are. Opens the same views and panels as reflow.ts.
//   node scripts/targets.ts [--url http://localhost:4317/] [--timeline ancient-classical] [--width 1280]... [--details]
//        [--browser chrome|msedge]
// Defaults: widths 390 (a phone) and 1280. Run `npm run build` and `npx vite preview --port 4317` first. Exits with 1
// if any control fails.
import { chromium } from 'playwright-core';
import { openState, uiStates } from './lib/ui-states.ts';

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const one = (flag: string, def: string) => all(flag)[0] ?? def;
const base = one('--url', 'http://localhost:4317/');
const timeline = one('--timeline', 'ancient-classical');
const widths = all('--width').length ? all('--width').map(Number) : [390, 1280];
const details = args.includes('--details');

const browser = await chromium.launch({
  channel: one('--browser', process.platform === 'win32' ? 'msedge' : 'chrome'),
});
let problems = 0;
for (const width of widths) {
  for (const state of uiStates(base, timeline)) {
    const page = await openState(browser, base, timeline, width, state);
    if (!page) continue;
    const failures = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight;
      const selector =
        'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [tabindex="0"]';
      const inSentence = (el: Element) => el.tagName === 'A' && !!el.closest('p, li') && (el.closest('p, li')!.textContent ?? '').trim() !== (el.textContent ?? '').trim();
      const nativeCheck = (el: Element) => el.tagName === 'INPUT' && /^(checkbox|radio)$/.test((el as HTMLInputElement).type);
      const targets = [...document.querySelectorAll<HTMLElement>(selector)].flatMap((el) => {
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || st.pointerEvents === 'none') return [];
        if ((el as HTMLButtonElement).disabled) return [];
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return [];
        // what's actually under the pointer at the centre: a control covered by another (e.g. a scrolled-away mark
        // under the sticky row labels) isn't a target there
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const top = document.elementFromPoint(Math.min(vw - 1, Math.max(0, cx)), Math.min(vh - 1, Math.max(0, cy)));
        if (top && !el.contains(top) && !top.contains(el)) return [];
        // a checkbox inside a label: the label is the target
        const label = nativeCheck(el) ? el.closest('label') : null;
        const box = label ? label.getBoundingClientRect() : r;
        return [{ el, box, exempt: inSentence(el) || (nativeCheck(el) && !label) }];
      });
      const name = (el: Element) => {
        const text = (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
        return `${el.tagName.toLowerCase()}${cls}${text ? ` "${text}"` : ''}`;
      };
      const small = (b: DOMRect) => b.width < 24 - 0.5 || b.height < 24 - 0.5;
      const centre = (b: DOMRect) => [b.left + b.width / 2, b.top + b.height / 2];
      // distance from a point to a rectangle
      const toRect = ([x, y]: number[], b: DOMRect) => Math.hypot(Math.max(b.left - x, 0, x - b.right), Math.max(b.top - y, 0, y - b.bottom));
      // the sticky box a control sits in (the ruler, the Ages strip, a row's label), if any
      const stickyLayer = (el: Element) => {
        for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).position === 'sticky') return a;
        return null;
      };
      const out: string[] = [];
      for (const t of targets) {
        if (t.exempt || !small(t.box)) continue;
        const c = centre(t.box);
        const layerT = stickyLayer(t.el);
        const clash = targets.find((o) => {
          if (o === t || o.el.contains(t.el) || t.el.contains(o.el)) return false;
          // a control in sticky chrome and one in scrolled content change places with every scroll, so any of them can pass
          // under the chrome: that pair isn't a spacing failure. Two controls in the same layer, or in two different sticky
          // layers (which don't move against each other), are still checked.
          if (!layerT !== !stickyLayer(o.el)) return false;
          return small(o.box) ? Math.hypot(c[0] - centre(o.box)[0], c[1] - centre(o.box)[1]) < 24 : toRect(c, o.box) < 12;
        });
        if (clash) out.push(`${name(t.el)} ${Math.round(t.box.width)}×${Math.round(t.box.height)} px, too close to ${name(clash.el)}`);
      }
      return out;
    });
    await page.close();
    if (!failures.length) {
      console.log(`ok    ${width}px ${state[0]}`);
      continue;
    }
    problems++;
    // grouped by the control's kind (tag and classes), with a count
    const groups = new Map<string, string[]>();
    for (const f of failures) {
      const kind = f.replace(/ ".*$/, '').replace(/ \d+×\d+ px.*$/, '');
      groups.set(kind, [...(groups.get(kind) ?? []), f]);
    }
    console.log(`FAIL  ${width}px ${state[0]}: ${failures.length} controls`);
    for (const [kind, fs] of groups) {
      console.log(`        ${fs.length} × ${kind}  e.g. ${fs[0].replace(/^[^"]*/, '')}`);
      if (details) for (const f of fs) console.log(`          ${f}`);
    }
  }
}
await browser.close();
process.exit(problems ? 1 : 0);
