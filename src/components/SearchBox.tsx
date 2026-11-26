import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useCommands } from '../commands/CommandsContext.ts';
import { keyLabel } from '../lib/keycap.ts';
import { search, type SearchEntry } from '../lib/search.ts';

interface Props {
  index: SearchEntry[];
  placeholder: string;
  /** A year written the way this timeline writes years, for the tooltip (e.g. "1274 BCE"). */
  example?: string;
  /** A year or date typed as text ("1274 BCE", "July 1916", "1 July 1916"), or null. */
  parseDate: (text: string) => SearchDate | null;
  /** Dates shown beside a result, e.g. "c. 1650 – 1180 BCE". */
  describeYears: (entry: SearchEntry) => string;
  /** Why a result is not drawn right now (e.g. hidden by Filters), or null. */
  hiddenReason: (entry: SearchEntry) => string | null;
  onPick: (entry: SearchEntry) => void;
  onYear: (date: SearchDate) => void;
}

/** A date typed in the search: where it is on the axis, how it reads, and how precise it is. */
export interface SearchDate {
  at: number;
  label: string;
  unit: 'year' | 'month' | 'day';
}

const HEADS = { track: 'Rows', phase: 'Phases', event: 'Events' } as const;

type Option = { kind: 'year'; date: SearchDate } | { kind: 'entry'; entry: SearchEntry; hidden: string | null };

/** The search field's id: "/" in the chart moves to it (src/timeline/useRovingFocus.ts). */
export const SEARCH_INPUT_ID = 'timeline-search';

/**
 * The toolbar search: finds rows (groups, regions, civilizations) and events, or jumps to a typed year.
 * A combobox rather than a <datalist>, so results can be ranked, grouped and shown with their row's path.
 * Press "/" in the chart to move to it. Only there: a page-wide one-key shortcut can't be turned off (WCAG 2.1.4).
 */
export function SearchBox(props: Props) {
  const { index, parseDate, hiddenReason } = props;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const listId = useId();
  // the key that moves here from the chart, as the reader has it (none when unbound, or with no chart)
  const commands = useCommands();
  const searchKey = useSyncExternalStore(commands.subscribe, () => commands.keyFor('chart.search'));

  const options = useMemo<Option[]>(() => {
    if (!query.trim()) return [];
    const date = parseDate(query);
    const hits = search(index, query).map((h) => ({ kind: 'entry' as const, entry: h.entry, hidden: hiddenReason(h.entry) }));
    // rows first, then phases, then events, each keeping its ranking
    const rows = hits.filter((h) => h.entry.kind === 'track');
    const phases = hits.filter((h) => h.entry.kind === 'phase');
    const evs = hits.filter((h) => h.entry.kind === 'event');
    return [...(date !== null ? [{ kind: 'year' as const, date }] : []), ...rows, ...phases, ...evs];
  }, [query, index, parseDate, hiddenReason]);



  // The list is position: fixed under the input, so the toolbar can't clip it. It starts at the input's left edge
  // unless its widest possible size (520 px, see .search-results) would run past the screen's right edge.
  const showList = open && query.trim() !== '';
  useLayoutEffect(() => {
    if (!showList) return;
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const maxW = Math.min(520, window.innerWidth - 16);
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 8 - maxW)), width: r.width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [showList]);

  // keep the highlighted option in view while arrowing through the list
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (o: Option | undefined) => {
    if (!o) return;
    if (o.kind === 'year') props.onYear(o.date);
    else props.onPick(o.entry);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (!options.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape') {
      if (query) setQuery('');
      else inputRef.current?.blur();
      setOpen(false);
    }
  };

  const optId = (i: number) => `${listId}-o${i}`;
  let lastKind: string | null = null;

  return (
    <>
      <input
        ref={inputRef}
        id={SEARCH_INPUT_ID}
        className="search"
        type="search"
        role="combobox"
        aria-label="Search rows and events, or go to a year"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && options.length ? optId(active) : undefined}
        placeholder={props.placeholder}
        title={`Find a row, phase or event, or type a year or date${props.example ? ` (e.g. ${props.example})` : ''}. ${searchKey ? ` ${keyLabel(searchKey)} comes here from anywhere but a text field.` : ''}`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && pos && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="search-results"
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
          // keep focus in the input so a click picks instead of blurring and closing first
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* an option that can't be picked, so the listbox holds only options (an empty list's message included) */}
          {options.length === 0 && (
            <li role="option" aria-disabled="true" aria-selected="false" className="search-empty muted">
              No rows or events match.
            </li>
          )}
          {options.map((o, i) => {
            const head = o.kind === 'entry' && o.entry.kind !== lastKind ? HEADS[o.entry.kind] : null;
            if (o.kind === 'entry') lastKind = o.entry.kind;
            return [
              head && (
                <li key={`h-${head}`} role="presentation" className="search-head">
                  {head}
                </li>
              ),
              // options are chosen with the arrow keys and Enter in the search input (the combobox pattern)
              // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={o.kind === 'year' ? 'year' : `${o.entry.kind}-${o.entry.id}`}
                id={optId(i)}
                data-i={i}
                role="option"
                aria-selected={i === active}
                className={`search-option${i === active ? ' active' : ''}${o.kind === 'entry' && o.hidden ? ' hidden' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                {o.kind === 'year' ? (
                  <span className="search-title">Go to {o.date.label}</span>
                ) : (
                  <>
                    <span className="search-title">
                      {o.entry.importance === 1 ? <strong>{o.entry.label}</strong> : o.entry.label}
                      <span className="search-years">{props.describeYears(o.entry)}</span>
                    </span>
                    {(o.entry.path.length > 0 || o.hidden) && (
                      <span className="search-path">
                        {o.entry.path.join(' › ')}
                        {o.hidden && <em>{o.entry.path.length ? ' · ' : ''}{o.hidden}</em>}
                      </span>
                    )}
                  </>
                )}
              </li>,
            ];
          })}
        </ul>
      )}
    </>
  );
}
