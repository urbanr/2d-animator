#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_SKILL="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT="${1:-$PWD}"
PROJECT="$(cd "$PROJECT" && pwd)"
CANONICAL="$PROJECT/.ai/skills/developer-environment"
START='<!-- developer-environment-skill:start -->'
END='<!-- developer-environment-skill:end -->'
STAMP="$(date +%Y%m%d-%H%M%S)"

section_content() {
  cat <<'TXT'
<!-- developer-environment-skill:start -->
## Local developer tooling
Use the `developer-environment` skill for Docker/Compose, MCP, Graphify, Serena, local SQLite FTS5, document extraction, deterministic local utilities, and token-efficient coding decisions.

Before installing anything, verify whether the tool is missing, installed-but-stopped, configured-but-unreachable, or already available. Prefer Graphify for repository relationships/impact, Serena for symbol-level navigation/editing, and local FTS5 for exact text/config/docs/logs before broad source reads. Keep changes local: small cohesive units, small public APIs, targeted reads/tests, filtered logs, and `git diff` instead of rereading whole files.
<!-- developer-environment-skill:end -->
TXT
}

backup_if_exists() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cp -p "$file" "$file.bak.$STAMP"
    printf 'Backup: %s\n' "$file.bak.$STAMP"
  fi
}

upsert_marked_section() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"

  if [[ -f "$file" ]]; then
    awk -v start="$START" -v end="$END" '
      $0 == start {skip=1; next}
      $0 == end   {skip=0; next}
      !skip {print}
    ' "$file" > "$tmp"
  else
    : > "$tmp"
  fi

  # Trim trailing blank lines before appending the canonical section.
  awk '{lines[NR]=$0} END {n=NR; while (n>0 && lines[n] ~ /^[[:space:]]*$/) n--; for (i=1;i<=n;i++) print lines[i]}' "$tmp" > "$tmp.trim"
  mv "$tmp.trim" "$tmp"

  if [[ -s "$tmp" ]]; then
    printf '\n\n' >> "$tmp"
  fi
  section_content >> "$tmp"
  printf '\n' >> "$tmp"

  if [[ -f "$file" ]] && cmp -s "$file" "$tmp"; then
    rm -f "$tmp"
    printf 'Unchanged: %s\n' "$file"
    return
  fi

  backup_if_exists "$file"
  mkdir -p "$(dirname "$file")"
  mv "$tmp" "$file"
  printf 'Updated: %s\n' "$file"
}

ensure_gitignore_block() {
  local file="$PROJECT/.gitignore"
  local start='<!-- developer-environment-local-artifacts:start -->'
  local end='<!-- developer-environment-local-artifacts:end -->'
  local tmp
  tmp="$(mktemp)"

  if [[ -f "$file" ]]; then
    awk -v start="$start" -v end="$end" '
      $0 == start {skip=1; next}
      $0 == end   {skip=0; next}
      !skip {print}
    ' "$file" > "$tmp"
  else
    : > "$tmp"
  fi

  awk '{lines[NR]=$0} END {n=NR; while (n>0 && lines[n] ~ /^[[:space:]]*$/) n--; for (i=1;i<=n;i++) print lines[i]}' "$tmp" > "$tmp.trim"
  mv "$tmp.trim" "$tmp"
  if [[ -s "$tmp" ]]; then printf '\n\n' >> "$tmp"; fi
  cat >> "$tmp" <<'TXT'
<!-- developer-environment-local-artifacts:start -->
.fts/
files/_text/
<!-- developer-environment-local-artifacts:end -->
TXT
  printf '\n' >> "$tmp"

  if [[ -f "$file" ]] && cmp -s "$file" "$tmp"; then
    rm -f "$tmp"
    printf 'Unchanged: %s\n' "$file"
    return
  fi
  backup_if_exists "$file"
  mv "$tmp" "$file"
  printf 'Updated: %s\n' "$file"
}

install_helper_if_missing() {
  local name="$1"
  local src="$SOURCE_SKILL/scripts/$name"
  local dst="$PROJECT/tools/$name"
  mkdir -p "$PROJECT/tools"
  if [[ -e "$dst" ]]; then
    printf 'Kept existing helper: %s\n' "$dst"
    return
  fi
  cp "$src" "$dst"
  chmod +x "$dst"
  printf 'Installed helper: %s\n' "$dst"
}

if [[ ! -f "$SOURCE_SKILL/SKILL.md" ]]; then
  printf 'ERROR: missing source skill: %s\n' "$SOURCE_SKILL/SKILL.md" >&2
  exit 1
fi

mkdir -p "$PROJECT/.ai/skills"
SOURCE_REAL="$(cd "$SOURCE_SKILL" && pwd -P)"
CANONICAL_REAL=""
if [[ -d "$CANONICAL" ]]; then
  CANONICAL_REAL="$(cd "$CANONICAL" && pwd -P)"
fi
if [[ "$SOURCE_REAL" == "$CANONICAL_REAL" ]]; then
  printf 'Canonical skill already active in this project: %s\n' "$CANONICAL"
else
  rm -rf "$CANONICAL.tmp"
  mkdir -p "$CANONICAL.tmp"
  cp -R "$SOURCE_SKILL/." "$CANONICAL.tmp/"
  rm -rf "$CANONICAL"
  mv "$CANONICAL.tmp" "$CANONICAL"
  printf 'Installed canonical skill: %s\n' "$CANONICAL"
fi

mkdir -p "$PROJECT/.agents/skills" "$PROJECT/.claude/skills"
rm -rf "$PROJECT/.agents/skills/developer-environment" "$PROJECT/.claude/skills/developer-environment"
ln -s "../../.ai/skills/developer-environment" "$PROJECT/.agents/skills/developer-environment"
ln -s "../../.ai/skills/developer-environment" "$PROJECT/.claude/skills/developer-environment"
printf 'Linked Codex skill:  %s\n' "$PROJECT/.agents/skills/developer-environment"
printf 'Linked Claude skill: %s\n' "$PROJECT/.claude/skills/developer-environment"

upsert_marked_section "$PROJECT/AGENTS.md"
upsert_marked_section "$PROJECT/CLAUDE.md"
ensure_gitignore_block

install_helper_if_missing "fts.sh"
install_helper_if_missing "extract-text.sh"
install_helper_if_missing "check-dev-env.sh"

printf '\nProject integration installed. The agent can now use this skill from Codex or Claude Code.\nSuggested verification:\n'
printf '  cd %q\n' "$PROJECT"
printf '  tools/check-dev-env.sh\n'
printf '  tools/fts.sh index\n'
