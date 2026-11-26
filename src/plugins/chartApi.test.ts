import { expect, it } from 'vitest';
import { createChartApiStore } from './chartApi.ts';
import type { LayerApi } from './layer.ts';

const a = {} as LayerApi;
const b = {} as LayerApi;

it('tells listeners null before a new api, and nothing for the same one', () => {
  const store = createChartApiStore();
  const heard: (LayerApi | null)[] = [];
  store.subscribe((api) => heard.push(api));
  store.set(a);
  store.set(a);
  // a second chart publishing before the first one's cleanup ran
  store.set(b);
  store.set(null);
  expect(heard).toEqual([a, null, b, null]);
  expect(store.get()).toBe(null);
});
