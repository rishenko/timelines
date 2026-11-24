/**
 * One small glyph per kind of event (the top-level categories), told apart by shape: colour already means the
 * row (WCAG 1.4.1). Drawn in the text colour, hidden from screen readers: the event's accessible name says its
 * category in words. Kinds a reader's own timeline adds have no glyph.
 */

/** The glyphs: Rulers a disc, Statehood a square, Territory a triangle, Cities and places a house, Wars and battles a
 * cross, Revolts a star, Diplomacy a ring, Religion, law and culture a hexagon, Archaeology a half-disc, Science and
 * technology a flask (a narrow neck on a wide base, so it doesn't read as Territory's triangle), Disasters a
 * lightning bolt (Kevin, 2026-11-23), Life and evolution a leaf (a pointed, curved body with a stalk, unlike the
 * hexagon, triangle and flask at 12 px). */
const SHAPES: Record<string, React.ReactNode> = {
  rule: <circle cx="6" cy="6" r="4.6" />,
  statehood: <rect x="1.6" y="1.6" width="8.8" height="8.8" />,
  territory: <path d="M6 1 11 10.5H1Z" />,
  place: <path d="M6 1.2 10.8 5v5.8H1.2V5Z" />,
  conflict: <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  unrest: <path d="m6 .8 1.5 3.4 3.7.3-2.8 2.4.9 3.6L6 8.6l-3.3 1.9.9-3.6L.8 4.5l3.7-.3Z" />,
  diplomacy: <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />,
  society: <path d="M6 .9 10.5 3.5v5L6 11.1 1.5 8.5v-5Z" />,
  archaeology: <path d="M1.2 8.5a4.8 4.8 0 0 1 9.6 0Z" />,
  science: <path d="M4.2 .8h3.6v1.4h-.7v2.5l3.9 5.8c.4.6 0 1.4-.7 1.4H1.7c-.7 0-1.1-.8-.7-1.4l3.9-5.8V2.2h-.7Z" />,
  disaster: <path d="M7.4.6 2 6.9h3.4l-1 4.5L10 5H6.5Z" />,
  life: <path d="M10.9 1.1C5.2.9 1.4 3.5 1.4 7c0 1.2.4 2.2 1.1 3L.9 11.3l.7.6 1.7-1.4c.7.4 1.5.6 2.3.6 3.4 0 5.6-3.3 5.3-10Z" />,
};

export const hasGlyph = (kind: string) => Object.hasOwn(SHAPES, kind);

export function CategoryGlyph({ kind }: { kind: string }) {
  if (!hasGlyph(kind)) return null;
  return (
    <svg className="cat-glyph" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false" data-kind={kind} fill="currentColor">
      {SHAPES[kind]}
    </svg>
  );
}
