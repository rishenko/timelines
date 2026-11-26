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

    def test_no_category_is_not_a_head(self):
        self.assertIsNone(judge(ER.head_by_evidence, feats([])))


class ConsortByEvidence(unittest.TestCase):
    CONS = [('consorts', 'Category:5th-century Byzantine empresses')]
    SAID = [('consort', 'Aelia Ariadne was Eastern Roman empress as the wife of Zeno')]

    def test_consort_category_and_lead(self):  # page: Aelia Ariadne
        self.assertIn('empresses', judge(ER.consort_by_evidence, feats(self.CONS, status=self.SAID)))

    def test_needs_both_and_no_category_of_the_row_s_monarchs(self):
        self.assertIsNone(judge(ER.consort_by_evidence, feats(self.CONS)))
        self.assertIsNone(judge(ER.consort_by_evidence, feats(HEAD + self.CONS, status=self.SAID)))  # a consort who also reigned in her own right


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
