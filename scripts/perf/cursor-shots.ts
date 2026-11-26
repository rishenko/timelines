// Screenshots with the year cursor drawn, for a before/after pixel compare (a companion to scripts/zoom-shots.ts, which
// moves the pointer off the chart): the pointer cursor at three points across the chart, and the keyboard cursor
// (Y on the first event, then two → steps). --compare <dir> counts differing pixels per shot, as zoom-shots does.
//   node scripts/perf/cursor-shots.ts --url http://localhost:4310/ --timeline modern-states --out shots/before
//   node scripts/perf/cursor-shots.ts --url http://localhost:4312/ --timeline modern-states --out shots/after --compare shots/before
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright-core';

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

async function open(page: Page) {
  await page.goto(`${base}?timeline=${encodeURIComponent(id)}`);
  await page.waitForTimeout(1500);
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 1000 }).catch(() => {});
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 1000 }).catch(() => {});
  await page.mouse.move(0, height - 1);
  await page.waitForTimeout(400);
}

const names: string[] = [];
for (const fx of [0.3, 0.55, 0.8]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await open(page);
  const box = (await page.locator('.tl-scroller').boundingBox())!;
  await page.mouse.move(box.x + box.width * fx, box.y + box.height * 0.6);
  await page.waitForTimeout(500);
  const name = `${id}_pointer-${Math.round(fx * 100)}.png`;
  await page.screenshot({ path: join(out, name) });
  names.push(name);
  await page.close();
}
{
  const page = await browser.newPage({ viewport: { width, height } });
  await open(page);
  await page.locator('.tl-mark[tabindex="0"]').first().focus();
  await page.keyboard.press('y');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const name = `${id}_keyboard.png`;
  await page.screenshot({ path: join(out, name) });
  names.push(name);
  await page.close();
}

if (compareDir) {
  const page = await browser.newPage();
  console.log('shot | differing pixels');
  let differing = 0;
  for (const name of names) {
    const before = join(compareDir, name);
    if (!existsSync(before)) {
      console.log(`${name} | no "before" shot`);
      differing++;
      continue;
    }
    const n = await page.evaluate(
      async ([a, b]) => {
        const load = (s: string) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
        const px = (img: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const da = px(ia), db = px(ib);
        let d = 0;
        for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) d++;
        return d;
      },
      [readFileSync(before).toString('base64'), readFileSync(join(out, name)).toString('base64')],
    );
    if (n) differing++;
    console.log(`${name} | ${n}`);
  }
  console.log(differing ? `${differing} shot(s) differ` : 'all shots identical');
}
await browser.close();
