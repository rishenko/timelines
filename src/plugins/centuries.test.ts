// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error: a plain JS module with no types; ViewPlugin is its contract
import centuries from '../../public/plugins/centuries.js';
import { checkPlugin, PLUGIN_API, type ViewContext, type ViewPlugin } from './api.ts';
import { defaultSelection, resolveEvents } from '../lib/chronology.ts';
import { formatYear } from '../lib/calendar.ts';
import type { Dataset } from '../types.ts';

const plugin = centuries as unknown as ViewPlugin;

function ctxFor(ds: Dataset, over: Partial<ViewContext> = {}): ViewContext {
  return Object.freeze({
    apiVersion: PLUGIN_API,
    data: ds,
    events: resolveEvents(ds, defaultSelection(ds)),
    spans: new Map(),
    selectedId: null,
    formatYear: (y: number) => formatYear(y, ds.meta.calendar),
    select: vi.fn(),
    showOnTimeline: vi.fn(),
    ...over,
  });
}

// the sample plugin must keep loading and working on every shipped timeline
describe.each(['ancient-classical', 'medieval', 'modern-states'])('the Centuries sample plugin on %s', (id) => {
  const ds = JSON.parse(readFileSync(`public/timelines/${id}.json`, 'utf8')) as Dataset;

  it('fits the contract and this schema', () => {
    expect(checkPlugin(plugin, ds.schemaVersion)).toBeNull();
  });

  it('draws, picks a century, opens an event and goes back to the chart', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const ctx = ctxFor(ds);
    const view = plugin.mount(el, ctx);
    expect(el.querySelector('h2')?.textContent).toContain(ds.meta.title);
    const bar = el.querySelector<HTMLButtonElement>('.bar:not([disabled])')!;
    expect(bar).toBeTruthy();
    bar.focus();
    bar.click();
    // redrawn, with focus kept on the same century
    expect(document.activeElement?.getAttribute('aria-pressed')).toBe('true');
    const first = el.querySelector<HTMLButtonElement>('li button')!;
    first.click();
    expect(ctx.select).toHaveBeenCalledTimes(1);
    const uuid = (ctx.select as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // a new snapshot marks the selected event
    view.update(ctxFor(ds, { selectedId: uuid, select: ctx.select, showOnTimeline: ctx.showOnTimeline }));
    expect(el.querySelector('[aria-current="true"]')).toBeTruthy();
    el.querySelector<HTMLButtonElement>('.go')!.click();
    expect(ctx.showOnTimeline).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(el.childElementCount).toBe(0);
    el.remove();
  });

  it('offers the same choice as a full-size select', () => {
    const el = document.createElement('div');
    const view = plugin.mount(el, ctxFor(ds));
    const sel = el.querySelector('select')!;
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change'));
    expect(el.querySelectorAll('li').length).toBeGreaterThan(0);
    view.unmount();
  });
});

describe('Centuries counts centuries the way the calendar does', () => {
  const ds = JSON.parse(readFileSync('public/timelines/ancient-classical.json', 'utf8')) as Dataset;
  it('BCE/CE (no year 0): 100–1 BCE, then 1–100 CE', () => {
    const el = document.createElement('div');
    const view = plugin.mount(el, ctxFor(ds));
    const labels = [...el.querySelectorAll('.bar')].map((b) => b.getAttribute('aria-label') ?? '');
    expect(labels.some((l) => l.startsWith('1 CE – 100 CE:'))).toBe(true);
    expect(labels.some((l) => l.startsWith('100 BCE – 1 BCE:'))).toBe(true);
    view.unmount();
  });
});
