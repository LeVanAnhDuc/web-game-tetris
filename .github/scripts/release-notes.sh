#!/usr/bin/env bash
#
# Composes the release notes from Conventional Commit subjects, grouped by type.
#
#   bash .github/scripts/release-notes.sh <next-tag> [previous-tag]
#
# Writes markdown to stdout. Run it locally to see exactly what a release will say
# before it says it.
#
# Why not `gh release create --generate-notes`: that lists merged pull requests, so
# a push of direct commits produces notes containing nothing but a compare link.
# Grouping the commit subjects works whether the change arrived as a PR or not, and
# it is the same information the version bump was computed from -- so the notes and
# the version number can never disagree about what happened.
set -euo pipefail

next="${1:?usage: release-notes.sh <next-tag> [previous-tag]}"
previous="${2:-}"

if [ -n "$previous" ]; then
  range="$previous..HEAD"
else
  range="HEAD"
fi

repo="${GITHUB_REPOSITORY:-}"

# type -> heading. Order here is the order in the notes: what a player notices
# first, then what a contributor cares about.
sections=(
  "feat|### Features"
  "fix|### Fixes"
  "perf|### Performance"
  "a11y|### Accessibility"
  "refactor|### Refactoring"
  "docs|### Documentation"
  "test|### Tests"
  "build|### Build"
  "ci|### CI"
  "chore|### Chores"
)

emit_section() {
  local type="$1" heading="$2" body
  # `!` after the type or scope marks a breaking change; match it either way.
  body=$(git log --no-merges --pretty='%h%x09%s' "$range" |
    awk -F'\t' -v t="$type" '
      {
        s = $2
        # type, optional (scope), optional !, then ": "
        if (match(s, "^" t "(\\([^)]*\\))?!?: ")) {
          prefix = substr(s, 1, RLENGTH)
          rest = substr(s, RLENGTH + 1)
          scope = ""
          if (match(prefix, /\([^)]*\)/)) {
            scope = substr(prefix, RSTART + 1, RLENGTH - 2)
          }
          breaking = (index(prefix, "!") > 0) ? "**BREAKING** " : ""
          if (scope != "") {
            printf "- %s**%s**: %s (`%s`)\n", breaking, scope, rest, $1
          } else {
            printf "- %s%s (`%s`)\n", breaking, rest, $1
          }
        }
      }')
  if [ -n "$body" ]; then
    printf '%s\n%s\n\n' "$heading" "$body"
  fi
}

# Breaking changes go first and on their own, because they are the one thing a
# reader must not scroll past.
breaking=$(git log --no-merges --pretty='%h%x09%s' "$range" |
  awk -F'\t' '$2 ~ /^[a-z]+(\([^)]*\))?!:/ { printf "- %s (`%s`)\n", $2, $1 }')
if [ -n "$breaking" ]; then
  printf '### ⚠ Breaking changes\n%s\n\n' "$breaking"
fi

for entry in "${sections[@]}"; do
  emit_section "${entry%%|*}" "${entry#*|}"
done

# Anything that did not follow the convention still has to appear -- notes that
# quietly drop commits are worse than notes with an untidy section.
known=$(printf '%s\n' "${sections[@]}" | cut -d'|' -f1 | paste -sd'|' -)
other=$(git log --no-merges --pretty='%h%x09%s' "$range" |
  awk -F'\t' -v known="$known" '
    BEGIN { n = split(known, k, "|") }
    {
      s = $2
      for (i = 1; i <= n; i++) {
        if (match(s, "^" k[i] "(\\([^)]*\\))?!?: ")) next
      }
      printf "- %s (`%s`)\n", s, $1
    }')
if [ -n "$other" ]; then
  printf '### Other\n%s\n\n' "$other"
fi

if [ -n "$repo" ] && [ -n "$previous" ]; then
  printf '**Full changelog**: https://github.com/%s/compare/%s...%s\n' "$repo" "$previous" "$next"
elif [ -n "$repo" ]; then
  printf '**Full changelog**: https://github.com/%s/commits/%s\n' "$repo" "$next"
fi
