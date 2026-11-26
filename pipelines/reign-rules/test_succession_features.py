"""python -I test_succession_features.py (the extractor's Python: it needs mwparserfromhell). The page snippets are the succession boxes of real articles."""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import succession_features as SF  # noqa: E402

ABHAYA = """{{s-start}}
{{s-hou|[[House of Lambakanna I]]|?|?|?|?|}}
{{s-reg|}}
{{s-bef
| before = [[Voharika Tissa of Anuradhapura|Voharika Tissa]]
}}
{{s-ttl
| title = [[List of Anuradhapura monarchs|King of Anuradhapura]]
| years = 231&ndash;240 AD
}}
{{s-aft
| after = [[Siri Naga II of Anuradhapura|Siri Naga II]]
}}
{{end}}"""  # Abhaya Naga
ADAD = "{{s-start}}\n{{succession box|title=[[King of Assyria]]|before=[[Ashur-dan II]]|after=[[Tukulti-Ninurta II]]|years=911&ndash;891 BC}}\n{{s-end}}"  # Adad-nirari II
TWO = ADAD + "\n{{succession box|title=Other office|before=[[X]]|after=[[Y]]|years=100&ndash;90 BC}}"


def reign(s, e, row='assyria'):
    return {'uuid': 'reign-a', 'timeline': 'ancient-classical', 'row': row, 'event': {'start': s, 'end': e}, 'review': {'qid': 'Q1'}}


def ctx(**kw):
    return dict({'by_row': {('ancient-classical', 'assyria'): [{'uuid': 'reign-b'}, {'uuid': 'reign-c'}]},
                 'pages': {'reign-b': 'Ashur-dan II', 'reign-c': 'Somebody'}}, **kw)


class Boxes(unittest.TestCase):
    def test_s_ttl_block_takes_its_neighbours(self):
        b, = SF.boxes(ABHAYA)
        self.assertEqual((b['title'], b['years'], b['before'], b['after']), ('King of Anuradhapura', '231–240 AD', ['Voharika Tissa of Anuradhapura'], ['Siri Naga II of Anuradhapura']))
        self.assertIn('King of Anuradhapura', b['title_quote'])

    def test_one_line_box(self):
        b, = SF.boxes(ADAD)
        self.assertEqual((b['title'], b['before'], b['after'], b['years']), ('King of Assyria', ['Ashur-dan II'], ['Tukulti-Ninurta II'], '911–891 BC'))

    def test_a_page_without_a_box_has_none(self):
        self.assertEqual(SF.boxes('Some prose with {{cite web|url=x}}.'), [])


class Pick(unittest.TestCase):
    def test_years_choose_the_box(self):
        self.assertEqual([b['title'] for b in SF.pick(SF.boxes(TWO), -905, -895)], ['King of Assyria'])
        self.assertEqual([b['title'] for b in SF.pick(SF.boxes(TWO), -99, -91)], ['Other office'])
        self.assertEqual(SF.pick(SF.boxes(TWO), 500, 510), [])

    def test_a_lone_box_without_years_is_taken(self):
        self.assertEqual(len(SF.pick(SF.boxes('{{succession box|title=King|before=[[A]]|after=[[B]]}}'), 5, 9)), 1)

    def test_a_lone_box_whose_years_miss_the_reign_is_dropped(self):
        self.assertEqual(SF.pick(SF.boxes(ADAD), 500, 510), [])

    def test_slack_is_one_year(self):
        self.assertEqual(len(SF.pick(SF.boxes(ADAD), -889, -880)), 1)  # a year after the box's end
        self.assertEqual(SF.pick(SF.boxes(ADAD), -885, -880), [])

    def test_at_most_three_boxes(self):
        four = '\n'.join('{{succession box|title=T%d|before=[[A]]|after=[[B]]|years=911&ndash;891 BC}}' % i for i in range(4))
        self.assertEqual([b['title'] for b in SF.pick(SF.boxes(four), -905, -895)], ['T0', 'T1', 'T2'])


class OnRow(unittest.TestCase):
    def test_any_neighbour_on_the_row_counts(self):
        self.assertIs(SF.on_row(['A', 'B'], {'A'}, lambda t: t), True)
        self.assertIs(SF.on_row(['B'], {'A'}, lambda t: t), False)
        self.assertIsNone(SF.on_row([], {'A'}, lambda t: t))


class Features(unittest.TestCase):
    def feats(self, page_text, r=None, quals=None, **kw):
        page = {'title': 'Adad-nirari II', 'revision': 7, 'text': page_text}
        return SF.succession_features(r or reign(-910, -890), page, ctx(**kw), lambda t: t, quals)

    def test_box_features_and_the_on_row_tests(self):
        f = {x['feature']: x for x in self.feats(ADAD)}
        self.assertEqual((f['office_succession']['value'], f['succession_pred_on_row']['value'], f['succession_succ_on_row']['value']), ('King of Assyria', True, False))
        self.assertIn('quote', f['office_succession'])
        self.assertNotIn('quote', f['succession_pred_on_row'])
        self.assertIn('inputs', f['succession_pred_on_row'])

    def test_a_box_that_names_nobody_gives_none(self):
        f = {x['feature']: x for x in self.feats('{{succession box|title=King|years=911–891 BC}}')}
        self.assertEqual((f['succession_pred_on_row']['value'], f['succession_succ_on_row']['value']), (None, None))

    def test_no_page_no_box_features(self):
        self.assertEqual(SF.succession_features(reign(-910, -890), None, ctx(), lambda t: t), [])

    def test_p39_edges(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'q.sqlite')
            con = sqlite3.connect(path)
            con.execute('create table wd_iqual(qid TEXT, prop TEXT, target TEXT, sid TEXT, qprop TEXT, qtarget TEXT)')
            con.executemany('insert into wd_iqual values (?,?,?,?,?,?)', [('Q1', 'P39', 'Q10', 'S1', 'P1365', 'Q2'), ('Q1', 'P39', 'Q10', 'S1', 'P1366', 'Q3'),
                                                                        ('Q1', 'P31', 'Q5', 'S9', 'P1365', 'Q4'), ('Q9', 'P39', 'Q10', 'S2', 'P1366', 'Q5')])
            con.commit()
            con.close()
            q = SF.Quals(path)
            f = SF.succession_features(reign(-910, -890), None, ctx(qid_rows={('ancient-classical', 'assyria'): {'Q2'}}), lambda t: t, q)
            q.close()
        self.assertEqual([(x['feature'], x['value'], x['on_row'], x['office']) for x in f], [('p39_replaces', 'Q2', True, 'Q10'), ('p39_replaced_by', 'Q3', False, 'Q10')])
        self.assertIn('statement S1', f[0]['inputs'])


if __name__ == '__main__':
    unittest.main()
