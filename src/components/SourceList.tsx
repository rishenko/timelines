import type { Dataset, SourceRef } from '../types.ts';
import { safeUrl } from '../lib/urls.ts';

/** Citations as a list: each source's name, linked to its page when it has one, then where in it. */
export function SourceList({ refs, sources }: { refs: SourceRef[]; sources: Dataset['sources'] }) {
  return (
    <ul>
      {refs.map((src, i) => {
        const source = sources[src.sourceKey];
        const href = safeUrl(source?.url);
        const name = source?.name ?? src.sourceKey;
        return (
          <li key={`${src.sourceKey}-${i}`}>
            {href ? (
              <a href={href} target="_blank" rel="noreferrer">
                {name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              name
            )}
            {src.sourceLocation && <span className="muted">, {src.sourceLocation}</span>}
          </li>
        );
      })}
    </ul>
  );
}
