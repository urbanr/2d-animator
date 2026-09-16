# Společné preview

Otevři `http://127.0.0.1:8765/tool/preview.html`. Horní menu spojuje **Postavy**, **Animátor**, **Levely** a **Kostry** v jednom nástroji. Animátor je editor bitmapových postav na kostře (dříve Postavy2); původní samostatný animátor už v menu není. Přepínání sekcí zachová jejich rozpracovaný stav; trvalé uložení změn se provádí tlačítkem v příslušném editoru. Obnovení celé stránky neuložené změny nezachovává.

Původní odkazy (`gallery.html`, `levels.html`, `poses.html`) se automaticky otevřou ve společném preview a zachovají výběr postavy, filtr i odkaz na konkrétní kartu.

V **Pózách a krocích** lze táhnout kruhové úchyty myší nebo dotykem. Koleno otáčí stehno v kyčli, kotník lýtko v koleni, loket paži v rameni a ruka předloktí v lokti. Potomci se pohybují s rodičem při zachování délek kostí a limitů kloubů. Střed trupu posouvá celou postavu svisle. Výběr červených/zelených úchytů zpřístupní překryté končetiny. Jeden tah tvoří jeden krok Zpět; změny se ukládají stávajícími tlačítky pro pózu nebo celou animaci. Exportované SVG neobsahuje úchyty.

## Animátor – ovládání náhledu

Jedna uložená postava může mít více animací. Horní řádek obsahuje výběr postavy a pouze její přiřazené animace. Disketa přepisuje vybranou položku, plus vytváří další variantu a koš maže postavu nebo odebírá animaci pouze z této postavy; každá operace vyžaduje potvrzení. Samostatně se volí **Bitmapová předloha**, jedna ze všech automaticky načtených **Koster** a obecná animace ze zásobníku **Hotové animace**. Disketa, plus a koš u koster i hotových animací vždy pracují s jejich vlastní globální knihovnou a seznam po změně hned obnoví. Rozpracovanou hotovou animaci lze zvláštním tlačítkem přiřadit vybrané postavě. Staré záznamy s jediným polem `animation` se při prvním zápisu bezpečně převedou na kolekci `animations`.

Úplný popis vlastnictví dat, ukládání, kompatibility a omezení je v [ANIMATOR-DATA-MODEL.md](ANIMATOR-DATA-MODEL.md). Tento dokument je nutné aktualizovat při každé změně modelu postavy, animace, kostry nebo bitmapové předlohy.

Středový úchyt trupu respektuje nástroj: **Posun** přesouvá celou postavu, **Rotace** otáčí trup kolem pánve a **Velikost** mění jeho délku. Ctrl + tah také mění délku, pokud jsou změny délek povolené. Rozsah Snímek / Animace platí i pro tyto úpravy.

Kostra ukládá délky i `joint_limits`. Starší kostry bez tohoto údaje dostanou při načtení maximální výchozí limity −180° až +180°. Stejné limity se kopírují do animace a herní postavy, aby je později mohl použít editor i fyzika.

U vybrané bitmapy jsou ihned vidět obě zapnuté poloelipsy průhlednosti. Malé tyrkysové značky jsou uvnitř kloubových bodů a zvětšují se společně s nimi. Otazníky jsou v záhlaví sekcí vedle rozbalení.

Průhlednost je třetí sbalovací sekce napravo. Na čárkovaném rámečku bitmapy jsou malé úchyty **↔** (šířka) a **↕** (výška); mění rozměr v místních osách natočeného dílu, se zvoleným rozsahem Snímek / Animace a možností Zpět.

Mimo vstupní pole: **1/+** přepíná Kostru a Bitmapu, **2/Ě** přepíná Snímek a Animaci a **3/Š** cyklicky volí Posun, Rotaci a Velikost. **Mezerník** přehraje/pozastaví, **Y** přepne na předchozí a **X** nebo **C** na další snímek včetně přechodu přes konec animace, **A/D** posouvá vybraný díl vodorovně, **W/S** svisle a **Q/E** otáčí. Funguje v režimu Bitmapa i Kostra; **Shift** zvětšuje krok z 1 na 10. Při psaní do polí se zkratky neuplatní. Stejné první tři přepínače jsou jako ikony v záhlaví panelu Úpravy a zůstávají dostupné i po jeho sbalení.

Náhled vždy využije celou volnou šířku. Plátno se interně vykresluje v rozlišení odpovídajícím skutečné šířce a hustotě pixelů displeje, takže se pevný logický prostor 512 × 560 při zvětšení nerozpixeluje. Proměnná výška pouze ořezává spodní část; její minimum je 294 logických bodů, tedy o 25 % méně než dříve. Tažením pravého dolního rohu lze výšku měnit, dvojklik vrací výchozí ořez. Změna velikosti náhledu neovlivňuje uloženou postavu.

Režimy **Kostra** a **Bitmapa** jsou výlučné. Kliknutí na postavu může vybrat odpovídající díl nebo kloub, ale režim nikdy nepřepne; to dělá pouze přepínač Upravuji.

Pravá sbalovací část se jmenuje **Bitmapová předloha**. Tímto názvem se označuje vzhled postavy tvořený bitmapovými díly, jejich pořadím, ukotvením, měřítkem a přechody průhlednosti; není to samostatná herní postava.

Při úpravě průhlednosti v rozsahu **Animace** vznikne jedna společná maska v místních souřadnicích bitmapového dílu. Ve všech snímcích proto sleduje příslušnou kost a vypadá stejně relativně ke kloubu. Starší snímkové výjimky vybraného konce se odstraní; výjimky druhého konce a jiné úpravy zůstanou zachované.

Nápovědy s otazníkem se otevřou jen kliknutím a zavřou po odjetí ukazatele z nápovědy.

## Přehrávač spritů – podklady

Rozestup ramen a pánve má nyní pracovní rozsah −300 až +300 % původní šířky. Bílý koncový úchyt lze táhnout plynule přes střed: +100 % původní polohy, 0 % společný střed, záporná hodnota prohozuje červený/zelený konec a až ±300 % dává trojnásobnou rezervu. Barvy zůstávají přiřazené stejným končetinám; nejde o změnu pořadí vrstev vůči kameře. Úhlové limity kostry jsou nyní maximální ±180°. Střed ramen pod krkem ani střed pánve se neposouvá. Končetiny následují své úchyty bez změny délky kostí. Staré záznamy bez `shoulderWidth` a `pelvisWidth` se interpretují jako 100 %; nic se hromadně nepřepisuje.

Obnov `index.html`. Výchozí sada je `../graphics/chuchvalec/ride-eight-solid/frames/`: osm kreslených PNG v prvním stylu, s bruslí. Přehrávač pouze střídá snímky; nepřidává stínovací vrstvy, osvětlení ani mezifáze. První původní sada je dostupná pro porovnání. Verze v2 a v3 byly zamítnuty.

Aktuální osmice má průhledné pozadí, černý obrys, jednu sdílenou kresbu boty a předem otočené bitmapy kol. Přehrávač pouze střídá těchto osm PNG.

Výchozí je nyní zkouška jednoduchých komiksových barev bez textur, ditheringu a ambient occlusion.

Aktuální varianta má vynucenou paletu: nejvýše tři tóny v každé skupině barev, vyčištěné ostrůvky odstínů a pevné souvislé plochy boty. Ověření uložených PNG je v `../graphics/chuchvalec/ride-eight-solid/animation.json`.
