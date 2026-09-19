# Generování chybějících postav a levelů — 14. 9. 2026

Použit byl vestavěný generátor obrázků. Postavy vznikly jako osm unikátních
fází na archu 1536 × 1024 px se sítí 4 × 2 a neutrálním podkladem `#505050`.
Prompty vyžadovaly temný souvislý vnější obrys, stabilní černou vnitřní kresbu,
2–3 tóny na materiál, pohyb doleva a neměnnou identitu i vybavení. Jako
výtvarná reference sloužily existující snímky Černobyláka, Kopáče, kance nebo
Loudače podle typu assetu.

Automatický dovoz zachoval zdrojový arch, rozdělil jej na osm snímků
384 × 480 px, odstranil jen šedé pozadí dosažitelné od okraje a vytvořil
samostatný kandidát produkčním profilem `enemy-production-v1`. Běžní nepřátelé
mají kandidátské plátno 96 × 96 px, bossové 288 × 360 px, všichni kotvu
`bottom-center`. Nové verze nejsou vybrané do herního datového souboru.

Tři věcně chybné první pokusy jsou zachované a označené jako zamítnuté:

- `rojnice/generated-v1` byl nosič hmyzu místo třiceti krys; oprava je
  `generated-v2`.
- `vozik/generated-v1` měl jediného jezdce místo tří tlačičů; oprava je
  `generated-v2`.
- `boss-retez/generated-v1` převzal siluetu kance; správná řada Loudačů je
  `generated-v2`.

Levely vznikly jako široké výtvarné mastery. Původní zdroj je 1536 × 1024 px,
herní master je středový výřez 1536 × 704 px bez převzorkování. Každý manifest
obsahuje plán tří hloubek. Hlavní terén a jeho kolize zůstávají datové;
výtvarný master je kandidát pro schválení a další oddělení střední a vzdálené
parallax vrstvy.

Strojově čitelná evidence je v `asset-production-status.json`, varianty postav
v `sprite-variants.json`, levely v `levels/levels.json`. Postavy se prohlížejí
v `../tool/gallery.html`, levely v `../tool/levels.html`.
