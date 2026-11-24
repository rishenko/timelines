"""Tests for source_cache.py with inline fixtures (no network, no cache): python3 -I pipelines/common/test_source_cache.py"""
import os
import sys
import tempfile
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import settings  # noqa: E402
import source_cache as sc  # noqa: E402


def stops(fn):
    try:
        fn()
    except SystemExit as e:
        return str(e)
    raise AssertionError('expected the build to stop')


def test_plain():
    assert sc.plain('<p>A&nbsp;test (  with  <b>tags</b> ) , ok</p><script>x()</script>') == 'A test (with tags), ok'
    assert sc.plain('it’s') == "it's"


def test_phrase_finds_and_limits():
    text = 'The Dresser Formation hosts some of Earth\'s earliest convincing evidence of life in the Pilbara of Western Australia.'
    p = sc.phrase(text, 'earliest convincing evidence', 'x')
    assert 'earliest convincing evidence' in p and len(p.replace('…', '').split()) <= 14
    assert 'does not hold' in stops(lambda: sc.phrase(text, 'a phrase that is absent', 'x'))
    long = ' '.join(['w'] * 16)
    assert 'longer than 14' in stops(lambda: sc.phrase(long, long, 'x'))


def test_quote_starts_at_the_sentence():
    t = 'Earlier text here. The unit dates to 66.0 Ma and ends later on in the record of the section.'
    q = sc.quote(t, '66.0 Ma', 'x')
    assert q.startswith('The unit dates')


def test_surnames_and_paper_source():
    assert sc.surnames('Smith AB, Van Der Berg C, Lee D.') == ['Smith', 'Van Der Berg', 'Lee']
    with tempfile.TemporaryDirectory() as d:
        settings.DATA = d
        sc._CACHE.clear()
        os.makedirs(os.path.join(d, 'europepmc'))
        rec = {'authorString': 'Smith AB, Lee D.', 'pubYear': '2010', 'title': 'A title.', 'abstractText': '<p>Dated <i>470 Ma</i>.</p>',
               'journalInfo': {'volume': 12, 'journal': {'title': 'Nature'}}, 'pageInfo': '1-5'}
        json.dump(rec, open(os.path.join(d, 'europepmc', '10.1_x.json'), 'w'))
        key, src = sc.paper_source('10.1/x', '2026-01-01')
        assert key == 'p-smith-2010' and src['name'] == 'Smith & Lee (2010), A title, Nature 12: 1-5'
        assert src['url'] == 'https://doi.org/10.1/x' and src['accessed'] == '2026-01-01' and src['tags'] == ['journal']
        assert sc.paper_text('10.1/x') == 'Dated 470 Ma.'
        assert sc.fetch_paper('10.1/x') == 'have'  # a cached record is never fetched again
        assert sc.si_source('homo-sapiens', '2026-01-01')[0] == 'si-homo-sapiens'


def test_missing_cache_stops():
    with tempfile.TemporaryDirectory() as d:
        settings.DATA = d
        sc._CACHE.clear()
        assert 'not cached' in stops(lambda: sc.paper_text('10.9/none'))
        assert 'not cached' in stops(lambda: sc.oa_text('PMC1'))
        assert 'not cached' in stops(lambda: sc.si_text('nothing'))


if __name__ == '__main__':
    for name, fn in sorted(globals().items()):
        if name.startswith('test_'):
            fn()
    print('source_cache: ok')
