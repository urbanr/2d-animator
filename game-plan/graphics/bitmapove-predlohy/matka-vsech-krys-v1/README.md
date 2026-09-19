# Matka všech krys · vzpřímený boss

Celkový návrh i atlas 19 dílů uživatel samostatně schválil 17. 9. 2026.
`source/character-reference.png` je celý schválený návrh. `source/parts-atlas.png`
je původní ImageGen atlas 1254 × 1254 s vlastní alfou; původní rozlišení i alfa
jsou zachované. `source/prompt.txt` obsahuje zadání atlasu.

Díly: hlava s korunou, krk, trup, pánev, nádrž, čtyři díly paží, čtyři díly nohou,
dvě chodidla, celý ocas a tři celé malé krysy. Rozřezání provedl
`tools/import_rat_mother_parts.py`: autorské hranice v mezerách, těsný ořez
s třípixelovou rezervou, žádné převzorkování ani přemalování. Souřadnice výřezů
a SHA jsou v `parts.json` a `source/import-v1.json`.

Předloha je dostupná v Animátoru. Úchyty jsou výchozí pracovní nastavení,
nikoli schválená finální animace nebo hotová herní integrace. Ocas a malé krysy
jsou na začátku vypnuté: zapni vybraný díl v panelu Bitmapy na kostech a zvol
jeho kost, nebo jej připoj tlačítkem Přilepit další bitmapu. Pro samostatný
pohyb vytvoř další kost a bitmapu přiřaď k ní. Není vytvořena žádná nová
kreslená osmifázová sekvence.
