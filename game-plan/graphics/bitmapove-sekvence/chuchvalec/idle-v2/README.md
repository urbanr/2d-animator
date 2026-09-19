# Chuchvalec — opravené dýchání v2

Zachovaný vzhled a velikost původního Chuchvalce. Oprava reaguje na putující stíny na botě a boční poskakování stojícího kola.

## Co je jinak

- Všechny snímky vycházejí z jediné původní kresby `../chuchvalec-neutral@3x.png`.
- Celá oblast od y = 300 px dolů, včetně kola a boty, je ve všech snímcích shodná po jednotlivých bajtech RGBA. Nemění se obrys, poloha ani stínování.
- Horní část těla se jemně zvedá při nádechu, pohyb postupně mizí směrem k pasu. Maximální zdvih je 4,5 px, u vlasů je drobný navazující pohyb.
- Barvy a nakreslené stíny se nepřekreslují ani náhodně nemění. Pohybují se se stejným povrchem.
- 24 snímků, 16 snímků/s, smyčka 1,5 sekundy. Rozměry každého snímku zůstávají 384 × 480 px.

Toto je řízená animace jedné bitmapy. Nejde o 24 nově kreslených póz. Je určená pro jemné dýchání; pro chůzi, výrazný úder nebo mluvení bude třeba další výtvarná práce. PNG plátno se nezmenšuje. Pohyb horní části používá lokální interpolaci poloh s přednásobenou průhledností, která předchází barevným lemům kolem hran. Spodní oblast se vůbec nepřevzorkovává.

## Prohlížení

Otevři `../../../tool/index.html` a vyber „Nová — pevné kolo a bota“. Nová varianta je výchozí. Přepínač dovoluje porovnání s původní animací.

- `chuchvalec-idle.webp` — samostatná bezztrátová animace s průhledností.
- `frames/` — jednotlivé PNG.
- `animation.json` — přesné rozměry, časy, kotva a výsledky kontroly.

Ověřeno při exportu: rozměry, 24 různých snímků, totožnost spodní části, bezztrátové uložení PNG a počet snímků v animovaném WebP. Vizuálně kontrolovány jednotlivé snímky. Přehrávač není v této relaci ověřen v prohlížeči kvůli dříve zjištěnému omezení místních URL. Výkon na fyzickém iPhonu nebyl měřen.

## Původ

Původní kresba pochází z vestavěného ImageGen, jehož konkrétní model nástroj neuvádí. Nový generativní pokus podle `../source/prompt-idle-retry.txt` byl uložen jako `../source/idle-retry-unused.png`, ale není použit v nové animaci: opět změnil pevné detaily. Finální v2 používá původní schválený vzhled a řízený pohyb z `../source/animate-idle-v2.mjs`.
