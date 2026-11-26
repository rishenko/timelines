"""
The ruler verdict, the third level under the category `reign` (wave 3 E; Workbench "2026-11-24 Timelines ruler data retro and
rules" §4-5b, Kevin: "Verdict as the level"). One verdict per reign, from the rule that decided it. The first five count as "who
ruled"; the rest are drawn on the row, marked, and never answer "who ruled in year X". A reign with no verdict yet stays plain
`reign` (today's data, until the rules run). The app keys on these ids (src/lib/reignLane.ts RULED), and any other value under
`reign` counts as not ruled there, so a new verdict is safe before the app knows it.
{id: (name in the Filters panel, counts as who ruled, definition)}
"""
VERDICTS = {
    'head': ('Head of state', True, 'R1: the office is the head-of-state office of the row\'s realm (king, emperor, president of the state, sultan…).'),
    'acting': ('Acting or interim', True, 'R5: an acting or interim holder of the head-of-state office (marked acting, as Wikipedia does).'),
    'co-ruler': ('Co-ruler', True, 'R6: one of two holders of the same office in the same years, each holding authority.'),
    'usurper': ('Usurper', True, 'R10: a usurper who passes the Roman test (absolute and undisputed power, or proclaimed or recognised by a legitimate senior emperor or the Senate).'),
    'regency': ('Regent as sole ruler', True, 'R4: a regent, kept only where no monarch reigned on the row in those years.'),
    'consort': ('Consort', False, 'R2: a consort (unless she reigned in her own right).'),
    'party-office': ('Party office', False, 'R7: the office names a party, union, front or movement, and no state.'),
    'other-realm': ('Ruler of another realm', False, 'R8: the office is another row\'s realm\'s, not this row\'s.'),
    'de-facto': ('De facto leader', False, 'R16: a party-state\'s leader shown on the country row (a named office, such as general secretary), marked de facto; never a head of state, so outside head-of-state counts and one-ruler-at-a-time checks.'),
    'unclassified': ('Unclassified', False, 'R14: no rule decides (an unclear office, sources that disagree on who ruled, ambiguous legitimacy).'),
}
RULED = {v for v, (_, ruled, _) in VERDICTS.items() if ruled}

# The verdicts of the ruler definition (Workbench "2026-11-25 Timelines ruler definition (Fable)", Kevin took all five recommendations, 2026-11-25) that
# VERDICTS does not have yet. The reign-rules stage and the verdict rulings may use them; the data may not until the data PR moves them into VERDICTS
# (they would add category values to the compiled timelines). None answers "who ruled". The two that would (under mandate, under occupation) wait
# for the app's RULED (src/lib/reignLane.ts) to learn them.
NEXT = {
    'representative': ('Representative of another state', False, 'Governors, governors-general, viceroys, residents and high commissioners: the office is another state\'s, exercised on its behalf (office test).'),
    'other-office': ('Another office', False, 'The cited block is another office of the person (a minister, a seat, a junior, a member of a collective head): fixed to the right block, or not a reign.'),
    'claimant': ('Claimant', False, 'Held the title and never the seat of government: shown marked, never answers "who ruled".'),
    'exile': ('Government in exile', False, 'Held the office abroad only: shown marked; counts only if the row has no occupant at home.'),
    'rival': ('Rival line', False, 'A breakaway or rival line on a parent row, with no row of its own: shown marked, never counts.'),
    'traditional': ('Traditional or legendary ruler', False, 'A traditional or legendary ruler, or one dated only to a half-century: shown marked, never counts.'),
    'ceremonial': ('Ceremonial head', False, 'The formal head beside an effective office held by another (emperor beside shōgun): shown marked.'),
}
