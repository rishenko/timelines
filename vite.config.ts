import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { localDataPlugin } from './scripts/lib/local-data-plugin.ts'
import { timelineIndexPlugin } from './scripts/lib/timeline-index-plugin.ts'
import { execFileSync } from 'node:child_process'

// the data version cited by "Cite this" and in problem reports: the commit the site is built from (the deploy sets
// GITHUB_SHA, and writes the same commit to version.txt) and that commit's date
const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}
const sha = process.env.GITHUB_SHA || git('rev-parse', 'HEAD')
const dataVersion = sha ? { sha: sha.slice(0, 7), date: git('log', '-1', '--format=%cs', sha) } : null

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/
  base: './',
  // localDataPlugin: dev server only, and only when TIMELINES_LOCAL_DATA is set (scripts/lib/local-data.ts); it adds
  // the local timelines to the site's list, so it comes before timelineIndexPlugin, which makes the list
  // (timelines/index.json) from public/timelines
  plugins: [react(), localDataPlugin(), timelineIndexPlugin()],
  define: { __DATA_VERSION__: JSON.stringify(dataVersion) },
  test: {
    environment: 'node',
    // the UI tests render whole timelines in jsdom: several take 1.5–5.5 s on a fast machine, more on a busy CI runner,
    // so vitest's default 5 s fails them now and then. Only a hung test waits this long.
    testTimeout: 30_000,
  },
})
