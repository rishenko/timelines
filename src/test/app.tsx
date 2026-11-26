// Opens the app in tests the way Boot does in the browser, without fetching: the site's timelines are the included
// ones, already loaded.
import { render } from '@testing-library/react';
import App from '../App.tsx';
import type { Dataset } from '../types.ts';
import { summarize, type TimelineIndexEntry } from '../data/timelineIndex.ts';
import combined from '../../public/timelines/ancient-classical.json';
import { secondSiteTimeline } from './fixtures.ts';
import { CommandsContext } from '../commands/CommandsContext.ts';
import type { CommandRegistry } from '../commands/registry.ts';
import { ChartApiContext, createChartApiStore, type ChartApiStore } from '../plugins/chartApi.ts';

/** The bundled timeline, plus a small fictional one so tests can switch between site timelines. */
export const SITE_DATASETS = [combined as unknown as Dataset, secondSiteTimeline()];
export const SITE: TimelineIndexEntry[] = SITE_DATASETS.map((d) => ({ ...summarize(d), file: `${d.meta.id}.json` }));

/**
 * Sets the address to `/?<query>` (with any #hash) and renders the app on the timeline it names (else the first), with
 * `commands` as Boot's registry if given, and Boot's chart api store (`charts`, or a new one).
 */
export function renderApp(query: string, datasets: Dataset[] = SITE_DATASETS, commands?: CommandRegistry, charts: ChartApiStore = createChartApiStore()) {
  window.history.replaceState(null, '', `/?${query}`);
  const id = new URLSearchParams(window.location.search).get('timeline');
  const published = datasets.find((d) => d.meta.id === id) ?? datasets[0];
  const app = (
    <ChartApiContext.Provider value={charts}>
      <App published={published} site={SITE} />
    </ChartApiContext.Provider>
  );
  // Boot's one registry, when a test needs to reach it (bindings); else the chart makes its own
  return render(commands ? <CommandsContext.Provider value={commands}>{app}</CommandsContext.Provider> : app);
}
