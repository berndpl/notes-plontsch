#!/usr/bin/env bash
set -euo pipefail

# Run from the script's directory (site root)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR" || exit 1

# Use Bundler if available, otherwise fall back to system `jekyll`.
if command -v bundle >/dev/null 2>&1; then
	exec bundle exec jekyll serve "$@"
else
	if command -v jekyll >/dev/null 2>&1; then
		echo "Warning: Bundler not found — running jekyll directly"
		exec jekyll serve "$@"
	else
		echo "Error: neither bundle nor jekyll found in PATH." >&2
		echo "Install Bundler (gem install bundler) and run bundle install." >&2
		exit 1
	fi
fi