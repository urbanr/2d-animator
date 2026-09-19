#!/bin/bash
# Extrakce textu z binarnich podkladu do files/_text/ pro fulltextovy index.
#
# Proc: fts.sh umi indexovat jen textove soubory, ale vecne podklady od zakaznika
# jsou docx/xlsx/pdf. Bez tohoto kroku fulltext hleda jen v tom, co jsme si sami napsali.
#
# Pouziti:
#   tools/extract-text.sh          # inkrementalne (jen zmenene soubory)
#   tools/extract-text.sh --force  # znovu vse
#
# Vystup: files/_text/<stejna cesta>.txt - odvozeny artefakt, patri do .gitignore.
# Extrahuje se i obsah souboru vyloucenych z gitu; _text/ je ignorovany, takze
# zustava jen lokalne - stejny rezim jako komunikace/raw/.
#
# Zavislosti (chybejici se preskoci s hlaskou, skript nespadne):
#   pandoc     docx, odt, rtf, epub
#   pdftotext  pdf            (poppler)
#   textutil   doc            (macOS)
#   python3    xlsx           (stdlib, bez openpyxl)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export FTS_ROOT="$ROOT"
export FTS_FORCE="${1:-}"

python3 - <<'PYEOF'
import os, re, shutil, subprocess, sys, zipfile
from pathlib import Path
import signal
signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # cisty konec pri "| head"

ROOT = Path(os.environ["FTS_ROOT"])
FORCE = os.environ.get("FTS_FORCE", "") == "--force"
SRC_DIR = ROOT / "files"
OUT_DIR = SRC_DIR / "_text"
# Projektovy doplnek: zdroje pravdy, ktere v tomhle repu nelezi ve files/.
EXTRA_DIRS = [ROOT / "game-plan" / "other"]


def sources():
    """Dvojice (zdroj, cilovy .txt) ze vsech sledovanych adresaru."""
    if SRC_DIR.is_dir():
        for item in sorted(SRC_DIR.rglob("*")):
            if OUT_DIR not in item.parents:
                yield item, OUT_DIR / item.relative_to(SRC_DIR).parent / (item.name + ".txt")
    for extra in EXTRA_DIRS:
        if not extra.is_dir():
            continue
        prefix = OUT_DIR / extra.relative_to(ROOT)
        for item in sorted(extra.rglob("*")):
            yield item, prefix / item.relative_to(extra).parent / (item.name + ".txt")

# Co umime vytahnout. Klic = pripona, hodnota = nastroj (kvuli hlasce o chybejici zavislosti).
HANDLERS = {
    ".docx": "pandoc", ".odt": "pandoc", ".rtf": "pandoc", ".epub": "pandoc",
    ".pdf": "pdftotext",
    ".doc": "textutil",
    ".xlsx": "python3", ".xlsm": "python3",
}
MAX_BYTES = 80_000_000

def have(tool):
    return shutil.which(tool) is not None

def xlsx_text(src):
    """Nazvy listu + vsechny retezce (sharedStrings i inline). Cisla se nevytahuji."""
    out = []
    try:
        z = zipfile.ZipFile(src)
    except Exception as e:
        return None, f"neni platny zip: {e}"
    try:
        wb = z.read("xl/workbook.xml").decode("utf-8", "ignore")
        sheets = re.findall(r'<sheet[^>]*name="([^"]+)"', wb)
        if sheets:
            out.append("LISTY: " + " | ".join(sheets))
    except KeyError:
        pass
    def untag(x):
        return re.sub(r"<[^>]+>", "", x)
    try:
        ss = z.read("xl/sharedStrings.xml").decode("utf-8", "ignore")
        out += [untag(t) for t in re.findall(r"<si>(.*?)</si>", ss, re.S)]
    except KeyError:
        pass
    for n in z.namelist():                      # inline strings v listech
        if n.startswith("xl/worksheets/") and n.endswith(".xml"):
            try:
                sh = z.read(n).decode("utf-8", "ignore")
            except Exception:
                continue
            out += [untag(t) for t in re.findall(r"<is>(.*?)</is>", sh, re.S)]
    txt = "\n".join(x.strip() for x in out if x and x.strip())
    return (txt, None) if txt else (None, "zadny text")

def extract(src, dst):
    ext = src.suffix.lower()
    tool = HANDLERS[ext]
    if not have(tool):
        return False, f"chybi {tool}"
    try:
        if tool == "pandoc":
            subprocess.run(["pandoc", "-t", "plain", "--wrap=none", str(src), "-o", str(dst)],
                           check=True, capture_output=True, timeout=180)
        elif tool == "pdftotext":
            subprocess.run(["pdftotext", "-q", str(src), str(dst)],
                           check=True, capture_output=True, timeout=180)
        elif tool == "textutil":
            subprocess.run(["textutil", "-convert", "txt", "-output", str(dst), str(src)],
                           check=True, capture_output=True, timeout=180)
        else:
            txt, err = xlsx_text(src)
            if txt is None:
                return False, err
            dst.write_text(txt, encoding="utf-8")
        return dst.exists() and dst.stat().st_size > 0, None
    except subprocess.TimeoutExpired:
        return False, "timeout"
    except subprocess.CalledProcessError as e:
        msg = (e.stderr or b"").decode("utf-8", "ignore").strip().splitlines()
        return False, (msg[-1][:80] if msg else "nastroj skoncil chybou")
    except Exception as e:
        return False, str(e)[:80]

if not SRC_DIR.is_dir() and not any(d.is_dir() for d in EXTRA_DIRS):
    print(f"zadny zdrojovy adresar (files/ ani {', '.join(str(d.relative_to(ROOT)) for d in EXTRA_DIRS)}) v {ROOT}")
    sys.exit(1)

done = skipped = failed = uptodate = 0
problems = []
expected = set()
for src, dst in sources():
    if not src.is_file():
        continue
    ext = src.suffix.lower()
    if ext not in HANDLERS:
        continue
    try:
        if src.stat().st_size > MAX_BYTES:
            skipped += 1; continue
    except OSError:
        continue
    rel = src.relative_to(ROOT)
    expected.add(dst)
    if not FORCE and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        uptodate += 1; continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    ok, err = extract(src, dst)
    if ok:
        done += 1
    else:
        failed += 1
        problems.append(f"  {rel}: {err}")
        if dst.exists() and dst.stat().st_size == 0:
            dst.unlink()

# uklid osirelych vystupu po smazanych zdrojich
removed = 0
if OUT_DIR.is_dir():
    for t in sorted(OUT_DIR.rglob("*.txt")):
        if t not in expected:
            t.unlink(); removed += 1

print(f"extrakce: {done} novych/zmenenych, {uptodate} aktualnich, "
      f"{failed} chyb, {skipped} prilis velkych, {removed} osirelych smazano")
if problems:
    print("nepodarilo se:")
    print("\n".join(problems))

# ARCHIVY SE NIKDY NEROZBALUJI AUTOMATICKY.
# Jsou to cizi soubory od zakaznika - rozbaleni je necha sahnout na filesystem
# (path traversal, zip bomba). Jen se ohlasi, rozbali je clovek vedome.
# Cteni seznamu polozek na disk nesaha, proto je bezpecne.
ARCHIVE_EXTS = {".zip", ".7z", ".rar", ".gz", ".tgz", ".tar", ".bz2", ".xz"}
archives = [src for src, _ in sources()
            if src.is_file() and src.suffix.lower() in ARCHIVE_EXTS]
if archives:
    print(f"\narchivy ({len(archives)}) - NEROZBALUJI SE, obsah tedy neni v indexu."
          f"\nrozbal rucne a obsah se pri dalsim behu naindexuje sam:")
    for p in archives:
        rel = p.relative_to(ROOT)
        detail = ""
        if p.suffix.lower() == ".zip":
            try:
                names = zipfile.ZipFile(p).namelist()
                from collections import Counter
                c = Counter(n.rsplit(".", 1)[-1].lower() for n in names if "." in n)
                detail = "  [" + ", ".join(f"{n}x {e}" for e, n in c.most_common(4)) + "]"
            except Exception:
                detail = "  [nelze precist seznam]"
        print(f"  {p.stat().st_size:>12,} B  {rel}{detail}")
PYEOF
