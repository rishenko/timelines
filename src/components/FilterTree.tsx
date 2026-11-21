import { useId, useMemo, useState, type ReactNode } from 'react';

/** One line of a FilterTree: a row, a source, or a group of them. */
export interface FilterNode {
  /** Unique within the tree (a source listed under two groups gets two keys). */
  key: string;
  /** Plain name, for finding and for the checkbox's accessible name. */
  name: string;
  /** What the line shows before its count (a colour chip and the name, say); defaults to the name. */
  label?: ReactNode;
  /** The filter ids the checkbox switches: the line's own and everything below it. */
  ids: string[];
  children?: FilterNode[];
  /** The number shown after a group's name (its rows or sources); none for single lines. */
  count?: number;
  /** Shown dimmed (still usable), with `dimNote` read out: outside the ticked regions. */
  dim?: boolean;
  /** Extra controls after the line (edit buttons in edit mode). */
  extra?: ReactNode;
}

interface Props {
  nodes: FilterNode[];
  /** Accessible name of the list, e.g. "Rows". */
  label: string;
  /** "row" / "source", for the find box and the counts. */
  noun: string;
  isOn: (id: string) => boolean;
  setMany: (ids: string[], on: boolean) => void;
  /** Read out after a dimmed line's name. */
  dimNote?: string;
  /** Lines to open (and keep open when they change), e.g. the branches holding rows in the ticked regions. */
  openKeys?: string[];
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * A long Filters list as a folding tree with a find box: each line a checkbox (a group's switches the whole group and
 * shows "mixed" when only some of it is on), a ▸ to open the lines inside, and a count. Typing in the find box keeps the
 * matching lines and the groups above them, opened. Same pattern as Filters → Regions; on touch screens the lines are
 * taller (CSS).
 */
export function FilterTree({ nodes, label, noun, isOn, setMany, dimNote, openKeys = [] }: Props) {
  const id = useId();
  const [open, setOpen] = useState<Set<string>>(() => new Set(openKeys));
  const [query, setQuery] = useState('');
  // newly asked-for branches open (the reader's own folding is kept)
  const wanted = openKeys.join('\u0000');
  const [openedFor, setOpenedFor] = useState(wanted);
  if (wanted !== openedFor) {
    setOpenedFor(wanted);
    if (wanted) setOpen((o) => new Set([...o, ...wanted.split('\u0000')]));
  }
  const flip = (key: string) =>
    setOpen((o) => {
      const next = new Set(o);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  // finding: keep the lines whose name matches, with the groups above them
  const q = fold(query.trim());
  const shown = useMemo(() => {
    if (!q) return nodes;
    const keep = (n: FilterNode): FilterNode | null => {
      const kids = (n.children ?? []).map(keep).filter((k): k is FilterNode => !!k);
      return fold(n.name).includes(q) || kids.length ? { ...n, children: kids.length ? kids : fold(n.name).includes(q) ? n.children : [] } : null;
    };
    return nodes.map(keep).filter((n): n is FilterNode => !!n);
  }, [nodes, q]);
  const matches = useMemo(() => {
    if (!q) return 0;
    let n = 0;
    const count = (list: FilterNode[]) => list.forEach((x) => (fold(x.name).includes(q) && n++, count(x.children ?? [])));
    count(shown);
    return n;
  }, [shown, q]);

  /**
   * A group's lines. When only some of them are dimmed (outside the ticked regions), the dimmed ones fold into one
   * "N more" line, so opening a group to reach its two rows in the regions doesn't spill out thirty others.
   */
  const children = (n: FilterNode, kids: FilterNode[]) => {
    const dimmed = kids.filter((k) => k.dim);
    if (q || !dimmed.length || dimmed.length === kids.length) return kids.map(line);
    const moreKey = `${n.key}\u0000more`;
    const more = open.has(moreKey);
    return (
      <>
        {kids.filter((k) => !k.dim).map(line)}
        <li className="dim-more">
          <span className="tree-line">
            <button className="icon small fold" aria-expanded={more} onClick={() => flip(moreKey)}>
              {more ? '▾' : '▸'}
            </button>
            <button className="linklike more" aria-expanded={more} onClick={() => flip(moreKey)}>
              {dimmed.length} more in {n.name}, outside the ticked regions
            </button>
          </span>
          {more && <ul>{dimmed.map(line)}</ul>}
        </li>
      </>
    );
  };

  const line = (n: FilterNode) => {
    const kids = n.children ?? [];
    const on = n.ids.filter(isOn).length;
    const state = on === n.ids.length ? 'on' : on === 0 ? 'off' : 'mixed';
    const isOpen = q ? true : open.has(n.key);
    return (
      <li key={n.key} className={n.dim ? 'dim' : undefined}>
        <span className="tree-line">
          {kids.length > 0 ? (
            <button
              className="icon small fold"
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} what is in ${n.name}`}
              title={`${isOpen ? 'Hide' : 'Show'} what is in ${n.name}`}
              onClick={() => flip(n.key)}
              disabled={!!q}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="fold-space" />
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={state === 'on'}
              ref={(el) => {
                if (el) el.indeterminate = state === 'mixed';
              }}
              onChange={() => setMany(n.ids, state !== 'on')}
            />
            <span className="tree-name">{n.label ?? n.name}</span>
            {n.count !== undefined && <span className="muted small"> ({n.count})</span>}
            {n.dim && dimNote && <span className="sr-only"> ({dimNote})</span>}
          </label>
          {n.extra}
        </span>
        {kids.length > 0 && isOpen && <ul>{children(n, kids)}</ul>}
      </li>
    );
  };

  return (
    <div className="filter-tree">
      <label className="sr-only" htmlFor={`${id}-find`}>
        Find a {noun}
      </label>
      <input id={`${id}-find`} type="search" className="tree-find" value={query} placeholder={`Find a ${noun}…`} onChange={(e) => setQuery(e.target.value)} />
      <p className="sr-only" aria-live="polite">
        {q ? `${matches} ${matches === 1 ? noun : `${noun}s`} match` : ''}
      </p>
      {q && matches === 0 && <p className="muted small">No {noun} matches.</p>}
      <ul className="tree-list" aria-label={label}>
        {shown.map(line)}
      </ul>
    </div>
  );
}
