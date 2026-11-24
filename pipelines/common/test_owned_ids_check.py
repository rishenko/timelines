"""python3 -I pipelines/common/test_owned_ids_check.py"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import owned_ids_check as O  # noqa: E402


def tree(source_ids, owned_ids):
    root = tempfile.mkdtemp()
    for d in ('data-src', 'pipelines/ancient', 'pipelines/v2/emitted'):
        os.makedirs(os.path.join(root, d))
    json.dump({'events': [{'uuid': u} for u in source_ids]}, open(os.path.join(root, 'data-src', 'ancient-classical.json'), 'w'))
    json.dump({'events': [{'uuid': u} for u in owned_ids]}, open(os.path.join(root, 'pipelines', 'ancient', 'reigns.json'), 'w'))
    json.dump({'events': [{'uuid': 'conflict-x'}]}, open(os.path.join(root, 'pipelines', 'v2', 'emitted', 'conflict-ancient-classical.json'), 'w'))
    return root


class Owned(unittest.TestCase):
    def test_owned_events_pass(self):
        self.assertEqual(O.orphans(tree(['reign-a', 'conflict-x', 'plain-event'], ['reign-a']))[0], [])

    def test_a_reign_removed_from_its_file_is_found(self):
        self.assertEqual(O.orphans(tree(['reign-a', 'reign-b'], ['reign-a']))[0], ['reign-b'])

    def test_other_events_are_not_checked(self):
        self.assertEqual(O.orphans(tree(['reign-a', 'the-battle-of-x', 'reigning-sovereigns'], ['reign-a']))[0], [])

    def test_main_reports_and_fails(self):
        self.assertEqual(O.main(['--root', tree(['reign-b'], [])]), 1)
        self.assertEqual(O.main(['--root', tree(['reign-a'], ['reign-a'])]), 0)


if __name__ == '__main__':
    unittest.main()
