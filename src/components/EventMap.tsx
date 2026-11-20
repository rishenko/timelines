import { useEffect, useMemo, useState } from 'react';
import type { Dataset } from '../types.ts';
import { formatYear } from '../lib/calendar.ts';
import { safeUrl } from '../lib/urls.ts';
import { bordersIn, isWikimediaImage, loadMap, mapYear, ringsBox, ringsPath, rowsAt, viewAround, type MapData } from '../map/mapData.ts';

interface Props {
  /** The timeline's map file (absolute URL). */
  url: string;
  /** The event's rows. */
  tracks: string[];
  /** The event's years, as plotted. */
  start: number;
  end?: number;
  data: Dataset;
}

const ASPECT = 4 / 3;

/**
 * The map in an event's details: the land, every row's borders in the event's year, and the event's own rows
 * picked out in their colours, zoomed to them. The year is the first of the event's range in which one of its rows
 * has borders (else its start). A row without borders that year shows its location (a pin) and, below the map, its
 * map image from Wikipedia. Nothing is drawn for an event whose rows have no map data at all.
 */
export function EventMap({ url, tracks, start, end, data }: Props) {
  const [map, setMap] = useState<MapData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadMap(url).then(
      (m) => live && setMap(m),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [url]);

  const landPath = useMemo(() => (map ? ringsPath(map.land) : ''), [map]);
  if (failed) return <p className="muted small">The map couldn't be loaded.</p>;
  if (!map) return null;

  const year = mapYear(map, tracks, start, end);
  const own = rowsAt(map, tracks, year);
  const known = own.filter((r) => r.borders.length || r.point || r.image);
  if (!known.length) return null;
  const cal = data.meta.calendar;
  const trackOf = (id: string) => data.tracks.find((t) => t.id === id);
  const drawn = own.filter((r) => r.borders.length || r.point);

  let svg = null;
  if (drawn.length) {
    let box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const r of drawn) {
      for (const b of r.borders) box = ringsBox(map.shapes[b.shape], box);
      if (r.point) box = ringsBox([[r.point[0], r.point[1]]], box);
    }
    // a pin alone needs a wider view to show where it is
    const { box: [w, s, e, n], k } = viewAround(box, ASPECT, drawn.some((r) => r.borders.length) ? 14 : 55);
    const others = Object.entries(map.rows).filter(([id]) => !tracks.includes(id)).flatMap(([, row]) => bordersIn(row, year));
    // a map pin with its tip on the location: head of radius `pr`, centre 1.6 radii above the tip
    const pr = (n - s) * 0.026;
    const pin = (x: number, y: number) =>
      `M${x},${y}L${x - pr * 0.8},${y - pr * 1}A${pr},${pr} 0 1 1 ${x + pr * 0.8},${y - pr * 1}Z`;
    const names = drawn.map((r) => trackOf(r.id)?.name ?? r.id).join(', ');
    svg = (
      <svg
        className="event-map-svg"
        viewBox={`${w * k} ${-n} ${(e - w) * k} ${n - s}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Map of ${names} in ${formatYear(year, cal)}`}
      >
        <rect className="sea" x={w * k} y={-n} width={(e - w) * k} height={n - s} />
        <g transform={`scale(${k},-1)`}>
          <path className="land" d={landPath} fillRule="evenodd" vectorEffect="non-scaling-stroke" />
          {others.map((b, i) => (
            <path key={i} className="other" d={ringsPath(map.shapes[b.shape])} fillRule="evenodd" vectorEffect="non-scaling-stroke">
              <title>{b.name}</title>
            </path>
          ))}
          {drawn.flatMap((r) =>
            r.borders.map((b, i) => (
              <path
                key={`${r.id}-${i}`}
                className="own"
                style={{ fill: trackOf(r.id)?.color }}
                d={ringsPath(map.shapes[b.shape])}
                fillRule="evenodd"
                vectorEffect="non-scaling-stroke"
              >
                <title>{b.name}</title>
              </path>
            )),
          )}
        </g>
        {drawn.map(
          (r) =>
            r.point && (
              <g key={r.id} className="own-point" style={{ fill: trackOf(r.id)?.color }}>
                <title>{trackOf(r.id)?.name}</title>
                <path d={pin(r.point[0] * k, -r.point[1])} />
                <circle className="pin-hole" cx={r.point[0] * k} cy={-r.point[1] - pr * 1.6} r={pr * 0.38} />
              </g>
            ),
        )}
      </svg>
    );
  }

  return (
    <section className="event-map">
      <h3>
        Map, {formatYear(year, cal)}
        {year !== start && <span className="muted"> (first year in the event's range with borders)</span>}
      </h3>
      {svg}
      <ul className="event-map-notes small">
        {known.map((r) => {
          const name = trackOf(r.id)?.name ?? r.id;
          return (
            <li key={r.id}>
              <strong>{name}</strong>:{' '}
              {r.borders.length
                ? `borders as ${r.borders.map((b) => b.name).join(', ')}`
                : r.point
                  ? 'no borders for this year; the pin is its location on Wikipedia'
                  : r.image
                    ? 'no borders or location for this year; see its Wikipedia map below'
                    : 'no borders or location for this year'}
            </li>
          );
        })}
      </ul>
      {known.map((r) => {
        const img = r.image;
        if (!img || !isWikimediaImage(img.thumb)) return null;
        const name = trackOf(r.id)?.name ?? r.id;
        const page = safeUrl(img.descriptionUrl);
        return (
          <figure key={`img-${r.id}`} className="event-map-image">
            <img src={img.thumb} width={img.width} height={img.height} alt={img.caption ?? `Map of ${name}`} loading="lazy" />
            <figcaption className="small">
              {img.caption ?? `Map of ${name}`} <span className="muted">(not dated to this year)</span>
              <br />
              <span className="muted">
                Wikipedia map:{' '}
                {page ? (
                  <a href={page} target="_blank" rel="noreferrer">
                    {img.artist ?? img.file}
                  </a>
                ) : (
                  (img.artist ?? img.file)
                )}
                {img.license && `, ${img.license}`}
              </span>
            </figcaption>
          </figure>
        );
      })}
      <p className="muted small event-map-credits">
        {map.credits.map((c, i) => {
          const href = safeUrl(c.url);
          return (
            <span key={i}>
              {i > 0 && ' · '}
              {href ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {c.text}
                </a>
              ) : (
                c.text
              )}
            </span>
          );
        })}
      </p>
    </section>
  );
}
