<!-- developer-environment-skill:start -->
## Local developer tooling
Use the `developer-environment` skill for Docker/Compose, MCP, Graphify, Serena, local SQLite FTS5, document extraction, deterministic local utilities, and token-efficient coding decisions.

Before installing anything, verify whether the tool is missing, installed-but-stopped, configured-but-unreachable, or already available. Prefer Graphify for repository relationships/impact, Serena for symbol-level navigation/editing, and local FTS5 for exact text/config/docs/logs before broad source reads. Keep changes local: small cohesive units, small public APIs, targeted reads/tests, filtered logs, and `git diff` instead of rereading whole files.
<!-- developer-environment-skill:end -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
