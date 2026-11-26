// Screenshots after sideways scrolls that land at different offsets inside the view's half-screen band (step 1b): sticky
// titles, strip line names, the Ages strip, the overview outline and the rows that settle are all drawn from the exact
// view. --compare <dir> counts differing pixels per shot (and the largest channel difference), as zoom-shots does.
//   node scripts/perf/scroll-shots.ts --url http://localhost:4310/ --timeline modern-states --out shots/before
//   node scripts/perf/scroll-shots.ts --url http://localhost:4312/ --timeline modern-states --out shots/after --compare shots/before
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (f: string) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const base = opt('--url') ?? 'http://localhost:4310/';
const id = opt('--timeline') ?? 'modern-states';
const out = opt('--out')!;
const compareDir = opt('--compare');
const width = 1800;
const height = 1400;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const names: string[] = [];
for (const dx of [123, 437, 911, 1789]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${base}?timeline=${encodeURIComponent(id)}`);
  await page.waitForTimeout(1500);
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 1000 }).catch(() => {});
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 1000 }).catch(() => {});
  await page.mouse.move(0, height - 1);
  await page.evaluate((dx) => {
    const el = document.querySelector<HTMLElement>('.tl-scroller')!;
    el.scrollLeft = el.scrollLeft + dx;
  }, dx);
  await page.waitForTimeout(900); // scroll handler (one frame), the rows' settle (200 ms) and the redraw
  const name = `${id}_scroll-${dx}.png`;
  await page.screenshot({ path: join(out, name) });
  names.push(name);
  await page.close();
}
if (compareDir) {
  const page = await browser.newPage();
  console.log('shot | differing pixels | largest channel difference');
  let differing = 0;
  for (const name of names) {
    const before = join(compareDir, name);
    if (!existsSync(before)) {
      console.log(`${name} | no "before" shot`);
      differing++;
      continue;
    }
    const [n, mx] = await page.evaluate(
      async ([a, b]) => {
        const load = (s: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
        const px = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const da = px(ia), db = px(ib);
        let d = 0, m = 0;
        for (let i = 0; i < da.length; i += 4) {
          const dd = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
          if (dd) { d++; m = Math.max(m, dd); }
        }
        return [d, m];
      },
      [readFileSync(before).toString('base64'), readFileSync(join(out, name)).toString('base64')],
    );
    if (n) differing++;
    console.log(`${name} | ${n} | ${mx}`);
  }
  console.log(differing ? `${differing} shot(s) differ` : 'all shots identical');
}
await browser.close();
