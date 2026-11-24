#!/bin/sh
# Rebuilds the conflicts pilot end to end (v2 kind 'conflict'), from the repo root, with the extractor's venv and the dumps:
#   TIMELINES_DATA=~/data sh pipelines/v2/run_conflicts.sh [path/to/python]
# The combatant index (harvest/conflicts_index.py, a few minutes) is built once per dump and reused; delete
# $TIMELINES_DATA/v2/candidates/conflict-index.jsonl to rebuild it.
set -e
PY=${1:-pipelines/extract/.venv/bin/python}
[ -f "$TIMELINES_DATA/v2/candidates/conflict-index.jsonl" ] || "$PY" -I pipelines/v2/harvest/conflicts_index.py
"$PY" -I pipelines/v2/build_places.py
"$PY" -I pipelines/v2/harvest/conflicts.py
python3 -I pipelines/v2/consensus.py conflict > /dev/null
python3 -I pipelines/v2/emit.py conflict
npm run data -- run-all ancient-classical > /dev/null || true  # may stop on a categories plan that still names a dropped event; the next two steps rebuild it
"$PY" -I pipelines/ancient/categories.py > /dev/null
npm run data -- run-all ancient-classical > /dev/null
"$PY" -I pipelines/modern-states/gen_modern.py > /dev/null
"$PY" -I pipelines/medieval/gen_medieval.py > /dev/null
npm run data -- build all
