#!/usr/bin/env bash
set -euo pipefail

SOURCE_REPO="${SOURCE_REPO:-https://github.com/tamaramack/tamaramack.github.io.git}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${DEST:-$ROOT}"
TAG=""
SOURCE_DIR=""

usage() {
  echo "usage: sync.sh [--source <clone>] [--dest <dir>] [--tag <tag-or-development>]" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE_DIR="$2"; shift 2 ;;
    --dest) DEST="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "unknown arg: $1" >&2; usage ;;
  esac
done

list_semver_tags() {
  git ls-remote --tags --refs "$SOURCE_REPO" \
    | awk '{print $2}' \
    | sed 's|refs/tags/||' \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
    | sort -V
}

next_tag() {
  local meta="$DEST/.sync-meta.json"
  local current=""
  if [[ -f "$meta" ]]; then
    current="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("sourceTag") or "")' "$meta")"
  fi
  local newest
  newest="$(list_semver_tags | tail -n 1 || true)"
  if [[ -z "$newest" ]]; then
    if [[ "$current" == "development" ]]; then
      echo ""
    else
      echo "development"
    fi
    return
  fi
  if [[ "$newest" == "$current" ]]; then
    echo ""
    return
  fi
  echo "$newest"
}

if [[ -z "$TAG" ]]; then
  TAG="$(next_tag)"
  if [[ -z "$TAG" ]]; then
    echo "No new public semver tag to sync."
    exit 0
  fi
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-sync.XXXXXX")"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

CLONE="$WORKDIR/source"
STAGE="$WORKDIR/stage"
mkdir -p "$STAGE"

if [[ -n "$SOURCE_DIR" ]]; then
  CLONE="$SOURCE_DIR"
else
  if [[ "$TAG" == "development" ]]; then
    git clone --depth 1 --branch development "$SOURCE_REPO" "$CLONE"
  else
    git clone --depth 1 --branch "$TAG" "$SOURCE_REPO" "$CLONE"
  fi
fi

SHA="$(git -C "$CLONE" rev-parse HEAD)"
META="$DEST/.sync-meta.json"
if [[ -f "$META" ]]; then
  EXISTING="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("sourceTag"), d.get("sourceSha"))' "$META")"
  if [[ "$EXISTING" == "$TAG $SHA" ]]; then
    echo "Already synced $TAG ($SHA). No-op."
    exit 0
  fi
fi

node "$ROOT/sync/copy.mjs" "$CLONE" "$STAGE" "$ROOT/sync/allowlist.txt"
node "$ROOT/sync/rewrite.mjs" "$STAGE"
node "$ROOT/sync/scan.mjs" "$STAGE"
node "$ROOT/sync/apply.mjs" "$STAGE" "$DEST"

python3 - "$META" "$TAG" "$SHA" <<'PY'
import json, sys, datetime
path, tag, sha = sys.argv[1], sys.argv[2], sys.argv[3]
json.dump({
  "sourceRepo": "tamaramack/tamaramack.github.io",
  "sourceTag": tag,
  "sourceSha": sha,
  "syncedAt": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
  "destRepo": "likwidmack/portfolio",
}, open(path, "w"), indent=2)
open(path, "a").write("\n")
PY

echo "synced $TAG ($SHA) into $DEST"
