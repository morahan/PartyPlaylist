#!/usr/bin/env bash
# Full suite: lint everything, typecheck, run every test.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

npx eslint .
npx tsc --noEmit
npx jest --ci
