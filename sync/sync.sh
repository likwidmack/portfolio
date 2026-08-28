#!/usr/bin/env bash
# Deterministic sanitizer: clone (or use) tamaramack/portfolio → keep-list copy → rewrite → scan.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_REPO="${SOURCE_REPO:-https://github.com/tamaramack/portfolio.git}"
DEST_DIR="${DEST_DIR:-$ROOT}"
SOURCE_DIR=""
TAG=""
SHA=""
SKIP_CLONE=0

usage() {
  echo "Usage: $0 [--source DIR] [--dest DIR] [--tag TAG] [--sha SHA] [--repo URL]" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE_DIR="$2"; SKIP_CLONE=1; shift 2 ;;
    --dest) DEST_DIR="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    --sha) SHA="$2"; shift 2 ;;
    --repo) SOURCE_REPO="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1" >&2; usage ;;
  esac
done

# Clone tamaramack/portfolio with TM_GH_TOKEN (tamaramack). Never print it.
github_token() {
  if [[ -n "${TM_GH_TOKEN:-}" ]]; then
    printf '%s' "$TM_GH_TOKEN"
    return 0
  fi
  if [[ -n "${GH_TOKEN:-}" ]]; then
    printf '%s' "$GH_TOKEN"
    return 0
  fi
  if [[ -n "${GITCONFIG_GITHUB_TOKEN:-}" ]]; then
    printf '%s' "$GITCONFIG_GITHUB_TOKEN"
    return 0
  fi
  python3 - <<'PY'
import re
from pathlib import Path
text = Path.home().joinpath(".gitconfig").read_text()
for pattern in (
    r"url \"https://x-access-token:([^@]+)@github\.com/",
    r"url \"https://[^:]+:([^@]+)@github\.com/",
):
    match = re.search(pattern, text)
    if match:
        print(match.group(1), end="")
        raise SystemExit(0)
raise SystemExit(1)
PY
}

auth_clone_url() {
  local url="$1"
  local token=""
  token="$(github_token 2>/dev/null || true)"
  if [[ -n "$token" && "$url" == https://github.com/* ]]; then
    echo "https://x-access-token:${token}@github.com/${url#https://github.com/}"
    return 0
  fi
  if [[ -z "$token" && "$url" == https://github.com/tamaramack/* ]]; then
    echo "git@github.com-tamaramack:${url#https://github.com/}"
    return 0
  fi
  echo "$url"
}

# Mirror tamaramack/portfolio `main` unless a tag/branch is passed.
# The private default branch is `development`; do not follow that HEAD.
if [[ "$SKIP_CLONE" -eq 0 && -z "$TAG" ]]; then
  TAG="main"
fi

if [[ "$SKIP_CLONE" -eq 0 ]]; then
  SOURCE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-src.XXXXXX")"
  CLONE_URL="$(auth_clone_url "$SOURCE_REPO")"
  echo "Cloning ${SOURCE_REPO}@${TAG} into ${SOURCE_DIR}"
  git clone --depth 1 --branch "$TAG" "$CLONE_URL" "$SOURCE_DIR"
  SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory missing: $SOURCE_DIR" >&2
  exit 3
fi

SHA="${SHA:-$(git -C "$SOURCE_DIR" rev-parse HEAD 2>/dev/null || echo unknown)}"
TAG="${TAG:-unsynced}"

STAGING="$(mktemp -d "${TMPDIR:-/tmp}/portfolio-stage.XXXXXX")"
trap 'rm -rf "$STAGING"' EXIT

ALLOWLIST="${ROOT}/sync/allowlist.txt"
while IFS= read -r rel || [[ -n "$rel" ]]; do
  [[ -z "$rel" || "$rel" == \#* ]] && continue
  src_path="${SOURCE_DIR}/${rel}"
  if [[ ! -e "$src_path" ]]; then
    echo "allowlist miss (skipped): ${rel}"
    continue
  fi
  dest_path="${STAGING}/${rel}"
  mkdir -p "$(dirname "$dest_path")"
  if [[ -d "$src_path" ]]; then
    mkdir -p "$dest_path"
    cp -a "$src_path"/. "$dest_path"/
  else
    cp -a "$src_path" "$dest_path"
  fi
done < "$ALLOWLIST"

# Strip nested tool/dot directories copied from vendored packages.
while IFS= read -r -d '' dir; do
  rm -rf "$dir"
done < <(find "$STAGING" -type d \( \
  -name '.github' -o -name '.husky' -o -name '.vscode' -o -name '.agents' \
  -o -name '.codex' -o -name '.opencode' -o -name '.git' \
\) -print0 2>/dev/null || true)

for leaked in scripts docker infra archive .github .env.sample .env.example AGENTS.md; do
  if [[ -e "${STAGING}/${leaked}" ]]; then
    echo "denied path leaked into staging: ${leaked}" >&2
    exit 3
  fi
done

node "${ROOT}/sync/rewrite.mjs" --staging "$STAGING" --tag "$TAG" --sha "$SHA"
node "${ROOT}/sync/scan.mjs" --staging "$STAGING"

# Replace allowlisted dest trees so dropped nested files do not linger.
# Do not wipe dest-owned sync/, .github/, or sanitizer tests.
mkdir -p "$DEST_DIR"
while IFS= read -r rel || [[ -n "$rel" ]]; do
  [[ -z "$rel" || "$rel" == \#* ]] && continue
  src_path="${STAGING}/${rel}"
  dest_path="${DEST_DIR}/${rel}"
  [[ -e "$src_path" ]] || continue
  rm -rf "$dest_path"
  mkdir -p "$(dirname "$dest_path")"
  cp -a "$src_path" "$dest_path"
done < "$ALLOWLIST"

for extra in .gitignore .sync-meta.json README.md package.json nx.json LICENSE; do
  if [[ -e "${STAGING}/${extra}" ]]; then
    cp -a "${STAGING}/${extra}" "${DEST_DIR}/${extra}"
  fi
done

# Restore dest-owned LICENSE if rewrite left a source copy out.
if [[ ! -f "${DEST_DIR}/LICENSE" && -f "${ROOT}/LICENSE" ]]; then
  cp "${ROOT}/LICENSE" "${DEST_DIR}/LICENSE"
fi

echo "Sanitized ${TAG} (${SHA:0:7}) into ${DEST_DIR}"
