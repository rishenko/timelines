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
    return json.dumps(e, separators=(',', ':')).encode()  # the dump's compact form, which the needle matches


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


class Status(unittest.TestCase):
    """Kevin, 2026-11-24: living people are kept and judged by importance; the status field says who is alive. Nobody is dropped."""

    def test_deceased_has_a_death_claim(self):
        self.assertEqual(person(human(claims={'P569': [time('+1990-05-05T00:00:00Z')], 'P570': [time('+2020-01-01T00:00:00Z')]}))['status'], 'deceased')
        unknown = {'mainsnak': {'snaktype': 'somevalue'}, 'rank': 'normal'}
        self.assertEqual(person(human(claims={'P569': [time('+1930-01-01T00:00:00Z', 9)], 'P570': [unknown]}))['status'], 'deceased')  # dead, date unknown

    def test_living_is_no_death_claim_and_born_1916_or_later(self):
        for born, prec in (('+1990-05-05T00:00:00Z', 11), ('+1916-01-01T00:00:00Z', 9)):
            p = person(human(claims={'P569': [time(born, prec)]}))
            self.assertEqual((p['status'], p['born']), ('living', born))  # kept, not left out

    def test_unknown_is_the_rest(self):
        self.assertEqual(person(human(claims={'P569': [time('+1915-12-31T00:00:00Z')]}))['status'], 'unknown')  # too old to be alive, no death date
        self.assertEqual(person(human())['status'], 'unknown')  # no dates at all
        dep = time('+1990-05-05T00:00:00Z', rank='deprecated')
        self.assertEqual(person(human(claims={'P569': [dep]}))['status'], 'unknown')  # a deprecated date is never read

    def test_a_deprecated_death_is_no_death_claim(self):
        p = person(human(claims={'P569': [time('+1950-01-01T00:00:00Z', 9)], 'P570': [time('+1960-01-01T00:00:00Z', 9, rank='deprecated')]}))
        self.assertEqual((p['status'], p['died']), ('living', None))


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
        db.executemany('INSERT INTO meta VALUES (?,?)', [('schema', '2'), ('done', done)])
        return db

    def row(self, qid, claims=None):
        return P.parse(human(qid=qid, claims=claims))[1]

    def test_a_clean_file_has_no_problems_and_counts_the_three_statuses(self):
        db = self.db([self.row('Q1', {'P569': [time('+1564-04-23T00:00:00Z')], 'P570': [time('+1616-04-23T00:00:00Z')]}), self.row('Q2'),
                      self.row('Q3', {'P569': [time('+1990-01-01T00:00:00Z')]})])
        problems, counts = P.check(db, expected=3)
        self.assertEqual(problems, [])
        self.assertEqual((counts['persons'], counts['deceased'], counts['living'], counts['unknown']), (3, 1, 1, 1))

    def test_the_person_count_must_match_schema_1(self):
        problems, _ = P.check(self.db([self.row('Q1')]), expected=2)
        self.assertTrue(any('parse difference' in x for x in problems))

    def test_problems_are_found(self):
        bad = list(self.row('Q1', {'P569': [time('+1990-01-01T00:00:00Z')]}))
        bad[P.PERSON_COLS.index('status')] = 'deceased'  # a living person marked deceased
        problems, _ = P.check(self.db([tuple(bad)], done='0'))
        self.assertTrue(any('deceased without a death claim' in x for x in problems))
        self.assertTrue(any('not finished' in x for x in problems))
        worse = list(self.row('Q2', {'P569': [time('+1990-01-01T00:00:00Z')]}))
        worse[P.PERSON_COLS.index('status')] = 'unknown'
        problems, _ = P.check(self.db([tuple(worse)]))
        self.assertTrue(any('living must be exactly' in x for x in problems))


class Parallel(unittest.TestCase):
    """The same rows whatever --workers is: results come back in order and the blocks in flight are bounded."""

    def dump(self, d, n):
        import bz2
        lines = [b'[']
        for i in range(n):
            if i % 7 == 0:
                e = {'id': f'Q{1000 + i}', 'labels': {'en': {'value': f'Place {i}'}}, 'claims': {'P31': [item('Q3624078')], 'P17': [item('Q145')]},
                     'sitelinks': {'enwiki': {'site': 'enwiki', 'title': f'Place {i}'}}}
                lines.append(json.dumps(e, separators=(',', ':')).encode() + b',')
            elif i % 11 == 0:
                lines.append(json.dumps({'id': f'Q{1000 + i}', 'claims': {'P31': [item('Q5')]}, 'sitelinks': {}}).encode() + b',')  # a human with no enwiki: skipped
            else:
                born = 1500 + i if i % 5 else 1990 - (i % 3)
                claims = {'P569': [time(f'+{born:04d}-01-01T00:00:00Z', 9)], 'P106': [item('Q1')], 'P27': [item('Q145', quals={'P580': '+1500-01-01T00:00:00Z'})]}
                if i % 5:
                    claims['P570'] = [time(f'+{born + 40:04d}-01-01T00:00:00Z', 9)]
                lines.append(human(qid=f'Q{1000 + i}', claims=claims, title=f'Person {i}', label=f'Person {i}') + b',')
        lines.append(b']')
        path = os.path.join(d, 'dump.json.bz2')
        with open(path, 'wb') as f:  # level 1: 100 kB bz2 blocks, so a dump of a few hundred kB has several (and groups of 1 block exercise pbz2's joins)
            f.write(bz2.compress(b'\n'.join(lines) + b'\n', 1))
        return path

    def rows(self, out):
        db = sqlite3.connect(out)
        return (db.execute('SELECT * FROM person ORDER BY qid').fetchall(), db.execute('SELECT * FROM ref ORDER BY qid').fetchall(),
                db.execute("SELECT key, value FROM meta WHERE key IN ('persons', 'refs', 'lines', 'done', 'offset') ORDER BY key").fetchall())

    def test_one_worker_and_many_give_the_same_rows(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            src = self.dump(d, 20000)
            old = P.GROUP
            P.GROUP = 1  # one bz2 block per task: many groups in flight at once
            try:
                got = []
                for w in (1, 4):
                    out = os.path.join(d, f'o{w}.sqlite')
                    P.run(src, out, workers=w, log=lambda m: None)
                    got.append(self.rows(out))
            finally:
                P.GROUP = old
            self.assertEqual(got[0], got[1])
            persons, refs, meta = got[0]
            self.assertGreater(len(persons), 14000)
            self.assertGreater(len(refs), 1500)
            self.assertEqual(dict(meta)['done'], '1')
            self.assertEqual({r[-1] for r in persons}, {'deceased', 'living'})  # the 1990s without a death claim are kept, as living

    def test_a_paused_run_resumes_to_the_same_rows(self):
        """Pause at several points (so the checkpoint falls inside lines that span groups) and resume: the rows, counts and line total match a whole run,
        and the resume point's carry is stored with the rows."""
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            src = self.dump(d, 20000)
            P.GROUP = 1
            try:
                whole = os.path.join(d, 'whole.sqlite')
                P.run(src, whole, workers=2, log=lambda m: None)
                for mid in (250000, 520000):  # bytes of JSON; the carry at these points is a partial line
                    part = os.path.join(d, f'part{mid}.sqlite')
                    P.run(src, part, workers=2, max_gib=mid / (1 << 30), log=lambda m: None)
                    m = dict(sqlite3.connect(part).execute('SELECT key, value FROM meta'))
                    self.assertEqual(m['done'], '0')
                    self.assertGreaterEqual(int(m['out']), mid)
                    self.assertEqual(m['offset'], m['out'])
                    self.assertTrue(m['carry'] == '' or bytes.fromhex(m['carry'])[:1] != b'\n')
                    P.run(src, part, workers=2, max_gib=(int(m['out']) + 1) / (1 << 30), log=lambda m: None)  # a second pause, then the rest
                    P.run(src, part, workers=2, log=lambda m: None)
                    self.assertEqual(self.rows(whole), self.rows(part))
            finally:
                P.GROUP = 64
            self.assertEqual(dict(self.rows(whole)[2])['lines'], '20002')  # '[', 20000 entries, ']'

    def test_the_recoveries_are_kept_in_meta(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'o.sqlite')
            P.run(self.dump(d, 300), out, workers=0, log=lambda m: None)
            self.assertEqual(dict(sqlite3.connect(out).execute('SELECT key, value FROM meta'))['recoveries'], '[]')  # a clean file: none


    def test_a_pause_with_a_partial_line_resumes_to_the_same_rows(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            src = self.dump(d, 20000)
            old_group, P.GROUP = P.GROUP, 1
            try:
                whole = os.path.join(d, 'whole.sqlite')
                P.run(src, whole, workers=2, log=lambda m: None)
                spans = [pos for _, pos in P.pbz2.map_lines(src, P.parse_lines, workers=2, size=1) if pos is not None and pos.carry][:3]
                self.assertEqual(len(spans), 3)
                for pos in spans:
                    part = os.path.join(d, f'p{pos.out}.sqlite')
                    P.run(src, part, workers=2, max_gib=pos.out / (1 << 30), log=lambda m: None)
                    m = dict(sqlite3.connect(part).execute('SELECT key, value FROM meta'))
                    self.assertEqual((int(m['out']), bytes.fromhex(m['carry'])), (pos.out, pos.carry))  # paused on a partial line
                    P.run(src, part, workers=2, log=lambda m: None)
                    self.assertEqual(self.rows(whole), self.rows(part))
            finally:
                P.GROUP = old_group

    def test_a_crash_between_checkpoints_resumes_to_the_same_rows(self):
        import tempfile
        real, old_cp = P.pbz2.map_lines, P.W.CHECKPOINT

        class Crash(Exception):
            pass

        def crashing(after):
            def ml(*a, **k):
                g = real(*a, **k)
                try:
                    for n, x in enumerate(g, 1):
                        if n == after:
                            raise Crash
                        yield x
                finally:
                    g.close()
            return ml

        with tempfile.TemporaryDirectory() as d:
            src = self.dump(d, 20000)
            old_group, P.GROUP, P.W.CHECKPOINT = P.GROUP, 1, 200000
            try:
                whole = os.path.join(d, 'whole.sqlite')
                P.run(src, whole, workers=2, log=lambda m: None)
                for after in (7, 23, 41):
                    part = os.path.join(d, f'c{after}.sqlite')
                    P.pbz2.map_lines = crashing(after)
                    with self.assertRaises(Crash):
                        P.run(src, part, workers=2, log=lambda m: None)
                    P.pbz2.map_lines = real
                    db = sqlite3.connect(part)
                    m = dict(db.execute('SELECT key, value FROM meta'))
                    self.assertEqual(m['done'], '0')
                    self.assertEqual(str(db.execute('SELECT COUNT(*) FROM person').fetchone()[0]), m['persons'])  # uncommitted rows rolled back
                    db.close()
                    P.run(src, part, workers=2, log=lambda m: None)
                    self.assertEqual(self.rows(whole), self.rows(part))
            finally:
                P.pbz2.map_lines, P.GROUP, P.W.CHECKPOINT = real, old_group, old_cp


class Memory(unittest.TestCase):
    def test_rss_is_a_positive_number_on_this_machine(self):  # Windows: psapi through ctypes (it printed None before)
        m = P.rss_mb()
        self.assertIsInstance(m, int)
        self.assertGreater(m, 5)


if __name__ == '__main__':
    unittest.main()
