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

# Regenerate app icons and logo from assets/source/logo.jpg (needs Inkscape)
icons:
    ./scripts/build-icons.sh

# Create the hosted PartyPlaylist Supabase project (run `npx supabase login` first)
db-create region="us-east-1":
    npx supabase orgs list
    @read -p "Org ID for Freio Labs: " org && npx supabase projects create PartyPlaylist --org-id "$org" --region {{region}}

# Link this repo to the hosted PartyPlaylist project and push migrations
db-push project-ref:
    npx supabase link --project-ref {{project-ref}}
    npx supabase db push
