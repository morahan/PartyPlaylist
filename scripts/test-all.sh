#!/usr/bin/env bash
# Full suite: lint everything, typecheck, run every test.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

npx eslint .
npx tsc --noEmit
# PGlite (database tests) loads WebAssembly via dynamic import.
NODE_OPTIONS=--experimental-vm-modules npx jest --ci
