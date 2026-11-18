// Screenshots the app in Microsoft Edge (via playwright-core; no browser download needed).
//   node scripts/screenshot.ts <url> <out.png> [--width 1800] [--height 1400] [--full] [--close-legend]
//        [--expand "Row name|Other row"] [--scroll-to "Row name"] [--storage key=file.json] [--click "Button|Other"]
// --click presses toolbar or panel buttons whose text contains each name, in order, before --expand.
// --expand opens collapsed rows by their label (in order, so a group can be opened before its regions);
// --scroll-to scrolls the timeline so that row sits near the top. Names are separated by "|".
// --storage puts a file into localStorage before the page loads (repeatable), e.g. a saved edit-mode draft.
// Run `npx vite preview --port 4317` (after `npm run build`) or `npm run dev` first for a local URL; the
// preview serves the app at /, not /timelines/.
// Prints any page errors and failed requests, and exits with 1 if there were any.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const valued = /^--(width|height|expand|scroll-to|storage|click)$/;
const [url, out] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.match(valued));
if (!url || !out) {
  console.error('usage: node scripts/screenshot.ts <url> <out.png> [--width N] [--height N] [--full] [--close-legend] [--expand "A|B"] [--scroll-to "A"]');
  process.exit(1);
}
const opt = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const num = (flag: string, def: number) => (opt(flag) !== undefined ? Number(opt(flag)) : def);

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: num('--width', 1800), height: num('--height', 1400) } });
const problems: string[] = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
const storage = args.flatMap((a, i) => (a === '--storage' ? [args[i + 1]] : [])).map((kv) => {
  const at = kv.indexOf('=');
  return [kv.slice(0, at), readFileSync(kv.slice(at + 1), 'utf8')];
});
if (storage.length) await page.addInitScript((pairs) => pairs.forEach(([k, v]) => localStorage.setItem(k, v)), storage);
await page.goto(url);
await page.waitForTimeout(2000);
if (args.includes('--close-legend')) {
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(300);
}
for (const name of opt('--click')?.split('|') ?? []) {
  const btn = page.locator('button').filter({ hasText: name }).first();
  if (await btn.count()) await btn.click();
  else problems.push(`--click: no button with "${name}"`);
  await page.waitForTimeout(300);
}

const label =(name: string) => page.locator('.tl-lane-label').filter({ has: page.getByText(name, { exact: true }) }).first();
for (const name of opt('--expand')?.split('|') ?? []) {
  const l = label(name);
  await l.scrollIntoViewIfNeeded();
  const btn = l.locator('button[title="Expand sub-tracks"]');
  if (await btn.count()) await btn.first().click();
  else problems.push(`--expand: "${name}" has no collapsed sub-rows`);
  await page.waitForTimeout(300);
}
const target = opt('--scroll-to');
if (target) {
  await label(target).evaluate((el) => {
    el.scrollIntoView({ block: 'start' });
    let s = el.parentElement;
    while (s && s.scrollHeight <= s.clientHeight + 5) s = s.parentElement;
    if (s) s.scrollTop -= 60; // clear the sticky axis header
  });
  await page.waitForTimeout(300);
}

await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
console.log('saved', out);
for (const p of problems) console.log(p);
process.exit(problems.length ? 1 : 0);
