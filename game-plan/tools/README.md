# Nástroje pro grafiku

Editor polohy obsahuje i tlačítka **← Dříve / Později →**. Prohodí aktuální
snímek se sousedem a ponechá ho vybraný; první doleva a poslední doprava
se prohazují přes hranici smyčky. Polohové posuny následují obrázek.
**Uložit polohy a pořadí** ukládá oboje společně do `sprite-frame-offsets.json`.
`frame_order` obsahuje čísla 1–8 podle původního pořadí souborů; uložené posuny
odpovídají výsledným pozicím v přehrávání. Galerie i herní export používají
stejné pořadí. Pokud chybí, platí původní pořadí varianty v katalogu.

Import větších buněk: `import_sprite_sheet.py --second-sheet druha-ctverice.png`
složí dvě stejně velké mřížky 2×2 do 4×2 bez převzorkování. Volba
`--frame-crop X,Y,WIDTH,HEIGHT` určuje stejný lokální výřez každé buňky;
odstraněná vnější rezerva neovlivní měřítko následného zmenšení. Rozměr
výřezu musí být zvolen podle velikosti kresby a společný pro celou animaci.
Import jej ukládá do protokolu jako `shared_frame_crop`.

## Automatické zmenšování spritů

`downscale_sprites.py` zmenšuje průhledné osmibitové RGBA PNG bez externích
knihoven. Používá `dark-dpid-v1`: plošné zmenšení v lineárním sRGB doplněné
jednostranným DPID vážením, které dává přednost pixelům tmavším než jejich
místní okolí. Alfa kanál se počítá samostatně v premultiplikované podobě.

Výchozí režim `--fit contain --anchor bottom-center` zachová poměr stran
kresby, vloží ji na společné cílové plátno a zarovná postavy k zemi. Rozměr
PNG je velikost logického plátna, nikoli povinná šířka těla postavy. Režim
`--fit stretch` existuje jen pro výslovné případy, kdy je deformace žádoucí.

Originály nástroj nikdy nemění. Existující výstup bez přepínače `--overwrite`
odmítne přepsat. Při dávkovém zpracování uloží do cílové složky také
`migration.json` s parametry, rozměry a SHA-256 otisky vstupů a výstupů.

Centrální lidsky čitelný stav všech postav je v
`graphics/LOWRES-MIGRATION.md`. Po každém převodu je potřeba doplnit nebo
aktualizovat příslušný řádek; podrobná technická evidence vzniká automaticky.

Schválené předzpracování běžných nepřátel je uložené jako pojmenovaný profil
`profiles/enemy-production-v1.json`. Nástroj ho načítá přímo; jednotlivé
hodnoty proto není potřeba opisovat do příkazu.

Příklad:

```sh
python3 tools/downscale_sprites.py \
  graphics/kopac/rage-gray-v2/frames \
  graphics/kopac/rage-gray-v2/frames-game@3x \
  --width 96 --height 96
```

Produkční profil pro běžného nepřítele:

```sh
python3 tools/downscale_sprites.py \
  graphics/kopac/rage-gray-v2/frames \
  graphics/kopac/rage-gray-v2/frames-production@3x-candidate \
  --width 96 --height 96 --profile enemy-production-v1
```

## Varianty a herní datový soubor

`sprite_variants.py` udržuje odděleně zdrojové snímky, neměnné alternativy a
produkční výběr. Nový pokus vytvoří ve `variants/<název>/`, zapíše ho do
`graphics/sprite-variants.json` a obnoví seznam v galerii. Existující varianta
se nikdy nepřepisuje; pro jiné parametry je nutný nový název.

Příklad alternativy odvozené z produkčního profilu, ale s jinou černotou:

```sh
python3 tools/sprite_variants.py create kopac cernejsi-ink35 \
  --set ink_blackness_strength=0.35 \
  --title "Kopáč — černější kresba 0,35" \
  --description "Alternativa s černější kresbou a nezměněnou šířkou čar."
```

Alternativa sama hru nepřepne. Teprve explicitní výběr ji označí jako
produkční a zároveň přegeneruje `graphics/game-sprites.generated.json`:

```sh
python3 tools/sprite_variants.py select kopac cernejsi-ink35
```

Pouhé obnovení herního souboru ze současných výběrů:

```sh
python3 tools/sprite_variants.py build-game-data
```

Sílu tmavých detailů řídí hlavně `--dark-strength`. Hodnota `0` vytvoří čisté
plošné zmenšení pro kontrolní srovnání, výchozí hodnota `0.72` chrání černou
kresbu bez chování čistého minimum poolingu.

Profil `--profile photopea-darken` přidá po zmenšení mírně kontrastnější
duplikovanou vrstvu v režimu Ztmavit. Výchozí kontrast `1.18` a krytí `0.80`
ztmaví obrysy a stíny, zatímco světlé zelené a oranžové části bere z původní
vrstvy. Alfa kanál ani kotvu nemění.

Jas lze před dokončovacími vrstvami přidat pomocí
`--photopea-brightness`. Například jas `10` a kontrast `1.22` vytvoří světlejší
variantu, ale následné Ztmavit stále udrží černé obrysy.

Přepínač `--outer-edge-strength` ztmaví pouze viditelné pixely sousedící
s průhledností. Zesílí tak vnější siluetu bez rozšíření alfy a bez dalšího
ztmavení vnitřních barevných ploch. Výchozí zkušební síla je `0.45`.

Přepínač `--ink-blackness-strength` zvyšuje černotu již existujících tmavých
pixelů, ale neposouvá jejich hranice a vůbec nemění alfu. Prah tmavých pixelů
určuje `--ink-blackness-threshold`; výchozí hodnota je `128`.

```sh
python3 tools/downscale_sprites.py \
  graphics/cernobylak/rage-gray-v2/frames \
  graphics/cernobylak/rage-gray-v2/frames-game@3x-photopea \
  --width 96 --height 96 --profile photopea-darken \
  --outer-edge-strength 0.45 --ink-blackness-strength 0.25
```

Algoritmickým základem je práce Weber et al.,
„Rapid, Detail-Preserving Image Downscaling“:
<https://doi.org/10.1145/2980179.2980239>. Původní implementace je dostupná
pod licencí BSD-3-Clause: <https://github.com/mergian/dpid>.

Kontroly spustíte z kořene `game-plan/`:

```sh
python3 -m unittest discover -s tools -p 'test_*.py'
```

## Dovoz nově generovaných postav a levelů

`import_sprite_sheet.py` přijme neprůhledný arch 1536 × 1024 px se sítí
4 × 2. Bez změny rozlišení jej rozdělí, ořízne prázdných spodních 32 px každé
buňky a odstraní pouze neutrální šedé pozadí spojené s okrajem buňky. Zdroj,
osm průhledných snímků a manifest s otisky uloží do samostatné neměnné verze.
Následný `sprite_variants.py create` vytvoří z těchto zdrojů kandidáta se
schváleným zpracováním obrysů. Běžná postava používá plátno 96 × 96 px;
současní boss kandidáti 288 × 360 px. Žádná alternativa se sama nevybere do
hry.

`import_level_image.py` ukládá původní obraz levelu 1536 × 1024 px a bez
převzorkování z něj vyřízne široký master 1536 × 704 px. Manifest popisuje
dalekou, střední a hlavní vrstvu; fyzikální terén se má sestavit z herních dat,
ne vypálit napevno do kolizí obrázku.

Úplnou evidenci hotových, čekajících a nepotřebných assetů přegeneruje:

```sh
python3 tools/build_asset_inventory.py
```

Výsledek je `graphics/asset-production-status.json`. Přehled levelů pro
prohlížeč obnoví `python3 tools/build_level_gallery.py` a otevře se přes
`tool/levels.html`.

## Ruční srovnání snímků animace

Galerie umí každý snímek posunout nahoru, dolů, doleva a doprava bez změny
zdrojového nebo zmenšeného PNG. Posuny jsou v pixelech daného PNG a ukládají
se do `graphics/sprite-frame-offsets.json`. Galerie i generovaný herní soubor
`graphics/game-sprites.generated.json` čtou stejná data.

Ukládací režim galerie spustí lokální server, který naslouchá pouze na tomto
počítači:

```sh
python3 tools/serve_sprite_gallery.py
```

Potom se editor otevře na
`http://127.0.0.1:8765/tool/gallery.html`. Obyčejná varianta otevřená přes
`file://` dovolí posuny vyzkoušet, ale prohlížeč jí nedovolí zapisovat JSON.
