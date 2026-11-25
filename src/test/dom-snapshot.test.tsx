// @vitest-environment jsdom
// Proof for refactors: renders the app in many states (the bundled timeline, from two selected events; the chart at several zooms with
// every row expanded; the table; the detail panel; search results; key zoom; a +N cluster; table and back) and
// writes the page's markup to one file. Run it before and after a change and compare the two files: identical
// files mean nothing visible changed. Skipped unless SNAP_OUT names the file to write:
//   SNAP_OUT=before.txt npm run dom-snapshot   …change…   SNAP_OUT=after.txt npm run dom-snapshot   cmp before.txt after.txt
// The build's commit and its date (cite and report links) print as <sha> and <date>, so a commit between the two runs
// doesn't show as a difference. The "Accessed" date is today's: run both on the same day.
import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { renderApp } from './app.tsx';
import { DATA_VERSION } from '../lib/cite.ts';

const OUT = process.env.SNAP_OUT!;
afterEach(() => { cleanup(); localStorage.clear(); window.history.replaceState(null, '', '/'); });
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1600 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 900 });
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));

const out: string[] = [];
// the short sha only where no hex digit touches it, so it can't match inside an id or a longer hash
const SHA = DATA_VERSION.sha === 'dev' ? null : new RegExp(`(?<![0-9a-f])${DATA_VERSION.sha}(?![0-9a-f])`, 'g');
const unversioned = (html: string) =>
  SHA ? html.replace(SHA, '<sha>').replaceAll(`<sha> (${DATA_VERSION.date})`, '<sha> (<date>)') : html;
const snap = (name: string, c: Element) => out.push(`=== ${name}\n${unversioned(c.innerHTML).replace(/></g, '>\n<')}`);
const open = (q: string) => renderApp(q).container;

const cases: [string, string, string[]][] = [
  ['ancient-classical', 'sargon-reign', ['Egypt', 'Sargon', 'Akkad', 'Old Kingdom', '1595 BCE', 'Hittite', 'Prepalatial', 'Wilton culture']],
  ['ancient-classical', 'buddha', ['Rome', 'Han', 'Buddha', 'Principate', '44 BCE', 'Sasanian']],
];

describe.skipIf(!OUT)('DOM snapshot', () => {
for (const [id, sel, queries] of cases) {
  it(`${id} #${sel}`, async () => {
    for (const inc of ['', '&inc=10&at=-2300', '&inc=50&at=-500', '&inc=1000']) {
      let c = open(`timeline=${id}${inc}`);
      snap(`${id} #${sel} chart ${inc}`, c);
      // expand every row: phases and lifespans of all rows
      const all = [...c.querySelectorAll<HTMLButtonElement>('button')].find((b) => /Expand all/.test(b.textContent ?? ''));
      if (all) { act(() => fireEvent.click(all)); snap(`${id} #${sel} chart expanded ${inc}`, c); }
      cleanup();
    }
    let c = open(`timeline=${id}&view=table`);
    snap(`${id} #${sel} table`, c);
    cleanup();
    c = open(`timeline=${id}#${sel}`);
    snap(`${id} #${sel} detail`, c);
    // search results (their dates)
    const input = c.querySelector<HTMLInputElement>('input[placeholder="Row, event or date…"]')!;
    for (const q of queries) {
      act(() => fireEvent.change(input, { target: { value: q } }));
      snap(`${id} #${sel} search ${q}`, c.querySelector('[role="listbox"]')?.parentElement ?? c);
    }
    act(() => fireEvent.change(input, { target: { value: '' } }));
    // keyboard zoom in and out on a mark, and clicking a +N cluster
    const mark = () => c.querySelector<HTMLButtonElement>('button.tl-mark[tabindex="0"]')!;
    for (const key of ['+', '+', '-', '-', '-', '-', '-']) {
      act(() => { mark().focus(); fireEvent.keyDown(mark(), { key }); });
      snap(`${id} #${sel} key ${key}`, c);
    }
    const cluster = c.querySelector<HTMLButtonElement>('button.tl-mark.cluster');
    if (cluster) { act(() => fireEvent.click(cluster)); snap(`${id} #${sel} cluster click`, c); }
    // Table view and back (focuses the selected event)
    const tableBtn = [...c.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Table')!;
    act(() => fireEvent.click(tableBtn));
    const chartBtn = [...c.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Timeline')!;
    act(() => fireEvent.click(chartBtn));
    snap(`${id} #${sel} table and back`, c);
  });
}

it('write', () => writeFileSync(OUT, out.join('\n')));
});
