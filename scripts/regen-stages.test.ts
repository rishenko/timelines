// The stage manifest is only worth having if it stays true: order, ownership and the output roots (scripts/regen-stages.ts).
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { STAGES } from './regen-stages.ts';

const names = STAGES.map((s) => s.name);
const ROOTS = ['data-src/', 'public/timelines/', 'docs/', 'pipelines/v2/emitted/', 'pipelines/out/'];
const reaches = (from: string, to: string, seen = new Set<string>()): boolean => {
  if (from === to) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  return (STAGES.find((s) => s.name === from)?.needs ?? []).some((n) => reaches(n, to, seen));
};

describe('regen stages', () => {
  it('has unique names', () => expect(new Set(names).size).toBe(names.length));
  it('lists every stage after the stages it needs (the route runs in list order)', () => {
    STAGES.forEach((s, i) => s.needs.forEach((n) => expect(names.indexOf(n), `${s.name} needs ${n}`).toBeLessThan(i)));
    STAGES.forEach((s) => s.needs.forEach((n) => expect(names, `${s.name} needs an unknown stage ${n}`).toContain(n)));
  });
  it('writes only inside the route output roots', () => {
    for (const s of STAGES) for (const f of s.outs) expect(ROOTS.some((r) => f.startsWith(r)), `${s.name}: ${f}`).toBe(true);
  });
  it('orders two stages that write the same file (one needs the other, directly or not)', () => {
    const writers = new Map<string, string[]>();
    for (const s of STAGES) for (const f of s.outs) writers.set(f, [...(writers.get(f) ?? []), s.name]);
    for (const [f, ws] of writers) for (let i = 1; i < ws.length; i++) expect(reaches(ws[i], ws[i - 1]), `${f}: ${ws[i - 1]} then ${ws[i]}`).toBe(true);
  });
  it('declares the hidden inputs (the previous compile; the pinned Modern seam)', () => {
    expect(STAGES.find((s) => s.name === 'medieval')?.reads.some((r) => r.startsWith('git:'))).toBe(true);
    expect(STAGES.find((s) => s.name === 'emit disasters')?.reads.length).toBeGreaterThan(0);
  });
  it('names checks that exist, and gates only after the stage that makes what they read', () => {
    for (const s of STAGES) for (const c of s.checks ?? []) expect(existsSync(c.cmd.args[0]), `${s.name}: ${c.name}`).toBe(true);
    expect(STAGES.at(-1)?.checks?.some((c) => c.mode === 'gate')).toBe(true);
  });
  it('has no pc stage run by the Mac route yet', () => expect(STAGES.filter((s) => s.host === 'pc')).toEqual([]));
});
