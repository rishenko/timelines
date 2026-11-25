"""
Headline-date rulings for the generated timelines. The rulings themselves (question, headline, the claims kept and why) live in
rulings.json; this module turns a ruling's kept claims into the generators' claim lists, so a row that sits on two timelines
(Songhai) gets the same dates on both. Every quotation was checked against the 2026-11-01 Wikipedia dump (raw wikitext, no AI
notice) or the page itself on 2026-11-24. The Polish Golden Age ruling (date-polish-golden-age-end) is applied in periods.json.
"""
import rulings as RU
import wp_claims as G


def claims(rid):
    """The ruling's kept claims as {year, margin?, source, note}: a Wikipedia page's source through wp_claims, any other source
    from the ruling's own `sources` (registered once)."""
    r = RU.get(rid)
    for key, s in r.get('sources', {}).items():
        G.SOURCES.setdefault(key, s)
    out = []
    for c in r['kept']:
        source = G.ref(c['page'], c['location']) if 'page' in c else {'sourceKey': c['sourceKey'], 'sourceLocation': c['location']}
        out.append({'year': c['year'], **({'margin': c['margin']} if 'margin' in c else {}), 'source': source, 'note': c['note']})
    return out


def songhai_start():
    return claims('date-songhai-start')


def gao_end():
    return claims('date-gao-end')
