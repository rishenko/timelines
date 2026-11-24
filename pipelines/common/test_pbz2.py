"""Tests for pbz2 (block-parallel bz2), on synthetic multi-block files: no dump needed."""
import bz2
import os
import random
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pbz2  # noqa: E402


def text(seed=7, lines=40000):
    """Deterministic JSON-ish lines of mixed length, plus one line longer than a whole group of blocks."""
    rnd = random.Random(seed)
    out = []
    for i in range(lines):
        if i == 15000:
            out.append(b'{"long": "' + bytes(rnd.choice(b'abcdefghij') for _ in range(700_000)) + b'"}')
        else:
            out.append(b'{"id": "Q%d", "v": "%s"}' % (i, bytes(rnd.choice(b'abcdefghijklmnop ') for _ in range(rnd.randint(5, 200)))))
    return b'\n'.join(out) + b'\n'


def line_list(lines):
    """A module-level fn for map_lines (runs in the workers): the lines, without their newlines."""
    return lines.rstrip(b'\n').split(b'\n')


class Pbz2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.TemporaryDirectory()
        cls.data = text()
        cls.path = os.path.join(cls.dir.name, 'synthetic.json.bz2')
        with open(cls.path, 'wb') as f:
            f.write(bz2.compress(cls.data, compresslevel=1))   # 100 kB blocks: dozens of them
        cls.nolf = os.path.join(cls.dir.name, 'no-final-newline.bz2')
        with open(cls.nolf, 'wb') as f:
            f.write(bz2.compress(cls.data.rstrip(b'\n'), compresslevel=1))

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def test_scan_finds_every_block(self):
        starts = list(pbz2.scan(self.path))
        self.assertGreater(len(starts), 20)
        self.assertEqual(starts[0], 32)   # right after "BZh1"
        with open(self.path, 'rb') as f:
            whole = pbz2.decode(f, pbz2.header(self.path), starts, pbz2.eos_bit(self.path))
        self.assertEqual(whole, self.data)

    def test_bytes_identical_at_1_and_n_workers_and_any_group_size(self):
        for workers in (0, 1, 3):
            for size in (1, 4, 64):
                got = b''.join(r for r, _ in pbz2.map_lines(self.path, None, workers=workers, size=size))
                self.assertEqual(got, self.data, f'workers={workers} size={size}')

    def test_no_recoveries_on_a_clean_file(self):
        rec = []
        for _ in pbz2.map_lines(self.path, None, workers=2, size=4, recoveries=rec, log=None):
            pass
        self.assertEqual(rec, [])

    def test_lines_are_whole_including_those_across_groups(self):
        want = self.data.rstrip(b'\n').split(b'\n')
        for workers, size in ((0, 2), (3, 2), (3, 5)):
            got = []
            for r, _ in pbz2.map_lines(self.path, line_list, workers=workers, size=size):
                got += r
            self.assertEqual(got, want, f'workers={workers} size={size}')

    def test_last_line_without_newline(self):
        got = []
        for r, _ in pbz2.map_lines(self.nolf, line_list, workers=2, size=3):
            got += r
        self.assertEqual(got, self.data.rstrip(b'\n').split(b'\n'))

    def test_resume_from_a_position(self):
        out, pos, k = [], None, 0
        for r, p in pbz2.map_lines(self.path, None, workers=2, size=3):
            out.append(r)
            if p is not None:
                k += 1
                if k == 5:
                    pos = p
                    break
        self.assertIsNotNone(pos)
        self.assertEqual(pos.out - len(pos.carry), len(b''.join(out)))   # carry is held back until its line completes
        rest = b''.join(r for r, _ in pbz2.map_lines(self.path, None, workers=2, size=3, start=pos))
        self.assertEqual(b''.join(out) + rest, self.data)

    def _with_false_magic(self, where):
        """map_lines with a false block start injected by the scanner: inside a group, or opening a group."""
        real = list(pbz2.scan(self.path))
        size = 4
        if where == 'inside':
            fake = real[1] + 1000                        # inside block 1: group 0's second "start"
        else:
            fake = real[size] - 5000                     # inside block size-1, placed so it opens group 1
        injected = sorted(real + [fake])
        if where != 'inside':
            self.assertEqual(injected.index(fake), size)  # group 1's first start (and group 0's end)
        orig = pbz2.scan
        pbz2.scan = lambda path, start_bit=32, end_bit=None: iter([b for b in injected if b >= start_bit])
        try:
            for workers in (0, 2):
                rec, logged = [], []
                got = b''.join(r for r, _ in pbz2.map_lines(self.path, None, workers=workers, size=size, recoveries=rec, log=logged.append))
                self.assertEqual(got, self.data, f'{where}, workers={workers}')
                self.assertEqual([r.dropped for r in rec], [(fake,)], f'{where}, workers={workers}')   # counted, with its bit
                self.assertEqual(logged, rec)
        finally:
            pbz2.scan = orig

    def test_false_magic_inside_a_group_is_recovered(self):
        self._with_false_magic('inside')

    def test_false_magic_opening_a_group_is_recovered(self):
        self._with_false_magic('opening')

    def test_recover_drops_the_false_start(self):
        real = list(pbz2.scan(self.path))[:6]
        end = list(pbz2.scan(self.path))[6]
        fake = real[2] + 777
        with open(self.path, 'rb') as f:
            level = pbz2.header(self.path)
            want = pbz2.decode(f, level, real, end)
            with self.assertRaises((OSError, ValueError, EOFError)):
                pbz2.decode(f, level, sorted(real + [fake]), end)
            got, used = pbz2.recover(f, level, sorted(real + [fake]), end)
        self.assertEqual((got, used), (want, real))

    def test_not_bzip2_or_not_one_stream(self):
        p = os.path.join(self.dir.name, 'plain.txt')
        with open(p, 'wb') as f:
            f.write(b'hello\n')
        with self.assertRaises(ValueError):
            pbz2.header(p)
        two = os.path.join(self.dir.name, 'truncated.bz2')
        with open(self.path, 'rb') as f:
            whole = f.read()
        with open(two, 'wb') as f:
            f.write(whole[:-20])
        with self.assertRaises(ValueError):
            pbz2.eos_bit(two)


if __name__ == '__main__':
    unittest.main()
