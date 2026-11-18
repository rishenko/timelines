// Screenshots the app in Microsoft Edge (via playwright-core; no browser download needed).
//   node scripts/screenshot.ts <url> <out.png> [--width 1800] [--height 1400] [--full] [--close-legend]
// Run `npx vite preview --port 4317` (after `npm run build`) or `npm run dev` first for a local URL.
// Prints any page errors and failed requests, and exits with 1 if there were any.
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const [url, out] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.match(/^--(width|height)$/));
if (!url || !out) {
  console.error('usage: node scripts/screenshot.ts <url> <out.png> [--width N] [--height N] [--full] [--close-legend]');
  process.exit(1);
}
const num = (flag: string, def: number) => (args.includes(flag) ? Number(args[args.indexOf(flag) + 1]) : def);

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: num('--width', 1800), height: num('--height', 1400) } });
const problems: string[] = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));
await page.goto(url);
await page.waitForTimeout(2000);
if (args.includes('--close-legend')) {
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(300);
}
await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
console.log('saved', out);
for (const p of problems) console.log(p);
process.exit(problems.length ? 1 : 0);
