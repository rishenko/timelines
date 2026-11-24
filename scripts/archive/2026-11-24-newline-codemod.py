# DONE (2026-11-24, PR #192): applied to pipelines/. Kept as a template: rerun it on new pipeline code, then prove
# the result with 2026-11-24-only-inserts.py. Run from the repo root with -X utf8.
"""Add newline='\n' to text-mode WRITE calls, so Windows writes LF like macOS/Linux (no-op there). Derived from 2026-11-24-utf8-codemod.py.

Targets (only when no encoding= is given):
  open(...)                       mode absent, or a literal mode without 'b'
  gzip/bz2/lzma.open(...)         literal mode containing 't'
  <x>.read_text() / .write_text() Path methods
  subprocess.run/check_output/Popen/check_call with text=True or universal_newlines=True
Calls whose mode is not a literal are reported, not changed.
Usage: python utf8_codemod.py ROOT [--apply]
"""
import ast, sys, pathlib

ROOT = pathlib.Path(sys.argv[1]); APPLY = '--apply' in sys.argv
SUB = {'run', 'check_output', 'Popen', 'check_call', 'call'}

def kw(call, name):
    return next((k for k in call.keywords if k.arg == name), None)

def literal_mode(call, pos):
    m = kw(call, 'mode') or (call.args[pos] if len(call.args) > pos else None)
    if m is None: return ''
    if isinstance(m, ast.Constant) and isinstance(m.value, str): return m.value
    return None  # not a literal

def target(call):
    f = call.func
    if kw(call, 'newline') or any(k.arg is None for k in call.keywords): return None
    wr = lambda m: m is not None and 'b' not in m and any(c in m for c in 'wax+')
    if isinstance(f, ast.Name) and f.id == 'open':
        m = literal_mode(call, 1)
        if m is None: return 'nonliteral'
        return 'open' if wr(m) else None
    if isinstance(f, ast.Attribute):
        base = f.value.id if isinstance(f.value, ast.Name) else None
        if f.attr == 'open' and base in ('gzip', 'bz2', 'lzma'):
            m = literal_mode(call, 1)
            if m is None: return 'nonliteral'
            return 'zopen' if (wr(m) and 't' in m) else None
        if f.attr == 'fdopen' and base == 'os':
            m = literal_mode(call, 1)
            return 'fdopen' if wr(m) else None
        if f.attr == 'write_text': return 'write_text'
    return None

total = 0; report = []
for path in sorted(ROOT.rglob('*.py')):
    if '.venv' in path.parts: continue
    src = path.read_text(encoding='utf-8')
    lines = src.splitlines(keepends=True)
    offs = [0]
    for l in lines: offs.append(offs[-1] + len(l.encode('utf-8')))
    data = src.encode('utf-8')
    edits = []
    for node in ast.walk(ast.parse(src)):
        if not isinstance(node, ast.Call): continue
        t = target(node)
        if t == 'nonliteral':
            report.append(f'{path.relative_to(ROOT)}:{node.lineno}: mode not a literal, left alone'); continue
        if not t: continue
        end = offs[node.end_lineno - 1] + node.end_col_offset - 1  # byte index of the closing ')'
        assert data[end:end + 1] == b')', (path, node.lineno)
        # find the last non-space byte before ')' to decide on the separator
        i = end - 1
        while data[i:i + 1] in (b' ', b'\n', b'\r', b'\t'): i -= 1
        prev = data[i:i + 1]
        if prev == b'(': ins, at = b"newline='\\n'", end
        elif prev == b',': ins, at = b" newline='\\n',", i + 1
        else: ins, at = b", newline='\\n'", i + 1
        edits.append((at, ins, node.lineno, t))
    if not edits: continue
    total += len(edits)
    for at, ins, ln, t in sorted(edits, reverse=True):
        data = data[:at] + ins + data[at:]
    new = data.decode('utf-8'); ast.parse(new)
    print(f'{path.relative_to(ROOT)}: {len(edits)} ({", ".join(sorted({e[3] for e in edits}))})')
    if APPLY: path.write_bytes(data)
print(f'TOTAL {total} edits'); print('\n'.join(report))
