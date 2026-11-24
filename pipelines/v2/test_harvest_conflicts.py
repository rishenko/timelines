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
    def test_romania_war_entry_is_the_invasion_not_the_pact_or_a_december_declaration(self):
        t = ('Romania signed the Tripartite Pact on November 23, 1940. Romania joined the German-led invasion of the Soviet Union on June 22, 1941. '
             'On 6 December 1941 Romania declared war on the United Kingdom.')
        e = conflicts.entry_sentence(t)
        self.assertEqual(e['from'], 1941)  # the war entry (22 June 1941), not the pact (1940) or the later declaration
        self.assertIn('invasion of the Soviet Union', e['quote'])

    def test_pact_stands_in_when_there_is_no_war_entry(self):
        e = conflicts.entry_sentence('Slovakia signed the Tripartite Pact on 24 November 1940.')
        self.assertEqual((e['from'], e['kind']), (1940, 'pact'))

    def test_another_state_declaring_war_on_the_state_is_not_its_entry(self):
        t = 'The United Kingdom declared war on Finland on 6 December 1941. Finland attacked in June.'
        self.assertIsNone(conflicts.entry_sentence(t, 'Finland'))
        self.assertEqual(conflicts.entry_sentence('Finland declared war on the Soviet Union on 25 June 1941.', 'Finland')['from'], 1941)

    def test_japan_declared_war_not_the_indochina_row(self):
        e = conflicts.entry_sentence('On 7 December 1941 Japan declared war on the United States and the British Empire.', 'Japan')
        self.assertEqual(e['from'], 1941)

    def test_a_caption_year_far_from_the_verb_is_not_an_entry(self):
        t = 'Germany justified its invasion of the Low Countries in May 1940. Hitler talked about it. Germany invaded the Soviet Union in 1941.'
        self.assertIsNone(conflicts.entry_sentence(t))

    def test_hungary_adhered_to_the_pact_with_a_caption_in_front(self):
        t = ('thumb|Hungarian Toldi I tank in the 1941 invasionThe Kingdom of Hungary, ruled by Regent Horthy, was the first country apart from Germany, '
             'Italy, and Japan to adhere to the Tripartite Pact, signing the agreement on 20 November 1940.')
        e = conflicts.entry_sentence(t)
        self.assertEqual(e['from'], 1940)
        self.assertNotIn('thumb|', e['quote'])

    def test_before_the_war_is_not_an_entry(self):
        self.assertIsNone(conflicts.entry_sentence('Hungary declared war on Czechoslovakia in 1938.'))


if __name__ == '__main__':
    unittest.main()
