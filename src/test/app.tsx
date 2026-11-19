// Opens the app in tests the way Boot does in the browser, without fetching: the site's timelines are the included
// ones, already loaded.
import { render } from '@testing-library/react';
import App from '../App.tsx';
import type { Dataset } from '../types.ts';
import { summarize, type TimelineIndexEntry } from '../data/timelineIndex.ts';
import ancient from '../../public/timelines/ancient-near-east.json';
import classical from '../../public/timelines/classical.json';

export const SITE_DATASETS = [ancient, classical] as unknown as Dataset[];
export const SITE: TimelineIndexEntry[] = SITE_DATASETS.map((d) => ({ ...summarize(d), file: `${d.meta.id}.json` }));

/** Sets the address to `/?<query>` (with any #hash) and renders the app on the timeline it names (else the first). */
export function renderApp(query: string) {
  window.history.replaceState(null, '', `/?${query}`);
  const id = new URLSearchParams(window.location.search).get('timeline');
  const published = SITE_DATASETS.find((d) => d.meta.id === id) ?? SITE_DATASETS[0];
  return render(<App published={published} site={SITE} />);
}
