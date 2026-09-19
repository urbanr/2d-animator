#!/usr/bin/env bash
set -euo pipefail

PROJECT="${1:-$PWD}"
PROJECT="$(cd "$PROJECT" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"

remove_block() {
  local file="$1" start="$2" end="$3"
  [[ -f "$file" ]] || return 0
  local tmp
  tmp="$(mktemp)"
  awk -v start="$start" -v end="$end" '
    $0 == start {skip=1; next}
    $0 == end   {skip=0; next}
    !skip {print}
  ' "$file" > "$tmp"
  awk '{lines[NR]=$0} END {n=NR; while (n>0 && lines[n] ~ /^[[:space:]]*$/) n--; for (i=1;i<=n;i++) print lines[i]}' "$tmp" > "$tmp.trim"
  mv "$tmp.trim" "$tmp"
  printf '\n' >> "$tmp"
  if cmp -s "$file" "$tmp"; then
    rm -f "$tmp"
    return 0
  fi
  cp -p "$file" "$file.bak.$STAMP"
  mv "$tmp" "$file"
  printf 'Removed managed block from: %s\n' "$file"
}

remove_block "$PROJECT/AGENTS.md" '<!-- developer-environment-skill:start -->' '<!-- developer-environment-skill:end -->'
remove_block "$PROJECT/CLAUDE.md" '<!-- developer-environment-skill:start -->' '<!-- developer-environment-skill:end -->'
remove_block "$PROJECT/.gitignore" '<!-- developer-environment-local-artifacts:start -->' '<!-- developer-environment-local-artifacts:end -->'

for p in \
  "$PROJECT/.agents/skills/developer-environment" \
  "$PROJECT/.claude/skills/developer-environment"; do
  if [[ -L "$p" ]]; then
    rm "$p"
    printf 'Removed link: %s\n' "$p"
  elif [[ -e "$p" ]]; then
    printf 'WARNING: not removing non-symlink path: %s\n' "$p" >&2
  fi
done

if [[ -d "$PROJECT/.ai/skills/developer-environment" ]]; then
  rm -rf "$PROJECT/.ai/skills/developer-environment"
  printf 'Removed canonical skill: %s\n' "$PROJECT/.ai/skills/developer-environment"
fi

printf '\nProject integration removed.\n'
printf 'Project tools/fts.sh, tools/extract-text.sh and tools/check-dev-env.sh were intentionally left in place because they may contain project-local changes.\n'
printf 'The agent may remove those separately only on explicit request.\n' 
