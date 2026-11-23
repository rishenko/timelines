// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginView } from './PluginView.tsx';
import { PLUGIN_API, type ViewContext, type ViewPlugin } from './api.ts';
import { plainTimeline } from '../test/fixtures.ts';

const ctx = (selectedId: string | null = null): ViewContext =>
  Object.freeze({
    apiVersion: PLUGIN_API,
    data: plainTimeline(),
    events: [],
    spans: new Map(),
    selectedId,
    formatYear: String,
    select: () => {},
    showOnTimeline: () => {},
  });

const pluginWith = (mount: ViewPlugin['mount']): ViewPlugin => ({ id: 't', name: 'Test view', apiVersion: PLUGIN_API, schema: [1, 99], mount });

describe('PluginView', () => {
  it('mounts once, passes each new snapshot to update, and unmounts', () => {
    const update = vi.fn();
    const unmount = vi.fn();
    const mount = vi.fn((el: HTMLElement) => ((el.textContent = 'drawn'), { update, unmount }));
    const p = pluginWith(mount);
    const r = render(<PluginView plugin={p} ctx={ctx()} />);
    expect(screen.getByRole('region', { name: 'Test view' }).textContent).toContain('drawn');
    r.rerender(<PluginView plugin={p} ctx={ctx('e1')} />);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ selectedId: 'e1' }));
    r.unmount();
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('shows a plugin’s error in a line instead of failing the app', () => {
    const p = pluginWith(() => {
      throw new Error('boom');
    });
    render(<PluginView plugin={p} ctx={ctx()} />);
    expect(screen.getByText(/The Test view view stopped: Error: boom/)).toBeTruthy();
  });

  it('survives a plugin that fails to clean up', () => {
    const p = pluginWith(() => ({
      update() {},
      unmount() {
        throw new Error('no');
      },
    }));
    const r = render(<PluginView plugin={p} ctx={ctx()} />);
    expect(() => r.unmount()).not.toThrow();
  });
});
