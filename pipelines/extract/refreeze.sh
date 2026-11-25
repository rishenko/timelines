#!/usr/bin/env bash
# Re-freeze one timeline's reigns from the recorded inputs, in the one safe order:
#   1. regenerate the timeline, so data-src holds exactly what the COMMITTED reigns.json builds (a data-src left over from another
#      branch can hold a reign the new freeze excludes; the freeze counts it as "already on the timeline" and drops the real reign
#      beside it: Baudouin of Belgium 1951 was lost that way when main was merged into reign-bulk),
#   2. freeze with --update (the freeze skips the reigns.json uuids itself),
#   3. regenerate and build again, so data-src and public/timelines carry the new reigns.
# Usage (from the repo root):  PY=<python with the extractor deps> R=<regression-inputs checkout> bash pipelines/extract/refreeze.sh <timeline> [...]
#   timeline: modern-states | medieval | ancient-classical      then check:  $PY -I pipelines/extract/freeze_regression.py $R/kc2-inputs
set -euo pipefail
: "${PY:?set PY to a python with the extractor deps}" "${R:?set R to the regression-inputs checkout}"
generate() {
  case "$1" in
    modern-states) "$PY" -I pipelines/modern-states/gen_modern.py >/dev/null ;;
    medieval) "$PY" -I pipelines/medieval/gen_medieval.py >/dev/null ;;
    ancient-classical) node scripts/data.ts run-all ancient-classical >/dev/null ;;
    *) echo "unknown timeline $1" >&2; exit 2 ;;
  esac
}
for t in "$@"; do
  generate "$t"
  "$PY" -I pipelines/extract/reigns_freeze.py --timeline "$t" --dir "$R/kc2-inputs/$t" --update --without-extras --term-labels "$R/kc2-inputs/term-labels.json" 2>&1 | tail -1 | cut -c1-120
  generate "$t"
done
node scripts/data.ts build all >/dev/null
