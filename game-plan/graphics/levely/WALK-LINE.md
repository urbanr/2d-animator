# Linka chůze

Každá varianta pozadí má v `levels.json` vlastní `walk_line`.
`y` je relativní vzdálenost od horní hrany obrázku: 0 nahoře, 1 dole.
V náhledu se kreslí žlutá linka; ↑ / ↓ mění výšku o jeden pixel podkladu,
Shift o deset. Změny se automaticky ukládají přes místní editor.
Tlačítko Uložit dovoluje potvrdit výchozí odhad nebo opakovat neúspěšné uložení.

`reviewed: false` označuje pouze výchozí odhad, nikoli přesně změřený terén.
Po ručním uložení je `reviewed: true`. Varianty se navzájem neovlivňují.
Údaj není zapečený do obrázku ani nemění produkční výběr.

`python3 game-plan/tools/build_level_gallery.py` doplní chybějící odhady,
zachová ručně uložené hodnoty a sestaví galerii i `levels-game.generated.json`.
Herní souřadnice: `groundY = displayedImageTop + walk_line.y * displayedImageHeight`.
Tento export obsahuje metadata všech alternativ a explicitní `selected_variant`;
samotné napojení na fyziku hry tím nevzniká. Jedna vodorovná linka nepředstavuje
profil nerovného terénu nebo svahu.
