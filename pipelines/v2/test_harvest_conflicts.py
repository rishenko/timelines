"""The declarations rule for a state's entry into World War II (python -m unittest from pipelines/v2 with the extract venv): the state's own
entry sentence, not the first declarations-table row it initiated."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, 'harvest'), os.path.join(HERE, '..', 'common'), os.path.join(HERE, '..', 'extract')]  # harvest first: extract has its own conflicts.py
sys.argv = sys.argv[:1]
import conflicts  # noqa: E402


class EntrySentence(unittest.TestCase):
    def test_romania_joins_the_invasion_not_a_december_declaration(self):
        t = ('Romania signed the Tripartite Pact on November 23, 1940. Romania joined the German-led invasion of the Soviet Union on June 22, 1941. '
             'On 6 December 1941 Romania declared war on the United Kingdom.')
        e = conflicts.entry_sentence(t)
        self.assertEqual(e['from'], 1940)  # the earliest entry sentence: the pact signing
        self.assertIn('Tripartite Pact', e['quote'])

    def test_japan_declared_war_not_the_indochina_row(self):
        e = conflicts.entry_sentence('On 7 December 1941 Japan declared war on the United States and the British Empire.')
        self.assertEqual(e['from'], 1941)

    def test_a_caption_year_far_from_the_verb_is_not_an_entry(self):
        t = 'Germany justified its invasion of the Low Countries in May 1940. Hitler talked about it. Germany invaded the Soviet Union in 1941.'
        self.assertIsNone(conflicts.entry_sentence(t))

    def test_before_the_war_is_not_an_entry(self):
        self.assertIsNone(conflicts.entry_sentence('Hungary declared war on Czechoslovakia in 1938.'))


if __name__ == '__main__':
    unittest.main()
