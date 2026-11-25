import type { LayerPlugin } from '../layer.ts';
import { cursorLayer } from './cursor.ts';
import { onionLayer } from './onion.ts';

/** The layers every chart loads (plugin design §4): they use the same `api` as a plugin from the site's folder. */
export const BUNDLED_LAYERS: LayerPlugin[] = [onionLayer, cursorLayer];
