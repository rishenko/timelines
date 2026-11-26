// What a failed stage of the regen route said: the last lines of its stdout, indented under the FAILED line (a stage that stops says why on
// stdout: reign rules prints "no recorded rulers inputs found"; its stderr is already passed through).
export function stdoutTail(out: string | null | undefined, lines = 15): string {
  return (out ?? '').trimEnd().split('\n').filter(Boolean).slice(-lines).map((l) => `      ${l}`).join('\n');
}
