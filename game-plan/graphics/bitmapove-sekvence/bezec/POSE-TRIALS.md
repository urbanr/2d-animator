# Běžec — zkouška uložených koster

15. 9. 2026. Tři alternativy k posouzení, žádná automaticky nevybraná do hry.
Původní kresby, varianty, vybraná verze i ruční posuny zůstávají zachovány.

| Pohyb | Výstup a zadání | Předloha | Tempo |
| --- | --- | --- | --- |
| Chůze | [pose-walk-v1](pose-walk-v1/) · [prompt](pose-walk-v1/references/prompt.txt) | Chůze · přirozený krok v4 | 8 fps |
| Sprint | [pose-sprint-v1](pose-sprint-v1/) · [prompt](pose-sprint-v1/references/prompt.txt) | Sprint · odraz a let v4, uložené ruční úpravy | 12 fps |
| Zombie | [pose-zombie-v2](pose-zombie-v2/) · [prompt](pose-zombie-v2/references/prompt.txt) | Zombie · šouravá chůze v1, aktuální uložené úpravy | 6 fps |

Vzniklo vestavěným ImageGen, nikoli API/CLI. Každé `references/poses.json`
obsahuje přesný uložený klip použitý pro daný pokus. Předloha je zrcadlená
doleva, červená končetina značí bližší stranu, zelená vzdálenější. Export
neobsahuje čáru země ani ovládací prvky. Identita pochází z
`rage-gray-v5/source/sheet-v1.png`.

`pose-zombie-v1/references/` je starší rozpracovaný pokus; mezitím byla změněna
uložená zombie kostra. Do galerie proto patří pouze novější v2.

## Import a měřítko

ImageGen vrátil 1586 × 992 px místo požadovaných 2048 × 1280. Originál
zůstává v `references/generated-sheet.png`. Dělení proto neodřezává přesahující
botu na matematické hranici buňky, ale používá společné prázdné mezery mezi
sloupci. `pack_pose_trial_sheet.py` přidává okolní prostor a kopíruje původní
pixely do společných buněk 512 × 512; **bez převzorkování, bez vyrovnávání
výšek a bez centrování jednotlivých siluet**. Přesná geometrie i otisky jsou
v `references/packed-sheet.json`.

`frames/` obsahuje osm velkých průhledných PNG. Import prověřil bezpečné
okraje a unikátnost všech osmi souborů. `source/import-v1.json` obsahuje
výsledek kontroly. Herní kopie v `variants/<id>/` mají 96 × 96 px, společné
měřítko 96/512 a profil `enemy-production-v1`: jas +30, kontrast 1,40,
Ztmavit 100 %, vnější obrys 0,45, černota linek 0,25. Parametry a otisky
každého výstupu jsou v `migration.json`.

Nové varianty mají vlastní klíče ručních posunů a pořadí, výchozí posuny nula.
Tempo klipu se respektuje v galerii a ukládá do exportovaných herních dat.
Produkční výběr ani herní datový soubor tento pokus nepřepisuje.

## Známé výtvarné nedostatky

ImageGen použil kostru jako přibližnou referenci, nikoli přesné omezení kloubů.
Osm různých bitmap samo o sobě nezaručuje správnou fázi ani plynulou smyčku.

- Chůze má některé zdvihy kolen větší než předloha a 8 → 1 může působit jako pauza.
- Sprint nedodržel zejména třetí fázi; ve 4 a 8 změnil ruce na otevřené dlaně.
- Zombie v pátém snímku vykreslila obě boty červené; ostatní fáze také nejsou
  přesným převodem kloubů. Toto není opravená ani schválená animace.

Tyto chyby jsou přiznané také na kartách galerie. Další generování až podle
hodnocení uživatele; nezkoušet automaticky přerovnat fáze nebo dorovnat výšku.
