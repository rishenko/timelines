import { describe, expect, it } from 'vitest';
import { groups, normalize } from './perf-summary.ts';

const row = (label: string, started: string | undefined, run: number, step: string, paintMs = 1) => ({ label, profile: 'desktop', timeline: 'm', started, run, step, paintMs });

describe('perf summary', () => {
  it('splits tables by label, so A and B rounds in one file stay apart', () => {
    const g = groups([row('main-r1', 's1', 0, 'load'), row('head-r1', 's2', 0, 'load'), row('main-r2', 's3', 0, 'load')]);
    expect(g.map((x) => x.label)).toEqual(['main-r1', 'head-r1', 'main-r2']);
  });

  it('counts repeated --runs 1 calls as separate runs, and keeps their zoom steps', () => {
    const rows = [row('b', 's1', 0, 'zoom 1y'), row('b', 's1', 0, 'zoom back to default'), row('b', 's2', 0, 'zoom 1y'), row('b', 's2', 0, 'zoom back to default')];
    const [g] = groups(rows);
    expect(g.runs).toBe(2);
    expect(g.rows.map((r) => r.step)).toEqual(['zoom 1y', 'zoom back to default', 'zoom 1y', 'zoom back to default']);
  });

  it('keeps a repeated step as it is in newer files', () => {
    const rows = normalize([row('b', 's1', 0, 'zoom 1y'), row('b', 's1', 0, 'zoom 1y')]);
    expect(rows.map((r) => r.step)).toEqual(['zoom 1y', 'zoom 1y']);
  });

  it('reads older files: no started, a repeated zoom step within a run becomes zoom back to default, load-detail dropped', () => {
    const rows = normalize([row('', undefined, 0, 'load-detail'), row('', undefined, 0, 'zoom 1y'), row('', undefined, 0, 'zoom 1y'), row('', undefined, 1, 'zoom 1y')]);
    expect(rows.map((r) => `${r.run} ${r.step}`)).toEqual(['0 zoom 1y', '0 zoom back to default', '1 zoom 1y']);
    expect(groups(rows)[0].runs).toBe(2);
  });
});
