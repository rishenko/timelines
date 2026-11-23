import { describe, expect, it } from 'vitest';
import { checkPlugin, pluginUrl, PLUGIN_API } from './api.ts';

const BASE = 'https://example.github.io/timelines/?timeline=ancient-classical';

describe('pluginUrl: only .js files in the site’s own plugins/ folder', () => {
  it.each([
    ['plugins/centuries.js', 'https://example.github.io/timelines/plugins/centuries.js'],
    ['/plugins/centuries.js', 'https://example.github.io/timelines/plugins/centuries.js'],
    ['plugins/sub/view.js', 'https://example.github.io/timelines/plugins/sub/view.js'],
  ])('%s loads', (param, href) => {
    expect(pluginUrl(param, BASE)?.href).toBe(href);
  });

  it.each([
    ['another site', 'https://elsewhere.example/plugins/x.js'],
    ['a protocol-relative link', '//elsewhere.example/plugins/x.js'],
    ['a step out of the folder', 'plugins/../assets/index.js'],
    ['an encoded step out', 'plugins/%2e%2e/x.js'],
    ['a file beside the app', 'x.js'],
    ['a query string', 'plugins/x.js?v=2'],
    ['a fragment', 'plugins/x.js#y'],
    ['not a .js file', 'plugins/x.css'],
    ['a javascript: link', 'javascript:alert(1)'],
    ['a data: link', 'data:text/javascript,export default {}'],
    ['nothing', ''],
  ])('%s is refused', (_, param) => {
    expect(pluginUrl(param, BASE)).toBeNull();
  });

  it('is null with no parameter', () => {
    expect(pluginUrl(null, BASE)).toBeNull();
  });
});

describe('checkPlugin', () => {
  const ok = { id: 'x', name: 'X', apiVersion: PLUGIN_API, schema: [5, 8], mount: () => ({ update() {}, unmount() {} }) };

  it('accepts a plugin that fits', () => {
    expect(checkPlugin(ok, 7)).toBeNull();
  });
  it.each([
    ['no export', undefined, /not a view plugin/],
    ['no mount', { ...ok, mount: undefined }, /not a view plugin/],
    ['another API version', { ...ok, apiVersion: PLUGIN_API + 1 }, /plugin API 2, this app speaks 1/],
    ['no schema range', { ...ok, schema: undefined }, /no data schema range/],
    ['a schema too new', { ...ok, schema: [8, 9] }, /reads data schema 8–9, this timeline is schema 7/],
    ['a schema too old', { ...ok, schema: [3, 6] }, /reads data schema 3–6/],
  ])('refuses %s', (_, p, why) => {
    expect(checkPlugin(p, 7)).toMatch(why);
  });
});
