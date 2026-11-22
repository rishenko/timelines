"""
Unit 7 key events (2026-11-22): events of 1900–1945 that history courses teach (AP World History Unit 7, "Global
Conflict") and Modern States lacked. Events only, on existing state rows: no new rows, phases or memberships.

Rows follow the union-event rule (docs/data-format.md): an event goes on the rows that acted as themselves, or whose
membership or phase it began or ended.

Every date cites its article and field. Whole years only (days and months aren't in the app yet); the day sits in the
citation. A field the extractor can't read (a date template it strips) is cited by hand with H(), which checks the raw
field still holds the year on every run, so a later dump that changes it stops the build.

PILOT (2026-11-22): the Holocaust, the Treaty of Versailles, the attack on Pearl Harbor. Kevin approved it with
the recommended answers (Holocaust on Germany and Poland, from the infobox's 1941; Versailles as one event), then the
rest: the Armenian genocide, the Great Depression, the Holodomor, Munich, Nanjing, Stalingrad, the Normandy landings.
"""

SHARED = {}


def tracks(M):
    return []


def H(M, year, title, field, shown):
    """A hand claim for an infobox field the extractor reads as empty (a date template): checks the raw wikitext."""
    import mwparserfromhell as mw
    import wp_states
    M.G.art(title)  # refuses missing and AI-flagged pages, registers the source
    code = mw.parse(wp_states.wp_dump.page(title)['text'])
    for t in code.filter_templates(recursive=True):
        if wp_states.tname(t).startswith('infobox') and t.has(field):
            raw = str(t.get(field).value)
            if str(year) not in raw:
                raise SystemExit(f'{title}: infobox {field} no longer holds {year}: {raw[:80]!r}')
            return year, M.G.ref(title, f'infobox {field}: {shown}')
    raise SystemExit(f'{title}: no infobox {field}')


def events(M):
    holo, holo_ref = M.W('The Holocaust')
    ph, ph_ref = M.W('Attack on Pearl Harbor')
    ver, ver_ref = H(M, 1919, 'Treaty of Versailles', 'date_signed', '28 June 1919')
    arm, arm_ref = M.W('Armenian genocide')
    dep, dep_ref = M.W('Great Depression')
    hol, hol_ref = M.W('Holodomor', 'period')
    mun, mun_ref = M.W('Munich Agreement')
    nan, nan_ref = M.W('Nanjing Massacre')
    sta, sta_ref = M.W('Battle of Stalingrad')
    nor, nor_ref = M.W('Normandy landings')
    return [
        M.ev('armenian-genocide', 'Armenian genocide', arm[0], ['ottoman-empire'], arm_ref, end=arm[-1], importance=1,
             descr='During the First World War the Ottoman government massacres its Armenian subjects and sends them '
                   'on death marches to the Syrian desert.',
             links=[{'to': 'ww1', 'kind': 'related'}]),
        M.ev('great-depression', 'Great Depression', dep[0], ['united-states', 'germany'], dep_ref, end=dep[-1], importance=1,
             descr='A worldwide economic collapse that begins with the Wall Street crash of October 1929; mass '
                   'unemployment in Germany helps bring the Nazis to power.'),
        M.ev('holodomor', 'Holodomor', hol[0], ['soviet-union', 'ukraine'], hol_ref, end=hol[-1], importance=1,
             descr='A man-made famine in Soviet Ukraine, caused by forced collectivization and grain requisitions '
                   'under Stalin; millions die.'),
        M.ev('munich-agreement', 'Munich Agreement', mun[0], ['germany', 'united-kingdom', 'france', 'italy', 'czechoslovakia'], mun_ref,
             importance=1,
             descr='Britain, France and Italy let Germany annex the Sudetenland from Czechoslovakia, which was not '
                   'invited; the high point of appeasement.',
             links=[{'to': 'german-occupation-of-czechoslovakia', 'kind': 'causes'}]),
        M.ev('nanjing-massacre', 'Nanjing Massacre', nan[0], ['japan', 'china'], nan_ref, end=nan[-1], importance=1,
             descr='After taking Nanjing, the Chinese capital, in December 1937, Japanese troops murder and rape '
                   'civilians and prisoners of war for about six weeks.',
             links=[{'to': 'ww2', 'kind': 'part-of'}]),
        M.ev('battle-of-stalingrad', 'Battle of Stalingrad', sta[0], ['germany', 'soviet-union'], sta_ref, end=sta[-1], importance=1,
             descr='The Soviet Red Army defeats the German siege of Stalingrad, a turning point of the war on the '
                   'Eastern Front.',
             links=[{'to': 'ww2', 'kind': 'part-of'}]),
        M.ev('normandy-landings', 'Normandy landings', nor[0], ['united-states', 'united-kingdom', 'canada', 'germany', 'france'], nor_ref,
             importance=1,
             descr='On D-Day, 6 June 1944, Allied forces land in German-occupied France and open a second front in '
                   'western Europe.',
             links=[{'to': 'ww2', 'kind': 'part-of'}]),
        M.ev('holocaust', 'The Holocaust', holo[0], ['germany', 'poland'], holo_ref, end=holo[-1], importance=1,
             descr='Nazi Germany and its collaborators murder about six million European Jews, most of them in '
                   'occupied Poland, along with millions of others they persecuted.',
             links=[{'to': 'ww2', 'kind': 'part-of'}]),
        M.ev('treaty-of-versailles', 'Treaty of Versailles', ver, ['germany', 'france', 'united-kingdom', 'united-states', 'italy', 'japan'],
             [ver_ref, M.lead('Paris Peace Conference (1919–1920)', 'in 1919 and 1920')], importance=1,
             descr='Signed on 28 June 1919 at the Paris Peace Conference, where the victorious Allies set the terms '
                   'for the defeated Central Powers; Germany loses territory and its colonies and must pay reparations.',
             links=[{'to': 'ww1', 'kind': 'succeeds'}]),
        M.ev('pearl-harbor', 'Attack on Pearl Harbor', ph[0], ['japan', 'united-states'], ph_ref, importance=1,
             descr='Japan strikes the US Pacific Fleet on 7 December 1941; the United States enters the Second World War.',
             links=[{'to': 'ww2', 'kind': 'part-of'}]),
    ]
