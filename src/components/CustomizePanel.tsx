import { useRef, type ReactNode } from 'react';

export type CustomizeTab = 'appearance' | 'edit' | 'timelines';

const TABS: { id: CustomizeTab; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'edit', label: 'Edit' },
  { id: 'timelines', label: 'Timelines' },
];

interface Props {
  tab: CustomizeTab;
  onTab: (t: CustomizeTab) => void;
  onClose: () => void;
  /** The theme presets and colors (ThemePanel). */
  appearance: ReactNode;
  /** Open, add and manage timelines (TimelinesPanel). */
  timelines: ReactNode;
  editMode: boolean;
  /** The reader has local edits to this timeline. */
  dirty: boolean;
  onToggleEdit: () => void;
}

/**
 * The toolbar's Customize panel: everything a reader changes for themselves, behind one button. Appearance (the theme,
 * saved in this browser), Edit (turn edit mode on or off; the edit bar then holds the tools) and Timelines (open
 * others, add your own). Tabs follow the ARIA tabs pattern: arrow keys move between them, and only the selected tab
 * is a Tab stop.
 */
export function CustomizePanel(p: Props) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pick = (t: CustomizeTab) => {
    p.onTab(t);
    tabRefs.current[t]?.focus();
  };
  const onTabKey = (ev: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === p.tab);
    const to =
      ev.key === 'ArrowRight' ? (i + 1) % TABS.length
      : ev.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
      : ev.key === 'Home' ? 0
      : ev.key === 'End' ? TABS.length - 1
      : -1;
    if (to < 0) return;
    ev.preventDefault();
    pick(TABS[to].id);
  };

  return (
    <div className="customize-panel">
      <h2 className="sr-only">Customize</h2>
      <div className="customize-head">
        {/* the tabs take focus, not the list (ARIA tabs pattern); the list only handles their arrow keys */}
        {/* oxlint-disable-next-line jsx-a11y/interactive-supports-focus */}
        <div role="tablist" aria-label="Customize" className="customize-tabs" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              role="tab"
              id={`customize-tab-${t.id}`}
              aria-selected={p.tab === t.id}
              aria-controls={`customize-${t.id}`}
              tabIndex={p.tab === t.id ? 0 : -1}
              className={`seg ${p.tab === t.id ? 'on' : ''}`}
              onClick={() => p.onTab(t.id)}
            >
              {t.label}
              {t.id === 'edit' && p.editMode && <span className="muted small"> (on)</span>}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button className="icon" onClick={p.onClose} aria-label="Close Customize" title="Close">
          ✕
        </button>
      </div>
      <div role="tabpanel" id={`customize-${p.tab}`} aria-labelledby={`customize-tab-${p.tab}`} className="customize-body">
        {p.tab === 'appearance' && p.appearance}
        {p.tab === 'timelines' && p.timelines}
        {p.tab === 'edit' && (
          <div className="customize-edit">
            {p.editMode ? (
              <>
                <p>
                  <strong>Edit mode is on.</strong> The bar under the toolbar adds events, rows and sources, and downloads or
                  uploads the timeline file. Select an event to edit or delete it; each row label has buttons to edit,
                  reorder or add sub-rows.
                </p>
                <button onClick={p.onToggleEdit}>Done editing</button>
              </>
            ) : (
              <>
                <p>
                  Add or change events, rows and sources, with their dates and citations. Your edits are saved in this
                  browser as you go and sit on top of the published timeline; download the file to keep or share them.
                </p>
                {p.dirty && <p className="muted">You have local edits to this timeline.</p>}
                <button className="primary" onClick={p.onToggleEdit}>
                  Turn on edit mode
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
