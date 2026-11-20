// After `npm run deploy`, waits until GitHub Pages serves the build in dist/, then checks that the page
// loads without errors and (optionally) contains some text.
//   node scripts/check-live.ts [--url https://rishenko.github.io/timelines/] [--expect "Harappan civilization"]...
//   --url may carry its own parameters, e.g. --url "https://rishenko.github.io/timelines/?timeline=ancient-classical".
// Pages can take a minute or two to update; this retries for about three minutes.
// Uses Microsoft Edge on Windows and Google Chrome elsewhere; --browser msedge|chrome picks one.
import { readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const base = opt('--url')[0] ?? 'https://rishenko.github.io/timelines/';
const expected = opt('--expect');
const bundle = readdirSync('dist/assets').find((f) => f.startsWith('index-') && f.endsWith('.js'));
if (!bundle) throw new Error('no dist/assets/index-*.js: run npm run build (or deploy) first');

const browser = await chromium.launch({
  channel: opt('--browser')[0] ?? (process.platform === 'win32' ? 'msedge' : 'chrome'),
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
let ok = false;
for (let attempt = 0; attempt < 12 && !ok; attempt++) {
  if (attempt) await page.waitForTimeout(15000);
  // add the cache-buster to whatever the URL already has (e.g. ?timeline=ancient-classical) instead of replacing it
  const url = new URL(base);
  url.searchParams.set('nocache', String(Date.now()));
  await page.goto(url.href);
  await page.waitForTimeout(2500);
  const scripts = await page.$$eval('script[src]', (s) => s.map((x) => (x as HTMLScriptElement).src));
  ok = scripts.some((s) => s.endsWith(bundle));
  if (!ok) console.log(`live site not updated yet (want ${bundle}); retrying`);
}
const body = (await page.textContent('body')) ?? '';
await browser.close();
if (!ok) {
  console.log('FAIL: the live site never served', bundle);
  process.exit(1);
}
console.log('live site serves', bundle);
const missing = expected.filter((t) => !body.includes(t));
for (const t of expected) console.log(`${missing.includes(t) ? 'MISSING' : 'found'}: ${t}`);
for (const e of errors) console.log('page error:', e);
process.exit(missing.length || errors.length ? 1 : 0);
