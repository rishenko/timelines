"""Extractor helpers (python -m unittest from pipelines/extract)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extractors import sentences  # noqa: E402


class Sentences(unittest.TestCase):
    def test_abbreviations_do_not_end_sentences(self):  # Bisbee Deportation, WW1 pilot
        s = sentences('On May 15, 1918, the U.S. Department of Labor reported the deportees. They were held at Columbus.')
        self.assertEqual(s, ['On May 15, 1918, the U.S. Department of Labor reported the deportees.', 'They were held at Columbus.'])

    def test_titles_and_initials(self):
        s = sentences('Gen. Allenby entered Jerusalem. J. R. Smith wrote of it in 1918.')
        self.assertEqual(s, ['Gen. Allenby entered Jerusalem.', 'J. R. Smith wrote of it in 1918.'])



class ShortTitles(unittest.TestCase):
    def test_lead_phrase(self):
        from extractors import short_title
        self.assertEqual(short_title('Free State President Arthur Griffith dies of a stroke. He is replaced by W. T. Cosgrave.'),
                         'Free State President Arthur Griffith dies of a stroke')
        self.assertEqual(short_title('Republican officer Tom Barry, who had escaped, was recaptured in Dublin.'),
                         'Republican officer Tom Barry, who had escaped, was recaptured in Dublin')


class ClassifierThroughShim(unittest.TestCase):
    """WpShim rebuilds only an article's infobox type and categories for the shared classifier; if the classifier starts
    reading something else, the extractor would quietly get fewer categories. This catches that."""
    def test_military_conflict_infobox_gives_conflict(self):
        # extract.py imports the shared wp_dump, which opens <TIMELINES_DATA>/wikipedia/index.sqlite at import: give it an
        # empty one in a temporary folder, so the test needs no dump (CI has none)
        import sqlite3
        import tempfile
        tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(tmp, 'wikipedia'))
        sqlite3.connect(os.path.join(tmp, 'wikipedia', 'index.sqlite')).close()
        os.environ['TIMELINES_DATA'] = tmp
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common'))
        import event_categories
        from extract import WIKI, WpShim

        class Tables:  # the lookup tables' two calls WpShim makes: (page_id, title, infobox type), categories
            page = staticmethod(lambda title: (1, title, 'military conflict') if title == 'Kilmichael ambush' else None)
            categories = staticmethod(lambda page_id: [])

        e = {'title': 'Kilmichael', 'descr': '', 'tracks': [], 'sources': [{'sourceKey': 'wp', 'sourceLocation': 'lead'}]}
        ds = {'sources': {'wp': {'url': WIKI + 'Kilmichael_ambush'}}, 'tracks': []}
        got = event_categories.classify(e, ds, WpShim(Tables()))
        self.assertTrue(got, 'no category: the classifier no longer reads what WpShim provides')
        self.assertEqual(got[0][0], 'conflict')
        self.assertIn('infobox', got[0][1])


if __name__ == '__main__':
    unittest.main()
