#!/usr/bin/env bash
# Lightweight check: lint and run only the tests related to changed files.
# Usage: test-changed.sh [--staged]   (default: all uncommitted changes)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ "${1:-}" == "--staged" ]]; then
  changed=$(git diff --cached --name-only --diff-filter=ACMR)
else
  changed=$( { git diff --name-only --diff-filter=ACMR HEAD; git ls-files --others --exclude-standard; } | sort -u)
fi

files=()
while IFS= read -r f; do
  [[ -n "$f" && -f "$f" ]] && files+=("$f")
done < <(grep -E '\.(js|jsx|ts|tsx)$' <<<"$changed" || true)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No changed source files to check."
  exit 0
fi

echo "Checking ${#files[@]} changed file(s)..."
npx eslint --no-warn-ignored "${files[@]}"
npx jest --findRelatedTests --passWithNoTests "${files[@]}"
