// Turns period rows into phases (Track.phases) on one row: a line where each period begins and its name along the
// top of the row, so the periods stay named even when the row or its region is collapsed. Used by
// scripts/additions/phases.ts (Ancient) and scripts/classical/phases.ts (Classical).
//
// For each conversion:
//   - Each period row becomes a phase with the row's name (or the name given) and its lifespan, date claims included,
//     unchanged.
//   - The target row is either a civilization row that already holds the periods as sub-rows (Assyria), which keeps
//     its own lifespan, or a new row placed before the first period row (Pharaonic Egypt). A row without a lifespan
//     gets one from the first period's start to the last period's end, with their claims; so list the periods with
//     the earliest start first and the latest end last.
//   - Events on a period row move to the target row (an event already on it isn't doubled).
//   - The period rows are removed, and dropped from meta.collapsed, as is the target row once it has no sub-rows.
//
// Re-runnable. An earlier script may still create some period rows or put events on them; the conversion runs after
// it and moves them again. When the period rows are gone, the phases already on the row stay as they are.

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Conversion {
  /** The row that takes the periods over. name/color/parent are needed only to create it. */
  row: { id: string; name?: string; color?: string; parent?: string };
  /** Period row ids; the first must start earliest and the last end latest. */
  periods: string[];
  /** Phase names that differ from the period rows' names, by period id. */
  names?: Record<string, string>;
}

export function convertToPhases(ed: { data: Json; track: (t: Json, where?: { before?: string }) => void }, list: Conversion[]) {
  for (const { row, periods, names = {} } of list) {
    const tracks: Json[] = ed.data.tracks;
    const periodRows = periods.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);
    const existing = tracks.find((t) => t.id === row.id);

    if (periodRows.length) {
      if (periodRows.length !== periods.length) throw new Error(`${row.id}: only some period rows exist; fix by hand`);
      for (const p of periodRows) {
        if (!p.span) throw new Error(`${p.id} has no lifespan to make a phase from`);
        if (tracks.some((t) => t.parent === p.id)) throw new Error(`${p.id} has sub-rows; move them first`);
      }
      const phases = periodRows.map((p) => ({ name: names[p.id] ?? p.name, ...p.span }));
      let span = existing?.span;
      if (!span) {
        const first = periodRows[0].span;
        const last = periodRows[periodRows.length - 1].span;
        span = { start: first.start, end: last.end };
        if (first.circa || last.circa) span.circa = true;
        if (first.startDates) span.startDates = first.startDates;
        if (last.endDates) span.endDates = last.endDates;
      }
      if (existing) {
        Object.assign(existing, row, { span, phases });
      } else {
        if (!row.name || !row.color || !row.parent) throw new Error(`${row.id}: a new row needs a name, colour and parent`);
        ed.track({ ...row, span, phases }, { before: periods[0] });
      }
      ed.data.tracks = ed.data.tracks.filter((x: Json) => !periods.includes(x.id));
      console.log(`${row.id}: ${periodRows.length} period rows → phases`);
    } else if (!existing) {
      throw new Error(`${row.id}: neither the row nor its period rows exist`);
    } else {
      Object.assign(existing, row); // already converted: keep the phases
    }

    const leaf = !ed.data.tracks.some((t: Json) => t.parent === row.id);
    ed.data.meta.collapsed = (ed.data.meta.collapsed ?? []).filter((id: string) => !periods.includes(id) && !(leaf && id === row.id));

    for (const e of ed.data.events as Json[]) {
      if (!e.tracks.some((id: string) => periods.includes(id))) continue;
      e.tracks = [...new Set(e.tracks.map((id: string) => (periods.includes(id) ? row.id : id)))];
    }
  }
}
