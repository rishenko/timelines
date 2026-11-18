import type { ReactNode } from 'react';
import type { PanelName } from '../state/panels.ts';

interface Props {
  /** The title menu (TimelinePicker). */
  picker: ReactNode;
  subtitle?: string;
  increments: number[];
  increment: number;
  onIncrement: (inc: number) => void;
  /** At the coarsest zoom only key events are drawn; say so. */
  keyOnly: boolean;
  /** The Dating button and its panel (DatingMenu). */
  dating: ReactNode;
  compress: boolean;
  onCompress: (on: boolean) => void;
  showLinks: boolean;
  onShowLinks: (on: boolean) => void;
  /** Expand all / Collapse all, and Default view. Omitted when the timeline has no sub-rows. */
  rows?: { someCollapsed: boolean; onToggleAll: () => void; canReset: boolean; onReset: () => void };
  /** The search box (SearchBox). */
  search: ReactNode;
  panels: Record<PanelName, boolean>;
  onTogglePanel: (p: PanelName) => void;
  editMode: boolean;
  onToggleEdit: () => void;
}

const PANEL_BUTTONS: { panel: PanelName; label: string; title?: string }[] = [
  { panel: 'filters', label: 'Filters' },
  { panel: 'legend', label: 'Legend', title: 'What the bars, diamonds, colors and lines mean' },
  { panel: 'timelines', label: 'Timelines', title: "Open a timeline from a link or file, or manage the ones you've added" },
  { panel: 'theme', label: 'Theme', title: 'Colors and theme' },
];

/** The top bar: timeline picker, zoom, view options, row folding, search, panel toggles and edit mode. */
export function Toolbar(p: Props) {
  return (
    <header className="toolbar">
      <h1>
        {p.picker}
        {p.subtitle && <span className="muted"> {p.subtitle}</span>}
      </h1>
      <div className="group" role="group" aria-label="Years per tick">
        {p.increments.map((inc) => (
          <button key={inc} className={`seg ${p.increment === inc ? 'on' : ''}`} onClick={() => p.onIncrement(inc)}>
            {inc} yr
          </button>
        ))}
      </div>
      {p.keyOnly && (
        <span className="muted small" title="At the widest zoom only key events are drawn; zoom in to see them all">
          Key events only
        </span>
      )}
      {p.dating}
      <label className="check" title="Collapse long stretches with no events">
        <input type="checkbox" checked={p.compress} onChange={(e) => p.onCompress(e.target.checked)} /> Compress gaps
      </label>
      <label className="check" title="Show arrows between connected events">
        <input type="checkbox" checked={p.showLinks} onChange={(e) => p.onShowLinks(e.target.checked)} /> Connections
      </label>
      {p.rows && (
        <button
          onClick={p.rows.onToggleAll}
          title={
            p.rows.someCollapsed
              ? 'Open every row, down to the smallest sub-row'
              : 'Fold every row into its parent, leaving only the top-level rows; open them again one level at a time'
          }
        >
          {p.rows.someCollapsed ? '▾ Expand all' : '▸ Collapse all'}
        </button>
      )}
      {p.rows?.canReset && (
        <button onClick={p.rows.onReset} title="Fold and open rows the way this timeline opens">
          ↺ Default view
        </button>
      )}
      {p.search}
      <span className="spacer" />
      {PANEL_BUTTONS.map(({ panel, label, title }) => (
        <button key={panel} className={p.panels[panel] ? 'on' : ''} onClick={() => p.onTogglePanel(panel)} title={title}>
          {label}
        </button>
      ))}
      <button className={p.editMode ? 'on edit' : ''} onClick={p.onToggleEdit}>
        Edit mode
      </button>
    </header>
  );
}
