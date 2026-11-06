alias t := test
alias ta := test-all

# Lint and test only files changed since the last commit
test:
    ./scripts/test-changed.sh

# Full suite: lint, typecheck and every test
test-all:
    ./scripts/test-all.sh

# Install dependencies and enable the git hooks
setup:
    npm install
    git config core.hooksPath .githooks
