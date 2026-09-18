# CLAUDE.md — Prdel světa

Orientační mapa repa pro AI asistenty. Detaily nejsou tady — jsou v dokumentech,
na které se odkazuje. Tenhle soubor jen říká, kam se podívat.

## Co to je

iOS hra **Prdel světa**: postapokalyptická tower-defense, kde si stavíš pevnost
z dílů s reálnou fyzikou a bráníš jádro proti vlnám nepřátel.
Swift + SpriteKit (hra) + SwiftUI (menu), iPhone na šířku, offline, 17+.

## Mapa repa

| Adresář | Co v něm je |
|---|---|
| `other/` | Herní design `prdel sveta design.md` (62 kB, v23, ~33 nepřátel / 13 bossů / 14 map) + `prdel_sveta_balanc.xlsx`. Zdroj pravdy pro game design. |
| `graphics/` | 574 MB assetů a JSON dat. Šest **oddělených** datových bank — nikdy nesloučit. |
| `tool/` | Webový editor bez buildu (statické HTML + UMD JS, žádný npm). Tady se dnes odehrává většina práce. |
| `tools/` | Python + CJS pipeline: import, downscale, varianty, ukládací API, jednorázové migrace. |
| `protoyp/` | Swift vizuální prototyp — přehrávač spritů přes pozadí. **Není to hra**, je bez fyziky, kolizí i boje. |
| `sound/` | Prázdné. |

Pozor na past: `other/README.md` popisuje *fyzikální* prototyp fáze 1
(Part.swift / GameScene.swift) — **ten kód v repu není**, je to jen návod.
`protoyp/` je něco úplně jiného.

## Datové banky v graphics/

Řetěz odkazů zdola nahoru:

```
kostry/skeletons.json        (čistá geometrie kostí: clips, poses)
   ↑ default_clip
bitmapove-predlohy/skins.json + <skin>/skin.json   (bitmapové díly na kostech)
   ↑ skin_id (povinný)
animace/animations.json      (finished_animations = snapshot kostry + skin)
   ↑ animation_ids
postavy/game-characters.json (postava drží JEN odkazy)
```

Bokem: `bitmapove-sekvence/` (klasické 8snímkové kreslené animace, 394 MB)
a `levely/` (14 levelů, master 1536×704, `walk_line`).

## Zdroje pravdy (čti tyhle, ne tenhle soubor)

- **Datový model animátoru** → `tool/ANIMATOR-DATA-MODEL.md` — musí se aktualizovat spolu s kódem.
- **Výtvarné požadavky** → `POZADAVKY-ANIMACE.md` — vrstvený chronologický dokument, **novější sekce ruší starší**.
- **CLI pipeline** → `tools/README.md`
- **Uživatelská příručka editoru a klávesové zkratky** → `tool/README.md`
- **Generování bitmapových dílů na kostru** → skill `../.agents/skills/bitmapove-podklady/SKILL.md`
- **Protokol AI generování assetů** → `graphics/bitmapove-sekvence/GENERATION-RUN-2026-09-14.md`, `LOWRES-MIGRATION.md`

## Jak to spustit a otestovat

```sh
# editor (z game-plan/)
./start-preview.sh                 # → http://127.0.0.1:8765/tool/preview.html

# JS testy — čistý Node, node:assert, žádný framework ani jsdom
node tool/test-cutout-editor.cjs   # a dalších ~25 souborů tool/test-*.cjs

# Python testy
python3 -m unittest discover -s tools -p 'test_*.py'

# datový test prototypu
cd protoyp && swiftc Sources/PrototypeData.swift Tools/TestData.swift -o .build/verify-data && .build/verify-data
```

Přes `file://` editor **neuloží** — zápis jde POSTem na lokální server
`tools/serve_sprite_gallery.py`. Proto `preview-bridge.js` přesměrovává na 127.0.0.1.

## Pravidla, která se nesmí porušit

- Soubory `*.generated.js` / `*.generated.json` se **needitují ručně** — generují je skripty v `tools/`.
- Originální PNG se **nikdy nepřepisují**. Zmenšeniny jdou vedle + `migration.json` s parametry a SHA-256.
- Cesty musí začínat `graphics/bitmapove-sekvence/`, `graphics/bitmapove-predlohy/` nebo `graphics/levely/`.
  Staré `graphics/characters2/`, `graphics/poses/`, `graphics/levels/` jsou zakázané.
- Zápis přes API: kontrola `expectedRecord`, záloha do `history/`, předchozí verze do `trash` (obnova je vratná).
- AI generování: pozadí jednolité `#505050`, přesně 8 fází (0°–315°), výchozí snímek 384×480, snímek 8 ≠ snímek 1.
- Alternativní varianty assetů jsou neměnné — nikdy se nepřepisují, přidává se nová.

## Stav k 18. 9. 2026

Čísla níže jsou spočítaná přímo z JSON katalogů 18. 9. 2026. Tahle sekce
zastarává nejrychleji — přepočítej si ji, než na ní něco postavíš.

- Repo je mladé: první commit 16. 9. 2026, 29 commitů, hodně rozpracovaného v pracovním stromu.
- **Herní kód prakticky neexistuje.** `protoyp/Sources/` má 3 soubory, ~260 řádků.
- Kosterní (cutout) větev je čerstvá: **3 skiny, 4 klipy, 6 hotových animací, 1 postava**.
- Kreslené sekvence: 44 postav / 54 variant, ale do produkce vybraná **jedna** (`cernobylak/production-v1`).
- Levely: 14 hotových masterů, **žádný** nemá vybranou variantu.
- Naprostá většina assetů je `needs-review` — čeká na výtvarné posouzení uživatelem.
- Finální boss Chuchvalec je po několika zamítnutích stále nedořešený.

## Známé nesrovnalosti (zjištěno, neopraveno)

- `protoyp/GameData/catalog.json` odkazuje na `graphics/levels/…`, ale adresář se dnes
  jmenuje `graphics/levely/` — export je z doby před přejmenováním. Vyřeší re-export
  přes `protoyp/Tools/ExportAssets.swift`.
- `tool/ANIMATOR-DATA-MODEL.md`, sekce „Stav po rozdělení 2026-09-16", uvádí
  0 postav / 0 animací — reálná data jsou už novější.
- `protoyp/VERIFICATION.md`: aplikace není nainstalovaná na fyzickém iPhonu
  (chybí signing identity / development team).
- **Směr pohybu si protiřečí.** Design (§2) i `POZADAVKY-ANIMACE.md` (15. 9.) říkají
  průchod **zprava doleva**; `protoyp/README.md` popisuje pohyb **zleva doprava**
  se zrcadlením původních levostranných animací. Před herní implementací si to ujasni.
- Design (§11) uvádí fázi 1 jako „hotovo v `PrdelSveta/`" — **takový adresář v repu není**
  a `Part.swift` / `GameScene.swift` nikde neexistují.
