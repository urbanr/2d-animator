# Evidence převodu spritů do herního rozlišení

Aktualizováno: 15. 9. 2026

Tento soubor je centrální přehled. Technický stav `MIGROVÁNO` znamená, že
všechny zdrojové snímky byly automaticky převedeny, znovu načteny a mají
správný rozměr. Neznamená to automatické výtvarné schválení.

Strojově čitelný katalog všech alternativ je v `sprite-variants.json`.
Soubor pro integraci do hry je generovaný `game-sprites.generated.json` a
obsahuje pouze varianty explicitně vybrané pro produkci.

## Aktuální sady

| Postava | Typ | Zdroj | Cíl @3× | Stav | Poznámka |
| --- | --- | --- | --- | --- | --- |
| Běžec — chůze podle póz | alternativa | `bezec/pose-walk-v1/frames/`, 8 × 512 × 512 px | `bezec/pose-walk-v1/variants/pose-walk-v1/`, 8 × 96 × 96 px | **MIGROVÁNO — čeká na posouzení** | `enemy-production-v1`, 8 fps; známé nedostatky v `bezec/POSE-TRIALS.md` |
| Běžec — sprint podle póz | alternativa | `bezec/pose-sprint-v1/frames/`, 8 × 512 × 512 px | `bezec/pose-sprint-v1/variants/pose-sprint-v1/`, 8 × 96 × 96 px | **MIGROVÁNO — čeká na posouzení** | `enemy-production-v1`, 12 fps; původní varianty zachované |
| Běžec — zombie podle póz | alternativa | `bezec/pose-zombie-v2/frames/`, 8 × 512 × 512 px | `bezec/pose-zombie-v2/variants/pose-zombie-v2/`, 8 × 96 × 96 px | **MIGROVÁNO — čeká na posouzení** | `enemy-production-v1`, 6 fps; starší rozpracovaná v1 se nemigruje |
| Kopáč | běžný nepřítel | `kopac/rage-gray-v2/frames/`, 8 × 444 × 444 px | `kopac/rage-gray-v2/frames-production@3x-candidate/`, 8 × 96 × 96 px | **TEST PRODUKČNÍHO PROFILU — čeká na výtvarné potvrzení** | `enemy-production-v1`; stejné automatické předzpracování jako finální Černobylák |
| Černobylák | běžný nepřítel | `cernobylak/rage-gray-v2/frames/`, 8 × 384 × 480 px | `cernobylak/rage-gray-v2/frames-production@3x/`, 8 × 96 × 96 px | **FINÁLNÍ PRODUKČNÍ VERZE** | `enemy-production-v1`; kresba 77 × 96 px, jas +30, kontrast 1,40, Ztmavit 100 %, obrys 0,45, černota kresby 0,25 |
| Přerostlý kanec | boss | `prerostly-kanec/rage-gray-v2/frames/`, 8 × 384 × 480 px | neurčeno | **NEMIGROVÁNO — čeká na rozhodnutí** | Boss nebyl součástí zkoušky běžných nepřátel; před převodem je nutné potvrdit jeho cílové rozlišení |
| Chuchvalec | finální boss | aktuální sady 384 × 480 px | 384 × 480 px | **NENÍ TŘEBA MIGROVAT** | Jeho 128 × 160 pt při @3× už odpovídá 384 × 480 px |

## Starší a vyřazené sady

| Sada | Stav | Důvod |
| --- | --- | --- |
| `kopac/rage-gray-v2/frames-lowres/` | **NAHRAZENO** | Starší výstup 128 × 96 px neodpovídá cíli 96 × 96 px; zůstává pouze pro historii |
| `cernobylak/rage-gray-v2/frames-lowres/` | **NAHRAZENO** | Starší výstup 128 × 96 px neodpovídá cíli 78 × 96 px; zůstává pouze pro historii |
| Zamítnuté a pracovní varianty Chuchvalce | **NEMIGROVAT** | Nejsou zdrojem pro herní asset; zachovávají se jen pro historii a porovnání |

## Pravidla pro další převody

- Originální velké PNG se nikdy nepřepisují.
- Všichni běžní pozemní nepřátelé používají společné logické plátno
  32 × 32 pt, tedy 96 × 96 px při @3×. Užší postava dostane průhledný prostor,
  nikoli menší PNG nebo roztaženou kresbu.
- Kresba zachovává poměr stran a má kotvu dole uprostřed. Stejný převod a
  stejná kotva platí pro všech osm snímků animace.
- Chování, rychlost a zásahová oblast se nesmějí odvozovat z rozměru PNG.
  Patří do herních dat postavy; sprite určuje pouze vzhled a kotvu.
- Každá aktuální animace se eviduje jedním řádkem v části „Aktuální sady“.
- Výstup `frames-game@3x/` obsahuje výsledné PNG a automatický
  `migration.json` s parametry, rozměry a SHA-256 otisky všech souborů.
- Všech osm snímků jedné animace musí používat stejné parametry, aby tmavé
  linky mezi snímky neblikaly.
- Po technickém převodu je stav „čeká na výtvarné potvrzení“. Na čisté
  `MIGROVÁNO` se změní až po kontrole v pohybu a v reálné herní velikosti.
- Bossové se nepřevádějí automaticky podle profilu běžných nepřátel. Nejdřív
  musí mít potvrzený cílový rozměr.

## Použitý profil `dark-dpid-v1`

```text
dark_strength = 0.72
lambda = 0.60
dark_threshold_linear = 0.01
detail_floor = 0.03
color_space = linear-sRGB
alpha = area-averaged premultiplied RGBA
fit = contain
anchor = bottom-center
```

Podrobný záznam konkrétního běhu je uložen v `migration.json` přímo u každé
migrované sady.

### Dokončovací profil `dark-dpid-photopea-v1`

Profil vychází z ruční zkoušky v Photopea: po Dark-DPID přidává kontrastní
kopii v režimu Ztmavit. Ztmavují se stíny a kreslicí linky, zatímco světlé
barevné kanály zůstávají z původní vrstvy. Alfa a kotva se nemění.

```text
photopea_contrast = 1.18
photopea_darken_opacity = 0.80
```

### Světlejší profil `dark-dpid-photopea-v2`

Novější kandidát přidává jas před zvýšením kontrastu a před vrstvou Ztmavit.
Původní `frames-game@3x/` i `frames-game@3x-photopea/` zůstávají zachované pro
porovnání.

```text
photopea_brightness_srgb = 10
photopea_contrast = 1.22
photopea_darken_opacity = 0.80
```

Nejnovější výtvarná zkouška používá stejné nastavení, pouze jas je zvýšený
o dalších 10 bodů na `photopea_brightness_srgb = 20`. Je uložena v adresářích
`frames-game@3x-photopea-bright20/`; varianta s jasem +10 zůstává pro porovnání.

Následující zkouška ponechává jas +20 a zvyšuje kontrast o dalších deset bodů
z 1,22 na `1,32`. Je uložena v `frames-game@3x-photopea-b20-c32/` a je aktuálně
zachovaná pro porovnání.

Nejnovější kandidát používá jas +20 a uživatelem zadaný kontrast `1,40`.
Varianta se Ztmavit 80 % je uložená v `frames-game@3x-photopea-b20-c40/`.
Nejnovější varianta zvyšuje Ztmavit na `90 %` a je uložená v
`frames-game@3x-photopea-b20-c40-d90/`.

Další zkouška zvyšuje jas na `+30` a vrstvu Ztmavit na `100 %`; kontrast
zůstává `1,40`. Je uložená v `frames-game@3x-photopea-b30-c40-d100/` a je
aktuálně nejnovějším kandidátem.

Porovnání dvou Photopea snímků ukázalo, že se změna soustředí do vnějšího
okraje: třípixelový pás u siluety byl průměrně o 35,6 úrovně tmavší, zatímco
vnitřek jen o 3,0. Proto nový `dark-dpid-photopea-outline-v1` přidává
deterministické ztmavení pouze pixelům sousedícím s průhledností. Síla obrysu
nemění alfu, nerozšiřuje siluetu a je stejná ve všech osmi snímcích. Pro
Černobyláka je výtvarně vybraná síla `0,45`; silnější `0,60` je zamítnutá jako
příliš tmavá. U Kopáče zůstává `0,60` zatím jen nejnovějším kandidátem.

Zkouška `frames-game@3x-photopea-b30-c40-d100-outline45-ink25/` byla výtvarně
schválena jako základ produkčního profilu `enemy-production-v1`. Stabilní
produkční výstup Černobyláka je v `frames-production@3x/`. Profil zachovává
obrys 0,45 a pouze stáhne již existující tmavé pixely o síle 0,25 blíž k černé;
nepoužívá rozšiřování masky, nemění alfu ani kotvu. Stejný profil je nyní
ověřován na Kopáčovi v `frames-production@3x-candidate/`.
