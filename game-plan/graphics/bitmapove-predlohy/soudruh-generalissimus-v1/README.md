# Soudruh Generalissimus — bitmapové díly v1

Zdroj je poslední vybraná varianta s neprůhledným šedým pozadím. Původní atlas
je uložen beze změny v `source/parts-atlas.png`. Import pouze rozdělil 4×4 atlas,
odstranil šedé pozadí napojené na okraje buněk a ořízl jednotlivé díly s třípixelovou
rezervou. Kresba nebyla zmenšena, převzorkována ani jinak překreslena.

Samostatné průhledné PNG jsou v `parts/`; jejich pořadí, rozměry, zdrojové výřezy
a kontrolní součty jsou v `parts.json`. Protokol odstranění pozadí je v
`source/import-v1.json`.

Předloha je zaregistrovaná v katalozích `templates` i `skins`, takže je viditelná
v dropdownu sekce **Bitmapové předlohy** i v **Animátoru**. Soubor `skin.json`
obsahuje ručně určené anatomické úchyty všech 14 bitmap. Pánev se překrývá se
spodkem trupu a amplion používá kost bližšího předloktí, takže držadlo sleduje
ruku. Reprodukovatelná registrace je v `tools/register_generalissimus_skin.py`.

Schválená následná oprava vodorovně převrací `farUpperArm`, `farThigh` a
`farShin` podle svislé osy každého samostatného PNG. Stejnou transformací jsou
přepočítané jejich body `start` a `end`; nové SHA a záznam transformace jsou v
`parts.json`, `skin.json` a `source/import-v1.json`. Operaci reprodukuje
`tools/flip_generalissimus_far_parts.py`; ostatní díly nemění.
