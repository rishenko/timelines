"""
Cycle rows for Earth and Life (PILOT, 2026-11-24; Track.cycle, draft schema v11: a period plus a start point).

Each cycle is a row in a "Cycles" group that opens collapsed. Its period rests on a Wikipedia sentence read from the
dump (gen_earth_life.wp: the sentence must hold the figure) and on a NASA or NOAA page. Those pages are not in the
dump: their sentences were read on the date in ACC_WEB and are kept here word for word, so the generator stays
re-runnable offline; re-check them by hand when the page is refreshed.

Anchors: the solar cycle's is a convention the sources give (solar cycle 1, from 1755). The others have no start date
in the sources; they are counted from the present (1950 in this file's calendar), and their anchor claim says so.
"""

ACC_WEB = '2026-11-23'

# the non-Wikipedia sources (official science agencies)
WEB_SOURCES = {
    'nasa-milankovitch': {
        'name': "NASA Science Editorial Team (2020, updated 2024), Milankovitch (Orbital) Cycles and Their Role in Earth's Climate",
        'url': 'https://science.nasa.gov/science-research/earth-science/milankovitch-orbital-cycles-and-their-role-in-earths-climate/',
        'author': 'NASA Science Editorial Team', 'year': '2020', 'accessed': ACC_WEB, 'tags': ['agency'],
    },
    'nasa-solar-system-facts': {
        'name': 'NASA Science, Solar System Facts',
        'url': 'https://science.nasa.gov/solar-system/solar-system-facts/',
        'author': 'NASA', 'year': '2026', 'accessed': ACC_WEB, 'tags': ['agency'],
    },
    'nasa-spaceplace-solar-cycle': {
        'name': 'NASA Space Place, What Is the Solar Cycle?',
        'url': 'https://spaceplace.nasa.gov/solar-cycles/en/',
        'author': 'NASA', 'year': '2021', 'accessed': ACC_WEB, 'tags': ['agency'],
    },
    'noaa-swpc-solar-cycle': {
        'name': 'NOAA Space Weather Prediction Center, Sunspots/Solar Cycle',
        'url': 'https://www.spaceweather.gov/phenomena/sunspotssolar-cycle',
        'author': 'NOAA SWPC', 'accessed': ACC_WEB, 'tags': ['agency'],
    },
}


def web(key, quote):
    return {'sourceKey': key, 'sourceLocation': f'"{quote}"'}


FROM_PRESENT = ('A reference point, not a start: the sources give the period but no start date, so the repeats are '
                'counted back from the present (1950).')


def cycle_tracks(wp, present):
    """The Cycles group and its rows. `wp(title, needle, must)` cites a dump sentence holding `must`."""
    def from_present():
        return [{'year': present, 'note': FROM_PRESENT}]

    solar_wp = wp('Solar cycle', 'average duration of about 11 years', '11 years')
    solar_start = wp('Solar cycle', 'first numbered solar cycle', '1755')
    solar_noaa = web('noaa-swpc-solar-cycle', 'The total number of sunspots has long been known to vary with an approximately 11-year repetition known as the solar cycle.')
    solar_noaa_1 = web('noaa-swpc-solar-cycle', 'This number assignment began with solar cycle 1 in 1755.')
    solar_nasa = web('nasa-spaceplace-solar-cycle', 'The solar cycle is the cycle that the Sun’s magnetic field goes through approximately every 11 years.')

    prec_wp = wp('Axial precession', 'corresponds to a period of 25,772 years', '25,772')
    prec_nasa = web('nasa-milankovitch', 'The cycle of axial precession spans about 25,771.5 years.')

    ecc_wp = wp('Milankovitch cycles', 'loosely combine into a 100,000-year cycle', '100,000')
    ecc_nasa = web('nasa-milankovitch', '…approaching its least elliptic (most circular)… in a cycle that spans about 100,000 years.')
    ecc_long_wp = wp('Milankovitch cycles', 'occurs with a period of 405,000 years', '405,000')

    gal_wp = wp('Galactic year', 'One galactic year is approximately 225 million', '225 million')
    gal_sun = wp('Sun', 'about 225–250 million years to complete one orbit', '225–250')
    gal_nasa = web('nasa-solar-system-facts', 'It takes about 230 million years to complete one orbit around the galactic center.')

    solar_25 = web('noaa-swpc-solar-cycle', 'which also marked the beginning of Solar Cycle 25.')

    def row(id_, name, color, cycle, span=None):
        r = {'id': id_, 'name': name, 'color': color, 'kind': 'theme', 'parent': 'cycles'}
        if span:
            r['span'] = span
        r['cycle'] = cycle
        return r

    return [
        {'id': 'cycles', 'name': 'Cycles', 'color': '#7a7f8c', 'kind': 'theme'},
        # the solar cycle is drawn only from the numbered record (solar cycle 1, 1755) on: its lifespan bounds the
        # repeats (Architect, #140), so an 11-year rhythm isn't drawn back through deep time
        row('cycle-solar', 'Solar cycle (11 yr)', '#c9a227', span={
            'start': 1755, 'ongoing': True,
            'startDates': [{'year': 1755, 'month': 2, 'source': solar_start}],
            'ongoingSources': [solar_25],
        }, cycle={
            'period': 11, 'anchor': 1755, 'label': 'Solar cycle', 'anchorNumber': 1,
            'periodClaims': [{'years': 11, 'source': solar_wp, 'note': 'An average duration; single cycles differ.'},
                             {'years': 11, 'source': solar_noaa}, {'years': 11, 'source': solar_nasa}],
            'anchorDates': [{'year': 1755, 'month': 2, 'source': solar_start, 'note': 'A convention: Rudolf Wolf (1852) numbered the cycles from this one.'},
                            {'year': 1755, 'source': solar_noaa_1}],
            'sources': [solar_wp, solar_noaa],
        }),
        row('cycle-precession', 'Precession (25.8 kyr)', '#5b7fb5', {
            'period': 25772, 'anchor': present, 'label': 'Precession cycle',
            'periodClaims': [{'years': 25772, 'source': prec_wp, 'note': 'The present rate; the rate itself varies over time.'},
                             {'years': 25771.5, 'source': prec_nasa}],
            'anchorDates': from_present(),
            'sources': [prec_wp, prec_nasa],
        }),
        row('cycle-eccentricity', 'Eccentricity (100 kyr)', '#4f9d8a', {
            'period': 100000, 'anchor': present, 'label': 'Eccentricity cycle',
            'periodClaims': [{'years': 100000, 'source': ecc_wp, 'note': 'Several shorter components loosely combine into this cycle.'},
                             {'years': 100000, 'source': ecc_nasa}],
            'anchorDates': from_present(),
            'sources': [ecc_wp, ecc_nasa],
        }),
        row('cycle-eccentricity-long', 'Eccentricity (405 kyr)', '#3f7f6f', {
            'period': 405000, 'anchor': present, 'label': 'Long eccentricity cycle',
            'periodClaims': [{'years': 405000, 'source': ecc_long_wp, 'note': 'The major component of the eccentricity variations.'}],
            'anchorDates': from_present(),
            'sources': [ecc_long_wp],
        }),
        row('cycle-galactic-year', 'Galactic year (225 Myr)', '#8a6bb5', {
            'period': 225000000, 'anchor': present, 'label': 'Galactic year',
            'periodClaims': [{'years': 225000000, 'source': gal_wp},
                             {'years': 237500000, 'min': 225000000, 'max': 250000000, 'source': gal_sun, 'note': 'A range; the figure is its midpoint.'},
                             {'years': 230000000, 'source': gal_nasa}],
            'anchorDates': from_present(),
            'sources': [gal_wp, gal_sun, gal_nasa],
        }),
    ]
