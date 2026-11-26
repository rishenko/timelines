// @vitest-environment jsdom
// Touch pinch (gestures.ts usePinchSteps): two fingers spreading past 1.6× their starting gap take a step finer, closing
// under 0.62× a step coarser; each step measures from the new gap, and a lifted finger ends the pinch.
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { pinchAnchor, usePinchSteps } from './gestures.ts';

afterEach(cleanup);

function Pad({ onStep }: { onStep: (dir: 1 | -1) => void }) {
  return <div data-testid="pad" {...usePinchSteps(onStep)} />;
}
const fingers = (gap: number) => ({ touches: [{ clientX: 0, clientY: 0 }, { clientX: gap, clientY: 0 }] });
// a scroller 1000 px wide at clientX 50, scrolled 300 px, with a 200 px label column; 1 px per year from year 0
const scroller = (scrollLeft = 300) => {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 1000 });
  el.getBoundingClientRect = () => ({ left: 50 }) as DOMRect;
  el.scrollLeft = scrollLeft;
  return el;
};

it('anchors on the year between the fingers, and where it sits on the time axis; over the labels, nothing', () => {
  const yearAt = (x: number) => x;
  // fingers at clientX 450: 400 px into the scroller, 200 px into the 800 px time axis, so year 300 + 200
  expect(pinchAnchor(scroller(), 200, yearAt, 450)).toEqual({ year: 500, at: 0.25 });
  expect(pinchAnchor(scroller(), 200, yearAt, 1050)).toEqual({ year: 1100, at: 1 });
  expect(pinchAnchor(scroller(), 200, yearAt, 120)).toBe(undefined);
  expect(pinchAnchor(null, 200, yearAt, 450)).toBe(undefined);
});

it('steps once per 1.6× spread or 0.62× close, from the gap after each step, and only with two fingers', () => {
  const onStep = vi.fn();
  const { getByTestId } = render(<Pad onStep={onStep} />);
  const pad = getByTestId('pad');
  fireEvent.touchStart(pad, fingers(100));
  fireEvent.touchMove(pad, fingers(150));
  expect(onStep).not.toHaveBeenCalled();
  fireEvent.touchMove(pad, fingers(170));
  fireEvent.touchMove(pad, fingers(200)); // 200/170 < 1.6: no second step yet
  expect(onStep.mock.calls).toEqual([[1, 85]]); // with the fingers' midpoint (0 and 170)
  fireEvent.touchMove(pad, fingers(100)); // 100/170 < 0.62
  expect(onStep.mock.calls).toEqual([[1, 85], [-1, 50]]);
  fireEvent.touchEnd(pad, { touches: [{ clientX: 0, clientY: 0 }] });
  fireEvent.touchMove(pad, fingers(400));
  expect(onStep).toHaveBeenCalledTimes(2);
});
