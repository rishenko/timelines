// Makes timelines/index.json, the site's list of timelines, from the files in public/timelines (see timeline-index.ts):
// the dev server serves it fresh on every request, and the build writes it into dist/timelines/. A file that isn't a
// valid timeline is left out with a warning.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { TIMELINES_DIR, timelineIndexText } from './timeline-index.ts';

export function timelineIndexPlugin(): Plugin {
  return {
    name: 'timelines-index',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== '/timelines/index.json') return next();
        const { text, notes } = timelineIndexText();
        for (const n of notes) server.config.logger.warn(`timelines/index.json: ${n}`);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(text);
      });
    },
    generateBundle() {
      // an old committed copy left in public/ would be copied over the list made here
      const stale = join(TIMELINES_DIR, 'index.json');
      if (existsSync(stale)) this.error(`${stale} is made at build time now: delete it (order: data-src/site-timelines.json)`);
      const { text, notes } = timelineIndexText();
      for (const n of notes) this.warn(`timelines/index.json: ${n}`);
      this.emitFile({ type: 'asset', fileName: 'timelines/index.json', source: text });
    },
  };
}
