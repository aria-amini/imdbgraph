#!/usr/bin/env bash
#MISE description="Bootstrap a fresh clone"

set -euo pipefail

# Headless bootstrap has no keyring/TPM; skip varlock's native encryption
# helper, which otherwise prints backend probes on every run.
export _VARLOCK_FORCE_FILE_ENCRYPTION_FALLBACK=1

cd "$(dirname "$0")/.."

if ! command -v gum &> /dev/null; then
	echo "gum is required (installed by the dotfiles install script)" >&2
	exit 1
fi

verbose=false
if [[ "${1:-}" == "--verbose" ]]; then
	verbose=true
elif [[ -n "${1:-}" ]]; then
	gum style --foreground 196 "Usage: mise run bootstrap [--verbose]" >&2
	exit 2
fi

app_name="$(basename "$(pwd)")"

gum style \
	--border double --border-foreground 212 --padding "1 3" --margin "1 0" \
	--align center --width 44 \
	"$(gum style --bold --foreground 212 "$app_name")" \
	"workspace bootstrap"

trap 'gum style --foreground 196 --bold "✗ Bootstrap failed (exit $?)" >&2' ERR

step() {
	local title="$1"
	shift
	if [[ "$verbose" == true ]]; then
		echo "  $title"
		"$@"
	else
		gum spin --show-error --title "  $title..." -- "$@"
	fi
	gum style --foreground 82 "  ✓ $title"
}

verify_app() {
	local url="$1"
	local attempts=30
	for ((i = 1; i <= attempts; i++)); do
		if curl -skf -o /dev/null "$url"; then
			return 0
		fi
		sleep 1
	done
	gum style --foreground 196 "App did not answer at $url after ${attempts}s" >&2
	return 1
}

step "Install tools (mise i)" mise install
step "Install packages (vp i)" vp i
setup_summary="$(mktemp)"
trap 'rm -f "$setup_summary"' EXIT

# gum spin execs commands directly and swallows their stdout, so setup's
# summary is redirected to a file at the child level for the finish box.
step "Generate .env.workspace.local" bash -c 'scripts/setup.ts >"$1"' bash "$setup_summary"
step "Remove orphaned compose stacks" mise run gc

# Agent-safe mode redacts values and fails fast instead of waiting at an
# interactive prompt, which a stale varlock(prompt) placeholder would trigger
step "Validate env with varlock" vp exec varlock load --agent --format pretty

step "Start Docker services" vp run compose:up
step "Apply database migrations" vp run db:migrate

base_url="$(sed -n 's/^BASE_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' .env.workspace.local 2>/dev/null)"
base_url="${base_url:-$(sed -n 's/^BASE_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' .env.development.local 2>/dev/null)}"

# Headless workspaces (herdr panes, CI) never trigger pitchfork's cd hook,
# so the daemon must be started explicitly.
if [[ -f pitchfork.toml ]] && command -v pitchfork &> /dev/null; then
	step "Start dev daemon" pitchfork start dev
fi

# Bootstrap only succeeds when the URL a human will open actually answers.
# Called directly: gum spin can only exec external commands, not functions.
if [[ -n "$base_url" ]]; then
	printf '  Verify app responds...'
	verify_app "$base_url"
	printf '\r\033[K'
	gum style --foreground 82 "  ✓ Verify app responds"
fi

finish_args=(
	--border rounded --border-foreground 82 --padding "0 3" --margin "1 0"
	"$(gum style --bold --foreground 82 '✓ Bootstrap complete')"
)
while IFS= read -r entry; do
	finish_args+=("$(gum style --foreground 39 "$entry")")
done < <(sed -n 's/^  //p' "$setup_summary")
gum style "${finish_args[@]}"
