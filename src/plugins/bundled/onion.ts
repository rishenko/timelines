/**
 * The overview strip (Kevin, 2026-11-23: the "onion skin" version) as a bundled layer (plugin design §5, step 3): a
 * thin map of the whole timeline above the chart, events counted by where they start, with the stretch in view outlined
 * and everything outside it dimmed. It maps the chart's own pixels, so shortened gaps stay short (and are marked) and the
 * outline is always the same share of the strip as the screen is of the chart. A click or drag moves the chart there.
 * From the keyboard the outline is a slider (one Tab stop): ←/→ move a quarter of a screen, Page Up/Down a screen,
 * Home/End to either end. Its name says which years are in view, of which span. It uses only the layer `api`.
 */
import type { LayerPlugin } from '../layer.ts';
import '../../timeline/overview.css';

const SVG = 'http://www.w3.org/2000/svg';
const div = (cls: string) => {
  const d = document.createElement('div');
  d.className = cls;
  return d;
};
const attrs = <T extends Element>(el: T, a: Record<string, string | number>): T => {
  for (const [k, v] of Object.entries(a)) el.setAttribute(k, String(v));
  return el;
};

export const onionLayer: LayerPlugin = {
  id: 'onion',
  name: 'Overview strip',
  apiVersion: 1,
  layer: {
    slots: ['header'],
    mount(els, api) {
      const header = els.header!;
      const root = div('tl-overview');
      const label = attrs(div('tl-overview-label'), { 'aria-hidden': 'true' });
      const from = document.createElement('span');
      const to = document.createElement('span');
      label.append(from, to);
      const trackEl = div('tl-overview-track');
      let svg: Element = document.createElementNS(SVG, 'svg');
      // the onion skin: everything outside the view is dimmed, so the outlined stretch stands out (Kevin's pick)
      // (attributes in the order the React version wrote them: class, style, aria-hidden)
      const shade = () => {
        const d = div('tl-overview-shade');
        d.style.left = '0px';
        return attrs(d, { 'aria-hidden': 'true' });
      };
      const shadeL = shade();
      const shadeR = shade();
      const outline = attrs(div('tl-overview-view'), { role: 'slider', tabindex: 0, 'aria-label': 'Years in view', 'aria-orientation': 'horizontal', 'aria-valuemin': 0, 'aria-valuemax': 100 });
      const end = (cls: string) => {
        const e = document.createElement('span');
        e.className = cls;
        return attrs(e, { 'aria-hidden': 'true' });
      };
      const endA = end('tl-overview-end start');
      const endB = end('tl-overview-end end');
      trackEl.append(svg, shadeL, shadeR, outline, endA, endB);
      root.append(label, trackEl);

      // the strip's geometry for the current view: the track keeps 6 px clear at each end, so the outline's focus ring
      // isn't cut off by the window's edge
      const geometry = () => {
        const view = api.viewport.get();
        const track = Math.max(0, view.width - api.labelWidth - 12);
        const shown = Math.max(1, view.width - api.labelWidth);
        const toStrip = (x: number) => (track * x) / Math.max(1, api.scale.width);
        const fromStrip = (s: number) => Math.min(1, Math.max(0, s / Math.max(1, track))) * api.scale.width;
        const a = toStrip(view.left);
        const b = toStrip(Math.min(api.scale.width, view.left + shown));
        return { view, track, shown, toStrip, fromStrip, a, b };
      };
      const scrollTo = (x: number, smooth = false) => api.viewport.scrollTo(Math.max(0, Math.min(api.scale.width - geometry().shown, x)), smooth);

      // events by where they start: one bar per 3 px of strip, heights on a square-root scale so sparse stretches show
      let barsFor = '';
      const drawBars = (track: number, toStrip: (x: number) => number) => {
        const n = Math.max(1, Math.floor(track / 3));
        const counts = new Array<number>(n).fill(0);
        for (const e of api.timeline.events) {
          const s = (api.scale.x(e.start) / Math.max(1, api.scale.width)) * n;
          counts[Math.min(n - 1, Math.max(0, Math.floor(s)))]++;
        }
        const max = Math.sqrt(Math.max(1, ...counts));
        const rects: Element[] = [];
        counts.forEach((c, i) => {
          const h = Math.sqrt(c) / max;
          if (h) rects.push(attrs(document.createElementNS(SVG, 'rect'), { x: i * 3, y: 20 - h * 18, width: 2, height: h * 18, class: 'bar' }));
        });
        for (const g of api.scale.gaps()) {
          const [g0, g1] = [toStrip(g.x0), toStrip(g.x1)];
          rects.push(attrs(document.createElementNS(SVG, 'rect'), { x: g0, y: 0, width: Math.max(1, g1 - g0), height: 20, class: 'gap' }));
        }
        const next = attrs(document.createElementNS(SVG, 'svg'), { width: track, height: '100%', viewBox: `0 0 ${track} 20`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
        next.append(...rects);
        svg.replaceWith(next);
        svg = next;
      };

      const draw = (all = false) => {
        const { view, track, shown, toStrip, a, b } = geometry();
        if (!track) return root.remove();
        if (!root.isConnected) header.prepend(root); // above the other header layers (the cursor's band)
        root.style.setProperty('--label-w', `${api.labelWidth}px`);
        const key = `${track}`;
        if (all || key !== barsFor) {
          drawBars(track, toStrip);
          barsFor = key;
        }
        const fmt = (y: number) => api.formatYear(y);
        const [y0, y1] = api.scale.domain;
        const f = fmt(Math.round(api.scale.year(view.left)));
        const t = fmt(Math.round(api.scale.year(Math.min(api.scale.width, view.left + shown))));
        const span = `${fmt(y0)} – ${fmt(y1)}`;
        label.setAttribute('title', `Viewing ${f} – ${t}, of ${span}`);
        from.textContent = `${f} –`;
        to.textContent = t;
        shadeL.style.left = '0px';
        shadeL.style.width = `${Math.max(0, a)}px`;
        shadeR.style.left = `${b}px`;
        shadeR.style.width = `${Math.max(0, track - b)}px`;
        // the outline is at least 6 px wide and stays inside the track: at the end of a narrow strip it would otherwise
        // stick out past the window and make the page scroll sideways (WCAG 1.4.10, seen at 320 px)
        const outlineW = Math.max(6, b - a);
        outline.setAttribute('aria-valuenow', String(Math.round((view.left / Math.max(1, api.scale.width - shown)) * 100)));
        outline.setAttribute('aria-valuetext', `Viewing ${f} – ${t}, of ${span}`);
        outline.setAttribute('title', `Viewing ${f} – ${t}, of ${span}. Drag, or use the arrow keys, Page Up/Down, Home and End.`);
        outline.style.left = `${Math.max(0, Math.min(a, track - outlineW))}px`;
        outline.style.width = `${outlineW}px`;
        endA.textContent = fmt(y0);
        endB.textContent = fmt(y1);
      };

      // dragging: where in the outline the pointer took hold, so the outline doesn't jump under it
      let grab: number | null = null;
      const onDown = (ev: PointerEvent) => {
        const { a, b, fromStrip } = geometry();
        const s = ev.clientX - trackEl.getBoundingClientRect().left;
        // on the outline: keep the offset; elsewhere: centre the view there
        grab = s >= a && s <= b ? s - a : (b - a) / 2;
        scrollTo(fromStrip(s - grab));
        trackEl.setPointerCapture(ev.pointerId);
      };
      const onMove = (ev: PointerEvent) => {
        if (grab === null) return;
        scrollTo(geometry().fromStrip(ev.clientX - trackEl.getBoundingClientRect().left - grab));
      };
      const onUp = () => {
        grab = null;
      };
      const onKey = (ev: KeyboardEvent) => {
        const { view, shown } = geometry();
        const step: Record<string, number> = { ArrowLeft: -shown / 4, ArrowRight: shown / 4, PageUp: -shown, PageDown: shown };
        if (ev.key in step) scrollTo(view.left + step[ev.key], true);
        else if (ev.key === 'Home') scrollTo(0, true);
        else if (ev.key === 'End') scrollTo(api.scale.width, true);
        else return;
        ev.preventDefault();
      };
      trackEl.addEventListener('pointerdown', onDown);
      trackEl.addEventListener('pointermove', onMove);
      trackEl.addEventListener('pointerup', onUp);
      trackEl.addEventListener('pointercancel', onUp);
      outline.addEventListener('keydown', onKey);
      const offs = [api.viewport.subscribe(() => draw()), api.onChange(() => draw(true))];
      draw(true);
      return () => {
        offs.forEach((off) => off());
        root.remove();
      };
    },
  },
};
