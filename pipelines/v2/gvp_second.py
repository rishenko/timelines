"""GVP second sources for the disasters pilot's volcano events. `python3 -I pipelines/v2/gvp_second.py fetch` reads the eruption records named in
pilot-gvp.json from GVP's official WFS and caches the fields we cite in gvp/gvp-records.json (a normal client, no workaround); emit.py then adds
each as a second source (tag "catalogue", key gvp-<eruption number>). Cite-only: no GVP text is copied."""
import json
import os
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = json.load(open(os.path.join(HERE, 'pilot-gvp.json')))
CACHE = os.path.join(HERE, 'gvp', 'gvp-records.json')
KEEP = ['Volcano_Number', 'Volcano_Name', 'Eruption_Number', 'ExplosivityIndexMax', 'StartDateYearModifier', 'StartDateYear', 'StartDateMonth',
        'StartDateDay', 'StartDateYearUncertainty', 'EndDateYear', 'EndDateMonth', 'EndDateDay']


def fetch():
    out = {}
    for title, n in SEED['eruptions'].items():
        q = urllib.parse.urlencode({'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature', 'typeName': 'GVP-VOTW:Smithsonian_VOTW_Holocene_Eruptions',
                                    'outputFormat': 'application/json', 'cql_filter': f'Eruption_Number={n}'})
        f = json.load(urllib.request.urlopen(f"{SEED['api']}?{q}", timeout=60))['features']
        if len(f) != 1:
            raise SystemExit(f'{title}: eruption {n} gave {len(f)} records')
        out[title] = {k: f[0]['properties'].get(k) for k in KEEP}
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump({'fetched': os.environ.get('FETCH_DATE', '2026-11-24'), 'records': out}, open(CACHE, 'w'), indent=1, sort_keys=True)
    print(f'{len(out)} records cached')


def source(title):
    """(key, source entry, locator, start year (astronomical), its +/- in years or None) for a title, or None."""
    if not os.path.exists(CACHE):
        return None
    c = json.load(open(CACHE))
    r = c['records'].get(title)
    if not r:
        return None
    def d(p):
        y = r.get(p + 'DateYear')
        if y is None:
            return None
        s = f'{-y} BCE' if y < 0 else str(y)
        return s + ''.join(f'-{r[p + "Date" + k]:02d}' for k in ('Month', 'Day') if r.get(p + 'Date' + k))
    loc = f"eruption {r['Eruption_Number']}: start {d('Start')}" + (f" (±{r['StartDateYearUncertainty']} years)" if r.get('StartDateYearUncertainty') else '')
    if d('End'):
        loc += f", end {d('End')}"
    if r.get('ExplosivityIndexMax') is not None:
        loc += f", VEI {r['ExplosivityIndexMax']}"
    key = f"gvp-{r['Eruption_Number']}"
    return key, {'name': f"Smithsonian Global Volcanism Program, {r['Volcano_Name']}, eruption {r['Eruption_Number']}",
                 'url': f"https://volcano.si.edu/volcano.cfm?vn={r['Volcano_Number']}", 'accessed': c['fetched'], 'tags': ['catalogue']}, loc, \
        (r['StartDateYear'] + 1 if r['StartDateYear'] < 0 else r['StartDateYear']), r.get('StartDateYearUncertainty')


if __name__ == '__main__':
    {'fetch': fetch}[sys.argv[1]]()
