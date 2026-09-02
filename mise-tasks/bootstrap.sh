#!/usr/bin/env bash
#MISE description="Bootstrap a fresh clone"

set -euo pipefail

# Headless bootstrap has no keyring/TPM; skip varlock's native encryption
# helper, which otherwise prints backend probes on every run.
export _VARLOCK_FORCE_FILE_ENCRYPTION_FALLBACK=1

cd "$(dirname "$0")/.."

mise install
vp i

if [[ ! -e .env.local ]]; then
	printf '%s\n' \
		'# Infisical machine-identity client secret.' \
		'# @sensitive' \
		'INFISICAL_CLIENT_SECRET=varlock(prompt)' > .env.local
fi

mise run setup
vp exec varlock load
vp run compose:up
vp run db:migrate

echo
echo "Bootstrap complete. Run 'vp dev' to start the app."
