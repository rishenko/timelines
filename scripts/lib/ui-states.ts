// The app's views and panels, opened one at a time in a browser page: shared by the UI checks (reflow.ts,
// targets.ts, a11y-report.ts) so they cover the same ground.
import type { Browser, Page } from 'playwright-core';

export type UiState = [name: string, open: (p: Page) => Promise<unknown>];

async function click(p: Page, css: string) {
  await p.locator(css).first().click({ timeout: 3000 });
  await p.waitForTimeout(300);
}
async function clickText(p: Page, text: string) {
  await p.locator('button', { hasText: new RegExp(`^\\s*${text.replace(/[+]/g, '\\+')}`) }).first().click({ timeout: 3000 });
  await p.waitForTimeout(300);
}
async function clickTab(p: Page, name: string) {
  await p.getByRole('tab', { name }).click({ timeout: 3000 });
  await p.waitForTimeout(300);
}
async function editMode(p: Page) {
  await clickText(p, 'Customize');
  await clickTab(p, 'Edit');
  await p.getByRole('button', { name: 'Turn on edit mode' }).click({ timeout: 3000 });
  await p.waitForTimeout(300);
}

/** The link to a timeline in the app at `base`, with extra query parameters. */
export const timelineUrl = (base: string, timeline: string, extra = '') =>
  `${base}${base.includes('?') ? '&' : '?'}timeline=${timeline}${extra}`;

/** Every state the UI checks open, after the timeline has loaded with the tour closed. */
export function uiStates(base: string, timeline: string): UiState[] {
  return [
    ['timeline', async () => {}],
    ['timeline menu', (p) => click(p, '.timeline-picker')],
    ['Dating', (p) => clickText(p, 'Dating')],
    ['Filters', (p) => clickText(p, 'Filters')],
    ['Legend', (p) => clickText(p, 'Legend')],
    ['Customize: Appearance', (p) => clickText(p, 'Customize')],
    ['Customize: Edit', async (p) => (await clickText(p, 'Customize'), clickTab(p, 'Edit'))],
    ['Customize: Timelines', async (p) => (await clickText(p, 'Customize'), clickTab(p, 'Timelines'))],
    ['search results', async (p) => (await p.locator('input[type=search], .search input').first().fill('egypt'), p.waitForTimeout(300))],
    ['event details', (p) => click(p, '.tl-mark:not(.cluster)')],
    ['table view', (p) => p.goto(timelineUrl(base, timeline, '&view=table'))],
    ['edit mode', (p) => editMode(p)],
    ['event editor', async (p) => (await editMode(p), clickText(p, '+ Event'))],
    ['event editor with claims', async (p) => {
      await editMode(p);
      await clickText(p, '+ Event');
      for (let i = 0; i < 2; i++) await clickText(p, '+ Add a dated claim');
    }],
    ['track editor', async (p) => (await editMode(p), clickText(p, '+ Row'))],
    ['source editor', async (p) => (await editMode(p), clickText(p, '+ Source'))],
    // a first visit: the tour opens by itself (the page setup below skips marking it seen once this flag is set)
    ['tour', async (p) => (await p.evaluate(() => (sessionStorage.setItem('ui-tour', '1'), localStorage.clear())), await p.reload(), p.waitForTimeout(1200))],
  ];
}

/**
 * A new page at `width` with the timeline open, the first-visit tour closed (except for the "tour" state), and the
 * state applied. Returns null, after printing why, if the state couldn't be opened.
 */
export async function openState(browser: Browser, base: string, timeline: string, width: number, [name, open]: UiState) {
  const page = await browser.newPage({ viewport: { width, height: Math.round(Math.max(600, width * 1.6)) } });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('ui-tour')) localStorage.setItem('timelines:legend-seen', '1');
  });
  await page.goto(timelineUrl(base, timeline));
  await page.waitForTimeout(1200);
  await page.locator('.tour-card .tour-actions .linklike').first().click({ timeout: 500 }).catch(() => {});
  try {
    await open(page);
    return page;
  } catch (e) {
    console.log(`?     ${width}px ${name}: couldn't open (${(e as Error).message.split('\n')[0]})`);
    await page.close();
    return null;
  }
}
