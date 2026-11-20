// Proposes each row's Wikipedia article and Wikidata id, and records decisions in the plan.
//
//   node scripts/row-links.ts <timeline> [--decide <file.json>] [--accept-same]     <timeline>: ancient-classical
//
// For every row not yet decided in data-src/<short>-row-links.json (the plan; rows listed there are skipped), it
// asks the Wikipedia API for:
// - the page the row's lifespan cites, when its claims cite exactly one Wikipedia page ("cited");
// - otherwise the top search results for the row's name ("search").
// Each candidate comes with its Wikidata id and flags: a disambiguation page, a missing page, or an AI-generated-text
// template on the page (such pages are never used; see the sources rules in docs/development.md).
// Writes docs/<short>-row-links.md, the review list of rows still undecided. Decisions go into the plan:
// --decide <file.json>  { "<row id>": "Article title" | null, … }: looks each article up (redirects followed) and
//                       records it with its Wikidata id; refuses missing, disambiguation and AI-flagged pages
// --accept-same         records every unflagged proposal whose title plainly names the row
// The plan is applied to the data by `npm run data -- importance` and `run-all` (scripts/lib/row-links.ts).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sourceTimeline } from './lib/timelines.ts';
import { lookUp, pageUrl, planText, sameName, search, titleFromUrl, type PageInfo, type RowLinkPlan } from './lib/row-links.ts';

type Json = Record<string, any>;

{
  const [name, ...flags] = process.argv.slice(2);
  const t = sourceTimeline(name);
  const planPath = `data-src/${t.short}-row-links.json`;
  const plan: RowLinkPlan = existsSync(planPath) ? JSON.parse(readFileSync(planPath, 'utf8')) : {};
  const d = JSON.parse(readFileSync(t.compiled, 'utf8'));
  let changed = false;

  const decideAt = flags.indexOf('--decide');
  if (decideAt !== -1) {
    const decisions: Record<string, string | null> = JSON.parse(readFileSync(flags[decideAt + 1], 'utf8'));
    const ids = new Set(d.tracks.map((x: Json) => x.id));
    const pages = await lookUp([...new Set(Object.values(decisions).filter((x): x is string => !!x))]);
    for (const [id, page] of Object.entries(decisions)) {
      if (!ids.has(id)) throw new Error(`--decide: no row "${id}"`);
      if (page === null) plan[id] = null;
      else {
        const p = pages.get(page)!;
        if (p.missing || p.disambiguation || p.ai)
          throw new Error(`--decide: ${id} → "${page}" is ${p.missing ? 'missing' : p.disambiguation ? 'a disambiguation page' : `flagged (${p.ai!.join(', ')})`}`);
        plan[id] = { page: p.title, ...(p.wikidata ? { wikidata: p.wikidata } : {}) };
      }
    }
    changed = true;
    console.log(`${t.short}: recorded ${Object.keys(decisions).length} decisions`);
  }
  const sources: Record<string, Json> = d.sources;
  const parents = new Set(d.tracks.map((x: Json) => x.parent).filter(Boolean));

  const rows = (d.tracks as Json[]).filter((r) => !(r.id in plan));
  const cited = new Map<string, string>();
  for (const r of rows) {
    const claims = [...(r.span?.startDates ?? []), ...(r.span?.endDates ?? [])];
    const pages = new Set(
      claims.map((c: Json) => titleFromUrl(sources[c.source?.sourceKey]?.url ?? '')).filter((x): x is string => !!x),
    );
    if (pages.size === 1) cited.set(r.id, [...pages][0]);
  }
  console.log(`${t.short}: ${rows.length} rows to propose (${d.tracks.length - rows.length} already decided); ${cited.size} cite one page`);
  const citedInfo = await lookUp([...new Set(cited.values())]);

  const proposals: { row: Json; group: boolean; basis: 'cited' | 'search'; pick?: PageInfo; others: PageInfo[] }[] = [];
  for (const r of rows) {
    const c = cited.get(r.id);
    if (c) proposals.push({ row: r, group: parents.has(r.id), basis: 'cited', pick: citedInfo.get(c), others: [] });
    else {
      const found = await search(r.name.replace(/\(.*?\)/g, '').trim());
      const usable = found.filter((p) => !p.disambiguation && !p.ai);
      proposals.push({ row: r, group: parents.has(r.id), basis: 'search', pick: usable[0], others: found.filter((p) => p !== usable[0]) });
    }
  }

  const flag = (p?: PageInfo) =>
    !p ? 'nothing found' : [p.missing && 'missing', p.disambiguation && 'disambiguation', p.ai && `AI template: ${p.ai.join(', ')}`].filter(Boolean).join('; ');

  if (flags.includes('--accept-same')) {
    let n = 0;
    for (const p of proposals)
      if (p.pick && !flag(p.pick) && sameName(p.row.name, p.pick.title)) {
        plan[p.row.id] = { page: p.pick.title, ...(p.pick.wikidata ? { wikidata: p.pick.wikidata } : {}) };
        n++;
      }
    changed = true;
    console.log(`${t.short}: accepted ${n} same-name pages`);
  }
  if (changed) {
    writeFileSync(planPath, planText(plan, d.tracks));
    console.log(`${t.short}: wrote ${planPath} (${Object.keys(plan).length} rows decided)`);
  }
  const undecided = proposals.filter((p) => !(p.row.id in plan));
  const linkCell = (v: { page: string; wikidata?: string }) =>
    `[${v.page}](${pageUrl(v.page)})${v.wikidata ? ` · [${v.wikidata}](https://www.wikidata.org/wiki/${v.wikidata})` : ''}`;
  const md = [
    `# ${t.short}: row links`,
    '',
    `Each row's Wikipedia article and Wikidata id, as decided in \`${planPath}\` and applied to the data by`,
    '`npm run data -- importance` and `run-all`. Written by `node scripts/row-links.ts ' + t.short + '`; see',
    '`docs/data-format.md` (tracks: `url`, `ids`) and the rules in `docs/development.md` ("Row links").',
    '',
    `${Object.values(plan).filter(Boolean).length} rows linked, ${Object.values(plan).filter((v) => v === null).length} without a link, ${undecided.length} undecided.`,
    '',
    '## Without a link',
    '',
    ...(d.tracks as Json[]).filter((r) => plan[r.id] === null).map((r) => `- ${r.name} (\`${r.id}\`)`),
    '',
    '## Linked',
    '',
    '| Row | Article and Wikidata id |',
    '|---|---|',
    ...(d.tracks as Json[]).filter((r) => plan[r.id]).map((r) => `| ${r.name} (\`${r.id}\`) | ${linkCell(plan[r.id]!)} |`),
    '',
    ...(undecided.length
      ? [
          '## Undecided',
          '',
          'Proposed page (Wikidata id), basis, flags, and other search results.',
          '',
          '| Row | Group | Proposed page | Wikidata | Basis | Same name | Flags | Other results |',
          '|---|---|---|---|---|---|---|---|',
          ...undecided.map(
            (p) =>
              `| ${p.row.name} (\`${p.row.id}\`) | ${p.group ? 'yes' : ''} | ${p.pick ? `[${p.pick.title}](${pageUrl(p.pick.title)})${p.pick.description ? ` — ${p.pick.description}` : ''}` : ''} | ${p.pick?.wikidata ?? ''} | ${p.basis} | ${p.pick && sameName(p.row.name, p.pick.title) ? 'yes' : ''} | ${flag(p.pick)} | ${p.others.map((o) => `${o.title}${o.disambiguation ? ' (disambiguation)' : ''}${o.ai ? ' (AI template)' : ''}`).join('; ')} |`,
          ),
          '',
        ]
      : []),
  ].join('\n');
  const reviewPath = `docs/${t.short}-row-links.md`;
  writeFileSync(reviewPath, md);
  console.log(`${t.short}: wrote ${reviewPath}`);
  // machine-readable proposals for the review, next to the list
  mkdirSync('node_modules/.tmp', { recursive: true });
  writeFileSync(`node_modules/.tmp/${t.short}-row-links.json`, JSON.stringify(proposals.map((p) => ({ id: p.row.id, name: p.row.name, group: p.group, basis: p.basis, pick: p.pick, others: p.others })), null, 1));
}

