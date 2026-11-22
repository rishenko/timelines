// The test suite with short output: one summary line (passed, failed, skipped) and one line per failure.
//   npm run test:quiet [-- <files>...]      the suite as CI runs it
//   npm run test:private [-- <files>...]    with your local timelines too (TIMELINES_LOCAL_DATA, or the path in
//                                           local-data.local; see docs/development.md, "Local timelines")
// Exits with 1 on any failure.
import { localData, quietVitest } from './lib/quiet.ts';

const args = process.argv.slice(2);
const priv = args.includes('--private');
const files = args.filter((a) => a !== '--private');
const env = { ...process.env };
if (priv) {
  const dir = localData();
  if (!dir) {
    console.log('FAIL  no local timelines: set TIMELINES_LOCAL_DATA, or put the path in local-data.local');
    process.exit(1);
  }
  env.TIMELINES_LOCAL_DATA = dir;
} else delete env.TIMELINES_LOCAL_DATA;

const t = quietVitest(files, env);
for (const f of t.failures) console.log(`FAIL  ${f}`);
console.log(`${t.ok ? 'ok  ' : 'FAIL'}  tests${priv ? ' (with local timelines)' : ''}: ${t.summary}`);
process.exit(t.ok ? 0 : 1);
