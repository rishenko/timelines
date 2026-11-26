"""python -I test_evidence_rules.py (from pipelines/reign-rules): the rules that read the evidence record, on fixtures, and the pin."""
import json
import os
import sys
import tempfile
import unittest

sys.path[:0] = [os.path.dirname(os.path.abspath(__file__))]
import evidence_rules as ER  # noqa: E402

ROWS = {'modern-states': {'nicaragua': {'name': 'Nicaragua', 'phases': ['Republic'], 'phase_spans': [(1838, None, 'Republic')]}}}


def reign(start=1850, end=1852, row='nicaragua', office=None):
    e = {'uuid': 'reign-x', 'title': 'X', 'start': start, 'end': end, 'tracks': [row]}
    return {'uuid': 'reign-x', 'timeline': 'modern-states', 'row': row, 'file': 'f', 'event': e, 'review': {}}, {'rows': ROWS, 'spans': {'modern-states': {row: [(1838, None)]}},
                                                                                                       'office': lambda r: {'office': office} if office else None}


def feats(cats=(), status=(), span=True, other=False):
    f = {'category_family': [{'feature': 'category_family', 'value': v, 'quote': q} for v, q in cats]}
    if status:
        f['lead_status'] = [{'feature': 'lead_status', 'value': v, 'quote': q} for v, q in status]
    f['span_in_phase'] = [{'feature': 'span_in_phase', 'value': span}]
    f['other_row_office'] = [{'feature': 'other_row_office', 'value': other}]
    return f


def judge(fn, ev, **kw):
    r, ctx = reign(**kw)
    ctx['evidence'] = lambda _r: ev
    return fn(r, ctx, {})


HEAD = [('heads-of-state', 'Category:Presidents of Nicaragua')]


class HeadByEvidence(unittest.TestCase):
    def test_own_category_and_nothing_else_decides(self):  # page: Silvestre Selva
        self.assertIn('Presidents of Nicaragua', judge(ER.head_by_evidence, feats(HEAD)))

    def test_no_record_is_not_in_the_class(self):
        self.assertIsNone(judge(ER.head_by_evidence, None))

    def test_another_polity_s_category_does_not_count(self):  # a category of Costa Rica's presidents on the Nicaragua row
        self.assertIsNone(judge(ER.head_by_evidence, feats([('heads-of-state', 'Category:Presidents of Costa Rica')])))

    def test_a_status_category_or_lead_word_blocks(self):
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD + [('pretenders', 'Category:Pretenders')])))
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD, status=[('acting', 'served as acting president')])))

    def test_outside_the_phase_or_naming_another_row_blocks(self):
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD, span=False)))
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD, other=True)))
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD), start=1800, end=1810))  # before the row's years

    def test_a_rival_line_office_blocks(self):  # pages: Emperor Kōgon ("1st Northern Emperor"), Sîn-šumu-līšir ("Usurper in the Neo-Assyrian Empire")
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD), office='1st Northern Emperor'))
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD), office='Usurper in the Neo-Assyrian Empire'))
        self.assertIn('Presidents', judge(ER.head_by_evidence, feats(HEAD), office='Supreme Director of Nicaragua'))

    def test_northern_in_the_row_s_own_name_is_no_rival_line(self):  # pages: Northern Wei emperors, Northern Kingdom of Israel kings (29 reigns blocked in PoC 1)
        rows = {'modern-states': {'northern-wei': {'name': 'Northern Wei', 'phases': [], 'phase_spans': []}}}
        r, ctx = reign(row='northern-wei', office='Emperor of Northern Wei')
        ctx['rows'], ctx['evidence'] = rows, lambda _r: feats([('monarchs', 'Category:Northern Wei emperors')])
        ctx['spans'] = {'modern-states': {'northern-wei': [(1850, None)]}}
        self.assertIn('Northern Wei', ER.head_by_evidence(r, ctx, {}))
        self.assertIsNone(judge(ER.head_by_evidence, feats(HEAD), office='Emperor of Northern Wei'))  # on the Nicaragua row it is still a rival line

    def test_no_category_is_not_a_head(self):
        self.assertIsNone(judge(ER.head_by_evidence, feats([])))


class Legendary(unittest.TestCase):
    def test_the_lead_says_legendary_ancus_marcius(self):  # page: Ancus Marcius
        f = feats([], status=[('legendary', 'Ancus Marcius was the legendary fourth king of Rome')])
        self.assertIn('legendary', judge(ER.legendary_by_evidence, f))
        self.assertIsNone(judge(ER.legendary_by_evidence, feats([], status=[('acting', 'x')])))
        self.assertIsNone(judge(ER.legendary_by_evidence, None))


class ConsortByEvidence(unittest.TestCase):
    CONS = [('consorts', 'Category:5th-century Byzantine empresses')]
    SAID = [('consort', 'Aelia Ariadne was Eastern Roman empress as the wife of Zeno')]

    def test_consort_category_and_lead(self):  # page: Aelia Ariadne
        self.assertIn('empresses', judge(ER.consort_by_evidence, feats(self.CONS, status=self.SAID)))

    def test_needs_both_and_no_category_of_the_row_s_monarchs(self):
        self.assertIsNone(judge(ER.consort_by_evidence, feats(self.CONS)))
        self.assertIsNone(judge(ER.consort_by_evidence, feats(HEAD + self.CONS, status=self.SAID)))  # a consort who also reigned in her own right


def rec(uuid, start, end, rule='D14', verdict='head', by='code', row='r'):
    return {'uuid': uuid, 'timeline': 'modern-states', 'row': row, 'title': uuid, 'start': start, 'end': end, 'verdict': verdict, 'rule': rule, 'decided_by': by, 'marks': [], 'reason': ''}


class DemoteOverlaps(unittest.TestCase):
    EV = {('modern-states', u) for u in ('a', 'b', 'c', 'd', 'e')}

    def test_overlapping_heads_are_both_demoted_and_edges_are_not(self):  # pages: Marcus Aurelius, Lucius Verus (161-169), Commodus after
        rs = [rec('a', 161, 180), rec('b', 161, 169), rec('c', 180, 192)]
        self.assertEqual(ER.demote_overlaps(rs, self.EV), 2)
        self.assertEqual([r['rule'] for r in rs], ['D6b', 'D6b', 'D14'])
        self.assertEqual((rs[0]['verdict'], rs[0]['decided_by'], rs[0]['class']), ('unclassified', 'none', 'co-ruler'))

    def test_only_code_decided_heads_of_the_rules_in_pilot_rows(self):
        rs = [rec('a', 1, 10), rec('b', 5, 12, by='human'), rec('d', 3, 4, rule='D3', verdict='other-office'), rec('x', 1, 10)]
        self.assertEqual(ER.demote_overlaps(rs, self.EV), 1)  # a overlaps the human-decided head b; x has no evidence record
        self.assertEqual([r['rule'] for r in rs], ['D6b', 'D14', 'D3', 'D14'])


class Pin(unittest.TestCase):
    def test_pin_matches_or_names_what_differs(self):
        with tempfile.TemporaryDirectory() as d:
            path, pin = os.path.join(d, 'evidence.jsonl'), os.path.join(d, 'pin.json')
            with open(path, 'wb') as f:
                f.write(b'{"a": 1}\n')
            import hashlib
            with open(pin, 'w') as f:
                json.dump({'reigns': 1, 'output_sha256': hashlib.sha256(b'{"a": 1}\n').hexdigest()}, f)
            self.assertEqual(ER.pin_problems(path, pin), [])
            with open(path, 'ab') as f:
                f.write(b'{"a": 2}\n')
            self.assertEqual(len(ER.pin_problems(path, pin)), 2)
            self.assertIn('missing', ER.pin_problems(os.path.join(d, 'none.jsonl'), pin)[0])


if __name__ == '__main__':
    unittest.main()
