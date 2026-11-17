import { useForm } from 'react-hook-form';
import type { Dataset, Source } from '../types.ts';
import { customTags, slug, sourceUsage, uniqueId } from '../state/edits.ts';

interface FormValues {
  key: string;
  name: string;
  author: string;
  year: string;
  url: string;
  accessed: string;
  tags: string[];
  newTag: string;
  hiddenByDefault: boolean;
}

interface Props {
  /** Key of the source being edited, or null to create one. */
  sourceKey: string | null;
  data: Dataset;
  onSave: (key: string, source: Source, previousKey?: string) => void;
  onDelete: (key: string) => void;
  onCancel: () => void;
}

export function SourceForm({ sourceKey, data, onSave, onDelete, onCancel }: Props) {
  const initial = sourceKey ? data.sources[sourceKey] : null;
  const isNew = !initial;
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      key: sourceKey ?? '',
      name: initial?.name ?? '',
      author: initial?.author ?? '',
      year: initial?.year ?? '',
      url: initial?.url ?? '',
      accessed: initial?.accessed ?? '',
      tags: initial?.tags ?? customTags(data),
      newTag: '',
      hiddenByDefault: initial?.hiddenByDefault ?? false,
    },
  });
  const otherKeys = Object.keys(data.sources).filter((k) => k !== sourceKey);
  const keyValue = watch('key');
  const previewKey = keyValue ? slug(keyValue) : uniqueId(watch('name'), otherKeys);
  // offer the custom tag even on datasets that predate it
  const custom = data.meta.customSourceTag;
  const tags = { ...data.tags, ...(custom && !data.tags[custom] ? { [custom]: { name: custom } } : {}) };

  const submit = (v: FormValues) => {
    const key = v.key ? slug(v.key) : uniqueId(v.name, otherKeys);
    if (!key) return setError('key', { message: 'Key is required.' });
    if (otherKeys.includes(key)) return setError('key', { message: `A source with key "${key}" already exists.` });
    const picked = Array.isArray(v.tags) ? v.tags : v.tags ? [v.tags as unknown as string] : [];
    const extra = slug(v.newTag);
    const s: Source = { name: v.name.trim(), tags: [...new Set([...picked, ...(extra ? [extra] : [])])] };
    if (v.author.trim()) s.author = v.author.trim();
    if (v.year.trim()) s.year = v.year.trim();
    if (v.url.trim()) s.url = v.url.trim();
    if (v.accessed.trim()) s.accessed = v.accessed.trim();
    if (v.hiddenByDefault) s.hiddenByDefault = true;
    onSave(key, s, sourceKey ?? undefined);
  };

  const del = () => {
    if (!sourceKey || !initial) return;
    const n = sourceUsage(data, sourceKey);
    const msg = n
      ? `Delete "${initial.name}"? ${n} event(s) cite it; the citation will be removed from them (the events stay).`
      : `Delete "${initial.name}"?`;
    if (window.confirm(msg)) onDelete(sourceKey);
  };

  return (
    <aside className="side-panel editor">
      <header>
        <h2>{isNew ? 'New source' : `Edit source: ${initial.name}`}</h2>
        <button className="icon" onClick={onCancel} title="Cancel">
          ✕
        </button>
      </header>
      <p className="muted">
        A source is where an event comes from: a book, an article, a web page, your campaign notes. Readers can filter by
        source and by tag.
      </p>
      <form onSubmit={handleSubmit(submit)}>
        <label htmlFor="src-name">Title</label>
        <input id="src-name" placeholder="The Oxford History of Ancient Egypt" {...register('name', { required: 'A title is required.' })} autoFocus />
        {errors.name && <p role="alert">{errors.name.message}</p>}

        <div className="row">
          <div className="grow">
            <label htmlFor="src-author">Author (optional)</label>
            <input id="src-author" placeholder="Shaw, Ian (ed.)" {...register('author')} />
          </div>
          <div>
            <label htmlFor="src-year">Year</label>
            <input id="src-year" size={8} placeholder="2000" {...register('year')} />
          </div>
        </div>

        <label htmlFor="src-url">Link (optional)</label>
        <input id="src-url" type="url" placeholder="https://…" {...register('url')} />
        <label htmlFor="src-accessed">Read on (for web pages)</label>
        <input id="src-accessed" type="date" {...register('accessed')} />

        <fieldset>
          <legend>Tags</legend>
          {Object.entries(tags).map(([k, a]) => (
            <label key={k} className="check">
              <input type="checkbox" value={k} {...register('tags')} /> {a.name}
            </label>
          ))}
          <input aria-label="New tag" placeholder="Add a new tag…" {...register('newTag')} />
        </fieldset>

        <label className="check">
          <input type="checkbox" {...register('hiddenByDefault')} /> Hidden by default (spoilers)
        </label>

        <details>
          <summary>Key: {previewKey || '…'}</summary>
          <p className="muted small">Used in the data file. Leave blank to derive it from the title.</p>
          <input aria-label="Source key" placeholder={previewKey} {...register('key')} />
          {errors.key && <p role="alert">{errors.key.message}</p>}
        </details>

        <footer>
          <button type="submit" className="primary">
            {isNew ? 'Create source' : 'Save source'}
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          {!isNew && (
            <button type="button" className="danger push-right" onClick={del}>
              Delete
            </button>
          )}
        </footer>
      </form>
    </aside>
  );
}
