"""Pinned categories for the conflicts pilot (v2 kind 'conflict'): the type each emitted battle or war carries, read from
pipelines/v2/emitted/conflict-pins.json, which pipelines/v2/emit.py writes. event_categories.apply applies them after Kevin's reviewed
overrides and before the keyword classifier, with the evidence "pinned: <file>", so they never enter the reviewed categories.json files."""
import json
import os

PINS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'v2', 'emitted', 'conflict-pins.json')


def category_pins():
    """{event uuid: [category]} for every emitted conflict event (empty if the pilot has not been emitted)."""
    return {k: v for k, v in json.load(open(PINS)).items() if not k.startswith('_')} if os.path.exists(PINS) else {}
