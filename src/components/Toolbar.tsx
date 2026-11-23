import { incrementButton, incrementName } from '../lib/subYear.ts';
import type { ReactNode } from 'react';
import type { PanelName } from '../state/panels.ts';
import type { View } from '../state/url.ts';

interface Props {
  /** The page heading and title menu (TimelinePicker). */
  picker: ReactNode;
  /** Timeline (the chart) or table. The chart's own controls (zoom, rows) are hidden in table view. */
  view: View;
  onView: (v: View) => void;
  /** Export: save an image of the view. Printing is the browser's own (⌘P), which prints the same view. */
  onExport?: (kind: 'png' | 'svg') => void;
  /** A view plugin's button after Timeline and Table (docs/plugins.md), and whether its view is showing. */
  pluginView?: { name: string; on: boolean; onShow: () => void };
  increments: number[];
  /** Zoom steps too wide to draw for this timeline (shown, but disabled). */
  tooWide?: Set<number>;
  increment: number;
  onIncrement: (inc: number) => void;
  /** The Dating button and its panel (DatingMenu). */
  dating: ReactNode;
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
  /** Shown on the Filters button while a filter the reader may forget is on (e.g. "2 regions"). */
  filtersNote?: string;
}

// Filters sits with the view controls, before the search box (it changes what the chart shows as much as the zoom
// does); Legend and Customize sit at the right end.
const PANEL_BUTTONS: { panel: PanelName; label: string; title?: string }[] = [
  { panel: 'filters', label: 'Filters', title: 'Regions, rows and sources to show, and how the chart draws them' },
  { panel: 'legend', label: 'Legend', title: 'What the bars, diamonds, colors and lines mean' },
  { panel: 'customize', label: 'Customize', title: 'Appearance, editing, and opening or adding timelines' },
];

/** The top bar: timeline picker, view switch, zoom, view options, row folding, search and the panel toggles. */
export function Toolbar(p: Props) {
  const panelButton = ({ panel, label, title }: (typeof PANEL_BUTTONS)[number]) => (
    <button
      key={panel}
      data-tour={panel}
      className={p.panels[panel] ? 'on' : ''}
      aria-expanded={p.panels[panel]}
      onClick={() => p.onTogglePanel(panel)}
      title={title}
    >
      {label}
      {panel === 'filters' && p.filtersNote ? ` · ${p.filtersNote}` : ''}
    </button>
  );
  return (
    <header className="toolbar">
      {p.picker}
      <div className="group" role="group" aria-label="View">
        {(['timeline', 'table'] as const).map((v) => (
          <button
            key={v}
            className={`seg ${p.view === v && !p.pluginView?.on ? 'on' : ''}`}
            aria-pressed={p.view === v && !p.pluginView?.on}
            onClick={() => p.onView(v)}
            title={v === 'table' ? 'The same events as tables, with dates and sources in words' : 'The events on a time axis'}
          >
            {v === 'timeline' ? 'Timeline' : 'Table'}
          </button>
        ))}
        {p.pluginView && (
          <button
            className={`seg ${p.pluginView.on ? 'on' : ''}`}
            aria-pressed={p.pluginView.on}
            onClick={p.pluginView.onShow}
            title={`${p.pluginView.name}: a view from a plugin`}
          >
            {p.pluginView.name}
          </button>
        )}
      </div>
      {p.onExport && (
        <details className="export-menu">
          <summary title="Save an image of this view. To print it, use your browser's Print (⌘P or Ctrl+P).">Export</summary>
          <div className="export-items">
            <button onClick={(e) => (p.onExport!('png'), e.currentTarget.closest('details')!.removeAttribute('open'))}>Image (PNG)</button>
            <button onClick={(e) => (p.onExport!('svg'), e.currentTarget.closest('details')!.removeAttribute('open'))}>Image (SVG)</button>
          </div>
        </details>
      )}
      {p.dating}
      {p.view === 'timeline' && !p.pluginView?.on && (
        <>
          <div className="group" role="group" aria-label={p.increments.some((i) => i < 1) ? 'Zoom: time per tick' : 'Years per tick'}>
            {p.increments.map((inc) => (
              // numbers only, to keep the toolbar on one row; the unit is in the ruler corner ("500 yr / tick"), the
              // tooltip and the accessible name
              <button
                key={inc}
                className={`seg ${p.increment === inc ? 'on' : ''}`}
                aria-label={incrementName(inc)}
                aria-pressed={p.increment === inc}
                disabled={p.tooWide?.has(inc)}
                title={p.tooWide?.has(inc) ? `${incrementName(inc)} (too wide to draw for this timeline)` : incrementName(inc)}
                onClick={() => p.onIncrement(inc)}
              >
                {incrementButton(inc)}
              </button>
            ))}
          </div>
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
      {PANEL_BUTTONS.filter((b) => b.panel === 'filters').map(panelButton)}
      {p.search}
      <span className="spacer" />
      {PANEL_BUTTONS.filter((b) => b.panel !== 'filters').map(panelButton)}
    </header>
  );
}
