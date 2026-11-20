// Re-formats a timeline source file in place, in the repo's compact style.
//   node scripts/format-source.ts data-src/ancient-classical.json
import { readSource, writeSource } from './lib/source-format.ts';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node scripts/format-source.ts <data-src file>...');
  process.exit(1);
}
for (const f of files) {
  writeSource(f, readSource(f));
  console.log('formatted', f);
}
