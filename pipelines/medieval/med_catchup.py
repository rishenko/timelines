"""
Catch-up pass (Kevin, 2026-11-21): rows Modern States added that cross 1500, added to Medieval from Modern's committed
build (med_europe.modern_seam()). For each row: its typed lifespan (copied as it is, with its claims and sources) and the
phases that overlap 650-1500; its own article's infobox events from 650-1500 (med_europe.all_events); a region
membership cited to the article's infobox capital. Modern's memberships are left out: they name rows Medieval doesn't
have (the Portuguese and British empires) or start after 1500. The list is the brief's "Catch-up pass" section.
"""
import json
import urllib.parse

import med_europe as X

# id -> (parent group in Medieval, geography facet value)
ROWS = {
    'terra-mariana': ('northern-europe', 'northern-europe'),
    'kartli': ('anatolia', 'caucasus'), 'kakheti': ('anatolia', 'caucasus'), 'imereti': ('anatolia', 'caucasus'),
    'beylik-of-dulkadir': ('anatolia', 'anatolia'), 'ramadanid-emirate': ('anatolia', 'anatolia'),
    'oman': ('arabia', 'arabia'), 'sharifate-of-mecca': ('arabia', 'arabia'), 'tahirid-sultanate': ('arabia', 'arabia'),
    'kathiri': ('arabia', 'arabia'), 'sultanate-of-tuggurt': ('maghreb', 'north-africa'),
    'kingdom-of-kumaon': ('northwest-india', 'south-asia'), 'maldives': ('south-india-group', 'south-asia'),
    'calicut-kingdom': ('south-india-group', 'south-india'), 'kingdom-of-mysore': ('south-india-group', 'south-india'),
    'nayakas-of-keladi': ('south-india-group', 'south-india'),
    # Modern wave 5 (71e7b76)
    'turpan-khanate': ('central-asia-steppe', 'central-asia'),
    'mrauk-u': ('mainland-se-asia', 'mainland-sea'), 'prome-kingdom': ('mainland-se-asia', 'mainland-sea'),
    'patani-kingdom': ('maritime-se-asia', 'maritime-sea'), 'tondo': ('maritime-se-asia', 'maritime-sea'),
    'maynila': ('maritime-se-asia', 'maritime-sea'), 'sunda-kingdom': ('maritime-se-asia', 'maritime-sea'),
    'sultanate-of-cirebon': ('maritime-se-asia', 'maritime-sea'), 'aceh-sultanate': ('maritime-se-asia', 'maritime-sea'),
    'sultanate-of-ternate': ('maritime-se-asia', 'maritime-sea'), 'sultanate-of-gowa': ('maritime-se-asia', 'maritime-sea'),
    'sultanate-of-maguindanao': ('maritime-se-asia', 'maritime-sea'),
    # Modern wave 6 (df77c93)
    'peten-itza-kingdom': ('mesoamerica', 'maya-region'),
    'dominican-republic': ('north-america', 'caribbean'),
    # Modern wave 7a (b6070a5)
    'oyo-empire': ('west-africa-group', 'west-africa'), 'kingdom-of-kano': ('west-africa-group', 'west-africa'),
    'waalo': ('west-africa-group', 'west-africa'), 'saloum': ('west-africa-group', 'west-africa'),
    'sultanate-of-agadez': ('west-africa-group', 'sahara'), 'kingdom-of-ardra': ('west-africa-group', 'west-africa'),
    'ghana': ('west-africa-group', 'west-africa'), 'cape-verde': ('west-africa-group', 'west-africa'),
    'tio-kingdom': ('central-africa', 'africa'), 'mwene-muji': ('central-africa', 'africa'),
    'kingdom-of-bamum': ('central-africa', 'africa'), 'mbunda-kingdom': ('central-africa', 'africa'),
    'sao-tome-and-principe': ('central-africa', 'africa'),
    # Modern wave 7b (4e174ca); rwanda left out (best start c. 1650, after the range; brief, overnight calls)
    'medri-bahri': ('horn-east-africa', 'horn-of-africa'), 'kingdom-of-kaffa': ('horn-east-africa', 'horn-of-africa'),
    'kingdom-of-yamma': ('horn-east-africa', 'horn-of-africa'), 'kingdom-of-wolaita': ('horn-east-africa', 'horn-of-africa'),
    'majeerteen-sultanate': ('horn-east-africa', 'horn-of-africa'), 'shilluk-kingdom': ('horn-east-africa', 'east-africa'),
    'kingdom-of-karagwe': ('horn-east-africa', 'east-africa'), 'buganda': ('horn-east-africa', 'east-africa'),
    'ankole': ('horn-east-africa', 'east-africa'),
    'maravi': ('southern-africa-group', 'southern-africa'), 'angoche-sultanate': ('southern-africa-group', 'southern-africa'),
    # Modern wave 8 (0ea585e)
    'kingdom-of-easter-island': ('oceania-group', 'polynesia'),
}


def build(mod, tracks):
    M = mod
    mod_data = X.modern_seam()
    mrows = {t['id']: t for t in mod_data['tracks']}
    out = list(tracks)
    for id_, (parent, region) in ROWS.items():
        m = mrows.get(id_)
        if not m:
            raise SystemExit(f'catch-up: {id_} is not in Modern States at {X.MODERN_COMMIT}')
        title = urllib.parse.unquote(m['url'].rsplit('/', 1)[1]).replace('_', ' ')
        t = {'id': id_, 'name': m['name'], 'color': m['color'], 'parent': parent, 'url': m['url']}
        if m.get('ids'):
            t['ids'] = m['ids']
        if m.get('span'):
            t['span'] = X._strip(m['span']) if not isinstance(m['span'], list) else [X._strip(s) for s in m['span']]
        phases = [X._strip(p) for p in m.get('phases', []) if p['start'] <= X.HI and (p.get('ongoing') or p['end'] >= X.LO)]
        if phases:
            t['phases'] = phases
        X._copy_sources(t, mod_data['sources'])
        t['memberships'] = [M.region(region, X.capital(title))]
        X.all_events(title, id_)
        M.REPORT.append(f'  {m["name"]} ({id_}) from Modern States (catch-up)')
        # place it after the last row already under its parent group
        idx = max(i for i, x in enumerate(out) if x['id'] == parent or x.get('parent') == parent)
        out.insert(idx + 1, t)
    # The breakup of the Kingdom of Georgia (1490) also belongs on Georgia's row
    for title, y in (('Georgia (Kartli) recognizes independence', 1490), ('Independence from Georgia', 1490)):
        X.on(X.find(title, y), 'georgia')
    X.EVENTS[X.find('Nabhani dynasty', 1154)]['title'] = 'Nabhani dynasty rules Oman'
    u = X.find('part of the Jolof Empire', 1350)
    X.EVENTS[u]['title'] = 'Waalo becomes part of the Jolof Empire'
    X.on(u, 'jolof-empire')
    X.on(X.find('Bornu suzerainty and opening of trade routes', 1438), 'bornu-empire')
    return out
