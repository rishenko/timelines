"""Head-of-state offices of party-states whose titles carry a word NOT_HEAD rejects ("Soviet of", "committee", "council") and no
RULER_WORD (rulers.py): the heads Wikipedia's lists give by these titles (Soviet Union, Poland, Bulgaria, East Germany, Cuba, North Korea,
Hungary, Albania, Mongolia, Vietnam). China's Standing Committee of the National People's Congress is left out: it was the head of state only 1975-82, and a title pattern cannot clip its 1959-75 chairs. The pattern is anchored at the start of the office text, so
"Deputy Chairman of the Presidium" and party bodies stay out; the republics' own presidiums (RSFSR, Ukrainian SSR…) are not the union's head."""
import re

HEAD_OFFICE = re.compile(r'^\s*(?:\d+(?:st|nd|rd|th)\s+)?(?:co-)?(?:chair(?:man|woman|person)?|president)\s+of\s+the\s+'
                         r'(?:presidium\s+of\s+the\s+(?:supreme\s+soviet|central\s+executive\s+committee|national\s+assembly|people.s\s+assembly|people.s\s+republic|'
                         r'(?:great|little)\s+(?:people.s\s+)?khural|supreme\s+people.s\s+assembly)(?!.*\b(?:sfsr|ssr|russian|ukrainian|byelorussian|belarusian)\b)|'
                         r'council\s+of\s+state\b|state\s+council\b|state\s+national\s+council\b|presidential\s+council\b|provisional\s+presidency\b|'
                         r'state\s+affairs\s+commission\b|standing\s+committee\s+of\s+the\s+supreme\s+people)', re.I)


class _OrHead:
    """A word filter with the HEAD_OFFICE titles added: `ruler` also accepts them, `not_head` no longer rejects them."""
    def __init__(self, words, mode):
        self.words, self.mode = words, mode

    def search(self, text):
        head = HEAD_OFFICE.search(text or '') is not None
        found = self.words.search(text or '') is not None
        return found or head if self.mode == 'ruler' else found and not head




def wrap(ruler_word, not_head):
    """(ruler_word, not_head) with the HEAD_OFFICE titles added."""
    return _OrHead(ruler_word, 'ruler'), _OrHead(not_head, 'not_head')
