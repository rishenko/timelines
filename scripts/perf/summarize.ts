// Markdown tables (medians of the runs) from profile.ts JSON lines, one table per label, profile and timeline.
//   node scripts/perf/summarize.ts perf-results/timing.jsonl [perf-results/react.jsonl]
// Grouping and run counting: scripts/lib/perf-summary.ts.
import { readFileSync } from 'node:fs';
import { groups, median, type PerfRow } from '../lib/perf-summary.ts';

for (const file of process.argv.slice(2)) {
  const rows: PerfRow[] = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const react = rows.some((r) => r.react);
  const cols = react
    ? ['commits', 'renders', 'mounts', 'renderMs', 'elements', 'lanes']
    : ['paintMs', 'settledMs', 'frameMean', 'frameP95', 'over33', 'longTaskMs', 'scriptMs', 'layoutMs', 'styleMs', 'layouts', 'elements', 'heapMB'];
  for (const g of groups(rows)) {
    console.log(`\n**${g.label ? `${g.label}: ` : ''}${g.profile}, ${g.timeline}** (${g.runs} runs, medians)\n`);
    console.log(`| step | ${cols.join(' | ')} |${react ? ' top components by self time (last run) |' : ''}`);
    console.log(`|---|${cols.map(() => '---:').join('|')}|${react ? '---|' : ''}`);
    for (const step of [...new Set(g.rows.map((r) => r.step))]) {
      const s = g.rows.filter((r) => r.step === step);
      const vals = cols.map((c) => {
        const xs = s.map((r) => r[c]).filter((x): x is number => typeof x === 'number');
        return xs.length ? String(median(xs)) : '';
      });
      console.log(`| ${step} | ${vals.join(' | ')} |${react ? ` ${s[s.length - 1].top ?? ''} |` : ''}`);
    }
  }
}
