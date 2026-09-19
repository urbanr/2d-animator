#!/usr/bin/env bash
set -u

# Read-only inspection for a token-efficient Codex + Claude Code environment.
# Does not install/start/stop/modify anything. Always exits 0 so agents can consume the full report.

have() { command -v "$1" >/dev/null 2>&1; }
section() { printf '\n[%s]\n' "$1"; }
kv() { printf '%-28s %s\n' "$1" "$2"; }
first_line() { "$@" 2>/dev/null | head -n 1 || true; }

section "Host"
kv "OS" "$(uname -s 2>/dev/null || echo unknown)"
kv "Architecture" "$(uname -m 2>/dev/null || echo unknown)"

section "Core tools"
for tool in git gh curl jq python3 uv uvx docker graphify sqlite3 pandoc pdftotext rg; do
  if have "$tool"; then
    kv "$tool" "installed: $(command -v "$tool")"
  else
    kv "$tool" "missing/not on PATH"
  fi
done

section "Docker"
if have docker; then
  kv "docker" "$(first_line docker --version)"
  if docker compose version >/dev/null 2>&1; then
    kv "docker compose" "$(docker compose version 2>/dev/null | head -n 1)"
  else
    kv "docker compose" "unavailable"
  fi
  if docker info >/dev/null 2>&1; then
    kv "Docker daemon" "running/reachable"
  else
    kv "Docker daemon" "installed but unreachable/stopped"
  fi
else
  kv "Docker" "missing"
fi

if have docker && docker info >/dev/null 2>&1; then
  graphify_ct="$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -i graphify | head -n 3 || true)"
  serena_ct="$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -i serena | head -n 3 || true)"
  [[ -n "$graphify_ct" ]] && kv "Graphify container" "running: $(echo "$graphify_ct" | tr '\n' '; ' | sed 's/; $//')" || kv "Graphify container" "no obvious running container"
  [[ -n "$serena_ct" ]] && kv "Serena container" "running: $(echo "$serena_ct" | tr '\n' '; ' | sed 's/; $//')" || kv "Serena container" "no obvious running container (may be STDIO/client-owned)"
  if [[ -f compose.yml || -f compose.yaml || -f docker-compose.yml || -f docker-compose.yaml ]]; then
    services="$(docker compose config --services 2>/dev/null | tr '\n' ' ' || true)"
    [[ -n "$services" ]] && kv "Compose services" "$services"
  fi
fi

section "Python / SQLite FTS5"
if have python3; then
  kv "python3" "$(first_line python3 --version)"
  if python3 - <<'PY' >/dev/null 2>&1
import sqlite3
c = sqlite3.connect(':memory:')
c.execute('create virtual table t using fts5(x)')
PY
  then
    kv "Python sqlite FTS5" "available"
  else
    kv "Python sqlite FTS5" "unavailable"
  fi
fi
have uv && kv "uv" "$(first_line uv --version)"
have uvx && kv "uvx" "$(first_line uvx --version)"

section "Project-local retrieval"
[ -x "tools/fts.sh" ] && kv "tools/fts.sh" "present/executable" || kv "tools/fts.sh" "absent/not executable"
[ -x "tools/extract-text.sh" ] && kv "tools/extract-text.sh" "present/executable" || kv "tools/extract-text.sh" "absent/not executable"
[ -f ".fts/fts.db" ] && kv ".fts/fts.db" "present ($(du -h .fts/fts.db 2>/dev/null | awk '{print $1}'))" || kv ".fts/fts.db" "absent (created by fts.sh on first index/query)"
[ -d "files/_text" ] && kv "files/_text" "present" || kv "files/_text" "absent"

section "Code intelligence"
if have graphify; then
  kv "graphify" "installed/on PATH"
else
  kv "graphify" "no direct CLI on PATH (may still run in Docker)"
fi

# Serena may be configured as an MCP without a standalone `serena` executable.
if have serena; then
  kv "serena" "installed/on PATH: $(command -v serena)"
else
  kv "serena" "no direct CLI on PATH; inspect MCP config before calling it missing"
fi

section "Project instructions"
[ -f "AGENTS.md" ] && kv "AGENTS.md" "present" || kv "AGENTS.md" "absent"
[ -f "CLAUDE.md" ] && kv "CLAUDE.md" "present" || kv "CLAUDE.md" "absent"
[ -d ".agents/skills" ] && kv ".agents/skills" "present" || kv ".agents/skills" "absent"
[ -d ".claude/skills" ] && kv ".claude/skills" "present" || kv ".claude/skills" "absent"

section "Known configs"
[ -f "$HOME/.codex/config.toml" ] && kv "Codex config" "$HOME/.codex/config.toml" || kv "Codex config" "not found"
[ -f "$HOME/.claude.json" ] && kv "Claude config" "$HOME/.claude.json" || true
[ -d "$HOME/.claude" ] && kv "Claude dir" "$HOME/.claude" || true

section "Policy"
kv "State model" "missing != stopped != configured-but-unreachable"
kv "Persistent services" "prefer Docker"
kv "Retrieval order" "Graphify/Serena/FTS -> targeted reads -> edit/test/diff"
kv "Install policy" "verify first; install only after confirming the actual gap"

exit 0
