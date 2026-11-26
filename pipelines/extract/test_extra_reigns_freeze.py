"""python -I test_extra_reigns_freeze.py (from pipelines/extract): the extra-reigns writer is append-or-refuse."""
import copy
import json
import os
import sys
import tempfile
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import extra_reigns_freeze as X  # noqa: E402

A = {'uuid': 'reign-a', 'title': 'A', 'start': 1, 'end': 2, 'sources': [{'sourceKey': 'wp-a'}]}
B = {'uuid': 'reign-b', 'title': 'B', 'start': 3, 'end': 4, 'sources': [{'sourceKey': 'wp-b'}]}


class AppendOrRefuse(unittest.TestCase):
    def test_new_file(self):
        cur, added = X.append_or_refuse(None, [A], {'wp-a': 1}, {'reign-a': 'h'})
        self.assertEqual((cur['events'], added, cur['inputs'], cur['sources']), ([A], ['reign-a'], {'reign-a': 'h'}, {'wp-a': 1}))

    def test_appends_and_keeps_what_the_file_holds(self):
        cur, _ = X.append_or_refuse(None, [A], {}, {})
        cur, added = X.append_or_refuse(copy.deepcopy(cur), [A, B], {}, {})
        self.assertEqual(([e['uuid'] for e in cur['events']], added), (['reign-a', 'reign-b'], ['reign-b']))

    def test_kept_event_keeps_its_recorded_hash_and_source(self):
        cur, _ = X.append_or_refuse(None, [A], {'wp-a': 1}, {'reign-a': 'old'})
        cur, added = X.append_or_refuse(cur, [A, B], {'wp-a': 2, 'wp-b': 3}, {'reign-a': 'new', 'reign-b': 'hb'})
        self.assertEqual((added, cur['inputs']['reign-a'], cur['inputs']['reign-b'], cur['sources']), (['reign-b'], 'old', 'hb', {'wp-a': 1, 'wp-b': 3}))

    def test_refuses_a_changed_event(self):
        cur, _ = X.append_or_refuse(None, [A], {}, {})
        with self.assertRaises(SystemExit):
            X.append_or_refuse(cur, [dict(A, end=9)], {}, {})

    def test_refuses_a_committed_uuid(self):
        with self.assertRaises(SystemExit):
            X.append_or_refuse(None, [A], {}, {}, committed={'reign-a'})


class FromDirs(unittest.TestCase):
    """--dir mode end to end on a temp root: the reigns.json guard and the append."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        os.makedirs(os.path.join(self.root, 'pipelines', 'medieval'))
        self.extra = os.path.join(self.root, 'pipelines', 'medieval', 'extra-reigns.json')
        self.run_dir = os.path.join(self.root, 'run')
        os.makedirs(self.run_dir)
        self.write(os.path.join(self.root, 'pipelines', 'medieval', 'reigns.json'), {'events': [dict(A, uuid='reign-committed')]})
        self.write(os.path.join(self.run_dir, 'rulers-events.json'), {'events': [A, B, dict(A, uuid='reign-committed')], 'sources': {'wp-a': 1, 'wp-b': 2}})

    def tearDown(self):
        self.tmp.cleanup()

    def read(self, path, mode='r'):
        with open(path, mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f:
            return f.read()

    def write(self, path, j):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(j, f)

    def test_committed_uuid_exits_and_leaves_the_file_alone(self):
        X.from_dirs('medieval', [f'{self.run_dir}:reign-a'], 'why', self.root)
        before = self.read(self.extra, 'rb')
        with self.assertRaises(SystemExit):
            X.from_dirs('medieval', [f'{self.run_dir}:reign-b', f'{self.run_dir}:reign-committed'], 'why', self.root)
        self.assertEqual(self.read(self.extra, 'rb'), before)

    def test_new_uuid_appends_and_keeps_existing_events(self):
        X.from_dirs('medieval', [f'{self.run_dir}:reign-a'], 'why', self.root)
        X.from_dirs('medieval', [f'{self.run_dir}:reign-b'], 'why', self.root)
        self.assertEqual([e['uuid'] for e in json.loads(self.read(self.extra))['events']], ['reign-a', 'reign-b'])


class FromFreeze(unittest.TestCase):
    """--from-freeze on a temp tree: adds the reigns a dry freeze holds beyond reigns.json for the named rows, keeps what the file holds."""

    def test_adds_new_reigns_for_the_rows_and_keeps_existing(self):
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, 'pipelines', 'medieval'))
            put = lambda p, j: json.dump(j, open(p, 'w', encoding='utf-8'))
            put(os.path.join(root, 'pipelines', 'medieval', 'reigns.json'), {'events': [dict(A, uuid='reign-committed')]})
            ev = lambda u, row: dict(A, uuid=u, tracks=[row], sources=[{'sourceKey': 'wp-a', 'sourceLocation': '1 - 2'}], descr='D.')
            freeze = {'events': [ev('reign-committed', 'r1'), ev('reign-new', 'r1'), ev('reign-other-row', 'r2')], 'sources': {'wp-a': 1},
                      'review': {u: {'row': r, 'toCheck': []} for u, r in (('reign-committed', 'r1'), ('reign-new', 'r1'), ('reign-other-row', 'r2'))}, 'inputs': {'x': 'h'}}
            put(os.path.join(root, 'freeze.json'), freeze)
            argv = ['--timeline', 'medieval', '--from-freeze', os.path.join(root, 'freeze.json'), '--rows', 'r1', 'why']
            X.from_freeze(argv, root)
            X.from_freeze(argv, root)  # a second run adds nothing and drops nothing
            with open(os.path.join(root, 'pipelines', 'medieval', 'extra-reigns.json'), encoding='utf-8') as f:
                self.assertEqual([e['uuid'] for e in json.load(f)['events']], ['reign-new'])


if __name__ == '__main__':
    unittest.main()
