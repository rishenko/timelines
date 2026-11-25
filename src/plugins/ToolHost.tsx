import { useLayoutEffect, useRef, useState } from 'react';
import { useCommands } from '../commands/CommandsContext.ts';
import { keyOf } from '../commands/registry.ts';
import { useChartApis } from './chartApi.ts';
import type { ToolApi, ToolPlugin } from './tool.ts';

/**
 * The tool host (plugin design §3): one toolbar button per tool, named for it, and one panel under it at a time. The
 * panel mounts the tool when it opens and unmounts it when it closes. Escape in the panel closes it and returns focus
 * to the button.
 */
export function ToolHost({ tools }: { tools: ToolPlugin[] }) {
  const commands = useCommands();
  const charts = useChartApis();
  const [open, setOpen] = useState<string | null>(null);
  const [api] = useState<ToolApi>(() => ({
    commands: {
      list: () => commands.list(),
      bind: (id, key) => commands.bind(id, key),
      reset: (id) => commands.reset(id),
      keyOf,
      notices: () => commands.notices(),
      subscribe: (fn) => commands.subscribe(fn),
    },
    chart: () => charts.get(),
    onChart: (fn) => charts.subscribe(fn),
  }));
  const body = useRef<HTMLDivElement>(null);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const tool = tools.find((t) => t.id === open);
  useLayoutEffect(() => (tool && body.current ? tool.tool.mount(body.current, api) : undefined), [tool, api]);
  const close = () => {
    buttons.current[open!]?.focus();
    setOpen(null);
  };
  return (
    <div className="tool-host">
      {tools.map((t) => (
        <button key={t.id} ref={(b) => void (buttons.current[t.id] = b)} className={open === t.id ? 'on' : ''} aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
          {t.name}
        </button>
      ))}
      {tool && (
        // Escape from anywhere in the panel closes it (a key the tool used, as when waiting for a key, is left alone)
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <section className="tool-panel" aria-label={tool.name} onKeyDown={(e) => e.key === 'Escape' && !e.defaultPrevented && close()}>
          <header>
            <h2>{tool.name}</h2>
            <button className="icon" onClick={close} aria-label={`Close ${tool.name}`} title={`Close ${tool.name}`}>
              ✕
            </button>
          </header>
          <div ref={body} />
        </section>
      )}
    </div>
  );
}
