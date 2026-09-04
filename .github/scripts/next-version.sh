#!/usr/bin/env bash
#
# Decides whether this push gets a release, and what version it is.
#
# Lives in a script rather than inline in the workflow so it can be run locally
# against the real history before anyone relies on it:
#
#   bash .github/scripts/next-version.sh
#
# With GITHUB_OUTPUT set (in Actions) it writes there; without it, to stdout.
# Outputs: skip · reason · bump · previous · next
set -euo pipefail

out() {
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "$1" >>"$GITHUB_OUTPUT"
  else
    echo "$1"
  fi
}

# The FIRST release of a repo with no version tags yet. Deliberately 0.1.0 and not
# 1.0.0: 1.0 is a claim about completeness, so reaching it has to be a decision
# somebody makes, not a side effect of the first push.
readonly FIRST_VERSION="v0.1.0"

subject=$(git log -1 --pretty=%s)

# Manual markers are honoured ONLY in the HEAD commit subject. Commit bodies here
# run long and discuss releases and breaking changes at length; if markers were read
# from bodies, writing about a major bump would cause one.
if printf '%s' "$subject" | grep -qiF '[skip release]'; then
  out "skip=true"
  out "reason=the HEAD subject carries [skip release]"
  exit 0
fi

if [ -n "$(git tag --points-at HEAD -l 'v*')" ]; then
  out "skip=true"
  out "reason=HEAD is already tagged (re-run of an earlier release)"
  exit 0
fi

latest=$(git tag -l 'v*' --sort=-v:refname | head -1)

if [ -z "$latest" ]; then
  out "skip=false"
  out "reason=no version tag exists yet"
  out "bump=initial"
  out "previous="
  out "next=$FIRST_VERSION"
  exit 0
fi

IFS=. read -r major minor patch <<<"${latest#v}"
range="$latest..HEAD"

if [ -z "$(git log --oneline "$range")" ]; then
  out "skip=true"
  out "reason=no commits since $latest"
  exit 0
fi

forced_major=false
if printf '%s' "$subject" | grep -qiF '[release major]'; then
  bump=major
  forced_major=true
elif printf '%s' "$subject" | grep -qiF '[release minor]'; then
  bump=minor
elif git log --pretty=%s "$range" | grep -qE '^[a-z]+(\([^)]*\))?!:' ||
  git log --pretty=%B "$range" | grep -qE '^BREAKING CHANGE'; then
  # Anchored to the start of a line: that is the Conventional Commits footer.
  # Unanchored, any commit body that merely mentions the phrase forces a major.
  bump=major
elif git log --pretty=%s "$range" | grep -qE '^feat(\([^)]*\))?:'; then
  bump=minor
else
  bump=patch
fi

# Semver for 0.x: a breaking change bumps the MINOR, because nothing is stable
# before 1.0. Only the explicit [release major] marker crosses to 1.0.0, so the
# first stable release is always somebody's decision.
if [ "$major" -eq 0 ] && [ "$bump" = major ] && [ "$forced_major" = false ]; then
  bump=minor
  out "reason=breaking change on 0.x bumps the minor, not the major"
fi

case "$bump" in
major) next="v$((major + 1)).0.0" ;;
minor) next="v$major.$((minor + 1)).0" ;;
patch) next="v$major.$minor.$((patch + 1))" ;;
esac

out "skip=false"
out "bump=$bump"
out "previous=$latest"
out "next=$next"
