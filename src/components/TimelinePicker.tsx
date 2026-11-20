import type { TimelineChoice } from '../state/timelines.ts';
import { collectionName, type Collection } from '../state/collections.ts';

/** Picker entry that opens the library panel instead of a timeline. */
const MANAGE = '__manage__';

interface Props {
  timelines: TimelineChoice[];
  currentId: string;
  onOpen: (id: string) => void;
  /** "Add or manage timelines…": opens the Timelines panel. */
  onManage: () => void;
}

/** The title menu: the site's timelines, then each shared list's, then the reader's own, then a way to add more. */
export function TimelinePicker({ timelines, currentId, onOpen, onManage }: Props) {
  const bundled = timelines.filter((t) => t.entry && !t.collection);
  const library = timelines.filter((t) => t.library);
  const lists = new Map<string, { collection: Collection; items: TimelineChoice[] }>();
  for (const t of timelines)
    if (t.collection) {
      const g = lists.get(t.collection.url) ?? { collection: t.collection, items: [] };
      g.items.push(t);
      lists.set(t.collection.url, g);
    }
  return (
    <select
      className="timeline-picker"
      aria-label="Timeline"
      value={currentId}
      onChange={(e) => (e.target.value === MANAGE ? onManage() : onOpen(e.target.value))}
    >
      {bundled.length > 0 && (
        <optgroup label="Included">
          {bundled.map(({ summary: t }) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </optgroup>
      )}
      {[...lists.values()].map(({ collection, items }) => (
        <optgroup key={collection.url} label={collectionName(collection)}>
          {items.map(({ summary: t }) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </optgroup>
      ))}
      {library.length > 0 && (
        <optgroup label="Your timelines">
          {library.map(({ summary: t }) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </optgroup>
      )}
      <option value={MANAGE}>Add or manage timelines…</option>
    </select>
  );
}
