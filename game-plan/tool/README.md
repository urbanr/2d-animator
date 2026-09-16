# Společné preview

Otevři `http://127.0.0.1:8765/tool/preview.html`. Horní menu spojuje **Postavy**, **Levely**, **Pózy a kroky** a **Animátor** v jednom nástroji. Přepínání sekcí zachová jejich rozpracovaný stav; trvalé uložení změn se nadále provádí tlačítkem v příslušném editoru. Obnovení celé stránky neuložené změny nezachovává.

Původní odkazy (`gallery.html`, `levels.html`, `poses.html`, `index.html`) se automaticky otevřou ve společném preview a zachovají výběr postavy, filtr i odkaz na konkrétní kartu.

V **Pózách a krocích** lze táhnout kruhové úchyty myší nebo dotykem. Koleno otáčí stehno v kyčli, kotník lýtko v koleni, loket paži v rameni a ruka předloktí v lokti. Potomci se pohybují s rodičem při zachování délek kostí a limitů kloubů. Střed trupu posouvá celou postavu svisle. Výběr červených/zelených úchytů zpřístupní překryté končetiny. Jeden tah tvoří jeden krok Zpět; změny se ukládají stávajícími tlačítky pro pózu nebo celou animaci. Exportované SVG neobsahuje úchyty.

## Postavy2 – ovládání náhledu

Středový úchyt trupu respektuje nástroj: **Posun** přesouvá celou postavu, **Rotace** otáčí trup kolem pánve a **Velikost** mění jeho délku. Ctrl + tah také mění délku, pokud jsou změny délek povolené. Rozsah Snímek / Animace platí i pro tyto úpravy.

Kostra ukládá délky i `joint_limits`. Starší kostry bez tohoto údaje dostanou při načtení maximální výchozí limity −180° až +180°. Stejné limity se kopírují do animace a herní postavy, aby je později mohl použít editor i fyzika.

U vybrané bitmapy jsou ihned vidět obě zapnuté poloelipsy průhlednosti. Malé tyrkysové značky jsou uvnitř kloubových bodů a zvětšují se společně s nimi. Otazníky jsou v záhlaví sekcí vedle rozbalení.

Průhlednost je třetí sbalovací sekce napravo. Na čárkovaném rámečku bitmapy jsou úchyty **↔ X** (šířka) a **↕ Y** (výška); mění rozměr v místních osách natočeného dílu, se zvoleným rozsahem Snímek / Animace a možností Zpět.

Mimo vstupní pole: **mezerník** přehraje/pozastaví, **Y/C** přepne předchozí/další snímek včetně přechodu přes konec animace, **A/D** posouvá vybraný díl vodorovně, **W/S** svisle a **Q/E** otáčí. Funguje v režimu Bitmapa i Kostra; **Shift** zvětšuje krok z 1 na 10. Při psaní do polí se zkratky neuplatní.

Náhled vždy využije celou volnou šířku. Plátno si zachovává proporce a proměnná výška pouze ořezává spodní prostor pod zemí; výchozí stav ukazuje polovinu původní podlahy. Tažením pravého dolního rohu lze výšku měnit, dvojklik vrací výchozí ořez. Změna velikosti náhledu neovlivňuje uloženou postavu.

Režimy **Kostra** a **Bitmapa** jsou výlučné. Kliknutí na postavu může vybrat odpovídající díl nebo kloub, ale režim nikdy nepřepne; to dělá pouze přepínač Upravuji.

Nápovědy s otazníkem se otevřou jen kliknutím a zavřou po odjetí ukazatele z nápovědy.

## Přehrávač spritů – podklady

Rozestup ramen a pánve má rozsah −100 až +100 % původní šířky. Bílý koncový úchyt lze táhnout plynule přes střed: +100 % původní polohy, 0 % společný střed, −100 % prohozené polohy červeného/zeleného konce vlevo/vpravo. Barvy zůstávají přiřazené stejným končetinám; nejde o změnu pořadí vrstev vůči kameře. Náklon má nadále limit ±20°. Střed ramen pod krkem ani střed pánve se neposouvá. Končetiny následují své úchyty bez změny délky kostí. Staré záznamy bez `shoulderWidth` a `pelvisWidth` se interpretují jako 100 %; nic se hromadně nepřepisuje.

Obnov `index.html`. Výchozí sada je `../graphics/chuchvalec/ride-eight-solid/frames/`: osm kreslených PNG v prvním stylu, s bruslí. Přehrávač pouze střídá snímky; nepřidává stínovací vrstvy, osvětlení ani mezifáze. První původní sada je dostupná pro porovnání. Verze v2 a v3 byly zamítnuty.

Aktuální osmice má průhledné pozadí, černý obrys, jednu sdílenou kresbu boty a předem otočené bitmapy kol. Přehrávač pouze střídá těchto osm PNG.

Výchozí je nyní zkouška jednoduchých komiksových barev bez textur, ditheringu a ambient occlusion.

Aktuální varianta má vynucenou paletu: nejvýše tři tóny v každé skupině barev, vyčištěné ostrůvky odstínů a pevné souvislé plochy boty. Ověření uložených PNG je v `../graphics/chuchvalec/ride-eight-solid/animation.json`.
