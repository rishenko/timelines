// Screenshots the app in an installed browser via playwright-core (no browser download needed): Microsoft Edge on
// Windows, Google Chrome elsewhere; --browser msedge|chrome picks one.
//   node scripts/screenshot.ts <url> <out.png> [--width 1800] [--height 1400] [--full] [--close-legend]
//        [--expand "Row name|Other row"] [--scroll-to "Row name"] [--row <row id>] [--storage key=file.json] [--click "Button|Other"]
//        [--pinch in|out] [--long-press "Row name"] [--measure ".toolbar > *"] [--keys "Tab|ArrowRight"] [--browser chrome]
// --close-legend closes the guided tour (it starts by itself on a first visit) and the legend.
// --click presses buttons whose text contains each name (or whose tooltip is exactly it), in order, before --expand;
// "=Name" matches the text exactly (so "=Edit" doesn't also match "Edit mode").
// --expand opens collapsed rows by their label (in order, so a group can be opened before its regions);
// --scroll-to scrolls the timeline so that row sits near the top. Names are separated by "|".
// --row <id> does the same by the row's id (as in the data file), expanding its collapsed ancestors first; use it for a
// new or deeply nested row, or a name that appears twice. It runs after --expand and instead of --scroll-to. It sees only
// the rows of the timeline files the page loaded (the open timeline, and any it loaded with it): a neighbouring
// timeline's row reports "no row" until that timeline is open.
// --storage puts a file into localStorage before the page loads (repeatable), e.g. a saved edit-mode draft.
// --measure prints the size and position of every element a CSS selector matches (e.g. to see what makes the
// toolbar wrap), measured just before the screenshot.
// Run `npx vite preview --port 4317` (after `npm run build`) or `npm run dev` first for a local URL; the
// preview serves the app at /, not /timelines/.
// Prints any page errors and failed requests, and exits with 1 if there were any.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const valued = /^--(width|height|expand|scroll-to|row|storage|click|pinch|long-press|measure|browser)$/;
const [url, out] = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.match(valued));
if (!url || !out) {
  console.error('usage: node scripts/screenshot.ts <url> <out.png> [--width N] [--height N] [--full] [--close-legend] [--expand "A|B"] [--scroll-to "A"] [--row <id>]');
  process.exit(1);
}
const opt = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const num = (flag: string, def: number) => (opt(flag) !== undefined ? Number(opt(flag)) : def);

const browser = await chromium.launch({
  channel: opt('--browser') ?? (process.platform === 'win32' ? 'msedge' : 'chrome'),
});
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
// the timeline files the page loads (rows with their parents), for --row
const loaded: { id: string; parent?: string }[][] = [];
page.on('response', async (r) => {
  if (!/\.json(\?|$)/.test(r.url()) || !r.ok()) return;
  const body = await r.json().catch(() => null);
  if (Array.isArray(body?.tracks)) loaded.push(body.tracks);
});
await page.goto(url);
await page.waitForTimeout(2000);
// --close-legend closes whatever opens by itself on a first visit: the guided tour (and the legend, if open)
if (args.includes('--close-legend')) {
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 1000 }).catch(() => {});
  await page.locator('.legend-panel header button.icon').first().click({ timeout: 1000 }).catch(() => {});
  await page.waitForTimeout(300);
}
for (const name of opt('--click')?.split('|') ?? []) {
  // by its text ("=Name": exactly), else by its tooltip (icon buttons such as a row's ✎ "Edit Egypt")
  const exact = name.startsWith('=');
  const text = exact ? new RegExp(`^\\s*${name.slice(1)}\\s*$`) : name;
  let btn = page.locator('button').filter({ hasText: text }).first();
  if (!(await btn.count())) btn = page.locator(`button[title="${name}"]`).first();
  if (await btn.count()) await btn.click();
  else problems.push(`--click: no button with "${name}"`);
  await page.waitForTimeout(300);
}

// --keys presses keys in order, after --click, as a keyboard user would: "Tab|Tab|ArrowRight". "focus:<css>" focuses the
// first element matching the selector first (e.g. "focus:.tl-mark[tabindex=\"0\"]|ArrowDown").
for (const k of opt("--keys")?.split("|") ?? []) {
  if (k.startsWith("focus:")) await page.locator(k.slice(6)).first().focus().catch(() => problems.push(`--keys: nothing matches ${k.slice(6)}`));
  else await page.keyboard.press(k);
  await page.waitForTimeout(250);
}

// --pinch in|out: a two-finger pinch on the timeline (spread = zoom in, close = zoom out), sent as touch events
// through the DevTools protocol, which Playwright's touchscreen API can't do with two fingers.
const pinch = opt('--pinch');
if (pinch) {
  const box = await page.locator('.tl-scroller').boundingBox();
  if (!box) problems.push('--pinch: no .tl-scroller');
  else {
    const cdp = await page.context().newCDPSession(page);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const pts = (gap: number) => [{ x: cx - gap / 2, y: cy, id: 1 }, { x: cx + gap / 2, y: cy, id: 2 }];
    const [from, to] = pinch === 'out' ? [200, 60] : [60, 200];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
    for (let i = 1; i <= 6; i++)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + ((to - from) * i) / 6) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500);
  }
}

// a row's label by its name; a name that links to the row's page also holds hidden " (opens in a new tab)" text
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const label = (name: string) =>
  page
    .locator('.tl-lane-label')
    .filter({ has: page.locator('.name', { hasText: new RegExp(`^${escapeRe(name)}( \\(opens in a new tab\\))?$`) }) })
    .first();
// the chart draws only the rows near the screen: scroll down a screen at a time until the row's label is drawn
const findLabel = async (name: string) => find(label(name));
const find = async (l: ReturnType<typeof label>) => {
  if (await l.count()) return l;
  await page.evaluate(() => (document.querySelector('.tl-scroller')!.scrollTop = 0));
  for (let i = 0; i < 1000 && !(await l.count()); i++) {
    const moved = await page.evaluate(() => {
      const el = document.querySelector('.tl-scroller')!;
      const before = el.scrollTop;
      el.scrollTop += el.clientHeight;
      return el.scrollTop !== before;
    });
    await page.waitForTimeout(60);
    if (!moved) break;
  }
  return l;
};
for (const name of opt('--expand')?.split('|') ?? []) {
  const l = await findLabel(name);
  await l.scrollIntoViewIfNeeded();
  const btn = l.locator('button[title="Expand sub-rows"]');
  if (await btn.count()) await btn.first().click();
  else problems.push(`--expand: "${name}" has no collapsed sub-rows`);
  await page.waitForTimeout(300);
}
// --row <id>: open each collapsed ancestor, outermost first, then scroll to the row
const rowId = opt('--row');
if (rowId) {
  const tracks = loaded.find((ts) => ts.some((t) => t.id === rowId));
  const chain: string[] = [];
  for (let t = tracks?.find((x) => x.id === rowId); t?.parent; t = tracks!.find((x) => x.id === t!.parent)) chain.unshift(t.parent);
  if (!tracks) problems.push(`--row: no row "${rowId}" in the timeline files the page loaded`);
  for (const id of chain) {
    const l = await find(page.locator(`.tl-lane-label[data-row="${id}"]`).first());
    const btn = l.locator('button[title="Expand sub-rows"]');
    if (await btn.count()) {
      await btn.first().click();
      await page.waitForTimeout(300);
    }
  }
}
const target = opt('--scroll-to');
if (target || rowId) {
  const l = rowId ? await find(page.locator(`.tl-lane-label[data-row="${rowId}"]`).first()) : await findLabel(target!);
  if (rowId && !(await l.count())) {
    if (loaded.some((ts) => ts.some((t) => t.id === rowId))) problems.push(`--row: row "${rowId}" isn't drawn (hidden by a filter?)`);
  } else {
    await l.evaluate((el) => {
      el.scrollIntoView({ block: 'start' });
      let s = el.parentElement;
      while (s && s.scrollHeight <= s.clientHeight + 5) s = s.parentElement;
      // clear the sticky header above the rows: the ruler, and the Ages strip when the timeline has ages
      const header = document.querySelector<HTMLElement>('.tl-lanes')?.offsetTop ?? 44;
      if (s) s.scrollTop -= header + 16;
    });
  }
  await page.waitForTimeout(300);
}

// --long-press "Row name": hold one finger on an empty spot of that row's lane (just right of its label, near
// the lane's bottom edge), as a touch screen would; in edit mode this opens a new event there.
const pressRow = opt('--long-press');
if (pressRow) {
  const l = await findLabel(pressRow);
  const labelBox = await l.boundingBox();
  const laneBox = await l.locator('xpath=..').boundingBox();
  if (!labelBox || !laneBox) problems.push(`--long-press: no row "${pressRow}"`);
  else {
    const cdp = await page.context().newCDPSession(page);
    const pt = [{ x: labelBox.x + labelBox.width + 40, y: laneBox.y + laneBox.height - 5, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
    await page.waitForTimeout(900);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
  }
}

const measure = opt('--measure');
if (measure) {
  const boxes = await page.locator(measure).evaluateAll((els) =>
    els.map((el) => {
      const b = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}×${Math.round(b.height)}  ${el.tagName.toLowerCase()}.${el.className}  ${name}`;
    }),
  );
  console.log(`${measure}: ${boxes.length} element(s)\n${boxes.join('\n')}`);
}

await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
console.log('saved', out);
for (const p of problems) console.log(p);
process.exit(problems.length ? 1 : 0);
