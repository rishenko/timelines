import { useEffect, useRef, useState, type ComponentProps, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { PrintPages } from '../print/PrintView.tsx';
import { exportImage } from '../print/export.ts';

type PageProps = Omit<ComponentProps<typeof PrintPages>, 'from' | 'to' | 'rows' | 'figure'>;
type ViewNow = { from: number; to: number; rows: ReadonlySet<string> | undefined };

/**
 * Print and Export: the view as it is on screen: the years in view (the chart puts them on its scroller), and the rows
 * whose lane is on screen. Print mounts the print layer just before the browser lays out its page (`printing`, which
 * App renders); Export draws the same view offscreen and downloads it, then calls `onSaved`.
 */
export function usePrintExport(page: PageProps, title: string, increment: number, centerRef: RefObject<number>, onSaved: (kind: 'png' | 'svg') => void) {
  const viewNow = (): ViewNow => {
    const el = document.querySelector<HTMLElement>('.tl-scroller');
    const scroller = el?.getBoundingClientRect();
    const rows = scroller
      ? new Set(
          [...document.querySelectorAll<HTMLElement>('.tl-lane[data-lane]:not(.thin)')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.bottom > scroller.top && r.top < scroller.bottom;
            })
            .map((el) => el.dataset.lane!),
        )
      : undefined;
    const [from, to] = (el?.dataset.viewYears ?? '').split(',').map(Number);
    if (Number.isFinite(from) && Number.isFinite(to) && to > from) return { from, to, rows };
    // (no chart drawn yet) about a screen around the centre
    const half = ((window.innerWidth - 220) / 80) * increment * 0.5;
    return { from: centerRef.current - half, to: centerRef.current + half, rows };
  };
  const [printing, setPrinting] = useState<ViewNow | null>(null);
  const viewNowRef = useRef(viewNow);
  useEffect(() => {
    viewNowRef.current = viewNow;
  });
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(viewNowRef.current()));
    const after = () => setPrinting(null);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
  const onExport = (kind: 'png' | 'svg') => {
    const host = document.createElement('div');
    const root = createRoot(host);
    flushSync(() => root.render(<PrintPages {...page} {...viewNow()} figure />));
    const svg = host.querySelector('svg');
    if (svg) void exportImage(svg, title, kind).then(() => onSaved(kind));
    root.unmount();
  };
  return { printing, onExport };
}
