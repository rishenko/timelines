import type { LayerPlugin } from '../layer.ts';
import { cursorLayer } from './cursor.ts';
import { onionLayer } from './onion.ts';
import type { ToolPlugin } from '../tool.ts';
import { bindingsTool } from './bindings.ts';

/** The layers every chart loads (plugin design §4): they use the same `api` as a plugin from the site's folder. */
export const BUNDLED_LAYERS: LayerPlugin[] = [onionLayer, cursorLayer];

/** The tools on the toolbar, each a button opening its panel (plugin design §3). */
export const BUNDLED_TOOLS: ToolPlugin[] = [bindingsTool];
