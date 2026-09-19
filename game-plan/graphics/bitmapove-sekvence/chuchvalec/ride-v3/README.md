# Chuchvalec — brusle a živější jízda

Nový návrh k posouzení. Výchozí v [přehrávači](../../../tool/index.html); varianta v2 byla uživatelem zamítnuta. Další postavy čekají na jeho pokyn. Závazné preference jsou v [požadavcích na animaci](../../../POZADAVKY-ANIMACE.md).

## Pohyb

- Babička pohybuje paží s válečkem v rozsahu přibližně 21° a mírně naklání hlavu.
- Profesor samostatně kývá hlavou přibližně ±9°. Malý posun udržuje vlasy uvnitř snímku.
- Přední noha má inline brusli se třemi koly. Její rám zůstává pevný.
- Velké kolo má poloměr 78 px, kolečka brusle 26 px. Za 4 sekundy proběhne jedna velká a tři malé otáčky. Platí `v = ωr`: v rovině kol jde o 122,52 px/s. Všechna kola používají stejnou vodorovnou projekci 0,9; jízdě doleva tak odpovídá 110,27 px/s na obrazovce v rozlišení assetu, tedy 36,76 pt/s při zobrazení 128 × 160 pt. Posuv země používá tuto promítnutou rychlost.
- Osy kol jsou pevné: přední strana velkého kola `(311,390)`, malé `(64,442)`, `(129,442)`, `(195,442)`. Společná čára kontaktu se zemí je `y=468`. Velká pneumatika má šikmý pohled s viditelnou šířkou: projekce na ose X 0,9 a hloubka 24 px. Otáčení probíhá před promítnutím, takže obrys pneumatiky při otáčení nekývá.
- Přehrávač počítá úhly průběžně při každém vykreslení. Posuv země v náhledu telefonu odpovídá rychlosti kol; kamera sleduje bosse.

## Soubory a velikost

- `chuchvalec-neutral@3x.png`: základní póza, průhledné PNG **384 × 480 px**.
- `frames/`: **120 PNG**, 30 snímků/s, smyčka 4 s; žádný duplicitní koncový snímek.
- `chuchvalec-ride.webp`: bezztrátová animace, 120 snímků, přesně 4000 ms. Prodlevy 33/33/34 ms vyrovnávají celočíselné milisekundy.
- `layers/`: tělo, paže, dvě hlavy a dvě textury kol. `reference.png` je pracovní referenční kresba.
- `rig.js`: sdílený výpočet pohybu pro přehrávač a export. `rig.json`: rozměry a kotvy.
- `../source/build-ride-v3.mjs`: opakovatelné sestavení a export. `../source/verify-ride-v3.mjs`: kontrola geometrie, smyčky a ovládání.

Obdélník postavy zůstává **128 × 160 pt**. Viditelná kresba této varianty má přibližně **137 pt** na výšku; na referenčním iPhonu 17 na šířku s výškou 402 pt je to přibližně **34 % výšky obrazovky** (celý průhledný obdélník přibližně 40 %). Herní velikost se nastavuje výslovně. Výkon na fyzickém iPhonu zatím nebyl ověřen.

## Původ kresby a meze návrhu

Úprava boty na brusli vznikla pomocí ImageGen z původního Chuchvalce. Použitý model nástroj neuvádí, proto jej neoznačujeme jako „Image 2.5“. Finální podklad je první výřez 384 × 480 px z archu 1536 × 1024 px `../source/roller-native-draft.png`; celá postava se nezmenšovala. Prompty jsou v `../source/prompt-roller-design.txt` a `../source/prompt-roller-native.txt`.

Generátor v podkladu namaloval šachovnici místo alfa kanálu. Při sestavení se odstraní a exportuje skutečná průhlednost. Paže a hlavy jsou oddělené z jedné kresby. Textury kol se pro výpočet otáčení lokálně narovnají; velké kolo se při vykreslení znovu promítne do šikmého pohledu s viditelnou šířkou pneumatiky. Není nahrazené plochým bočním diskem. Stejné textury se sdílejí mezi snímky. Kreslené detaily se proto náhodně nemění; nad koly se navíc vykresluje pevné osvětlení. Původní malované stínování je částečně potlačené, nejde však o fyzikální model materiálu a světla.

Jde o animaci částí bitmapy, nikoli 120 nových ručně kreslených póz. Styl a spoje pohybujících se částí čekají na uživatelovo posouzení. Původní v1 a odmítnutá v2 jsou zachované pro porovnání. Žádná další postava ani kompletní sada útoků tím není schválena.

Pro budoucí hru je praktičtější animovat vrstvy. Samotných 120 plně rozbalených RGBA snímků by zabralo přibližně 84 MiB; velikost PNG/WebP na disku není paměťová náročnost textur.

## Ověření 12. 9. 2026

Kontrola prošla: všech 120 PNG má rozměry 384 × 480 a alfa kanál; WebP má 120 snímků a 4000 ms. Vykreslení v čase 0 a 4 s je pixelově shodné. Celá kresba v průběhu smyčky zůstává uvnitř plátna (viditelné hranice x=10–380, y=58–467). Poměr otáčení 3 : 1 a shoda promítnutého posuvu země s odvalováním všech kol jsou ověřené výpočtem.

Na skutečných vrstvách a nativním canvasu prošla kontrola logiky načítání, přehrání, krokování, rychlosti, přepínání všech tří verzí včetně rychlých změn a všech rozměrů telefonu. Jednotlivé výsledné PNG byly vizuálně prohlédnuté. Vizuální kontrolu rozložení HTML v prohlížeči blokoval nástroj pro místní adresu `file://`; tato kontrola ani test na fyzickém iPhonu nejsou prohlášené za hotové.
