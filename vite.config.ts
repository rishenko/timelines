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
  },
})
