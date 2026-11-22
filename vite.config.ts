import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { localDataPlugin } from './scripts/lib/local-data-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/
  base: './',
  // localDataPlugin: dev server only, and only when TIMELINES_LOCAL_DATA is set (scripts/lib/local-data.ts)
  plugins: [react(), localDataPlugin()],
  test: {
    environment: 'node',
    // the UI tests render whole timelines in jsdom: several take 1.5–5.5 s on a fast machine, more on a busy CI runner,
    // so vitest's default 5 s fails them now and then. Only a hung test waits this long.
    testTimeout: 30_000,
  },
})
