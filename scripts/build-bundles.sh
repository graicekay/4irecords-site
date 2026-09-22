#!/usr/bin/env bash
# Zips each numbered folder in content/files/4i-artist-resources-bundle/ into
# one bundle per resource, named after the resource slug.
#
# Pre-built and committed rather than zipped per request: the files only change
# when Grace regenerates them, and a build step costs nothing at request time.
# Re-run this after replacing any PDF or spreadsheet.
set -euo pipefail
cd "$(dirname "$0")/.."

declare -a MAP=(
  "01:release-label-visuals-checklist"
  "02:what-pro-visuals-cost"
  "03:cutdown-matrix"
)

SRC="content/files/4i-artist-resources-bundle"

for entry in "${MAP[@]}"; do
  n="${entry%%:*}"; slug="${entry##*:}"
  out="$PWD/content/files/4i-$slug.zip"
  rm -f "$out"
  ( cd "$SRC/$n" && zip -q -r -X "$out" . -x '.DS_Store' '__MACOSX/*' )
  printf '%-40s %s\n' "$slug" "$(du -h "$out" | cut -f1)"
done
