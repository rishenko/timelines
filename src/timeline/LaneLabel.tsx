import { safeUrl } from '../lib/urls.ts';
import { labelStopKey } from './keyboard.ts';
import type { LaneDef } from './layout.ts';

interface Props {
  lane: LaneDef;
  labelW: number;
  /** Events folded into "+N" badges for lack of room. */
  overflow: number;
  /** The lane shows all its events (no "+N" badges). */
  expanded: boolean;
  editMode: boolean;
  /** The chart control that holds the one Tab stop (see useRovingFocus). */
  rovingKey: string | null;
  onStopFocus: (key: string) => void;
  onToggleExpanded: () => void;
  onToggleCollapsed: () => void;
  onEditTrack: () => void;
  onMoveTrack: (dir: -1 | 1) => void;
  onAddSubTrack: () => void;
  /** Rows below this header with nothing in view (hidden, or shown when `revealed`); 0 or absent: no button. */
  inactiveBelow?: number;
  revealed?: boolean;
  onToggleRevealed?: () => void;
}

/** The site a link goes to, for its tooltip ("en.wikipedia.org"). */
const hostOf = (url: string) => {
  try {
    return new URL(url, window.location.href).hostname;
  } catch {
    return url;
  }
};

/**
 * The row's label, sticky at the left: name (a link to the row's page, when it has one), logo, edit buttons in edit
 * mode, and the show-all and fold buttons.
 */
export function LaneLabel({ lane, labelW, overflow, expanded, editMode, rovingKey, onStopFocus, inactiveBelow = 0, revealed = false, ...on }: Props) {
  const image = safeUrl(lane.track.image);
  const url = safeUrl(lane.track.url);
  const name = lane.track.name;
  const linkKey = labelStopKey(lane.id, 'link');
  const overflowKey = labelStopKey(lane.id, 'overflow');
  const foldKey = labelStopKey(lane.id, 'fold');
  const hiddenKey = labelStopKey(lane.id, 'hidden');
  const rows = (n: number) => (n === 1 ? '1 row' : `${n} rows`);
  return (
    <div className="tl-lane-label" style={{ width: labelW }}>
      <span className="chip" />
      {image && <img src={image} alt="" className="logo" />}
      {url ? (
        <a
          className="name"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${name}: ${hostOf(url)} (opens in a new tab)`}
          data-stop={linkKey}
          tabIndex={rovingKey === linkKey ? 0 : -1}
          onFocus={() => onStopFocus(linkKey)}
        >
          {name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="name" title={name}>
          {name}
        </span>
      )}
      {editMode && (
        <span className="lane-edit">
          <button className="icon small" aria-label={`Edit ${name}`} title={`Edit ${name}`} onClick={on.onEditTrack}>
            ✎
          </button>
          <button className="icon small" aria-label={`Move ${name} up`} title="Move up" onClick={() => on.onMoveTrack(-1)}>
            ↑
          </button>
          <button className="icon small" aria-label={`Move ${name} down`} title="Move down" onClick={() => on.onMoveTrack(1)}>
            ↓
          </button>
          <button className="icon small" aria-label={`Add a sub-track under ${name}`} title={`Add a sub-track under ${name}`} onClick={on.onAddSubTrack}>
            +
          </button>
        </span>
      )}
      {(overflow > 0 || expanded) && (
        <button
          className="collapse"
          aria-label={`All events in ${name}${expanded ? '' : ` (${overflow} folded)`}`}
          aria-expanded={expanded}
          data-stop={overflowKey}
          tabIndex={rovingKey === overflowKey ? 0 : -1}
          onFocus={() => onStopFocus(overflowKey)}
          title={expanded ? 'Limit rows (fold crowded events into +N badges)' : `Show all rows (${overflow} events folded)`}
          onClick={on.onToggleExpanded}
        >
          {expanded ? '⇡' : '⇣'}
        </button>
      )}
      {inactiveBelow > 0 && (
        <button
          className="hidden-rows"
          aria-label={revealed ? `Hide ${rows(inactiveBelow)} in ${name} with nothing in view` : `Show ${rows(inactiveBelow)} in ${name} with nothing in view`}
          aria-pressed={revealed}
          data-stop={hiddenKey}
          tabIndex={rovingKey === hiddenKey ? 0 : -1}
          onFocus={() => onStopFocus(hiddenKey)}
          title={revealed ? `Hide the ${rows(inactiveBelow)} with nothing in view` : `${rows(inactiveBelow)} with nothing in view hidden: show them`}
          onClick={on.onToggleRevealed}
        >
          {revealed ? `−${inactiveBelow}` : `+${inactiveBelow}`}
        </button>
      )}
      {lane.hasChildren && (
        <button
          className="collapse"
          aria-label={`Sub-rows of ${name}`}
          aria-expanded={!lane.collapsed}
          data-stop={foldKey}
          tabIndex={rovingKey === foldKey ? 0 : -1}
          onFocus={() => onStopFocus(foldKey)}
          title={lane.collapsed ? 'Expand sub-tracks' : 'Collapse sub-tracks into this lane'}
          onClick={on.onToggleCollapsed}
        >
          {lane.collapsed ? '▸' : '▾'}
        </button>
      )}
    </div>
  );
}
