"""Wikidata pass cases: which items and statements wikidata.py keeps, on synthetic entity lines shaped like the dump's.
Run: pipelines/extract/.venv/bin/python -I pipelines/extract/test_wikidata.py"""
import json
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wikidata  # noqa: E402
from wd_join import WD  # noqa: E402

G, J = 'http://www.wikidata.org/entity/Q1985727', 'http://www.wikidata.org/entity/Q1985786'


def tv(t, precision=11, cal=G):
    return {'snaktype': 'value', 'datavalue': {'type': 'time', 'value': {'time': t, 'precision': precision, 'calendarmodel': cal}}}


def iv(q):
    return {'snaktype': 'value', 'datavalue': {'type': 'wikibase-entityid', 'value': {'entity-type': 'item', 'id': q}}}


def stmt(snak, rank='normal', sid=None, **quals):
    s = {'mainsnak': snak, 'rank': rank}
    if sid:
        s['id'] = sid
    if quals:
        s['qualifiers'] = {p: v for p, v in quals.items()}
    return s


def entity(qid, claims, enwiki='Title'):
    e = {'id': qid, 'claims': claims, 'sitelinks': {}}
    if enwiki:
        e['sitelinks']['enwiki'] = {'site': 'enwiki', 'title': enwiki}
    return json.dumps(e).encode()


class Parse(unittest.TestCase):
    def test_head_of_state_with_term_qualifiers(self):  # France: P35 with start/end, office held by head of state
        line = entity('Q142', {
            'P35': [stmt(iv('Q3052772'), sid='Q142$a', P580=[tv('+2017-05-14T00:00:00Z')])],
            'P1906': [stmt(iv('Q191954'))],
            'P31': [stmt(iv('Q6256'))]}, 'France')
        qid, title, times, links, quals = wikidata.parse(line)
        self.assertEqual((qid, title, times), ('Q142', 'France', []))
        self.assertIn(('Q142', 'P35', 'Q3052772', 'normal', 'Q142$a'), links)
        self.assertIn(('Q142', 'P1906', 'Q191954', 'normal', None), links)  # no qualifiers, no sid
        self.assertEqual(quals, [('Q142$a', 'P580', '+2017-05-14T00:00:00Z', 11, 'Q1985727')])

    def test_position_held_keeps_start_end_and_point(self):  # a person: P39 with a term
        line = entity('Q517', {'P39': [stmt(iv('Q7742'), sid='Q517$p',
                                            P580=[tv('+1804-05-18T00:00:00Z')], P582=[tv('+1814-04-11T00:00:00Z')],
                                            P585=[tv('+1815-00-00T00:00:00Z', 9)])]}, 'Napoleon')
        _, _, _, links, quals = wikidata.parse(line)
        self.assertEqual(links, [('Q517', 'P39', 'Q7742', 'normal', 'Q517$p')])
        self.assertEqual([q[1] for q in quals], ['P580', 'P582', 'P585'])

    def test_conflict_and_participant_links(self):
        line = entity('Q1', {'P607': [stmt(iv('Q361'))], 'P1344': [stmt(iv('Q362'), rank='preferred')]})
        links = wikidata.parse(line)[3]
        self.assertEqual({(l[1], l[2], l[3]) for l in links}, {('P607', 'Q361', 'normal'), ('P1344', 'Q362', 'preferred')})

    def test_science_props(self):  # penicillin-like: discoverer, time of discovery; a paper: publication date
        line = entity('Q12190', {'P61': [stmt(iv('Q47497'))], 'P575': [stmt(tv('+1928-00-00T00:00:00Z', 9))],
                                 'P577': [stmt(tv('+1929-06-01T00:00:00Z', 10, J))]})
        _, _, times, links, _ = wikidata.parse(line)
        self.assertEqual([(t[1], t[3], t[4]) for t in times], [('P575', 9, 'Q1985727'), ('P577', 10, 'Q1985786')])
        self.assertEqual(links, [('Q12190', 'P61', 'Q47497', 'normal', None)])

    def test_instance_of_alone_is_not_kept(self):
        self.assertIsNone(wikidata.parse(entity('Q5', {'P31': [stmt(iv('Q5'))]})))

    def test_no_english_article_is_not_kept(self):
        self.assertIsNone(wikidata.parse(entity('Q9', {'P35': [stmt(iv('Q1'))]}, enwiki=None)))

    def test_unknown_and_no_value_skipped(self):
        line = entity('Q2', {'P35': [stmt({'snaktype': 'somevalue'}), stmt(iv('Q3'), P580=[{'snaktype': 'novalue'}])]})
        self.assertEqual(wikidata.parse(line)[3:], ([('Q2', 'P35', 'Q3', 'normal', None)], []))

    def test_instance_of_qualifiers_ignored(self):
        line = entity('Q4', {'P31': [stmt(iv('Q3624078'), P580=[tv('+1990-00-00T00:00:00Z', 9)])],
                             'P571': [stmt(tv('+1800-00-00T00:00:00Z', 9))]})
        self.assertEqual(wikidata.parse(line)[3:], ([('Q4', 'P31', 'Q3624078', 'normal', None)], []))

    def test_cheap_filter_lets_new_props_through(self):
        for p in ('P6', 'P35', 'P39', 'P1344', 'P607', 'P61', 'P575', 'P577', 'P1906', 'P1313'):
            line = entity('Q1', {p: [stmt(iv('Q2') if p not in ('P575', 'P577') else tv('+1900-00-00T00:00:00Z', 9))]})
            self.assertTrue(b'"enwiki"' in line and any(n in line for n in wikidata.NEEDLES), p)
            self.assertIsNotNone(wikidata.parse(line), p)


class Store(unittest.TestCase):
    def test_round_trip_and_dates_ignore_science_props(self):
        lines = [entity('Q361', {'P580': [stmt(tv('+1914-07-28T00:00:00Z'))], 'P582': [stmt(tv('+1918-11-11T00:00:00Z'))],
                                 'P577': [stmt(tv('+1920-01-01T00:00:00Z'))]}, 'World War I') + b',',
                 entity('Q142', {'P35': [stmt(iv('Q3052772'), sid='Q142$a', P580=[tv('+2017-05-14T00:00:00Z')])]},
                        'France') + b',']
        items, claims, links, quals, off, nl = wikidata.parse_batch((lines, 10, 2))
        self.assertEqual((off, nl, len(items)), (10, 2, 2))
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'wd.sqlite')
            db = sqlite3.connect(path)
            wikidata.create(db)
            wikidata.store(db, items, claims, links, quals)
            db.execute("INSERT INTO meta VALUES ('done', '1')")
            db.commit()
            got = db.execute('SELECT l.qid, l.prop, l.target, q.qprop, q.time FROM wd_link l JOIN wd_qual q USING (sid)').fetchall()
            self.assertEqual(got, [('Q142', 'P35', 'Q3052772', 'P580', '+2017-05-14T00:00:00Z')])
            db.close()
            wd = WD(path)
            dates = wd.dates('Q361')  # P577 must not turn up as an end date
            wd.db.close()  # before the directory is removed: Windows can't delete an open file
            self.assertEqual(dates, {'start': [(1914, 7, 28, 'P580', 'Q1985727')], 'end': [(1918, 11, 11, 'P582', 'Q1985727')]})


if __name__ == '__main__':
    unittest.main()
