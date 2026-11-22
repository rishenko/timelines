// Dev server only: serves the local datasets (see local-data.ts) under /timelines/ and adds them to the end of the
// timeline list, so `npm run dev` shows them next to the bundled timelines. Builds and the deployed site never
// include them.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { parseTimelineIndex, summarize } from '../../src/data/timelineIndex.ts';
import type { Dataset } from '../../src/types.ts';
import { localAsset, localDataDirs, localTimelineFiles } from './local-data.ts';

export function localDataPlugin(): Plugin {
  return {
    name: 'timelines-local-data',
    apply: 'serve',
    configureServer(server) {
      const dirs = localDataDirs();
      if (!dirs.length) return;
      server.config.logger.info(`local datasets: ${localTimelineFiles(dirs).length} timeline(s) from ${dirs.length} folder(s)`);
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent((req.url ?? '').split('?')[0]);
        const m = /^\/timelines\/(.+)$/.exec(path);
        if (!m) return next();
        if (m[1] === 'index.json') {
          const bundled = parseTimelineIndex(JSON.parse(readFileSync(join(server.config.root, 'public/timelines/index.json'), 'utf8')));
          const entries = [...bundled.entries];
          for (const f of localTimelineFiles(dirs)) {
            const data = JSON.parse(readFileSync(f.path, 'utf8')) as Dataset;
            const { id, title, ...rest } = summarize(data);
            if (!entries.some((e) => e.id === id)) entries.push({ id, title, file: f.file, ...rest });
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ timelines: entries }));
          return;
        }
        const file = localAsset(m[1], dirs);
        if (!file) return next();
        if (file.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
        else if (file.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
        else if (file.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(file));
      });
    },
  };
}
