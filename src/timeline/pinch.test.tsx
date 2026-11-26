// @vitest-environment jsdom
// Touch pinch (gestures.ts usePinchSteps): two fingers spreading past 1.6× their starting gap take a step finer, closing
// under 0.62× a step coarser; each step measures from the new gap, and a lifted finger ends the pinch.
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { usePinchSteps } from './gestures.ts';

afterEach(cleanup);

function Pad({ onStep }: { onStep: (dir: 1 | -1) => void }) {
  return <div data-testid="pad" {...usePinchSteps(onStep)} />;
}
const fingers = (gap: number) => ({ touches: [{ clientX: 0, clientY: 0 }, { clientX: gap, clientY: 0 }] });

it('steps once per 1.6× spread or 0.62× close, from the gap after each step, and only with two fingers', () => {
  const onStep = vi.fn();
  const { getByTestId } = render(<Pad onStep={onStep} />);
  const pad = getByTestId('pad');
  fireEvent.touchStart(pad, fingers(100));
  fireEvent.touchMove(pad, fingers(150));
  expect(onStep).not.toHaveBeenCalled();
  fireEvent.touchMove(pad, fingers(170));
  fireEvent.touchMove(pad, fingers(200)); // 200/170 < 1.6: no second step yet
  expect(onStep.mock.calls).toEqual([[1]]);
  fireEvent.touchMove(pad, fingers(100)); // 100/170 < 0.62
  expect(onStep.mock.calls).toEqual([[1], [-1]]);
  fireEvent.touchEnd(pad, { touches: [{ clientX: 0, clientY: 0 }] });
  fireEvent.touchMove(pad, fingers(400));
  expect(onStep).toHaveBeenCalledTimes(2);
});
