"""People pass schema 2 cases: what wd_people_attrs.parse keeps, on synthetic entity lines shaped like the dump's.
Run: pipelines/.venv/bin/python -I pipelines/extract/test_wd_people_attrs.py (no dump needed)."""
import json
import os
import sqlite3
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wd_people_attrs as P  # noqa: E402

GREG, JUL = 'http://www.wikidata.org/entity/Q1985727', 'http://www.wikidata.org/entity/Q1985786'


def item(i, rank='normal', quals=None):
    c = {'mainsnak': {'snaktype': 'value', 'datavalue': {'type': 'wikibase-entityid', 'value': {'id': i}}}, 'rank': rank}
    if quals:
        c['qualifiers'] = {p: [{'snaktype': 'value', 'datavalue': {'value': {'time': t, 'precision': 9}}}] for p, t in quals.items()}
    return c


def time(t, prec=11, cal=GREG, rank='normal'):
    return {'mainsnak': {'snaktype': 'value', 'datavalue': {'type': 'time', 'value': {'time': t, 'precision': prec, 'calendarmodel': cal}}}, 'rank': rank}


def human(qid='Q1', claims=None, title='Someone', sitelinks=None, aliases=None, label='Someone'):
    cl = {'P31': [item('Q5')]}
    cl.update(claims or {})
    e = {'id': qid, 'labels': {'en': {'value': label}}, 'claims': cl, 'sitelinks': {'enwiki': {'site': 'enwiki', 'title': title}, **(sitelinks or {})}}
    if aliases:
        e['aliases'] = {'en': [{'value': a} for a in aliases]}
    return json.dumps(e).encode()


def person(line):
    r = P.parse(line)
    assert r and r[0] == 'p', r
    return dict(zip(P.PERSON_COLS, r[1]))


class Dates(unittest.TestCase):
    def test_precision_calendar_rank_and_count(self):
        p = person(human(claims={'P569': [time('+1564-04-23T00:00:00Z', 11, JUL, 'preferred')], 'P570': [time('+1616-04-23T00:00:00Z', 9)]}))
        self.assertEqual((p['born'], p['born_prec'], p['born_cal'], p['born_rank'], p['born_n']), ('+1564-04-23T00:00:00Z', 11, 'Q1985786', 'preferred', 1))
        self.assertEqual((p['died_prec'], p['died_cal'], p['died_rank'], p['died_n']), (9, 'Q1985727', 'normal', 1))

    def test_preferred_beats_normal_and_deprecated_is_never_read(self):
        p = person(human(claims={'P569': [time('+1500-00-00T00:00:00Z', 9, rank='deprecated'), time('+1501-00-00T00:00:00Z', 9), time('+1502-00-00T00:00:00Z', 9, rank='preferred')],
                                 'P570': [time('+1600-00-00T00:00:00Z', 9)]}))
        self.assertEqual((p['born'], p['born_rank'], p['born_n']), ('+1502-00-00T00:00:00Z', 'preferred', 2))  # two live claims: contested
        p = person(human(claims={'P569': [time('+1500-00-00T00:00:00Z', 9, rank='deprecated')], 'P570': [time('+1560-00-00T00:00:00Z', 9)]}))
        self.assertIsNone(p['born'])
        self.assertEqual(p['born_n'], 0)

    def test_century_and_decade_precision_are_kept(self):
        p = person(human(claims={'P569': [time('+0300-00-00T00:00:00Z', 7)], 'P570': [time('+0257-00-00T00:00:00Z', 8)]}))
        self.assertEqual((p['born_prec'], p['died_prec']), (7, 8))

    def test_negative_years(self):
        p = person(human(claims={'P569': [time('-0356-07-20T00:00:00Z', 11)], 'P570': [time('-0323-06-10T00:00:00Z', 11)]}))
        self.assertEqual(P.year_of(p['born']), -356)

    def test_unknown_value_death_is_dead_with_no_date(self):
        unknown = {'mainsnak': {'snaktype': 'somevalue'}, 'rank': 'normal'}
        p = person(human(claims={'P569': [time('+1930-01-01T00:00:00Z', 9)], 'P570': [unknown]}))  # born after 1916 but known dead: kept
        self.assertEqual((p['died'], p['died_n']), (None, 1))


class Living(unittest.TestCase):
    def test_no_death_claim_and_born_1916_or_later_is_left_out(self):
        self.assertEqual(P.parse(human(claims={'P569': [time('+1990-05-05T00:00:00Z')]})), ('l', None))
        self.assertEqual(P.parse(human(claims={'P569': [time('+1916-01-01T00:00:00Z', 9)]})), ('l', None))

    def test_the_rest_stay(self):
        self.assertEqual(person(human(claims={'P569': [time('+1915-12-31T00:00:00Z')]}))['born_n'], 1)  # too old to be alive: kept without a death date
        self.assertEqual(person(human(claims={'P569': [time('+1990-05-05T00:00:00Z')], 'P570': [time('+2020-01-01T00:00:00Z')]}))['died_n'], 1)
        self.assertIsNone(person(human())['born'])  # no dates at all (an ancient person): kept


class Claims(unittest.TestCase):
    def test_occupations_preferred_first_deprecated_dropped(self):
        p = person(human(claims={'P106': [item('Q1', 'deprecated'), item('Q2'), item('Q3', 'preferred')]}))
        self.assertEqual(json.loads(p['p106']), ['Q3', 'Q2'])  # the first is the primary occupation

    def test_dated_citizenship(self):
        p = person(human(claims={'P27': [item('Q145', quals={'P580': '+1707-05-01T00:00:00Z', 'P582': '+1800-12-31T00:00:00Z'}), item('Q174193')]}))
        self.assertEqual(json.loads(p['p27d']), [['Q145', '+1707-05-01T00:00:00Z', '+1800-12-31T00:00:00Z', 'normal'], ['Q174193', None, None, 'normal']])
        self.assertEqual(json.loads(p['p27']), ['Q145', 'Q174193'])

    def test_work_location_residence_floruit_and_work_period(self):
        p = person(human(claims={'P937': [item('Q84', quals={'P580': '+1600-01-01T00:00:00Z'})], 'P551': [item('Q90')], 'P1317': [time('+0870-00-00T00:00:00Z', 9)],
                                 'P2031': [time('+1590-00-00T00:00:00Z', 9)], 'P2032': [time('+1610-00-00T00:00:00Z', 9)]}))
        self.assertEqual(json.loads(p['p937']), [['Q84', '+1600-01-01T00:00:00Z', None, 'normal']])
        self.assertEqual(json.loads(p['p551']), [['Q90', None, None, 'normal']])
        self.assertEqual((json.loads(p['fl']), json.loads(p['wp_start']), json.loads(p['wp_end'])), (['+0870-00-00T00:00:00Z', 9], ['+1590-00-00T00:00:00Z', 9], ['+1610-00-00T00:00:00Z', 9]))
        self.assertEqual(json.loads(person(human())['fl']), None)

    def test_sitelinks_and_aliases(self):
        p = person(human(sitelinks={'frwiki': {'site': 'frwiki'}, 'dewiki': {'site': 'dewiki'}, 'commonswiki': {'site': 'commonswiki'}, 'wikidatawiki': {'site': 'wikidatawiki'}},
                         aliases=['Will', 'W. S.']))
        self.assertEqual(p['sitelinks'], 3)  # enwiki, frwiki, dewiki; not commons or wikidata
        self.assertEqual(json.loads(p['aliases']), ['Will', 'W. S.'])

    def test_not_a_human_goes_to_ref_and_no_enwiki_is_skipped(self):
        e = {'id': 'Q9', 'labels': {'en': {'value': 'Kingdom'}}, 'claims': {'P31': [item('Q3624078')], 'P17': [item('Q145')]}, 'sitelinks': {'enwiki': {'site': 'enwiki', 'title': 'Kingdom'}}}
        r = P.parse(json.dumps(e).encode())
        self.assertEqual((r[0], r[1][0], r[1][5]), ('r', 'Q9', 'Q145'))
        e['sitelinks'] = {}
        self.assertIsNone(P.parse(json.dumps(e).encode()))


class Check(unittest.TestCase):
    def db(self, people, done='1'):
        db = sqlite3.connect(':memory:')
        P.setup(db)
        qs = ','.join('?' * len(P.PERSON_COLS))
        db.executemany(f'INSERT INTO person VALUES ({qs})', people)
        db.executemany('INSERT INTO meta VALUES (?,?)', [('schema', '2'), ('done', done), ('skipped_living', '7')])
        return db

    def row(self, qid, claims=None):
        r = P.parse(human(qid=qid, claims=claims))
        return r[1]

    def test_a_clean_file_has_no_problems(self):
        db = self.db([self.row('Q1', {'P569': [time('+1564-04-23T00:00:00Z')], 'P570': [time('+1616-04-23T00:00:00Z')]}), self.row('Q2')])
        problems, counts = P.check(db)
        self.assertEqual(problems, [])
        self.assertEqual((counts['persons'], counts['with born'], counts['skipped_living']), (2, 1, 7))

    def test_problems_are_found(self):
        alive = list(self.row('Q1', {'P569': [time('+1900-01-01T00:00:00Z')]}))
        alive[P.PERSON_COLS.index('born')] = '+1990-01-01T00:00:00Z'  # a living person that slipped through
        problems, _ = P.check(self.db([tuple(alive)], done='0'))
        self.assertTrue(any('living person' in x for x in problems))
        self.assertTrue(any('not finished' in x for x in problems))


if __name__ == '__main__':
    unittest.main()
