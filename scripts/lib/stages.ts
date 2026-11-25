// Where staged data lives (Workbench "2026-11-24 Timelines staged data pipeline design (light)", section 2): one job, the path.
//   <root>/<layer>/<stage>/<key>/   root = $TIMELINES_STAGES, else ~/data/stages (outside the repo, never in git)
// Without a key the path is the stage's `current` folder. Layers: L1 extracted tables (heavy ones are built on the PC), L2 curated tables.
import { homedir } from 'node:os';
import { join } from 'node:path';

export type Layer = 'L1' | 'L2';

export const stagesRoot = (env: NodeJS.ProcessEnv = process.env): string => env.TIMELINES_STAGES ?? join(homedir(), 'data', 'stages');

export function stagePath(layer: Layer, stage: string, key = 'current', env: NodeJS.ProcessEnv = process.env): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(stage)) throw new Error(`stage name must be lower-case words with hyphens: ${stage}`);
  if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error(`stage key has characters a folder name should not: ${key}`);
  return join(stagesRoot(env), layer, stage, key);
}
