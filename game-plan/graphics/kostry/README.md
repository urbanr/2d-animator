# Kostra póz — chůze a sprint

Aktuální výběr po uživatelově úklidu: pouze **Chůze · přirozený krok v4**,
**Sprint · odraz a let v4** a **Zombie · šouravá chůze v1**. Sedm předchozích
animací včetně „Chůze · jemnější ramena v3 · moje verze“ bylo na výslovný pokyn
odstraněno z `clips`; úplná obnovitelná záloha je
`archives/removed-old-clips-beaded96-a3cf-499e-96f0-b5b7b0f590e9.json`.
Tři zbývající záznamy ani knihovna jednotlivých póz se při úklidu nezměnily.
Pro další pokusy s Běžcem se používají pouze tyto tři zbývající animace,
v aktuálně uloženém stavu; historické varianty níže popisují vývoj, ne aktivní nabídku.

Editor: `http://127.0.0.1:8765/tool/poses.html`.

Výchozí knihovna obsahuje dvě osmisnímkové smyčky a jejich 16 jednotlivých póz.
Nové alternativy **Chůze · ramena a pánev v2** a **Sprint · ramena a pánev v2**
navíc střídají podepsaný rozestup ramen a pánve přes nulu. Ramena pracují proti
pánvi; ve fázi 1 je červená kyčel vpředu ve směru chůze a červené rameno vzadu,
ve fázi 5 naopak. Chůze používá amplitudy 70/60 %, sprint 100/85 % (ramena/pánev).
Nejde o přepínání barev ani vrstev. Oprava kloubových úhlů nohou se počítá až
po změně úchytů pánve. Původní smyčky a ručně uložené záznamy zůstávají zachované.
Přidání přes místní server: `node game-plan/tools/add_body_twist_poses.cjs`.
Opakované spuštění existující pojmenované varianty nepřepisuje. Editor při načtení
upřednostňuje nový sprint; výběrem animace lze otevřít i původní varianty.

Varianty **Chůze · jemnější ramena v3** a **Sprint · jemnější ramena v3** mají
oproti v2 poloviční náklon i rozestup ramen. Pánev a krok jsou beze změny.
Přidání: `node game-plan/tools/add_body_twist_poses.cjs --soft-shoulders`.
Je-li přítomný sprint v3, editor jej vybere jako první; předchozí verze nemaže.

## Referenční chůze a sprint v4

Nové samostatné pokusy: **Chůze · přirozený krok v4** a **Sprint · odraz a let v4**.
Přidání přes server: `node game-plan/tools/add_body_twist_poses.cjs --reference-gait`.
Pokud existuje chůze v4, editor ji při otevření upřednostní. Starší a vlastní varianty
se nemění. Tyto osmifázové návrhy jsou ručně sestavená aproximace, nikoli mocap
nebo přesný přepis obrázků. Chůze má téměř propnutou stojnou nohu (5–16°), švih
nejvýše 60° a přenos opory mezi nohama. Sprint má aktivní odraz, složenou vracející
se nohu a let ve snímcích 4 a 8; končetiny se vystřídají o čtyři snímky.
Ramena zůstávají jemná. Nový parametr `bodyLean` umožňuje předklon trupu ±45°,
u starých záznamů se interpretuje jako 0°. V4 sprint používá 18°, chůze 2°.

Podklady: přiložené uživatelovy dvě tabule běhu, vlastní referenční přehled
[Academy of Neurologic Physical Therapy](https://www.neuropt.org/docs/default-source/cpgs/afo-fes/quick-reference-gait-analysis-2022.pdf?sfvrsn=20245d43_0)
pro rozlišení fází kolene a [rozhovor se sprinterem Richardem Kiltym na World Athletics](https://worldathletics.org/spikes/news/richard-kiltys-road-to-the-world-title)
pro návrat stehna dopředu a aktivní kontakt. Číselné parametry sprintu jsou autorský
návrh, nikoli hodnoty naměřené v těchto zdrojích. Odkaz uživatele na Magnific
`https://www.magnific.com/free-photos-vectors/human-movement` se nepodařilo načíst;
nebyl použit jako ověřený zdroj konkrétních fází.
Jsou to výchozí procedurální návrhy k ručnímu doladění, nikoli schválené pohyby.
ImageGen zatím nebyl použit. Směr je doprava. Bližší ruka i noha jsou stále červené
`#ff514f`, vzdálenější zelené `#42dd80`; nezaměňovat podle stran obrazu.
Vzdálenější končetiny se kreslí první, bližší překrývají trup a vzdálenější končetiny.

## Klouby a souřadnice

Varianta **Zombie · šouravá chůze v1**: 8 fází při 6 sn./s, krátký krok,
nízký švih bez letu, předklon, hlava sklopená a obě ruce před tělem s různým
svěšením. Barvy zachovávají identitu končetin. Každý snímek lze upravit obvyklým
způsobem; dosavadní animace se nemění. Přidání: `node game-plan/tools/add_body_twist_poses.cjs --zombie`.
Editor po načtení nabídne zombie jako výchozí variantu, pokud existuje.
Autorská kostra inspirovaná dohledaným textovým rozborem
[Micaha Buzana](https://www.micahbuzan.com/zombie-walk-cycle-2d-animation-tutorial/),
nikoli kopií jeho kresby. Uživatelský odkaz
`https://www.magnific.com/free-photos-vectors/zombie-movement` se nepodařilo načíst.

- Kruh hlavy, krátký krk, příčná ramena, svislý trup, příčná pánev.
- Obě paže mají ramenní kloub a loket; obě nohy kyčel, koleno a chodidlo.
- Ramena a pánev: náklon proti vodorovné rovině −20 až +20°.
- Ramenní klouby, lokty, kyčle, kolena, krk: −180 až +180°.
- Hlava: −30 až +30° vůči krku, rotuje kolem spodního úchytu. Směrová čárka
  v kruhu dovoluje náklon vidět, samotné otočení dokonalého kruhu by vidět nebylo.
- Chodidla: −180 až +180° vůči vodorovné zemi, celý kruh. Tažení špičky myší plynule přechází přes hranici ±180° bez dorazu. Chodidlo se také otáčí společně s nadřazenou nohou.
- Celá postava: `bodyY` −100 až +100 pracovních pixelů; kladné směrem dolů.
- Loket a koleno jsou relativní úhly vůči nadřazené kosti. Délky kostí jsou pevné.
- Jedna buňka: 512 × 560 px, zem y=392. Větší rezerva ponechává prostor pro posun těla.
- Osm fází je časově rovnoměrných. Poslední snímek se liší od prvního, následuje
  přechod 8→1 bez dodatečné pauzy. Uživatel může snímky cyklicky prohazovat.

## Ukládání a opětovné použití

`poses.json` je zdroj pravdy. `clips` obsahuje celé kosterní animace (`fps`, `frames`),
`poses` jednotlivé pojmenované stavební pózy (`frame`) a `finished_animations` hotové kombinace
kosterní animace s bitmapovou předlohou. Uložení **jako nové** dostane nové UUID;
původní záznamy zůstávají beze změny. Stejný název je dovolený pro další alternativu.
**Uložit změny do vybrané animace** po potvrzení aktualizuje jen její ID, snímky
a tempo; zachová název i datum vytvoření. Předchozí záznam se nejprve uloží do
`history/<uuid>.json`. Zálohy lze použít k ručnímu obnovení; nejsou dalšími položkami
výběru animací. Pokud mezitím tutéž animaci změnila jiná karta, přepis se odmítne
a rozpracované úpravy zůstanou v editoru. Lze je uložit jako novou variantu.
Server `/api/poses` validuje rozsahy a ukládá soubor atomicky pod společným zámkem galerie.

Úpravy nejsou automaticky uložené. Uložení snímku do knihovny neukládá celou smyčku.
Knihovní póza se kliknutím kopíruje do vybraného snímku; originál se nemění.
Přepnutí animace a opuštění stránky upozorní na neuložené změny.

`node game-plan/tools/build_pose_library.cjs` vytváří chybějící výchozí knihovnu
a samostatné SVG v `templates/`, ale nepřepisuje existující data.
Editor umožňuje stáhnout aktuální pózu a tabuli 4×2 jako SVG; obsahují stejné souřadnice
bez přepočtu velikosti postavy. Před předáním do ImageGenu lze SVG deterministicky
vyrenderovat do PNG. Barevná kostra bude reference pro pózu, výtvarná postava samostatná reference.
