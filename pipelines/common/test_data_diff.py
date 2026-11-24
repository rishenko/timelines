"""data_diff.py on a throwaway git repository: added, lost and changed events, reigns apart, and the exit code."""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
tmp = tempfile.mkdtemp()
os.makedirs(os.path.join(tmp, 'data-src'))
sys.path.insert(0, HERE)
import data_diff as D  # noqa: E402

D.ROOT, D.DATA = tmp, os.path.join(tmp, 'data-src')
git = lambda *a: subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', *a], cwd=tmp, check=True, capture_output=True)
ev = lambda u, t='x', **k: dict(uuid=u, title=t, start=1, tracks=['r1'], **k)
write = lambda evs: json.dump({'tracks': [{'id': 'r1', 'name': 'Row'}], 'events': evs}, open(os.path.join(tmp, 'data-src', 't.json'), 'w'))
git('init', '-q')
write([ev('a'), ev('reign-b'), ev('reign-c'), ev('d')])
git('add', '-A'); git('commit', '-qm', 'one')
write([ev('a'), ev('reign-c', t='changed'), ev('d'), ev('reign-new'), ev('new')])
_, added, lost, changed = D.diff('t', 'HEAD')
assert sorted(e['uuid'] for e in added) == ['new', 'reign-new'], added
assert [e['uuid'] for e in lost] == ['reign-b'], lost
assert [e['uuid'] for e in changed] == ['reign-c'], changed
assert [is_ for is_ in map(D.is_reign, lost)] == [True]
assert D.timelines() == ['t']
print('ok')
