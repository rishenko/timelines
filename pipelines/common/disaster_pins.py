"""
The pinned categories of the disaster events (and any other event the v2 emitter writes): the type the harvest read from the article's class
(an earthquake, an eruption, a famine…) beats the keyword classifier, which called Lake Nyos an earthquake. They are read from the emitted
files, pipelines/v2/emitted/<kind>-<timeline>.json, where each event carries its category memberships, and applied by
event_categories.apply as a pinned layer (evidence "pinned: <file>") after Kevin's reviewed overrides, which this module never touches.
"""
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
EMITTED = os.path.normpath(os.path.join(HERE, '..', 'v2', 'emitted'))


def category_pins():
    """{event uuid: ([categories], 'pipelines/v2/emitted/<file>')} for every emitted event that has category memberships."""
    out = {}
    for path in sorted(glob.glob(os.path.join(EMITTED, '*.json'))):
        rel = 'pipelines/v2/emitted/' + os.path.basename(path)
        for e in json.load(open(path, encoding='utf-8')).get('events', []):
            cats = [m['value'] for m in e.get('memberships', []) if m.get('facet') == 'category']
            if cats:
                out[e['uuid']] = (cats, rel)
    return out
