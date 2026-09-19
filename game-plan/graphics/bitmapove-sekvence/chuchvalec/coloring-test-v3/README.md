# Chuchvalec — podklady z bílého pozadí

- `source/ink-sheet-white.png`: osm kreseb vytvořených na čistém bílém pracovním podkladu.
- `frames/`: osm výsledných PNG 384 × 480 px se skutečným alfa kanálem.
- `sheet-transparent.png`: všech osm snímků na jediném skutečně průhledném PNG.
- `reference-00.png`: barevný vzor se stejnou průhlednou siluetou a černou linkou jako první snímek.
- `palette.json`: pevná paleta barevného vzoru.

Bílá plocha se odstraňuje flood-fillem od okrajů jednotlivých polí. Vnitřní bílé plochy uzavřené černou linkou zůstávají součástí postavy. Vyhlazený vnější okraj se převádí do alfa kanálu, aby kolem černé linky nevznikl bílý lem. Návrh čeká na výtvarné posouzení.
