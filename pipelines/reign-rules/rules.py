"""The rule functions of the reign-rules stage (Workbench "2026-11-25 Timelines ruler rules as code design" §2), by name. rules.json
names each by its `test`. A rule is fn(reign, ctx, params) -> a reason (str) when the reign is in the rule's class, else None; it never
edits anything. reign: {uuid, timeline, row, file, event, review}; ctx: {'spans': {timeline: {row: [(start, end)]}}, 'by_person':
{(timeline, row, person): [reign]}}. Empty until the ruler definition's decision table is answered (Dev C writes them; Architect reviews)."""
RULES = {}


def rule(name):
    """Registers fn under name: @rule('party-office')."""
    def add(fn):
        if name in RULES:
            raise ValueError(f'rule {name} registered twice')
        RULES[name] = fn
        return fn
    return add
