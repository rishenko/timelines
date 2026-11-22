// Screenshots one timeline at every zoom step, at a few center years, with rows as they open and with every row
// expanded, then (with --compare) diffs each shot against an earlier set pixel by pixel. Proves that a change
// leaves the chart as it was ("before" shots from the old build, "after" shots from the new one).
//   node scripts/zoom-shots.ts --url http://localhost:4323/ --out shots/before [--timeline ancient-classical]
//        [--at "-3000|-500|300"] [--inc "10|50"] [--width 1800] [--height 1400] [--compare shots/before]
//        [--browser chrome]
// Without --inc it takes the timeline's own zoom steps (meta.increments, read from public/timelines/<id>.json, or from
// the folders in TIMELINES_LOCAL_DATA).
// --compare writes <name>.diff.png beside each shot that differs and prints a table of differing pixels;
// exits with 1 if any shot differs.
// npm run zoom-shots -- <same flags>
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { chromium, type Page } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const base = opt('--url') ?? 'http://localhost:4317/';
const out = opt('--out');
if (!out) {
  console.error('usage: node scripts/zoom-shots.ts --url <app url> --out <dir> [--timeline id] [--at "a|b"] [--inc "a|b"] [--compare <dir>]');
  process.exit(1);
}
const id = opt('--timeline') ?? 'ancient-classical';
// the timeline's file: a bundled one, else one in the folders of TIMELINES_LOCAL_DATA (see scripts/lib/local-data.ts)
const file = [`public/timelines/${id}.json`, ...(process.env.TIMELINES_LOCAL_DATA ?? '').split(delimiter).filter(Boolean).map((d) => join(d, `${id}.json`))].find(
  (f) => existsSync(f),
);
const incs = opt('--inc')?.split('|') ?? (file ? (JSON.parse(readFileSync(file, 'utf8')).meta.increments as (number | string)[]).map(String) : []);
if (!incs.length) {
  console.error(`No zoom steps: ${id} not found (give --inc)`);
  process.exit(1);
}
const ats = (opt('--at') ?? '-3000|-500|300').split('|');
const width = Number(opt('--width') ?? 1800);
const height = Number(opt('--height') ?? 1400);
const compareDir = opt('--compare');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: opt('--browser') ?? (process.platform === 'win32' ? 'msedge' : 'chrome') });
const problems: string[] = [];

async function open(page: Page, inc: string, at: string) {
  await page.goto(`${base}?timeline=${encodeURIComponent(id)}&inc=${encodeURIComponent(inc)}&at=${encodeURIComponent(at)}`);
  await page.waitForTimeout(1500);
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 1000 }).catch(() => {});
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 1000 }).catch(() => {});
  await page.mouse.move(0, height - 1);
  await page.waitForTimeout(400);
}

const names: string[] = [];
for (const inc of incs)
  for (const at of ats)
    for (const rows of ['opening', 'expanded'] as const) {
      const page = await browser.newPage({ viewport: { width, height } });
      page.on('pageerror', (e) => problems.push(`${inc}/${at}: page error: ${e.message}`));
      await open(page, inc, at);
      if (rows === 'expanded') {
        // "Expand all" opens one more level per press; press until it's gone
        for (let i = 0; i < 10; i++) {
          const b = page.getByRole('button', { name: /Expand all/ }).first();
          if (!(await b.count())) break;
          await b.click();
          await page.waitForTimeout(300);
        }
        await page.mouse.move(0, height - 1);
        await page.waitForTimeout(300);
      }
      const name = `${id}_inc-${inc}_at-${at}_${rows}.png`;
      await page.screenshot({ path: join(out, name) });
      names.push(name);
      await page.close();
    }

let differing = 0;
if (compareDir) {
  // decode both PNGs in a page canvas and count pixels that differ
  const page = await browser.newPage();
  console.log('shot | differing pixels');
  for (const name of names) {
    const before = join(compareDir, name);
    if (!existsSync(before)) {
      console.log(`${name} | no "before" shot`);
      differing++;
      continue;
    }
    const a = readFileSync(before).toString('base64');
    const b = readFileSync(join(out, name)).toString('base64');
    const r = await page.evaluate(async ([a, b]) => {
      const load = (s: string) =>
        new Promise<HTMLImageElement>((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.src = `data:image/png;base64,${s}`;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
      const px = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d')!;
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, w, h);
      };
      const da = px(ia), db = px(ib);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d')!;
      const diff = x.createImageData(w, h);
      let n = 0;
      for (let i = 0; i < da.data.length; i += 4) {
        const same = da.data[i] === db.data[i] && da.data[i + 1] === db.data[i + 1] && da.data[i + 2] === db.data[i + 2];
        const g = (da.data[i] + da.data[i + 1] + da.data[i + 2]) / 3;
        if (!same) n++;
        diff.data.set(same ? [g, g, g, 60] : [255, 0, 0, 255], i);
      }
      x.putImageData(diff, 0, 0);
      return { n, png: c.toDataURL('image/png').split(',')[1] };
    }, [a, b]);
    console.log(`${name} | ${r.n}`);
    if (r.n) {
      differing++;
      writeFileSync(join(out, name.replace(/\.png$/, '.diff.png')), Buffer.from(r.png, 'base64'));
    }
  }
  await page.close();
  console.log(`${names.length - differing} of ${names.length} shots identical`);
}
await browser.close();
if (problems.length) console.error(problems.join('\n'));
process.exit(differing || problems.length ? 1 : 0);
