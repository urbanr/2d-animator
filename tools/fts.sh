#!/bin/bash
# Lokální fulltextový index projektu - SQLite FTS5 (unicode61, bez diakritiky).
# Použití:
#   tools/fts.sh index          # (pře)indexovat změněné soubory
#   tools/fts.sh q "dotaz"      # dotaz (před hledáním se automaticky přeindexují změny)
# Dotazy: FTS5 MATCH syntaxe. Praxe pro češtinu: u obsahových slov VŽDY prefix -
#   "alokačn* klíč* EDC" (přesný tvar najde jen přesný tvar, prefix pokryje skloňování).
#   Fráze: "\"skupina sdileni\"". Přesné tvary jen pro kódy a identifikátory (EAN, A30, V20).
#   Diakritika je lhostejná - normalizuje se index i dotaz, "klic" najde "klíč".
# DB: .fts/fts.db v kořeni repa - odvozený artefakt, patří do .gitignore.
# NIKDY se neindexuje komunikace/raw/ (syrové záznamy) - viz odp-analysis-skill §2a.
# Binární podklady (docx/xlsx/pdf) se před indexací vytáhnou do files/_text/ přes
# tools/extract-text.sh - spouští se automaticky, viz níže. files/_text/ patří do .gitignore.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export FTS_ROOT="$ROOT"
export FTS_CMD="${1:-q}"
shift || true
export FTS_QUERY="${*:-}"

# Binární podklady (docx/xlsx/pdf) nejdou indexovat přímo - nejdřív z nich vytáhnout
# text do files/_text/. Inkrementálně, takže po prvním běhu je to prakticky zdarma.
# Hlášení extraktoru (co se vytáhlo, jaké archivy leží stranou) patří do `index`.
# Při dotazu se jen tiše doextrahuje, aby výpis nezasypal výsledky hledání.
if [ -x "$ROOT/tools/extract-text.sh" ]; then
  if [ "$FTS_CMD" = "index" ]; then
    "$ROOT/tools/extract-text.sh" || true
  else
    "$ROOT/tools/extract-text.sh" >/dev/null || true
  fi
fi

python3 - <<'PYEOF'
import os, sqlite3, sys
from pathlib import Path
import signal
signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # cisty konec pri "| head"

ROOT = Path(os.environ["FTS_ROOT"])
CMD = os.environ["FTS_CMD"]
QUERY = os.environ.get("FTS_QUERY", "")

DB_DIR = ROOT / ".fts"
DB_DIR.mkdir(exist_ok=True)
db = sqlite3.connect(DB_DIR / "fts.db")
db.executescript("""
CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, mtime INTEGER);
CREATE VIRTUAL TABLE IF NOT EXISTS doc USING fts5(path UNINDEXED, body, tokenize='unicode61 remove_diacritics 2');
""")

EXTS = {".md", ".txt", ".js", ".jsx", ".ts", ".tsx", ".py", ".sh", ".sql",
        ".yaml", ".yml", ".mermaid", ".proto", ".css", ".html", ".json",
        ".csv", ".log"}
# .xml záměrně NENÍ v seznamu: strojové exporty (Archi, ArchiMate) bývají v podkladech
# v desítkách skoro shodných variant a zaplaví výsledky. Přidat, až bude důvod.
EXCLUDE_DIR_NAMES = {".git", ".fts", ".idea", ".venv", "node_modules", "graphify-out",
                     "dist", "dist-single", "target", "__pycache__"}
EXCLUDE_REL_PREFIXES = ("komunikace/raw",)          # syrová data - nikdy neindexovat
EXCLUDE_REL_PARTS = ("/build/out/", "/build/.venv/")  # generované výstupy
MAX_BYTES = 3_000_000   # OpenAPI specifikace bývají přes 2 MB; přes limit se soubor NEindexuje
SKIPPED_TOO_BIG = []    # hlásí se na konci - tichý skip je past, viz komentář u výpisu

def wanted():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIR_NAMES and not d.startswith(".")]
        for fn in filenames:
            p = Path(dirpath) / fn
            rel = p.relative_to(ROOT).as_posix()
            if p.suffix.lower() not in EXTS:
                continue
            if rel.startswith(EXCLUDE_REL_PREFIXES):
                continue
            if any(part in "/" + rel for part in EXCLUDE_REL_PARTS):
                continue
            try:
                if p.stat().st_size > MAX_BYTES:
                    SKIPPED_TOO_BIG.append((rel, p.stat().st_size))
                    continue
            except OSError:
                continue
            yield rel, p

def reindex():
    known = dict(db.execute("SELECT path, mtime FROM files"))
    seen, added, updated = set(), 0, 0
    for rel, p in wanted():
        seen.add(rel)
        mtime = int(p.stat().st_mtime)
        if known.get(rel) == mtime:
            continue
        body = p.read_text(errors="ignore")
        db.execute("DELETE FROM doc WHERE path = ?", (rel,))
        db.execute("INSERT INTO doc(path, body) VALUES(?, ?)", (rel, body))
        db.execute("REPLACE INTO files(path, mtime) VALUES(?, ?)", (rel, mtime))
        if rel in known: updated += 1
        else: added += 1
    removed = set(known) - seen
    for rel in removed:
        db.execute("DELETE FROM doc WHERE path = ?", (rel,))
        db.execute("DELETE FROM files WHERE path = ?", (rel,))
    db.commit()
    return added, updated, len(removed), len(seen)

a, u, r, total = reindex()

# Soubor pres limit se NEindexuje. Drive se to delo potichu a index vypadal kompletni -
# tak zmizela cela OpenAPI specifikace, aniz by to kdokoli poznal. Proto se to hlasi vzdy.
if SKIPPED_TOO_BIG:
    print(f"POZOR: {len(SKIPPED_TOO_BIG)} souboru pres limit {MAX_BYTES:,} B - NEJSOU v indexu:")
    for rel, size in sorted(SKIPPED_TOO_BIG, key=lambda x: -x[1]):
        print(f"  {size:>12,} B  {rel}")

if CMD == "index":
    print(f"index: {total} souboru ({a} novych, {u} zmenenych, {r} odstranenych)")
    sys.exit(0)

if not QUERY:
    print('pouziti: fts.sh index | fts.sh q "dotaz"'); sys.exit(1)
try:
    rows = db.execute(
        "SELECT path, snippet(doc, 1, '>>', '<<', ' ... ', 16), bm25(doc) "
        "FROM doc WHERE doc MATCH ? ORDER BY bm25(doc) LIMIT 12", (QUERY,)).fetchall()
except sqlite3.OperationalError as e:
    print(f"chyba dotazu: {e}\n(FTS5 syntaxe - zkus prefix 'slovo*' nebo frazi v uvozovkach)")
    sys.exit(1)
if not rows:
    print(f"nic nenalezeno pro: {QUERY}"); sys.exit(0)
for i, (path, snip, rank) in enumerate(rows, 1):
    snip = " ".join(snip.split())
    print(f"{i:2}. {path}\n    {snip}")
PYEOF
