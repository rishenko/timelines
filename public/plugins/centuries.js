// The sample view plugin (docs/plugins.md): events per century as bars, and the events of a picked century as a list.
// A plain ES module with no build step and no imports: it gets an element and a snapshot, and answers through
// ctx.select / ctx.showOnTimeline. It inherits the page's theme through CSS variables (--text, --muted, --accent…).
// Each bar is a 24 px-wide target the height of the chart (its visible bar is drawn inside it); the row of bars scrolls
// sideways on its own when the view is narrow (a chart: WCAG 1.4.10's two-dimensional exception), and the century list
// beside them (a <select>) does the same job without scrolling.

const css = `
.cv { padding: 16px 20px; color: var(--text); font: 14px/1.4 system-ui, sans-serif; overflow: auto; box-sizing: border-box; }
.cv h2 { margin: 0 0 4px; font-size: 16px; }
.cv .muted { color: var(--muted); }
.cv .bars { display: flex; align-items: stretch; gap: 2px; height: 220px; margin: 16px 0 4px; border-bottom: 1px solid var(--line-2, #666); overflow-x: auto; }
.cv .bar { position: relative; flex: 0 0 24px; min-width: 24px; background: none; border: 0; padding: 0; cursor: pointer; }
.cv .bar::after { content: ''; position: absolute; left: 3px; right: 3px; bottom: 0; height: var(--h, 0); background: color-mix(in srgb, var(--accent, #c80) 55%, transparent); border-radius: 2px 2px 0 0; }
.cv .bar:hover::after, .cv .bar[aria-pressed="true"]::after { background: var(--accent, #c80); }
.cv .bar:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
.cv .axis { display: flex; justify-content: space-between; font-size: 12px; }
.cv ul { list-style: none; padding: 0; margin: 12px 0 0; columns: 2 320px; }
.cv li { break-inside: avoid; margin: 0 0 4px; }
.cv li button { background: none; border: 0; padding: 2px 0; color: var(--text); text-align: left; cursor: pointer; font: inherit; min-height: 24px; }
.cv li button:hover { text-decoration: underline; }
.cv li .yr { color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 6px; }
.cv .go { margin-left: 8px; min-height: 24px; }
.cv label { display: inline-flex; gap: 8px; align-items: center; margin-top: 8px; }
.cv select { min-height: 28px; font: inherit; }
`;

// Centuries as the calendar counts them: with no year 0 (BCE/CE) the 1st century is 1–100 and the one before it
// 100–1 BCE; with a year 0 they run 0–99. `o` shifts the buckets to match.
const offset = (ctx) => (ctx.data.meta.calendar?.yearZero ? 0 : 1);

export default {
  id: 'centuries',
  name: 'Centuries',
  apiVersion: 1,
  schema: [5, 10],
  mount(el, ctx) {
    const root = document.createElement('div');
    root.className = 'cv';
    const style = document.createElement('style');
    style.textContent = css;
    el.append(style, root);
    let picked = null;
    let last = ctx;

    function render() {
      const ctx = last;
      const o = offset(ctx);
      const centuryOf = (y) => Math.floor((y - o) / 100);
      const range = (c) => `${ctx.formatYear(c * 100 + o)} – ${ctx.formatYear(c * 100 + 99 + o)}`;
      // the whole view is redrawn, so remember what had focus and give it back afterwards
      const had = document.activeElement && root.contains(document.activeElement) ? document.activeElement.dataset.key : null;
      const byC = new Map();
      for (const e of ctx.events) {
        const c = centuryOf(e.start);
        (byC.get(c) ?? byC.set(c, []).get(c)).push(e);
      }
      const cs = [...byC.keys()];
      const lo = Math.min(...cs), hi = Math.max(...cs);
      const max = Math.max(1, ...[...byC.values()].map((l) => l.length));
      root.replaceChildren();
      const h = document.createElement('h2');
      h.textContent = `${ctx.data.meta.title}: events per century`;
      const sub = document.createElement('p');
      sub.className = 'muted';
      sub.textContent = `${ctx.events.length} events as filtered and dated now. Pick a century for its events; an event opens its details.`;
      root.append(h, sub);
      if (!cs.length) return;
      const bars = document.createElement('div');
      bars.className = 'bars';
      bars.setAttribute('role', 'group');
      bars.setAttribute('aria-label', 'Centuries');
      for (let c = lo; c <= hi; c++) {
        const n = byC.get(c)?.length ?? 0;
        const b = document.createElement('button');
        b.className = 'bar';
        b.dataset.key = `bar${c}`;
        b.style.setProperty('--h', `${Math.max(n ? 3 : 0, (n / max) * 100)}%`);
        const label = `${range(c)}: ${n} event${n === 1 ? '' : 's'}`;
        b.title = label;
        b.setAttribute('aria-label', label);
        b.setAttribute('aria-pressed', String(picked === c));
        b.disabled = !n;
        b.onclick = () => {
          picked = picked === c ? null : c;
          render();
        };
        bars.append(b);
      }
      const axis = document.createElement('div');
      axis.className = 'axis muted';
      for (const t of [lo * 100 + o, hi * 100 + 99 + o]) {
        const s = document.createElement('span');
        s.textContent = ctx.formatYear(t);
        axis.append(s);
      }
      // the same choice as the bars, as a full-size control
      const pick = document.createElement('label');
      pick.textContent = 'Century';
      const sel = document.createElement('select');
      sel.dataset.key = 'select';
      sel.append(new Option('None', ''));
      for (let c = lo; c <= hi; c++) {
        const n = byC.get(c)?.length ?? 0;
        if (n) sel.append(new Option(`${range(c)} (${n})`, String(c), false, picked === c));
      }
      sel.onchange = () => {
        picked = sel.value === '' ? null : Number(sel.value);
        render();
      };
      pick.append(sel);
      root.append(bars, axis, pick);
      if (picked !== null && byC.has(picked)) {
        const h3 = document.createElement('h2');
        h3.style.marginTop = '16px';
        h3.textContent = range(picked);
        const go = document.createElement('button');
        go.className = 'go';
        go.dataset.key = 'go';
        go.textContent = 'Show on the timeline';
        go.onclick = () => ctx.showOnTimeline(picked * 100 + 50 + o);
        h3.append(go);
        const ul = document.createElement('ul');
        for (const e of [...byC.get(picked)].sort((a, b) => a.start - b.start)) {
          const li = document.createElement('li');
          const b = document.createElement('button');
          const yr = document.createElement('span');
          yr.className = 'yr';
          yr.textContent = ctx.formatYear(e.start);
          b.append(yr, e.title);
          b.dataset.key = `ev${e.uuid}`;
          if (e.uuid === ctx.selectedId) {
            b.style.fontWeight = '700';
            b.setAttribute('aria-current', 'true');
          }
          b.onclick = () => ctx.select(e.uuid);
          li.append(b);
          ul.append(li);
        }
        root.append(h3, ul);
      }
      if (had) root.querySelector(`[data-key="${CSS.escape(had)}"]`)?.focus();
    }
    render();
    return {
      update(next) {
        last = next;
        render();
      },
      unmount() {
        el.replaceChildren();
      },
    };
  },
};
