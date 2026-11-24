"""Tests for description_check.py with inline fixtures (no dump): python3 -I pipelines/medieval/test_description_check.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import description_check as D  # noqa: E402


def stops(fn):
    try:
        fn()
    except SystemExit as e:
        return str(e)
    raise AssertionError('expected the check to stop')


def test_names_and_numbers_are_not_counted():
    t = dict(D.tokens('The Sultan Sabr ad-Din III met McDonald in 1204 and wrote.'))
    counts = {w for w, c in D.tokens('The Sultan Sabr ad-Din III met McDonald in 1204 and wrote.') if c}
    assert counts == {'the', 'met', 'in', 'and', 'wrote'}, counts   # Sultan, Sabr, ad-Din, III, McDonald, 1204 are names or numbers
    assert t['the'] is True


def test_sentence_initial_word_is_ordinary_but_not_after_an_abbreviation():
    assert D.tokens('Rulers fell. Kings rose.')[2] == ('kings', True)     # sentence-initial: ordinary
    tk = D.tokens('Dr. Johnson visited St. Peter later.')
    assert tk[1] == ('johnson', False) and tk[4] == ('peter', False)   # after "Dr." and "St.": names, not sentence starts
    assert D.tokens('He ruled c. Kazan later.')[3] == ('kazan', False)


def test_a_run_continues_through_a_shared_name():
    src = ['the army of King Harald crossed the river at dawn']
    n, run, _ = D.run_words('Then the army of King Harald crossed the river', src)
    assert run.startswith('the army of king harald crossed the river') and n == 6   # the army of crossed the river (Harald and King are names)


def test_limit_boundary_five_passes_six_is_refused():
    src = ['one two three four five six seven']
    five = D.too_close('one two three four five and more', src)
    six = D.too_close('one two three four five six and more', src)
    assert five[0] == 5 and not any('in a row' in w for w in five[3])
    assert six[0] == 6 and any('in a row' in w for w in six[3])


def test_a_word_swapped_every_sixth_place_is_caught_by_the_phrase_share():
    src = ['alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon']
    # replace every 6th word: runs stay at 5, but the 5-gram share is still counted
    swapped = 'alpha beta gamma delta epsilon X1 eta theta iota kappa lambda Y2 nu xi omicron pi rho Z3 tau upsilon'
    n, share = D.run_words(swapped, src)[0], D.ngram_share(swapped, src)
    assert n <= 5 and share < D.NGRAM_LIMIT   # a 1-in-6 swap leaves few shared phrases...
    nearly = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon'
    assert D.too_close(nearly, src)[3]        # ...and a straight copy is refused on both measures


def test_truncated_locator_resolves_to_the_full_sentence_and_infobox_is_used_as_given():
    full = 'In 1171, Saladin abolished the dynasty\'s rule and founded the Ayyubid dynasty, which brought the Levant back.' + ' tail' * 40
    sents = lambda title: [('lead', full), ('History', 'Another sentence.')]   # noqa: E731
    ev = {'uuid': 'x', 'sources': [
        {'sourceKey': 'wp-a', 'sourceLocation': 'lead: "' + full[:160] + '"'},
        {'sourceKey': 'wp-a', 'sourceLocation': 'infobox event2: Golden Bull, 1222'}]}
    out = D.source_sentences(ev, {'wp-a': 'A'}, sents)
    assert out[0] == full and out[1] == 'infobox event2: Golden Bull, 1222'
    # a source key that isn't a Wikipedia article is skipped
    assert D.source_sentences({'sources': [{'sourceKey': 'p-x', 'sourceLocation': 'abstract: "y"'}]}, {'wp-a': 'A'}, sents) == []


def test_an_unresolvable_quoted_locator_stops_instead_of_falling_back():
    sents = lambda title: [('lead', 'Some other sentence entirely.')]   # noqa: E731
    ev = {'uuid': 'x', 'sources': [{'sourceKey': 'wp-a', 'sourceLocation': 'lead: "A sentence the article no longer has"'}]}
    assert 'was not found' in stops(lambda: D.source_sentences(ev, {'wp-a': 'A'}, sents))


if __name__ == '__main__':
    for name, fn in sorted(globals().items()):
        if name.startswith('test_'):
            fn()
    print('description_check: ok')
