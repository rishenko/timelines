import type { ReactNode } from 'react';
import type { PanelName } from '../state/panels.ts';
import type { View } from '../state/url.ts';

interface Props {
  /** The title menu (TimelinePicker). */
  picker: ReactNode;
  /** Timeline (the chart) or table. The chart's own controls (zoom, gaps, connections, rows) are hidden in table view. */
  view: View;
  onView: (v: View) => void;
  subtitle?: string;
  increments: number[];
  increment: number;
  onIncrement: (inc: number) => void;
  /** The Dating button and its panel (DatingMenu). */
  dating: ReactNode;
  compress: boolean;
  onCompress: (on: boolean) => void;
  showLinks: boolean;
  onShowLinks: (on: boolean) => void;
  /**
   * Expand all / Collapse all, and ↺ Default view. Omitted when the timeline has no sub-rows. hasDefaultView: the
   * timeline opens with some rows folded (else "default" is just "all open" and ↺ isn't shown); canReset: the rows
   * differ from that now.
   */
  rows?: { someCollapsed: boolean; onToggleAll: () => void; hasDefaultView: boolean; canReset: boolean; onReset: () => void };
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
        {p.subtitle && (
          <span className="subtitle muted" title={p.subtitle}>
            {p.subtitle}
          </span>
        )}
      </h1>
      <div className="group" role="group" aria-label="View">
        {(['timeline', 'table'] as const).map((v) => (
          <button
            key={v}
            className={`seg ${p.view === v ? 'on' : ''}`}
            aria-pressed={p.view === v}
            onClick={() => p.onView(v)}
            title={v === 'table' ? 'The same events as tables, with dates and sources in words' : 'The events on a time axis'}
          >
            {v === 'timeline' ? 'Timeline' : 'Table'}
          </button>
        ))}
      </div>
      {p.dating}
      {p.view === 'timeline' && (
        <>
          <div className="group" role="group" aria-label="Years per tick">
            {p.increments.map((inc) => (
              // numbers only, to keep the toolbar on one row; the unit is in the ruler corner ("500 yr / tick"), the
              // tooltip and the accessible name
              <button
                key={inc}
                className={`seg ${p.increment === inc ? 'on' : ''}`}
                aria-label={`${inc} years per tick`}
                aria-pressed={p.increment === inc}
                title={`${inc} years per tick`}
                onClick={() => p.onIncrement(inc)}
              >
                {inc}
              </button>
            ))}
          </div>
          <label className="check" title="Collapse long stretches with no events">
            <input type="checkbox" checked={p.compress} onChange={(e) => p.onCompress(e.target.checked)} /> Compress gaps
          </label>
          <label className="check" title="Show arrows between connected events">
            <input type="checkbox" checked={p.showLinks} onChange={(e) => p.onShowLinks(e.target.checked)} /> Connections
          </label>
          {p.rows && (
            <div className="group rows-group" role="group" aria-label="Rows">
              <button
                className="seg"
                onClick={p.rows.onToggleAll}
                title={
                  p.rows.someCollapsed
                    ? 'Open every row, down to the smallest sub-row'
                    : 'Fold every row into its parent, leaving only the top-level rows; open them again one level at a time'
                }
              >
                {p.rows.someCollapsed ? '▾ Expand all' : '▸ Collapse all'}
              </button>
              {/* always there (disabled when the rows already are as the timeline opens), so the toolbar doesn't jump */}
              {p.rows.hasDefaultView && (
                <button
                  className="seg"
                  onClick={p.rows.onReset}
                  disabled={!p.rows.canReset}
                  aria-label="Default view"
                  title={p.rows.canReset ? 'Default view: fold and open rows the way this timeline opens' : 'The rows are as this timeline opens'}
                >
                  ↺
                </button>
              )}
            </div>
          )}
        </>
      )}
      {p.search}
      <span className="spacer" />
      {PANEL_BUTTONS.map(({ panel, label, title }) => (
        <button
          key={panel}
          data-tour={panel}
          className={p.panels[panel] ? 'on' : ''}
          onClick={() => p.onTogglePanel(panel)}
          title={title}
        >
          {label}
        </button>
      ))}
      <button className={p.editMode ? 'on edit' : ''} onClick={p.onToggleEdit}>
        Edit mode
      </button>
    </header>
  );
}
