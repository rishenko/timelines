import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryGlyph, hasGlyph } from './CategoryGlyph.tsx';

// the twelve kinds of the shared `category` facet (pipelines/common/event_categories.py VOCAB)
const KINDS = ['rule', 'statehood', 'territory', 'place', 'disaster', 'conflict', 'unrest', 'diplomacy', 'society', 'science', 'archaeology', 'life'];

describe('CategoryGlyph', () => {
  it('has a glyph for each of the twelve kinds, hidden from screen readers', () => {
    for (const k of KINDS) {
      expect(hasGlyph(k), k).toBe(true);
      const svg = renderToStaticMarkup(<CategoryGlyph kind={k} />);
      expect(svg, k).toContain('aria-hidden="true"');
      expect(svg, k).toContain(`data-kind="${k}"`);
    }
  });

  it('draws each kind with its own shape', () => {
    const drawn = KINDS.map((k) => renderToStaticMarkup(<CategoryGlyph kind={k} />).replace(/data-kind="[^"]*"/, ''));
    expect(new Set(drawn).size).toBe(KINDS.length);
  });

  it('draws nothing for a kind a reader\'s own timeline added', () => {
    expect(hasGlyph('invented')).toBe(false);
    expect(renderToStaticMarkup(<CategoryGlyph kind="invented" />)).toBe('');
  });
});
