// One command for the data work on every timeline built from data-src/ (the table is scripts/lib/timelines.ts).
//
//   npm run data -- build <timeline|all>         compile data-src/<file> → public/timelines/<file>
//   npm run data -- importance <timeline|all>    apply the importance and row-link plans, compile, refresh docs/<short>-key-events.md
//   npm run data -- format <timeline|all>        re-format the source file in the repo's compact style
//   npm run data -- row-order <timeline> [args]  how close related rows sit (args as for scripts/row-order.ts)
//   npm run data -- run-all <timeline> [--check] replay every content script in order, then `importance`
//   npm run data -- ids [--check] [--base <rev>] [<dir> ...]
//                                                the id-stability check: ids links can name that a compiled timeline
//                                                lost since <rev> (default origin/main) without a redirect (CI runs it)
//   npm run data -- ai-flags [--check]           links in data-src/ to Wikipedia pages flagged for AI-generated text
//                                                (data-src/ai-flagged-pages.txt; --check exits with 1 if any)
//   npm run data -- index                        print the site's list of timelines (timelines/index.json, made at
//                                                build time from public/timelines and data-src/site-timelines.json)
//
// <timeline> is a short name or an id (both ancient-classical for the bundled timeline). `npm run data:build`,
// `npm run importance` and `npm run data:check` are aliases for the common cases.
//
// run-all rebuilds the timeline's additions from the scripts, in the order the table gives. Every script is an
// upsert, so on an up-to-date source file it should change nothing. --check proves that: it replays everything,
// reports any difference, and puts the source file back as it was (exit code 1 if anything changed). A phase with no
// date claims fails it too (every date cites its source); a plain run-all only warns about one.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { compileSource, compiledText } from './lib/compile.ts';
import { applyImportancePlan, importanceCounts, keyEventsMarkdown } from './lib/importance.ts';
import { readSource, writeSource } from './lib/source-format.ts';
import { SOURCE_TIMELINES, sourceTimeline, type SourceTimeline } from './lib/timelines.ts';
import { timelineIndexText } from './lib/timeline-index.ts';
import { applyRowLinks } from './lib/row-links.ts';
import { applyMemberships } from './lib/memberships.ts';
import { applyCategories } from './lib/categories.ts';
import { applyPeriods } from './lib/periods.ts';
import { idsCommand } from './lib/ids-check.ts';
import { flaggedCitations, loadFlagged } from './lib/ai-flagged.ts';

const [command, name, ...rest] = process.argv.slice(2);
const USAGE = 'usage: npm run data -- <build|importance|format|row-order|run-all> <timeline|all> [options], npm run data -- ids [--check] [--base <rev>] [<dir> ...], npm run data -- ai-flags [--check], or npm run data -- index';

function build(t: SourceTimeline) {
  const { dataset, errors } = compileSource(readSource(t.source));
  if (errors.length) throw new Error(`${t.source}:\n${errors.join('\n')}`);
  writeFileSync(t.compiled, compiledText(dataset));
  const n = (k: string) => (dataset[k] as unknown[]).length;
  console.log(`${t.short}: wrote ${t.compiled} (${n('tracks')} tracks, ${n('events')} events)`);
  return dataset;
}

/** Prints the site's list of timelines as the build will make it, and notes on files it leaves out. */
function index() {
  const { text, notes } = timelineIndexText();
  process.stdout.write(text);
  for (const note of notes) console.error(`index: ${note}`);
}

/**
 * Applies the timeline's plans to the source file (in place): golden ages and eras, importance, row links, memberships, then event categories. Returns the importance
 * counts. A timeline without plans is left alone.
 */
function applyPlan(t: SourceTimeline) {
  const d = readSource(t.source);
  if (t.periods) applyPeriods(d, JSON.parse(readFileSync(t.periods, 'utf8')));
  if (t.importance) applyImportancePlan(d.events, JSON.parse(readFileSync(t.importance, 'utf8')));
  if (t.rowLinks) applyRowLinks(d.tracks, JSON.parse(readFileSync(t.rowLinks, 'utf8')));
  if (t.memberships) applyMemberships(d, JSON.parse(readFileSync(t.memberships, 'utf8')));
  if (t.categories) applyCategories(d, JSON.parse(readFileSync(t.categories, 'utf8')));
  if (t.periods || t.importance || t.rowLinks || t.memberships || t.categories) writeSource(t.source, d);
  return importanceCounts(d.events);
}

function importance(t: SourceTimeline) {
  if (!t.importance || !t.keyEvents) {
    console.log(`${t.short}: no importance plan; compiling only`);
    build(t);
    return;
  }
  const { key, normal, minor } = applyPlan(t);
  console.log(`${t.short}: ${key} key, ${normal} normal, ${minor} minor`);
  const compiled = build(t);
  writeFileSync(t.keyEvents, keyEventsMarkdown(compiled as Parameters<typeof keyEventsMarkdown>[0], t.short));
  console.log(`${t.short}: wrote ${t.keyEvents}`);
}

function runScript(file: string) {
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  const out = (r.stdout + r.stderr).replace(/^.*ExperimentalWarning.*\n?/gm, '').trim();
  if (r.status !== 0) throw new Error(`${file} failed:\n${out}`);
  const lines = out.split('\n').filter(Boolean);
  console.log(`  ${file}: ${lines.length === 1 ? lines[0] : `${lines.length} lines of output`}`);
}

/** Phases with neither start nor end claims, as "row / phase name". */
function uncitedPhases(d: { tracks: { id: string; phases?: { name: string; startDates?: unknown[]; endDates?: unknown[] }[] }[] }) {
  return d.tracks.flatMap((t) =>
    (t.phases ?? []).filter((p) => !p.startDates?.length && !p.endDates?.length).map((p) => `${t.id} / ${p.name}`));
}

function runAll(t: SourceTimeline, check: boolean) {
  const before = readFileSync(t.source, 'utf8');
  try {
    console.log(`${t.short}: replaying ${t.scripts.length} scripts onto ${t.source}`);
    for (const s of t.scripts) runScript(s);
    applyPlan(t);
    const after = readFileSync(t.source, 'utf8');
    if (after === before) console.log(`${t.short}: the scripts reproduce ${t.source} exactly`);
    else {
      const a = before.split('\n');
      const b = after.split('\n');
      const i = a.findIndex((line, k) => line !== b[k]);
      console.log(`${t.short}: the source file changed (first difference at line ${i + 1}):\n- ${a[i]}\n+ ${b[i]}`);
      if (check) process.exitCode = 1;
    }
    const uncited = uncitedPhases(readSource(t.source));
    if (uncited.length) {
      const shown = uncited.slice(0, 5).join('; ');
      const label = check ? 'error' : 'warning';
      console.log(`${t.short}: ${label}: ${uncited.length} phases have no date claims (${shown}${uncited.length > 5 ? '; …' : ''})`);
      if (check) process.exitCode = 1;
    }
    if (!check) importance(t);
  } finally {
    if (check) writeFileSync(t.source, before);
  }
}

const targets = (n: string | undefined) => (n === 'all' ? SOURCE_TIMELINES : [sourceTimeline(n)]);

try {
  switch (command) {
    case 'build':
      targets(name).forEach(build);
      break;
    case 'importance':
      targets(name).forEach(importance);
      break;
    case 'format':
      for (const t of targets(name)) {
        writeSource(t.source, readSource(t.source));
        console.log(`${t.short}: formatted ${t.source}`);
      }
      break;
    case 'row-order': {
      const r = spawnSync(process.execPath, ['scripts/row-order.ts', sourceTimeline(name).compiled, ...rest], { stdio: 'inherit' });
      process.exitCode = r.status ?? 1;
      break;
    }
    case 'run-all':
      runAll(sourceTimeline(name), rest.includes('--check'));
      break;
    case 'ids':
      idsCommand(process.argv.slice(3));
      break;
    case 'ai-flags': {
      // Kevin's rule: never cite a page flagged for AI-generated text
      const { titles, dump } = loadFlagged();
      const hits = flaggedCitations(titles);
      for (const h of hits.slice(0, 20)) console.log(`${h.file}: ${h.at}: "${h.title}" is flagged for AI-generated text`);
      if (hits.length > 20) console.log(`… and ${hits.length - 20} more`);
      console.log(`ai-flags: ${hits.length} links to flagged pages (list: ${titles.size} titles, dump ${dump})`);
      if (hits.length && process.argv.slice(3).includes('--check')) process.exitCode = 1;
      break;
    }
    case 'index':
      index();
      break;
    default:
      console.error(USAGE);
      process.exitCode = 1;
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
