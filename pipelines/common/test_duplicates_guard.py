"""The duplicate-event and wide-war guards (no git, no dump)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import duplicates_guard as G  # noqa: E402

E = lambda u, t, s, reign=False: {'uuid': u, 'title': t, 'start': s, 'memberships': [{'facet': 'category', 'value': 'reign' if reign else 'war'}]}  # noqa: E731


class Duplicates(unittest.TestCase):
    def test_added_event_repeating_an_existing_one(self):  # the conflicts pilot: conflict-iran-iraq-war beside iran-iraq-war
        base = [E('iran-iraq-war', 'Iran–Iraq War', 1980)]
        head = base + [E('conflict-iran-iraq-war', 'Iran-Iraq war', 1980)]
        self.assertEqual(G.duplicates(base, head), [('conflict-iran-iraq-war', 'iran-iraq-war', 'Iran-Iraq war')])

    def test_far_apart_or_reigns_or_allowed_pass(self):
        base = [E('a', 'Siege of Rhodes', 1480), E('r', 'Reign of Darius II', -422, True)]
        head = base + [E('b', 'Siege of Rhodes', 1522), E('r2', 'Reign of Darius II', -422, True), E('c', 'Siege of Rhodes (1480)', 1481)]
        self.assertEqual(G.duplicates(base, head, {'c': 'a second account'}), [])

    def test_hand_set_wide(self):
        conflicts = {'conflicts': [{'title': 'Ōnin War', 'wide': True}, {'title': 'World War II', 'wide': True, 'wide_by': 'combatants in 6 regions'}, {'title': 'Battle of X'}]}
        self.assertEqual(G.hand_set_wide(conflicts), ['Ōnin War'])


if __name__ == '__main__':
    unittest.main()
