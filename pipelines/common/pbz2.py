"""
Block-parallel reading of a single-stream .bz2 file with Python's own bz2 module: flat memory, every core.

Why: indexed_bzip2 holds about 80 MB of native memory per GiB it decompresses (2.0.1; close() frees it), so a pass over
the 1,723 GiB Wikidata JSON dump needs ~135 GB; its index cannot be built without the same growth. The plain bz2
module stays flat but runs on one core (~95 MiB/s, 5+ hours). This reads the same bytes at ~1.1-1.3 GiB/s on the PC.

How: a bzip2 stream is "BZh<level>", then blocks, each opening with the 48-bit magic 0x314159265359 at any bit offset
followed by the block's CRC, then the end-of-stream magic 0x177245385090 and the combined CRC. The main process finds
the block magics (bytes.find over the 8 bit shifts, checked against all 48 bits), groups them, and hands each group's
bit range to a worker. The worker cuts those bits out of the file, wraps them as a stand-alone stream (header + blocks +
end-of-stream magic + the group's combined CRC) and decompresses it with bz2, which checks every block's CRC.
A "magic" inside compressed data (2^-48 per bit, ~0.003 expected in the Wikidata dump) makes a group fail to decompress:
the main process then joins it with the next group and drops one candidate start at a time until the CRCs check.

    import pbz2
    for result, pos in pbz2.map_lines(path, parse, workers=30):   # parse(lines: bytes) runs in the workers
        ...                                                         # results in file order; pos: where to resume

`parse` gets whole lines only (each ends in b'\\n', except the file's last line if it has none). A line that spans two
groups is put together in the main process and passed to `parse` there. `pos` (a Position) is a resume point after
each group: map_lines(path, parse, start=pos) carries on from it with no re-read of the prefix.
Stdlib only, so it runs the same on macOS, Linux and Windows.
"""
import bz2
import multiprocessing as mp
import multiprocessing.util
import os
import threading
from collections import namedtuple

MAGIC = 0x314159265359   # block header
EOS = 0x177245385090     # end of stream
M48 = (1 << 48) - 1
GROUP = 64               # blocks per task (about 50 MB of output at level 9)
SCAN = 64 << 20          # compressed bytes read per scan step

# where a resume starts: the bit offset of the next group's first block, the decompressed bytes before it, and the
# partial line (bytes after the last newline so far) that the next group's first line completes
Position = namedtuple('Position', 'bit out carry')


def _patterns():
    """For each bit shift s (the magic starting s bits into a byte): the bytes the magic covers whole."""
    out = []
    for s in range(8):
        b = (MAGIC << (64 - 48 - s)).to_bytes(8, 'big')
        out.append((s, b[0:6] if s == 0 else b[1:6]))
    return out


PATTERNS = _patterns()


def header(path):
    """The stream's block-size level (b'1'..b'9' as an int byte); raises on anything but a bzip2 stream."""
    with open(path, 'rb') as f:
        h = f.read(4)
    if len(h) < 4 or h[:3] != b'BZh' or not 0x31 <= h[3] <= 0x39:
        raise ValueError(f'{path}: not a bzip2 stream')
    return h[3]


def eos_bit(path):
    """Bit offset of the end-of-stream magic. A single stream ends with it, the 32-bit combined CRC and < 8 bits of
    padding, so it sits 80 to 87 bits before the end of the file."""
    size = os.path.getsize(path)
    with open(path, 'rb') as f:
        f.seek(max(0, size - 16))
        tail = f.read()
    v, n = int.from_bytes(tail, 'big'), len(tail) * 8
    for pad in range(8):
        k = 32 + pad   # bits after the magic's last bit
        if (v >> k) & M48 == EOS:
            return size * 8 - 48 - k
    raise ValueError(f'{path}: no end-of-stream marker at the end (truncated, or several streams)')


def scan(path, start_bit=32, end_bit=None):
    """Yields the bit offsets of the block magics in [start_bit, end_bit), in order, streaming over the file."""
    end_bit = eos_bit(path) if end_bit is None else end_bit
    with open(path, 'rb') as f:
        base = start_bit // 8
        f.seek(base)
        carry = b''
        while True:
            chunk = f.read(SCAN)
            buf = carry + chunk
            last = not chunk or (base + len(buf)) * 8 >= end_bit + 48
            limit = len(buf) if last else len(buf) - 8   # starts in the last 8 bytes wait for the next read
            hits = []
            for s, p in PATTERNS:
                i = buf.find(p)
                while i != -1:
                    bi = i - (0 if s == 0 else 1)
                    if 0 <= bi < limit and bi + 7 <= len(buf) and (int.from_bytes(buf[bi:bi + 7], 'big') >> (8 - s)) & M48 == MAGIC:
                        hits.append((base + bi) * 8 + s)
                    i = buf.find(p, i + 1)
            for h in sorted(hits):
                if start_bit <= h < end_bit:
                    yield h
            if last:
                return
            base += limit
            carry = buf[limit:]


def groups(path, start_bit=32, size=GROUP):
    """Yields (starts, end): the block starts of each group and the bit where it ends (the next group's first block,
    or the end-of-stream magic)."""
    end = eos_bit(path)
    grp = []
    for b in scan(path, start_bit, end):
        grp.append(b)
        if len(grp) == size + 1:
            yield grp[:-1], grp[-1]
            grp = [grp[-1]]
    if grp:
        yield grp, end


def _cut(f, s, e):
    """The bits [s, e) of an open file, as an int."""
    b0, b1 = s // 8, (e + 7) // 8
    f.seek(b0)
    raw = f.read(b1 - b0)
    return (int.from_bytes(raw, 'big') >> (b1 * 8 - e)) & ((1 << (e - s)) - 1)


def decode(f, level, starts, end):
    """Decompresses the blocks starting at `starts` (bit offsets, the last block ending at `end`) as one stream.
    Raises (OSError/ValueError from bz2, or ValueError here) if a start is not a real block."""
    s = starts[0]
    n = end - s
    bits = _cut(f, s, end)
    crc = 0
    for b in starts:
        off = b - s
        if off + 80 > n or (bits >> (n - off - 48)) & M48 != MAGIC:
            raise ValueError(f'no block magic at bit {b}')
        crc = (((crc << 1) | (crc >> 31)) & 0xFFFFFFFF) ^ ((bits >> (n - off - 80)) & 0xFFFFFFFF)
    total = n + 80
    pad = (-total) % 8
    data = b'BZh' + bytes([level]) + ((((bits << 80) | (EOS << 32) | crc)) << pad).to_bytes((total + pad) // 8, 'big')
    return bz2.decompress(data)


def recover(f, level, starts, end):
    """Decodes a range whose start list holds a false magic: drops one candidate start at a time (never the first,
    which follows the previous group's last good block) until the CRCs check. Returns (bytes, the starts that worked)."""
    for i in range(1, len(starts)):
        trial = starts[:i] + starts[i + 1:]
        try:
            return decode(f, level, trial, end), trial
        except (OSError, ValueError, EOFError):
            continue
    raise ValueError(f'blocks from bit {starts[0]} to {end} do not decode, even without any one of their {len(starts)} starts')


_files = {}


def _file(path):
    f = _files.get(path)
    if f is None:
        f = _files[path] = open(path, 'rb')
        if mp.current_process().name != 'MainProcess':   # a pool worker: close it when the worker exits
            mp.util.Finalize(None, f.close, exitpriority=10)
    return f


def _split(data):
    """(head, body, tail): the bytes up to and including the first newline, the whole lines after it, and the bytes
    after the last newline. With no newline at all: (None, b'', data)."""
    i = data.find(b'\n')
    if i == -1:
        return None, b'', data
    j = data.rfind(b'\n')
    return data[:i + 1], data[i + 1:j + 1], data[j + 1:]


def _record(data, end, fn):
    """A decoded group as ('ok', end bit, output bytes, head, body result, tail); see _split."""
    head, body, tail = _split(data)
    return ('ok', end, len(data), head, fn(body) if (fn and body) else (body or None), tail)


def _work(task):
    """In a worker: decode a group and run the caller's fn on its whole lines; a decode failure comes back as such,
    for the main process to join the group with the next one."""
    path, level, starts, end, fn = task
    try:
        return _record(decode(_file(path), level, starts, end), end, fn)
    except (OSError, ValueError, EOFError):
        return ('fail', starts, end)


def _local(path, level, starts, end, fn):
    """In the main process: a range that failed in a worker, decoded with recover()."""
    try:
        data = decode(_file(path), level, starts, end)
    except (OSError, ValueError, EOFError):
        data, _ = recover(_file(path), level, starts, end)
    return _record(data, end, fn)


def map_lines(path, fn=None, workers=None, start=None, size=GROUP, inflight=None):
    """Decompresses `path` on `workers` processes (default: all cores) and yields (result, pos) in file order:
    fn(lines) for each group's whole lines (run in the workers) and fn(line) for each line that spans groups (run here).
    pos is a Position to resume from (on a group's last result), else None.
    fn must be a module-level function (it is pickled to the workers). With fn=None the results are the raw bytes:
    b''.join(r for r, _ in map_lines(p)) == bz2.decompress(open(p, 'rb').read()).
    workers=0 decodes in this process. inflight caps the groups decoded ahead of the consumer (default 2 x workers),
    which bounds memory."""
    level = header(path)
    workers = os.cpu_count() if workers is None else workers
    pos = start or Position(32, 0, b'')
    state = {'out': pos.out, 'carry': pos.carry}
    gate = threading.BoundedSemaphore(inflight or 2 * max(workers, 1))
    stop = threading.Event()   # set when the consumer stops early, so the pool's task thread is not left on the gate

    def tasks():
        for starts, end in groups(path, pos.bit, size):
            while not gate.acquire(timeout=0.2):
                if stop.is_set():
                    return
            if stop.is_set():
                return
            yield (path, level, starts, end, fn)

    def emit(rec):
        _, end, n, head, body, tail = rec
        state['out'] += n
        if head is None:   # no newline in the whole group: the middle of one long line
            state['carry'] += tail
            return
        line = state['carry'] + head
        state['carry'] = tail
        here = Position(end, state['out'], tail)
        if body is None:
            yield (fn(line) if fn else line), here
        else:
            yield (fn(line) if fn else line), None
            yield body, here

    pool = mp.Pool(workers) if workers else None
    try:
        results = pool.imap(_work, tasks()) if pool else map(_work, tasks())
        failed = None   # (starts, end) of a group that did not decode, waiting for the next result
        for r in results:
            gate.release()
            if r[0] == 'fail':
                if failed is None:
                    failed = (r[1], r[2])
                    continue
                # two in a row: the false magic opens the second group (it cut the first one's last block short)
                rec, failed = _local(path, level, failed[0] + r[1], r[2], fn), None
                yield from emit(rec)
                continue
            if failed is not None:   # the false magic was inside the failed group
                yield from emit(_local(path, level, failed[0], failed[1], fn))
                failed = None
            yield from emit(r)
        if failed is not None:
            yield from emit(_local(path, level, failed[0], failed[1], fn))
        if state['carry']:   # the last line, with no newline after it
            yield (fn(state['carry']) if fn else state['carry']), None
        if pool:
            pool.close()
            pool.join()
            pool = None
    finally:
        stop.set()
        f = _files.pop(path, None)   # this process's handle (workers=0, recover); the workers' close with the pool
        if f:
            f.close()
        if pool:   # the consumer stopped early
            try:
                pool.terminate()
            except ValueError:   # Windows: the result thread may still be sending ("concurrent send_bytes() calls")
                pass


def read_all(path, workers=None):
    """The whole decompressed stream (small files and tests)."""
    return b''.join(r for r, _ in map_lines(path, None, workers))