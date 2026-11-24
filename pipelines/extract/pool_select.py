"""
The pre-1500 reigns pool (Kevin approved a pool of reigns the rulers pass found beyond the committed ones; pass 9): which of them are added, and which
are held and why. Reads dry freezes (reigns_freeze.py --out) of the final full rulers run and writes, per timeline, the freeze file without the held
reigns (for extra_reigns_freeze.py --from-freeze) and one held list.

    pipelines/extract/.venv/bin/python -I pipelines/extract/pool_select.py --timeline medieval --freeze FILE --held HELD.json --out FILTERED.json

Held (listed with the reason; none is added):
  - no end: the span would show as one year;
  - Wallachia's rows (they have their own pilot);
  - a span that joins two chronologies (reigns_freeze.merged_chronologies);
  - scope calls Kevin has not ruled on (the held list says which): sub-horde, Astrakhan, Crimean and Kazan khans on the Golden Horde row; the other half
    of the Roman Empire's rulers and usurpers on the Eastern Roman row (Western emperors, usurpers in Britain, Gaul and Hispania).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'common'))
import reigns_freeze as F  # noqa: E402
import wp_dump  # noqa: E402

SUBHORDE = re.compile(r'khans? of (?:the )?(?:White|Blue|Great|Nogai) Horde|ruler of the (?:White|Blue|Great) Horde|Khanate of Astrakhan|Mahmud Astrakhani|Khan of (?:the )?(?:Crimean|Kazan) Khanate|Khan of the Khanate of Kazan', re.I)  # the lead's own description of the office, not a passing mention (Tokhtamysh "consolidating the Blue and White Hordes" is a Golden Horde khan)
OTHER_HALF = re.compile(r'usurper|Western Roman (?:emperor|Empire)|emperor of the West|Roman Britain|Hispania|\bin Gaul\b', re.I)


def lead(title):
    """The article's first paragraph of prose (templates, references and link markup removed), up to 900 characters."""
    pg = wp_dump.page(title)
    tx = (pg or {}).get('text', '')
    for _ in range(4):
        tx = re.sub(r'\{\{[^{}]*\}\}', '', tx)
    tx = re.sub(r'<ref[^>]*?/>|<ref.*?</ref>', '', tx, flags=re.S)
    tx = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', tx)
    tx = tx.replace("'''", '').replace("''", '')
    m = re.search(r'\n([^\n=|{}*\[][^\n]{80,})', tx)
    return re.sub(r'\s+', ' ', m.group(1))[:900] if m else ''


DOUBT = re.compile(r'only primary source|only source|the only (?:contemporary )?(?:attestation|evidence)|hypothesis of his existence|existence is (?:uncertain|doubtful|disputed|hypothetical)|known only from|attested only|possibly legendary|legendary', re.I)
SEVERAL = re.compile(r'\b(?:two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:men|brothers|sons|kings|rulers|emperors|khans|princes)\b[^.]{0,80}(?:ruled|reigned|succession)|in succession between', re.I)
FROM_TO = re.compile(r'from (?:c\. |circa |about )?(\d{3,4}) (?:to|until|till) (?:c\. |circa |about )?(\d{3,4})', re.I)
YEAR = re.compile(r'\b(\d{3,4})\b')
OFFICE = re.compile(r'\b(?:king|queen|emperor|empress|tsar|tsarina|sultan|sultana|khan|khagan|qaghan|caliph|pharaoh|prince|princess|duke|voivode|hospodar|emir|amir|shah|maharaja|raja|chaopha|doge|monarch|basileus|negus|ruler|sapa inca|chief(?:tain)?|lord of|governor-?general of the (?:realm))\b', re.I)
SUBORD = re.compile(r'\bserved\b[^.]{0,90}\bas\b|illegitimate son|claimants?\b|magnate|governor|viceroy|\bban of\b|feudal lord|retired|\bregent\b|\bwas an? (?:general|commander|noble|nobleman|courtier|official|aristocrat)\b', re.I)


def span_sanity(e, loc, text):
    """The five span-sanity checks (AD spans only): returns the hold reason or None. A lead is the article's first ~600 characters.
    (a) a start that is a year/day alternative pair read as a year: Frederick II's \"1196/5 December 1212\" (elected king as a child in 1196, reigning from 1212). A general
        \"started in childhood\" rule held nine real child kings (Afonso I, Chlothar III, Baldwin II), so it is not used;
    (b) a sliver of a week or less, unless the quote says it was one of the ruler's reigns (Sejo's 1-2 October 1468);
    (c) a span that covers several people (the five sons of Yagbe'u Seyon);
    (d) a span disjoint from the lead's single \"from X to Y\" (first sentence, one office) (Halsten Stenkilsson: lead 1067-1070, span 1079-1081);
    (e) a ruler whose lead says his existence rests on one source (Chararic, Theodemund);
    (f) a positive check: the lead's first sentence must name a head-of-state office and no subordinate role (Dejan the sevastokrator, John Corvinus the ban,
        Petar Snacic the claimant fail it). A lead that cannot be read holds the row."""
    lead600 = text[:600]
    if not text:
        return 'no lead text to check the office against'
    sent = re.split(r'(?<=[a-z0-9)])\.\s', re.sub(r'\([^)]*\)', ' ', lead600).strip(), 1)[0]
    if not OFFICE.search(sent) or SUBORD.search(sent):
        return 'the lead\'s first sentence does not describe a head of state of this row (a magnate, governor, claimant, regent or retired ruler)'
    if DOUBT.search(lead600):
        return 'held-doubtful: the lead says his existence rests on one source or a hypothesis'
    if SEVERAL.search(lead600):
        return 'the span covers several people (the lead names a group that ruled in succession)'
    if e['start'] <= 0:
        return None
    m = re.search(r'\(([^)]*)\)', lead600)
    paren = m.group(1) if m else ''
    body = lead600.replace(paren, ' ', 1)
    sm, sd, em, ed = e.get('startMonth'), e.get('startDay'), e.get('endMonth'), e.get('endDay')
    if e.get('end') == e['start'] and sm and sm == em and sd and ed and abs(ed - sd) <= 7 and not re.search(r'\b(?:1st|2nd|3rd|\dth|first|second|third) reign\b|\breign\d', loc, re.I):
        return 'a sliver of a week or less: the holder\'s real reign is elsewhere'
    first = re.split(r'(?<=[a-z0-9)])\.\s', body.strip(), 1)[0]  # the lead's first sentence: it holds the one reign statement, one office and no other year
    nth = re.search(r'\b(?:1st|2nd|3rd|\dth|first|second|third) reign\b|\breign\d', loc, re.I)  # a numbered reign is one of several: the lead's range need not be this one
    mf = FROM_TO.findall(first)
    if not nth and len(mf) == 1 and len(set(YEAR.findall(first))) == 2 and not re.search(r'\b(?:again|twice|second|third|and from|onward|and (?:Duke|King|Prince|Grand|Count|Emperor))\b', first, re.I):
        a, b = int(mf[0][0]), int(mf[0][1])
        if e['start'] > b + 1 or (e.get('end') or e['start']) < a - 1:  # disjoint from the lead's own reign (a span inside or touching it is a part of it)
            return f"the span {e['start']}-{e.get('end')} does not meet the lead's own {a}-{b}"
    if re.search(r'\b\d{4}/\d{1,2}\s+[A-Za-z]+\s+\d{4}', loc):
        return 'the start reads an alternative pair ("1196/5 December 1212") as a year: an election as a child, the reign from the later date'
    return None


def flag(n):
    return sys.argv[sys.argv.index(n) + 1]


def main():
    tl = flag('--timeline')
    data = json.load(open(flag('--freeze')))
    committed = json.load(open(os.path.join(F.ROOT, 'pipelines', F.OUT[tl], 'reigns.json')))
    xp = os.path.join(F.ROOT, 'pipelines', F.OUT[tl], 'extra-reigns.json')
    have = {e['uuid'] for e in committed['events']} | ({e['uuid'] for e in json.load(open(xp))['events']} if os.path.exists(xp) else set())
    held, keep = [], []
    for e in data['events']:
        if e['uuid'] in have:
            continue
        r = data['review'][e['uuid']]
        why = None
        if r['row'] == 'wallachia':
            continue  # its own pilot, not part of this pool
        loc = e['sources'][0]['sourceLocation']
        if e.get('end') is None:
            why = 'no end read: shown as one year'
        elif F.merged_chronologies(e, loc):
            why = 'span joins two chronologies'
        else:
            text = lead(r.get('cited') or r['person'])
            why = span_sanity(e, loc, text)
            if why:
                pass
            elif r['row'] == 'golden-horde' and SUBHORDE.search(text[:260]):
                why = 'scope call: sub-horde, Astrakhan, Crimean or Kazan khan on the Golden Horde row'
            elif r['row'] == 'eastern-roman' and OTHER_HALF.search(e['title'] + ' ' + loc + ' ' + text):
                why = "scope call: the other half's ruler or a usurper outside the East, on the Eastern Roman row"
        if why:
            held.append({'uuid': e['uuid'], 'row': r['row'], 'person': r['person'], 'title': e['title'], 'start': e['start'], 'end': e.get('end'), 'quote': loc, 'why': why})
            r['toCheck'] = list(r['toCheck']) + ['HELD: ' + why]
        else:
            keep.append(e['uuid'])
    json.dump(data, open(flag('--out'), 'w'), ensure_ascii=False)
    json.dump(held, open(flag('--held'), 'w'), ensure_ascii=False, indent=1)
    print(f'{tl}: {len(keep)} in the pool, {len(held)} held: ' + ', '.join(f'{k} {v}' for k, v in sorted(__import__("collections").Counter(h["why"].split(":")[0] for h in held).items())))


if __name__ == '__main__':
    main()
