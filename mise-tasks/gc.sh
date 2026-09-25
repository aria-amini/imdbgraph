#!/usr/bin/env bash
#MISE description="Remove compose stacks whose workspace directory is gone (--volumes also deletes data)"

set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "${1:-}" && "${1:-}" != "--volumes" ]]; then
	echo "Usage: mise run gc [--volumes]" >&2
	exit 2
fi

# -d below judges working_dir labels with this machine's filesystem, so a
# remote daemon's projects would be classified by the wrong host
if [[ -n "${DOCKER_HOST:-}" && "${DOCKER_HOST}" != unix://* ]]; then
	echo "gc: refusing to run against a remote Docker daemon: $DOCKER_HOST" >&2
	exit 1
fi

down_flags=(down --remove-orphans)
if [[ "${1:-}" == "--volumes" ]]; then
	down_flags+=(--volumes)
fi

# compose stamps every object with the directory that ran it
# (working_dir label), so Docker's own labels are the ownership record:
# a stack whose directory is gone can never be stopped by its workspace.
projects="$(docker ps -a --format '{{.Label "com.docker.compose.project"}}' | sort -u)"
removed=0
failed=0
for project in $projects; do
	dir="$(docker ps -a --filter "label=com.docker.compose.project=$project" \
		--format '{{.Label "com.docker.compose.project.working_dir"}}' | head -1)"
	if [[ -z "$dir" || -d "$dir" ]]; then
		continue
	fi
	echo "Removing orphaned stack: $project ($dir)"
	# down never creates networks, so the subnet value only satisfies
	# docker-compose.yml interpolation for a project that is not ours.
	if DOCKER_SUBNET=10.255.255.0/24 docker compose -p "$project" "${down_flags[@]}"; then
		removed=$((removed + 1))
	else
		echo "Failed to remove: $project" >&2
		failed=$((failed + 1))
	fi
done

# networks can outlive their containers, so apply the same ownership
# check to compose networks instead of pruning every unused network
# on the daemon
for network in $(docker network ls --filter 'label=com.docker.compose.project' --format '{{.Name}}'); do
	dir="$(docker network inspect "$network" --format '{{.Label "com.docker.compose.project.working_dir"}}')"
	if [[ -z "$dir" || -d "$dir" ]]; then
		continue
	fi
	echo "Removing orphaned network: $network ($dir)"
	docker network rm "$network" || {
		echo "Failed to remove: $network" >&2
		failed=$((failed + 1))
	}
done

if [[ "$failed" -gt 0 ]]; then
	echo "$failed stack(s) failed to remove" >&2
	exit 1
fi

echo "gc: removed $removed orphaned stack(s)"
