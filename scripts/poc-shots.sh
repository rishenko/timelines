#!/usr/bin/env bash
# Screenshots the POC test set (docs/poc/README.md) at the same views on any branch, so POCs compare like for like.
#
#   npm run poc:shots -- <port> <out dir>        e.g. npm run poc:shots -- 4320 /tmp/poc-1
#
# Needs a dev server on <port> (`npx vite --port <port> --strictPort`). Each view is taken twice: as the file opens,
# and with its group rows folded ("-folded"), from a copy of the file with meta.collapsed set to the top-level rows
# (written to public/timelines/_poc-folded/, which git ignores).
set -euo pipefail
port=${1:?port}
out=${2:?out dir}
mkdir -p "$out" public/timelines/_poc-folded
base="http://localhost:$port"

for f in poc-ancient poc-modern poc-battletech; do
  node -e '
    const fs = require("fs");
    const d = JSON.parse(fs.readFileSync(`public/timelines/${process.argv[1]}.json`, "utf8"));
    d.meta.collapsed = d.tracks.filter((t) => !t.parent && d.tracks.some((c) => c.parent === t.id)).map((t) => t.id);
    d.meta.id += "-folded";
    fs.writeFileSync(`public/timelines/_poc-folded/${process.argv[1]}.json`, JSON.stringify(d));
  ' "$f"
done

# name | file | zoom (years per tick) | year at the centre of the view
views=(
  "ancient-overview|poc-ancient|50|-1700"
  "ancient-mycenae-end|poc-ancient|10|-1100"
  "modern-overview|poc-modern|25|1860"
  "modern-1760-1850|poc-modern|5|1805"
  "modern-1900-2000|poc-modern|5|1950"
  "modern-uar-1954-1974|poc-modern|1|1964"
  "modern-1981-2001|poc-modern|1|1991"
  "bt-overview|poc-battletech|50|2735"
  "bt-3000-3100|poc-battletech|5|3050"
)
shot() { # url, file: up to 3 tries (the dev server may reload just after the folded copies are written)
  for try in 1 2 3; do
    node scripts/screenshot.ts "$1" "$2" --width 1800 --height 1350 --close-legend >/dev/null 2>&1 && return 0
    sleep 2
  done
  echo "FAILED: $2" >&2
}
sleep 2
for v in "${views[@]}"; do
  IFS='|' read -r name file inc at <<<"$v"
  shot "$base/?data=$base/timelines/$file.json&inc=$inc&at=$at" "$out/$name.png"
  shot "$base/?data=$base/timelines/_poc-folded/$file.json&inc=$inc&at=$at" "$out/$name-folded.png"
  echo "$out/$name.png (+ -folded)"
done
