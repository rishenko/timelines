// Profiling build: the production build, unminified (component names survive), with React's profiling renderer
// (fibers carry actualDuration/selfBaseDuration). Output: dist-profile/. Not for deploys.
//   npx vite build --config scripts/perf/vite.profile.config.ts && npx vite preview --config scripts/perf/vite.profile.config.ts --port 4310 --strictPort --host 0.0.0.0
import { mergeConfig } from 'vite';
import base from '../../vite.config.ts';

export default mergeConfig(base, {
  resolve: { alias: [{ find: /^react-dom\/client$/, replacement: 'react-dom/profiling' }] },
  build: { outDir: 'dist-profile', minify: false, emptyOutDir: true },
  preview: { port: 4310 },
});
