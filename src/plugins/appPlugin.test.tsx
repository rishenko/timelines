// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderApp } from '../test/app.tsx';

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  Element.prototype.scrollTo ??= function () {};
  Element.prototype.scrollIntoView ??= function () {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as never;
});
beforeEach(() => localStorage.setItem('timelines:legend-seen', '1'));
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('view plugins in the app', () => {
  it.each([
    ['another site', 'https://elsewhere.example/plugins/x.js'],
    ['a path out of the folder', 'plugins/../assets/x.js'],
  ])('a link naming a plugin from %s is refused, with a notice and no extra view', async (_, at) => {
    renderApp(`timeline=ancient-classical&plugin=${encodeURIComponent(at)}`);
    expect((await screen.findAllByText(/names a view plugin from outside this site's plugins folder/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Centuries' })).toBeNull();
  });

  it('a link with no plugin shows no notice', () => {
    renderApp('timeline=ancient-classical');
    expect(screen.queryByText(/view plugin/)).toBeNull();
  });
});
