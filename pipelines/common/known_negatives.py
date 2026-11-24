"""
Checks the classifier against pipelines/common/known_negatives.json: events it once got wrong. Prints one line per
failure and exits 1 on any. failures() returns (title, problem) pairs. With the Wikipedia dump (settings.py) it checks every case; without it, only the 'never'
values on title evidence (said on stderr).

    pipelines/.venv/bin/python -I pipelines/common/known_negatives.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import event_categories as ec  # noqa: E402


def failures(wp):
    out = []
    for c in json.load(open(os.path.join(HERE, 'known_negatives.json')))['cases']:
        ds = {'sources': {'w': {'url': 'https://en.wikipedia.org/wiki/' + c['article'].replace(' ', '_')}}, 'tracks': []}
        e = {'uuid': 'case', 'title': c['title'], 'descr': '', 'tracks': [], 'sources': [{'sourceKey': 'w'}], 'start': {'year': 1}}
        got = [v for v, _ in ec.classify(e, ds, wp)]
        bad = [v for v in c['never'] if v in got]
        if bad:
            out.append((c['title'], f'gives {" + ".join(got)}, never {", ".join(bad)} ({c["why"]})'))
        if wp and c.get('first') and got[:1] != [c['first']]:
            out.append((c['title'], f'gives {" + ".join(got) or "(none)"}, main should be {c["first"]} ({c["why"]})'))
    return out


def dump():
    try:
        import wp_dump as wp
        wp.page('Magna Carta')
        return wp
    except Exception as err:
        print(f'(no Wikipedia dump: {err}; title evidence and "never" only)', file=sys.stderr)
        return None


if __name__ == '__main__':
    wp = dump()
    bad = failures(wp)
    for title, why in bad:
        print(f'{title}: {why}')
    n = len(json.load(open(os.path.join(HERE, 'known_negatives.json')))['cases'])
    print(f'known negatives: {n - len({title for title, _ in bad})}/{n} clean' + ('' if wp else ' (no dump)'))
    sys.exit(1 if bad else 0)
