"""data_root.py against data-root.cases.json (the same cases scripts/lib/data-root.test.ts runs). Run: python -I pipelines/common/test_data_root.py"""
import json
import ntpath
import os
import posixpath
import tempfile
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import data_root as DR  # noqa: E402
with open(os.path.join(HERE, 'data-root.cases.json'), encoding='utf-8') as f:
    CASES = json.load(f)['cases']


class Cases(unittest.TestCase):
    def test_every_case(self):
        for c in CASES:
            with self.subTest(c['name']):
                with tempfile.TemporaryDirectory() as d:
                    if c['repoFile'] is not None:
                        with open(os.path.join(d, 'timelines.local.json'), 'w', encoding='utf-8') as f:
                            json.dump(c['repoFile'], f)
                    mod = _Win(d) if c['platform'] == 'win32' else _Posix(d)  # the repo file is a real file in a temp folder; join/home follow the platform
                    got = DR.where(c['where'], *c['parts'], env=c['env'], repo=d, home=c['home'], pathmod=mod)
                self.assertEqual(got, c['expect'])

    def test_unknown_name_is_an_error(self):
        with self.assertRaises(KeyError):
            DR.where('nope', env={}, home='/h')

    def test_a_broken_local_file_falls_back_to_the_default(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, 'timelines.local.json'), 'w', encoding='utf-8') as f:
                f.write('{not json')
            self.assertEqual(DR.root(env={}, repo=d, home='/h', pathmod=_Posix(d)), '/h/data')


class _Posix:
    """posixpath, with exists() answering from the real temp folder."""
    sep = '/'

    def __init__(self, repo):
        self.repo = repo

    join = staticmethod(posixpath.join)

    def expanduser(self, p):
        return p

    def exists(self, p):
        return os.path.exists(os.path.join(self.repo, os.path.basename(p)))


class _Win(_Posix):
    sep = '\\'
    join = staticmethod(ntpath.join)

if __name__ == '__main__':
    unittest.main()
