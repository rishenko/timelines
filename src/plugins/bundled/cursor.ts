/**
 * The year cursor as a bundled layer (plugin design §5, step 2): a vertical line at one year across the rows, its top
 * part through the ruler and Ages strip with the year in a chip, and a band above the chart saying what was going on
 * then in the rows on screen (meanwhile.ts). It uses only the layer `api`, like a plugin from the site's folder.
 * Keyboard: Y on the chart places it (at the focused event's year, else the view's centre) and focuses its chip; on
 * the chip ←/→ step one zoom step, Shift+←/→ a tenth of one, and Escape puts it away and returns focus. The keys are
 * commands, so the reader can rebind them (step 4).
 */
import type { LayerApi, LayerPlugin } from '../layer.ts';
import type { Cursor } from '../../cursor/cursorStore.ts';
import { meanwhile, rowNote } from '../../cursor/meanwhile.ts';
import { keycap } from '../../lib/keycap.ts';
import '../../cursor/cursor.css';

const el = (cls: string) => {
  const d = document.createElement('div');
  d.className = cls;
  return d;
};
const span = (cls: string, text: string) => {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
};

/** The cursor's commands: what each key does, given the api. Exported for the registry tests. */
export function cursorCommands(api: LayerApi) {
  const step = (dir: 1 | -1, fine: boolean) => {
    const c = api.cursor.get();
    if (c) api.cursor.set(c.year + dir * Math.max(1, Math.round(fine ? api.scale.step / 10 : api.scale.step)), true);
  };
  return [
    api.command('cursor.place', 'Place the year cursor', (ctx) => ctx.year !== undefined && api.cursor.set(ctx.year, true), { key: 'y', scope: 'chart' }),
    api.command('cursor.step-back', 'Year cursor: a step earlier', () => step(-1, false), { key: 'ArrowLeft', scope: 'cursor' }),
    api.command('cursor.step-forward', 'Year cursor: a step later', () => step(1, false), { key: 'ArrowRight', scope: 'cursor' }),
    api.command('cursor.step-back-fine', 'Year cursor: a tenth of a step earlier', () => step(-1, true), { key: 'shift+ArrowLeft', scope: 'cursor' }),
    api.command('cursor.step-forward-fine', 'Year cursor: a tenth of a step later', () => step(1, true), { key: 'shift+ArrowRight', scope: 'cursor' }),
    api.command('cursor.close', 'Put the year cursor away', () => api.cursor.set(null), { key: 'Escape', scope: 'cursor' }),
  ];
}

export const cursorLayer: LayerPlugin = {
  id: 'cursor',
  name: 'Year cursor',
  apiVersion: 1,
  layer: {
    slots: ['overlay', 'ruler', 'header'],
    mount(els, api) {
      const { overlay, ruler, header } = els as Required<typeof els>;
      // the line through the rows (overlay: x = 0 is the time axis; it scrolls with the chart and spans every row)
      const line = el('tl-cursor-line');
      line.setAttribute('aria-hidden', 'true');
      line.style.height = '100%';
      // the line's top part and the chip, in viewport coordinates, while the line is on screen
      const head = el('tl-cursor-head');
      head.setAttribute('aria-hidden', 'true');
      const chip = el('tl-cursor-chip');
      // the readout band: always there, so the chart doesn't jump as the pointer comes and goes; a live region only
      // when the reader placed the cursor with the keyboard (under the pointer it changes every frame)
      const band = el('tl-cursor-band');
      band.setAttribute('aria-live', 'off'); // (set before aria-atomic, as the React version wrote them)
      band.setAttribute('aria-atomic', 'true');
      header.append(band);

      let shown: Cursor | null = null;
      let wasKeyboard = false;
      const drawLine = (c: Cursor | null) => {
        if (!c) return line.remove();
        line.style.left = `${api.scale.x(c.year)}px`;
        if (!line.isConnected) overlay.append(line);
      };
      const drawHead = (c: Cursor | null) => {
        const v = api.viewport.get();
        // the line's x in the window: the time axis's left edge, plus the year's x, less the sideways scroll
        const cx = c ? c.axisLeft + api.scale.x(c.year) - v.left : 0;
        if (!c || cx < c.axisLeft || cx > c.left + v.width) {
          head.remove();
          chip.remove();
          wasKeyboard = false;
          return;
        }
        head.style.left = chip.style.left = `${cx}px`;
        head.style.top = `${c.top}px`;
        head.style.height = `${c.headH}px`;
        chip.style.top = `${c.top + 2}px`;
        chip.textContent = api.formatYear(c.year);
        if (c.keyboard) {
          chip.tabIndex = 0;
          chip.setAttribute('role', 'slider');
          chip.setAttribute('aria-label', 'Year cursor');
          chip.setAttribute('aria-valuetext', chip.textContent);
          chip.removeAttribute('aria-hidden');
        } else {
          chip.tabIndex = -1;
          for (const a of ['role', 'aria-label', 'aria-valuetext']) chip.removeAttribute(a);
          chip.setAttribute('aria-hidden', 'true');
        }
        const fresh = !chip.isConnected;
        if (fresh) ruler.append(head, chip);
        // the chip takes focus when it appears in keyboard mode, or when the cursor turns to keyboard mode
        if (c.keyboard && (fresh || !wasKeyboard)) chip.focus();
        wasKeyboard = c.keyboard;
      };
      const drawBand = (c: Cursor | null) => {
        band.setAttribute('aria-live', c?.keyboard ? 'polite' : 'off');
        if (!c) {
          // the hint names the reader's key for placing the cursor, as a keycap (none when they unbound it)
          const key = api.keyFor('cursor.place');
          const hint = span('cur-none', key ? 'Point at the chart (or press ' : 'Point at the chart to see what was going on in a year.');
          if (key) hint.append(keycap(key), ' on it) to see what was going on in a year.');
          band.replaceChildren(hint);
          return;
        }
        const t = api.timeline;
        const m = meanwhile(c.year, api.rows.inView(), t.phases, t.events, t.ruledReigns, t.ages, t.spans);
        const out: Node[] = [span('cur-year', api.formatYear(c.year))];
        if (m.ages.length > 0) out.push(span('cur-ages', m.ages.join(' · ')));
        for (const r of m.rows) {
          const s = span('cur-row', '');
          s.style.setProperty('--track-color', r.color);
          const b = document.createElement('b');
          b.textContent = r.name;
          s.append(b, ' ', rowNote(r)); // two text nodes, as the React version wrote them (text is shaped per node)
          out.push(s);
        }
        if (!m.rows.length) out.push(span('cur-none', 'Nothing on screen spans this year'));
        band.replaceChildren(...out);
      };
      const draw = () => {
        const c = api.cursor.get();
        drawLine(c);
        drawHead(c);
        if (c !== shown || !c) drawBand(c);
        shown = c;
      };
      const offs = [
        ...cursorCommands(api),
        api.keys(chip, 'cursor'),
        api.cursor.subscribe(draw),
        api.viewport.subscribe(() => drawHead(api.cursor.get())),
        api.onChange(() => {
          shown = null;
          draw();
        }),
      ];
      draw();
      return () => {
        offs.forEach((off) => off());
        for (const e of [line, head, chip, band]) e.remove();
      };
    },
  },
};
