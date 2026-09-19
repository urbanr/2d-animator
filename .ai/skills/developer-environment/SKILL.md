---
name: developer-environment
description: Inspect, diagnose, and recommend a token-efficient local developer environment for Codex and Claude Code. Prefer Docker for persistent services, Graphify for code relationships, Serena for symbol-level navigation/editing, and local SQLite FTS5 plus deterministic scripts for text/document retrieval. Verify before installing and minimize context sent to AI models.
---

# Developer Environment

Use this skill for local developer tooling, MCP servers, Docker, Graphify, Serena, local full-text search, SQLite FTS5, Python utilities, Codex, Claude Code, and token-efficient coding workflows.


## Project install/remove actions

This skill is self-installing at the project level. The user should not have to run a separate top-level installer.

When the user says to install, enable, add, or use this skill in the current project:

1. Determine the project root. Prefer `git rev-parse --show-toplevel`; otherwise use the current working directory.
2. Run this skill's own installer:

```bash
bash <this-skill-dir>/scripts/install-project.sh <project-root>
```

3. Do the work yourself when shell access is available. Do not tell the user to copy snippets or manually run the installer unless execution is unavailable.
4. Report what was changed and any detected missing/stopped dependencies.

The installer:
- copies one canonical project-local skill to `.ai/skills/developer-environment` when needed;
- links it into `.agents/skills/developer-environment` and `.claude/skills/developer-environment`;
- idempotently inserts managed instructions into `AGENTS.md` and `CLAUDE.md`;
- adds local derived artifacts to `.gitignore`;
- installs `fts.sh`, `extract-text.sh`, and `check-dev-env.sh` into `tools/` only if those files do not already exist;
- backs up existing instruction files before modifying them.

If the skill is already running from the project's canonical `.ai/skills/developer-environment`, the installer must not copy the skill onto itself; it only repairs/updates the project integration.

When the user says to remove/uninstall this skill from the current project, run:

```bash
bash <this-skill-dir>/scripts/remove-project.sh <project-root>
```

Do not remove project-local `tools/fts.sh`, `tools/extract-text.sh`, or `tools/check-dev-env.sh` automatically because they may have project-specific changes. Remove those only when the user explicitly asks.

The top-level distribution directory is not required after the skill has been copied into a project. For installing into another project, use any already-installed/global copy of this skill and let the agent invoke `scripts/install-project.sh` there.

## Core principles

1. Verify before installing anything.
2. Distinguish `missing`, `installed-but-stopped`, `configured-but-unreachable`, and `available`.
3. Prefer Docker for persistent services. Do not introduce PM2.
4. Prefer local deterministic tools before sending raw data to an AI model.
5. Prefer Graphify/Serena/FTS lookup before opening whole files.
6. Optimize code for change locality: a normal change should require reading a small number of cohesive symbols/files.
7. Keep persistent agent instructions short; move operational detail into this skill and scripts.

## Recommended stack

### Persistent runtime

- Docker Desktop
- Docker Compose

Use Docker for long-running MCP/services such as a shared Graphify HTTP MCP used by both Codex and Claude Code.

Expected architecture:

```text
Claude Code --\
               -> http://127.0.0.1:PORT/mcp -> Graphify container
Codex --------/
```

Prefer `restart: unless-stopped` and keep the application as the container's main PID 1 process. Do not add a second process supervisor inside a single-service container.

### Code intelligence

- **Graphify**: architecture, dependency/call graph, impact paths, broad relationships.
- **Serena**: symbol/LSP-aware lookup, references, small symbol reads, symbol-level edits.
- **SQLite FTS5**: fast local lexical search over code, notes, logs, extracted documents.

These are complementary, not substitutes.

`ast-grep` is optional, not part of the default stack. Add it only when repeated AST-pattern searches or structural mass refactors justify another tool. Graphify + Serena + FTS cover the normal workflow.

Recommended search order:

1. Graphify when the question is relational: "what calls this", "what depends on this", "what path connects A to B", "what is impacted".
2. Serena when a concrete symbol/class/method is known or must be edited.
3. FTS5 when searching exact wording, identifiers, configuration text, comments, docs, logs, or customer artifacts.
4. `rg`/targeted shell tools for simple exact local checks.
5. Read source only after narrowing scope; read the smallest useful range or symbol body.

Do not dump whole repositories or large files into model context when a local index or symbol tool can narrow the target first.

## Local FTS5 index

The canonical project helper is `tools/fts.sh`.

Expected database:

```text
<repo>/.fts/fts.db
```

It is a derived local artifact and belongs in `.gitignore`.

Typical usage:

```bash
tools/fts.sh index
tools/fts.sh q "payment* timeout*"
tools/fts.sh q '"exact phrase"'
```

The helper should:
- create `.fts/fts.db` automatically;
- use SQLite FTS5;
- incrementally update changed files using metadata such as mtime/hash;
- delete stale entries when source files disappear;
- return a small ranked result set with short snippets;
- avoid generated/build directories;
- avoid sensitive/raw directories explicitly excluded by the project;
- report files skipped because of size rather than silently pretending the index is complete.

For Czech/Slovak text, prefix queries are often preferable for inflected words.

### SQLite availability check

Do not require the `sqlite3` CLI when Python's standard `sqlite3` module is sufficient.

Verify FTS5 support with a small read-only/self-contained Python check before recommending installation:

```bash
python3 - <<'PY'
import sqlite3
c = sqlite3.connect(':memory:')
c.execute('create virtual table t using fts5(x)')
print('FTS5 OK')
PY
```

If this succeeds, the project already has what `fts.sh` needs.

## Binary/document text extraction

The canonical helper is `tools/extract-text.sh`.

Its role is to convert documents into local plain-text derivatives before indexing, for example:

```text
files/spec.pdf
        -> files/_text/spec.pdf.txt
        -> .fts/fts.db
```

Keep `files/_text/` in `.gitignore`.

Prefer incremental extraction. Do not repeatedly send PDFs/DOCX/XLSX to an AI model when unchanged extracted text already exists locally.

Optional local dependencies may include:
- `pandoc` for DOCX/ODT/RTF/EPUB;
- `pdftotext`/Poppler for PDF;
- macOS `textutil` for DOC;
- Python stdlib parsing for simple XLSX text extraction where sufficient.

Missing optional extractors should be reported precisely. Do not fail the entire indexing flow merely because one file type cannot be extracted.

Do not automatically unpack untrusted archives. Report them and require an explicit human decision.

## Deterministic local scripts

When a deterministic task can be performed locally, prefer a script over model reasoning and token use.

Good candidates:
- hashing/checksums;
- filtering and summarizing test/build logs;
- extracting stack traces/errors;
- parsing JSON/YAML/XML;
- counting/searching files;
- computing dependency or file metadata;
- extracting text from documents;
- generating compact diffs;
- querying SQLite/FTS5.

Before inventing a new script, inspect `tools/`, `scripts/`, and the skill's scripts. Reuse an existing helper if it already does the job.

Keep script output compact and machine-readable where useful. Do not feed 20,000-line logs to the model when a script can return the 30 relevant lines.

## Docker checks

Run safe checks first:

```bash
command -v docker
docker --version
docker compose version
docker info
```

Interpretation:
- Docker binary exists + `docker info` works -> available.
- Docker binary exists + `docker info` fails -> Docker is installed but Desktop/daemon may be stopped; do not recommend reinstalling yet.
- Docker binary absent -> installation may be appropriate.

For Graphify containers also inspect:

```bash
docker compose ps
docker compose logs --tail=100 <service>
```

If an MCP endpoint is expected, verify reachability separately. A dead endpoint does not prove the image/package is missing.

## Graphify

Use Graphify as the persistent broad code-graph layer.

Before emitting exact CLI flags, verify installed version/help or current upstream documentation because commands can change.

For a shared Codex + Claude Code setup, prefer one HTTP MCP instance in Docker bound to loopback unless LAN access is explicitly needed.

After source changes, keep the graph fresh using the installed Graphify version's incremental/update workflow. Prefer incremental refresh over full rebuild where supported.

## Serena

Use Serena for precise symbol-level work:
- symbol lookup;
- references;
- small symbol body retrieval;
- symbol-aware editing;
- language-server navigation.

Serena may be client-owned via STDIO or containerized if that matches the installed deployment. Verify actual local configuration rather than assuming one transport.

When Graphify already identified the relevant class/path, use Serena to retrieve/edit only the required symbols instead of reading entire files.

## Token-efficient coding rules

### Design for change locality

Prefer code where one feature/change is understandable from a small number of cohesive files.

Good:
- cohesive classes with one clear responsibility;
- small public APIs;
- feature-oriented packages/modules where practical;
- explicit dependencies;
- domain logic separated from infrastructure/integration concerns;
- focused methods;
- tests close to the behavior they verify.

Avoid both extremes:
- giant "god" classes that force the model to read hundreds/thousands of lines;
- hyper-fragmentation into many tiny wrappers/interfaces/factories that require opening ten files to understand one operation.

Do not enforce arbitrary LOC limits. Optimize for the question:

> How much code must an agent read to safely modify this behavior?

### Minimize required context

When implementing a change:
1. query Graphify/FTS/Serena first;
2. identify the smallest relevant symbol set;
3. inspect signatures/interfaces before bodies;
4. read only the bodies needed;
5. edit the smallest coherent unit;
6. run targeted tests first;
7. inspect compact test/error output;
8. use `git diff` to review the actual change instead of rereading all modified files;
9. run broader tests only when the change warrants them.

### File and API structure

Prefer:
- stable small interfaces;
- dependency injection over hidden global state;
- descriptive names that make text/symbol search effective;
- one canonical implementation path instead of duplicated logic;
- configuration split by real responsibility, not arbitrary file size;
- generated code clearly separated and excluded from normal context/search when possible.

Avoid:
- broad utility classes with unrelated methods;
- duplicate implementations that force cross-checking;
- huge configuration files when they can be meaningfully modularized;
- implicit conventions that require scanning the whole repository to understand behavior.

### Agent output discipline

The coding agent should not paste entire unchanged files unless explicitly needed. Prefer:
- changed diff;
- specific symbol/line ranges;
- compact summaries;
- filtered logs;
- targeted test output.

For commands that produce large output, redirect/filter before returning it to the model.

## Installation/integration behavior

When this skill is installed into a project, the project should have one canonical copy at `.ai/skills/developer-environment` and relative links from both `.agents/skills/developer-environment` and `.claude/skills/developer-environment`. The top-level bundled `install.sh` is only the one-time global bootstrap: it installs the master copy to `~/.ai/skills/developer-environment` and discovery links to `~/.agents/skills/developer-environment` and `~/.claude/skills/developer-environment`. The installer also maintains a short marker-delimited integration block in project `AGENTS.md` and `CLAUDE.md`; do not duplicate the full skill there.

The installer is expected to be idempotent, back up existing instruction files before changing managed blocks, preserve all unmanaged content, add `.fts/` and `files/_text/` to a managed `.gitignore` block, and install FTS/extraction/diagnostic helpers only when the project does not already have its own copy.

## Agent instruction files

### Codex

Use project `AGENTS.md` for short persistent rules. Keep details in this skill.

Suggested root snippet:

```md
## Local developer tooling
Use the developer-environment skill for environment, Docker, MCP, Graphify, Serena, local FTS, document extraction, and token-efficiency decisions. Verify availability/running state before recommending installation. Prefer Graphify/Serena/FTS before broad source reads and optimize changes for minimal context.
```

### Claude Code

Use project `CLAUDE.md` similarly:

```md
## Local developer tooling
Use the developer-environment skill for environment, Docker, MCP, Graphify, Serena, local FTS, document extraction, and token-efficiency decisions. Verify availability/running state before recommending installation. Prefer Graphify/Serena/FTS before broad source reads and optimize changes for minimal context.
```

Do not duplicate the whole skill in either instruction file.

## Diagnostic workflow

Use `scripts/check-dev-env.sh` when present.

Report:
1. observed installed tools;
2. running/reachable services;
3. relevant project-local helpers/indexes;
4. exact gap;
5. smallest fix.

Ask only when read-only inspection cannot resolve the state or when installation/config mutation requires consent.

## Safety

Read-only inspection is fine proactively.

Ask before:
- installing/uninstalling software;
- editing global Codex/Claude configuration;
- changing Docker/network exposure;
- deleting images/containers/indexes;
- unpacking untrusted archives;
- changing project-wide persistent behavior not requested by the user.
