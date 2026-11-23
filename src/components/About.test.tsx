// @vitest-environment jsdom
// About this data: the page's claims, the way back to the timeline, and the footer's link to it.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { About, backUrl } from './About.tsx';
import { Credits } from './Credits.tsx';
import { Boot } from '../Boot.tsx';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('About this data', () => {
  it('covers method, the AI-flag rule, licences and how to report or cite', () => {
    render(<About search="?timeline=medieval&page=about" pathname="/" />);
    expect(screen.getByRole('heading', { level: 1, name: 'About this data' })).toBeTruthy();
    for (const h of ['Method', 'Pages we don’t use', 'Known gaps', 'Licences', 'Report a problem or cite this'])
      expect(screen.getByRole('heading', { name: h })).toBeTruthy();
    expect(screen.getByText(/flagged for AI-generated text/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeTruthy();
    expect(screen.getByText(/Data version \S+.*the commit this site was built from/)).toBeTruthy();
  });

  it('links back to the timeline it was opened from', () => {
    expect(backUrl('?timeline=medieval&page=about&zoom=50', '/timelines/')).toBe('/timelines/?timeline=medieval&zoom=50');
    expect(backUrl('?page=about', '/')).toBe('/');
    render(<About search="?timeline=medieval&page=about" pathname="/" />);
    expect(screen.getByRole('link', { name: /Back to the timeline/ }).getAttribute('href')).toBe('/?timeline=medieval');
  });

  it('opens from the footer, with or without a credits note', () => {
    window.history.replaceState(null, '', '/?timeline=medieval&zoom=50');
    const { unmount } = render(<Credits text="Some credits" />);
    expect(screen.getByRole('link', { name: 'About this data' }).getAttribute('href')).toBe('/?timeline=medieval&zoom=50&page=about');
    unmount();
    render(<Credits />);
    expect(screen.getByRole('link', { name: 'About this data' })).toBeTruthy();
  });

  it('opens at ?page=about without loading a timeline', () => {
    window.history.replaceState(null, '', '/?page=about');
    const asked: string[] = [];
    render(<Boot fetchImpl={(async (u: string) => (asked.push(String(u)), { ok: false, status: 404 })) as never} />);
    expect(screen.getByRole('heading', { name: 'About this data' })).toBeTruthy();
    expect(asked).toEqual([]);
  });
});
