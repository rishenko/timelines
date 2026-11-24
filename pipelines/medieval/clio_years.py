"""Summarize Cliopatria polities: name -> first and last year (Cliopatria years: BCE negative, no year 0).
Usage: python3 -I clio_years.py <cliopatria .geojson> out.json"""
import json, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src, encoding='utf-8'))
res = {}
for f in d['features']:
    p = f['properties']
    r = res.setdefault(p['Name'], {'from': p['FromYear'], 'to': p['ToYear'], 'wikipedia': set(), 'type': p.get('Type')})
    r['from'] = min(r['from'], p['FromYear']); r['to'] = max(r['to'], p['ToYear'])
    if p.get('Wikipedia'): r['wikipedia'].add(p['Wikipedia'])
for r in res.values(): r['wikipedia'] = sorted(r['wikipedia'])
json.dump(res, open(out, 'w', encoding='utf-8', newline='\n'), indent=0, ensure_ascii=False)
print(len(res), 'polities; properties:', list(d['features'][0]['properties']))
