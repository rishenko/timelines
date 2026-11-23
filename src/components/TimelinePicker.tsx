import { useEffect, useId, useRef, useState } from 'react';
import type { TimelineChoice } from '../state/timelines.ts';
import { collectionName } from '../state/collections.ts';

interface Props {
  timelines: TimelineChoice[];
  currentId: string;
  /** The open timeline's title, on the button. */
  title: string;
  /** Small print under the title, cut to the button's width (the full text is its tooltip). */
  subtitle?: string;
  /** "Add or manage timelines…": opens the Timelines panel. */
  onManage: () => void;
  /** "Cite this timeline": opens its citation. */
  onCite?: () => void;
}

/**
 * The page heading and title menu: a button with the open timeline's title that shows the site's timelines, then
 * each shared list's, then the reader's own, then a way to add more. Each timeline is a link, so another one opens
 * only when the reader follows it; a <select> here opened one on every arrow key in some browsers (WCAG 3.2.2).
 * The list sits outside the <h1>, so the heading is only the title.
 */
export function TimelinePicker({ timelines, currentId, title, subtitle, onManage, onCite }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups: { label: string; items: TimelineChoice[] }[] = [];
  const bundled = timelines.filter((t) => t.entry && !t.collection);
  if (bundled.length) groups.push({ label: 'Included', items: bundled });
  const lists = new Map<string, { label: string; items: TimelineChoice[] }>();
  for (const t of timelines)
    if (t.collection) {
      const g = lists.get(t.collection.url) ?? { label: collectionName(t.collection), items: [] };
      g.items.push(t);
      lists.set(t.collection.url, g);
    }
  groups.push(...lists.values());
  const library = timelines.filter((t) => t.library);
  if (library.length) groups.push({ label: 'Your timelines', items: library });

  return (
    <div className="timeline-menu" ref={ref}>
      <h1>
        <button
          ref={buttonRef}
          className="timeline-picker"
          aria-expanded={open}
          aria-controls={open ? popId : undefined}
          onClick={() => setOpen((o) => !o)}
          title="Switch to another timeline, or add your own"
        >
          {title} <span aria-hidden="true">▾</span>
        </button>
        {subtitle && (
          <span className="subtitle muted" title={subtitle}>
            {subtitle}
          </span>
        )}
      </h1>
      {open && (
        <div className="timeline-pop" id={popId}>
          {groups.map((g, i) => (
            <div key={g.label + i}>
              <p className="muted small" id={`${popId}-g${i}`}>
                {g.label}
              </p>
              <ul aria-labelledby={`${popId}-g${i}`}>
                {g.items.map(({ summary: t }) => (
                  <li key={t.id}>
                    <a href={`?timeline=${encodeURIComponent(t.id)}`} aria-current={t.id === currentId ? 'page' : undefined}>
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button
            className="linklike"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
          >
            Add or manage timelines…
          </button>
          {onCite && (
            <button
              className="linklike"
              onClick={() => {
                setOpen(false);
                // focus the title button first: the dialog returns focus to it on close (this item unmounts)
                buttonRef.current?.focus();
                onCite();
              }}
            >
              Cite this timeline…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
