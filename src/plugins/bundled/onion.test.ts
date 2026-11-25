// @vitest-environment jsdom
// The overview strip above the chart (the onion skin, a bundled layer): its readout, the outlined view with the rest
// dimmed, and moving the chart from the keyboard and with a click. The layer is mounted on a small fake `api`.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { onionLayer } from './onion.ts';
import { buildScale } from '../../timeline/scale.ts';
import { formatYear } from '../../lib/calendar.ts';
import type { Calendar } from '../../types.ts';
import type { ResolvedEvent } from '../../lib/chronology.ts';
import type { LayerApi } from '../layer.ts';

let unmount = () => {};
afterEach(() => {
  unmount();
  document.body.innerHTML = '';
});

/** About the years 0–1000 at 8 px a year, no shortened gaps (the scale pads its ends a little). */
const scale = buildScale([0, 1000], { increment: 10, tickPx: 80, compress: false });
const cal: Calendar = { before: 'BCE', after: 'CE', yearZero: false };
const ev = (start: number) => ({ uuid: `e${start}`, title: `E${start}`, start, tracks: ['r'] }) as unknown as ResolvedEvent;

function strip(left: number, width = 1236) {
  const scrollTo = vi.fn();
  const header = document.createElement('div');
  document.body.append(header);
  const api = {
    scale: { x: scale.x, year: scale.yearAt, step: 10, width: scale.width, domain: scale.domain, gaps: () => scale.gaps() },
    viewport: { get: () => ({ left, width }), subscribe: () => () => {}, scrollTo: (l: number, smooth?: boolean) => scrollTo({ left: l, smooth }) },
    labelWidth: 236,
    timeline: { events: [ev(10), ev(500), ev(510)] },
    formatYear: (y: number) => formatYear(y, cal),
    onChange: () => () => {},
  } as unknown as LayerApi;
  unmount = onionLayer.layer.mount({ header }, api);
  return { scrollTo, slider: header.querySelector<HTMLElement>('[role="slider"][aria-label="Years in view"]')! };
}

describe('the overview strip', () => {
  it('names the years in view, of the whole span, and where the view is along it', () => {
    const { slider } = strip(4000);
    // 1000 px of chart in view from 4000 px, 125 years at 8 px a year
    const y = (x: number) => Math.round(scale.yearAt(x));
    expect(slider.getAttribute('aria-valuetext')).toBe(`Viewing ${y(4000)} CE – ${y(5000)} CE, of 11 BCE – 1020 CE`);
    expect(y(5000) - y(4000)).toBe(125);
    expect(slider.getAttribute('aria-valuenow')).toBe(String(Math.round((4000 / (scale.width - 1000)) * 100)));
  });

  it('outlines the view at its share of the chart, and dims everything outside it (the onion skin)', () => {
    const { slider } = strip(4000);
    // the track is 1000 - 12 = 988 px for the whole chart, so the view (4000–5000 px) is the same share of it
    const at = (x: number) => (988 * x) / scale.width;
    expect(parseFloat(slider.style.left)).toBeCloseTo(at(4000), 1);
    expect(parseFloat(slider.style.width)).toBeCloseTo(at(5000) - at(4000), 1);
    const shades = document.querySelectorAll<HTMLElement>('.tl-overview-shade');
    expect(shades).toHaveLength(2);
    expect(parseFloat(shades[0].style.width)).toBeCloseTo(at(4000), 1);
    expect(parseFloat(shades[1].style.left)).toBeCloseTo(at(5000), 1);
  });

  it('from the keyboard: ←/→ a quarter screen, Page Up/Down a screen, Home and End to either end', () => {
    const { scrollTo, slider } = strip(4000);
    const to = () => scrollTo.mock.lastCall![0].left;
    const key = (k: string) => slider.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    key('ArrowRight');
    expect(to()).toBe(4250);
    key('PageUp');
    expect(to()).toBe(3000);
    key('Home');
    expect(to()).toBe(0);
    key('End');
    // never past the end: the last screen
    expect(to()).toBe(scale.width - 1000);
  });

  it('a click on the track centres the view there', () => {
    const { scrollTo } = strip(0);
    const track = document.querySelector<HTMLElement>('.tl-overview-track')!;
    track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 988, height: 20, right: 988, bottom: 20, x: 0, y: 0, toJSON() {} });
    track.setPointerCapture = () => {};
    const down = new MouseEvent('pointerdown', { clientX: 494, bubbles: true }) as unknown as PointerEvent;
    Object.defineProperty(down, 'pointerId', { value: 1 });
    track.dispatchEvent(down);
    // the middle of the strip: the view centred on the chart's middle
    expect(scrollTo.mock.lastCall![0].left + 500).toBeCloseTo(scale.width / 2, 0);
  });
});
