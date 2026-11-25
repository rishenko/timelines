// The dump names the route reads (the Wikipedia and Wikidata dumps the generators pin in their settings), shared by regen.ts and stage-record.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function dumpNames(root: string): Record<string, string> {
  const wp = /TIMELINES_WP_DUMP', '([^']+)'/.exec(readFileSync(join(root, 'pipelines/common/settings.py'), 'utf8'))?.[1];
  const wd = /TIMELINES_WD_DUMP', '([^']+)'/.exec(readFileSync(join(root, 'pipelines/extract/wikidata.py'), 'utf8'))?.[1];
  return { wikipedia: wp ?? '?', wikidata: wd ?? '?' };
}
