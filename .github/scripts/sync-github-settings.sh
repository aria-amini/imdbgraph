#!/usr/bin/env bash
# Apply repo settings and rulesets from .github/*.json to GitHub.
# Usage: .github/scripts/sync-github-settings.sh [owner/repo]
# Requires: gh authenticated with repo admin, jq.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
default_repo="$(git -C "$root" remote get-url origin | sed -E 's#.*github\.com[:/]##; s#\.git$##')"
repo="${1:-$default_repo}"

gh api -X PATCH "repos/$repo" --input "$root/.github/repo-settings.json" --silent
echo "synced repo settings"

for ruleset in "$root"/.github/rulesets/*.json; do
  name="$(jq -r '.name' "$ruleset")"
  id="$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name == \"$name\") | .id")"
  if [ -n "$id" ]; then
    gh api -X PUT "repos/$repo/rulesets/$id" --input "$ruleset" --silent
  else
    gh api -X POST "repos/$repo/rulesets" --input "$ruleset" --silent
  fi
  echo "synced ruleset: $name"
done
