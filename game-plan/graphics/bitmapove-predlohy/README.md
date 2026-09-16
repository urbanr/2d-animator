# Animátor: bitmapová předloha + kostra = hotová animace

Kanonický popis vlastnictví dat je v `../../tool/ANIMATOR-DATA-MODEL.md`. Hotová
animace vlastní kombinaci kostry a konkrétního nastavení bitmapy. Herní postava
v `../postavy/game-characters.json` drží jen atributy a odkazy na hotové animace.

## Detail a herní pixely

Pod náhledem je přepínač **Detailní originály / Herní pixely · 192 × 210 px**.
Jde o velikost celého dosavadního plátna (původně 96 × 105 px), nikoli automatické
zvětšení siluety na jeho celou výšku. Postava zůstává stejně velká vůči kostře.

Zombie má 13 skutečných zmenšených průhledných PNG v `bezec-zombie-v1/game-192/`.
Vznikly stávajícím `downscale_sprites.py` s přesným profilem `enemy-production-v1`:
dark DPID 0,72 / lambda 0,60, jas +30 v sRGB, kontrast 1,4, Ztmavit 100 %, obrys
0,45 a černota 0,25. Filtry se aplikují na zmenšené díly, nikoli znovu při renderu.
U vnitřních spojů tedy mohou zvýraznit i okraj jednotlivého dílu.

Reprodukce: `python3 tools/build_cutout_game_parts.py graphics/bitmapove-predlohy/bezec-zombie-v1/skin.json --width 192`
(z adresáře game-plan). Existující výstup se bez přepsání odmítne. Manifest
obsahuje nastavení, rozměry i SHA-256 originálů a výsledků.

Rozlišení každého dílu vychází z jeho měřítka při uchycení na neutrální kostru;
díly proto nejsou všechny uměle velké 192 px. Bitmapové souřadnice úchytů a
uživatelských offsetů zůstávají původní. Renderer kreslí malou texturu do
původního lokálního obdélníku a aplikuje stejnou transformaci jako u detailu.
Herní režim skládá postavu na opravdové plátno 192 × 210 s bilineárním vyhlazováním
(Canvas smoothing, kvalita low) a vyhlazeně ho zvětšuje pro editaci. Stejné filtrování
mají miniatury i PNG export. Zdrojové díly se nemění. Má i odpovídající alfa masku
pro výběr Option tahem.

Malý kontrolní náhled má nově 192 × 210 pixelů. PNG export respektuje režim:
detail 512 × 560, herní 192 × 210, list osmi herních snímků 768 × 420. Zoom,
pomocná kostra a podlaha do exportu nevstupují. Režim zobrazení nepřepisuje
pózy ani již uložené animace; uložená animace obsahuje odkaz na manifest herních
textur. Swift/iPhone přehrávač zatím tento cutout katalog nepřebírá.

## Aktuální ukládání

- **Postava: Uložit** aktualizuje vybranou herní postavu se stejným ID, její
  atributy a odkazy na animace. Bitmapové díly ani kostru do postavy nekopíruje. **Uložit jako…** se zeptá
  na název a vytvoří novou. U dosud neuložené postavy je Uložit neaktivní.
- Pokud zadaný název už existuje, **Uložit jako…** nabídne přepsání se zálohou.
  OK přepíše existující ID; Zrušit vrátí zadání názvu bez ztráty rozpracovaných
  změn. Porovnání ignoruje velikost písmen a přebytečné mezery. Při starších
  duplicitách stejného názvu se přepisuje vybraná postava, pokud patří mezi ně;
  jinak editor požádá o konkrétní položku. Katalog se před kontrolou obnoví,
  server navíc odmítne vytvoření další duplicity z jiné souběžné karty.
- **Hotová animace** ukládá kostru, bitmapovou předlohu, pořadí, uchycení,
  měřítko, přechody a snímkové výjimky do společné knihovny. Po úpravě animace
  přiřazené postavě se kvůli bezpečnosti vytváří nová animace; stará se nepřepisuje.
- Přepisy kontrolují očekávaný předchozí záznam; konflikt z jiné karty nic
  nepřepíše. Předchozí stav postavy se zálohuje do `../postavy/history/`, animace do
  `../animace/history/`. Název existujícího záznamu Uložit nemění.
- Otevření `file://` přesměruje na místní server `http://127.0.0.1:8765`.
  Chyba spojení ponechá změny v editoru a vysvětlí, jakou adresu použít.
- Změny ve staré otevřené kartě lze před obnovením zachránit přes **Stáhnout
  data pohybu a napojení**. V aktualizovaném editoru je v Podklady a export
  rozbalovací **Obnovit rozpracovanou postavu ze stažených dat** pro načtení JSON.
- Volba **Obě / Bližší / Vzdálenější** je vedle výšky a posunu postavy.

Tyto možnosti nahrazují starší popis ukládání jen nových kombinací níže.

Sekce je součástí společného `tool/preview.html?sekce=animator`.

- `skins.json`: nabídka bitmapových postav; zatím Zombie (Běžec).
- `../postavy/game-characters.json`: katalog postav ve schématu 3. Každá postava obsahuje
  `animation_ids` a `default_animation_id`; neobsahuje `skin`, `animation` ani
  `animations`.
- `../kostry/skeletons.json`: banka pojmenovaných kosterních animací (`clips`).
- `../animace/animations.json`: hotové kombinace interní kostry a nastavení bitmapy.
  Odkaz z postavy míří právě sem. Odkaz hotové animace na bankovní kostru je
  volitelný a po první úpravě kostry se odstraní.

Bitmapové PNG se nekopírují; záznam na ně odkazuje. Nové výtvarné varianty
proto patří do nové složky skinu, ne přes původní PNG. Tento katalog zatím
není automaticky napojený na Swift/iPhone přehrávač ani původní sprite katalog.

## Ovládání Póz i Animátor

### Panel přímo v Animátor (2026-09-16)

Panel lze táhnout za záhlaví a sbalit tlačítkem −. Je součástí okna, nikoli
bitmapy: zoom jej nezvětšuje a nikdy nevstupuje do PNG. Vše vybíráš jedním klikem:
**Upravuji: Kostra / Bitmapa**, **Nástroj: Posun / Rotace / Velikost**.
Aktivní tlačítko je žluté, neaktivní šedé. **Platí pro: Celá animace** je jeden
přepínač: žlutý = všechny snímky, šedý = pouze aktuální snímek (výchozí stav).
Text pod ovládáním vždy upřesňuje skutečný rozsah. Náhledy všech snímků se
obnovují již během tahu, nikoli teprve po puštění myši. Posun bitmapy je v
lokálních souřadnicích jejího uchycení, takže s kostí rotuje, neputuje stejným
směrem po obrazovce ve všech pózách. Již vytvořené snímkové výjimky se zachovají.

| Gesto | Výsledek (ve zvoleném rozsahu) |
| --- | --- |
| Tah za kloub | Vybraný nástroj; výchozí rotace navazující končetiny |
| Ctrl + konec kosti | Jen délka, bez současné rotace; lze zamknout checkboxem |
| Ctrl + konec ramen/pánve | Nezávislý posun jednoho úchytu |
| Ctrl + bitmapa (režim Bitmapový díl) | Výška; tah dolů zvětšuje, nahoru zmenšuje |
| Option + bitmapa (režim Bitmapový díl) | Šířka; tah doprava zvětšuje, doleva zmenšuje |
| Nástroj Posun + bitmapa | Posun bitmapového uchycení vůči kosti |
| Kruhový úchyt bitmapy bez modifikátorů | Rotace bitmapy kolem uchycení |
| Čtvercový úchyt / Ctrl+Option + bitmapa | Velikost bitmapy bez změny kosti |
| Tah do prázdna | Posun pohledu, nikoli postavy |
| ⌘Z / ⌘⇧Z (také Ctrl) | Zpět / Znovu; jeden tah je jeden krok |

Klávesové zkratky nepřebírají Zpět při psaní do polí. Rotace a posuny celé
animace se přičítají k jednotlivým pózám, délky a velikosti se násobí stejným
poměrem. Nezkopírují aktuální pózu do všech snímků. Při dosažení limitu je
společná změna omezena tak, aby se zachovaly rozdíly. Pořadí vrstev a nastavení
tempa/rychlosti jsou nadále společné, nikoli snímkové.

Snímek s výjimkou má ●. **Reset snímku** odstraní jeho lokální změny pózy,
délky a bitmap, ale zachová společné úpravy animace. Reset je vratný přes
Zpět. Historie je pracovní (60 kroků), neukládá se jako součást postavy.
Při úpravě přehrávané animace se vybere nejbližší celý snímek a přehrávání se
pozastaví; nelze upravovat samostatnou neuloženou mezifázi.

Data: `frames` obsahují výsledné úhly/posuny, společné délky jsou v
`rig_lengths`. `frame_edits[index].pose_base` drží původní hodnoty pro reset,
`lengths` obsahuje násobky společných délek, `parts` lokální offsety, úhly a
násobky velikosti bitmap. Společné bitmapové úpravy jsou `skin.parts[key]`
(`offset`, `rotation`, `scale`, `scale_x`, `scale_y`). `scale_x/y` jsou nezávislé
násobky šířky a výšky zdrojové bitmapy, společný `scale` zůstává zachován.
Staré záznamy mají oba nové násobky 1. Kostra ani uchycení se změnou poměru
bitmapy nemění; změny respektují rozsah a historii. Offset je v původních pixelech v soustavě
kosti; rotace/velikost bitmapy nemění jeho význam. Renderer interpoluje i
délky a bitmapové výjimky včetně přechodu poslední→první snímek.

Hotová animace ukládá snímkové výjimky i společné bitmapové úpravy jako jeden
celek. JSON záloha, import a PNG export výjimky respektují. Starší vložené
kombinace převedl jednorázový migrační nástroj do společné knihovny.

### Společné vlastnosti a starší editor Póz

- Kolečko nad náhledem přibližuje/oddaluje. Reset zoomu vrací 100 %, nemění pózu.
- Všechny snímky jsou v jednom vodorovně posuvném řádku.
- Editor Póz zatím zachovává změnu délky běžným tahem pro celou animaci.
  Bližší a vzdálenější končetina mají vlastní délky. Animátor používá panel výše.
- Ctrl + tah za konec ramen/pánve posune jen tento úchyt; opačný konec i střed
  zůstávají. V Animátor rozsah určuje panel, v Pózách jde o aktuální snímek.
- V Animátor je „Upravit klouby myší“ standardně zapnuté. Přehrávání volbu
  nevypíná, úchyty sledují i plynulou animaci a pohyb vpřed. Uchopení kloubu
  přehrávání zastaví. Vybrat lze bližší/vzdálenější stranu.
  Výška je pod animací, pod ní předklon; Zpět/Znovu přímo v panelu. Šedá nápověda uvnitř plochy
  shrnuje tah, Ctrl a zoom; není součástí exportovaných obrázků.
- Holeně se vykreslují před stehny příslušné nohy.

### Animátor: uchycení, pořadí, posun pohledu a rychlost

- Seznam dílů je **zezadu dopředu**. Vyber díl a tlačítky ↑ Dozadu / ↓ Dopředu
  změň pořadí. Pořadí se nepřetáčí přes konec seznamu a ukládá se do bitmapového
  snapshotu hotové animace, nikoli do postavy ani společné kostry.
- Nástroj Posun v bitmapovém režimu (nebo Option ze zvoleného režimu kostry)
  uchopí **viditelnou bitmapu přímo pod kurzorem** a posouvá
  ji vůči její kosti. Prochází skutečné pořadí vrstev od přední dozadu a ignoruje
  průhledné pixely (alfa nejvýše 8/255). Předchozí výběr v seznamu výsledek
  neovlivňuje; seznam se přepne na uchopený díl. Kliknutí mimo bitmapy nic nemění.
  Výběr respektuje zoom, posun pohledu, pohyb vpřed, upravené délky i uchycení.
  Při přehrávání se pro editaci vybere nejbližší celý snímek.
  `parts[key].offset`
  je dvojice posunů v lokálních pixelech bitmapy; při otáčení následuje kost a
  je společný základ. Snímek může mít vlastní výjimku. Referenční kost ani póza
  se nemění. Reset uchycení vynuluje posun vybraného dílu ve zvoleném rozsahu.
  V režimu bitmapy má Ctrl svislý kurzor změny výšky, Option vodorovný kurzor
  změny šířky a Ctrl+Option diagonální kurzor celkové velikosti.
- Tah myší/jedním prstem mimo kloub bez modifikátorů posouvá náhled. Kolečko
  přibližuje kolem ukazatele, dva dotykové prsty umějí zoom i posun.
  Reset pohledu vrátí zoom 100 % a vystředění. Kamera se nikdy neukládá do PNG,
  skinu ani kostry.
- `motion.variation_percent` je rozptyl ±X % (0–90) pro samostatné herní postavy.
  Při vytvoření instance se jednou vybere odchylka `d` z intervalu `[-X,+X]`.
  Násobek `k=1+d/100` řídí současně `fps=baseFps*k` i
  `speed=baseSpeed*k`. Vzdálenost na animační cyklus se tak nezmění.
  Poměr je nejprve třeba ručně dobře nastavit základním tempem a rychlostí;
  násobek sám špatný základní krok neopraví.
- Posuvník odchylky a Náhodná rychlost slouží jen k náhledu. Rozptyl a pravidlo
  společného násobku se ukládají do herní postavy a JSON exportu. Implementace
  náhledu je v `motion-preview.js`; Swift prototyp tento nový katalog zatím
  nepřehrává, takže nejde o již nasazené chování na iPhonu.

Uložení hotové animace ukládá i všechny společné a snímkové úpravy bitmapy.
Uložení postavy bitmapu nemění. Zpět vrací také uchycení a pořadí v rozpracované animaci.

## Pořadí bitmap (zezadu dopředu)

Zadní paže a předloktí → zadní chodidlo → zadní stehno a holeň → přední
chodidlo → přední stehno a holeň → doplněk/nádrž → trup → hlava s krkem →
celá přední paže a předloktí. Přední ruka je navrchu podle potvrzení uživatele.

Pánev a ramena jsou jen geometrické úchyty, bitmapy pro ně přehrávač nekreslí
(ani ze starších uložených skinů). Původní `parts/pelvis.png` je červený kus
oblečení s opaskem, ne krk. Zůstal na disku i v popisu zdrojových dílů, ale není
aktivní vrstvou. Zombie má nyní 13 vykreslovaných bitmap. Krk je už namalovaný
v `parts/head.png`, proto se bez nového dělení obrázku vykresluje společně s hlavou.

`rig_lengths` je společný základ animace (UpperArm, Forearm, Thigh, Shin, Foot
pro near/far); `frame_edits` může přidat snímkové násobky. Starší animace bez něj
zůstávají kompatibilní. Samostatné kořenové posuny `near/farShoulder/HipOffsetX/Y`
patří do snímku; chybějící hodnoty znamenají nulu.

Ukládání vyžaduje běžící `tools/serve_sprite_gallery.py`. POST
`/api/game-characters` ověřuje vstup a atomicky přidává záznam. Všechny dosavadní
uživatelské animace a ruční posuny zůstávají zachované.

## Pokus `pruhlednost`: měkké půlkruhové spoje

Pod zobrazením Detail / Herní pixely je **Varianta: průhlednost spojů**.
Nové základy mají oba konce všech bitmapových dílů zapnuté na 65 %.
Dřívější hromadné tlačítko bylo odstraněno. Oba konce se nezávisle vypínají
a zapínají kliknutím na × / + u vybraného dílu v režimu Bitmapa.
Pánev a ramena jsou jen vodítka kostry bez vlastní bitmapy.
Po jednorázové migraci existujících postav se další uložená vypnutí zachovávají.

- **Pravý tah na bitmapě dolů** zesílí průhlednost, nahoru ji odstraní.
  150 jednotek náhledu odpovídá celému rozsahu. Není to štětec: mění se celý
  zvolený půlkruhový přechod. Průhledné místo lze znovu uchopit podle původní
  bitmapy. Seznam vždy ukazuje vybraný díl.
- **Konec** vybírá uchycení nebo druhý konec; u nového základu jsou oba zapnuté.
  **Směr** obrátí půlkruh ven / dovnitř. **Poloměr** je v původních pixelech;
  následuje otočení i velikost bitmapy. Tyrkysový obrys je pouze pomůcka editoru.
- Síla 0 % plně obnoví původní alfu. 100 % odstraní okraj zvolené poloviny.
  Konec dílu (plus ruční X/Y posun masky) je **střed pomyslného kruhu**, tedy
  střed rovné hrany půlkruhu. Není na oblouku: žádný automatický posun o
  poloměr dovnitř dílu se nepřičítá. Poloměr ani úhel neposouvají střed.
  Střed půlkruhu zůstává neprůhledný. Výchozí poloměr je nejvýše 45 % délky kosti,
  aby např. přechod krátkého krku nezprůhlednil celý obličej.
  Při nevhodném poloměru nebo chybějícím překryvu
  se může ukázat mezera — maska nepřikresluje chybějící materiál.
- Změny respektují **Celá animace / snímek**, Zpět a Znovu. Nastavení celé
  animace ulož přes **Hotová animace → Uložit / Uložit jako**. Postava si uloží
  jen odkaz na výslednou hotovou animaci.

Data: `skin.parts[key].joint_fade.start/end = {strength, radius, direction, offset, angle}`.
Síla je 0–1, poloměr 1–2000, směr `outward`/`inward`. Snímkové výjimky mají
stejný formát v `clip.frame_edits[i].parts[key].joint_fade`. Číselné hodnoty
se interpolují včetně přechodu posledního snímku na první, směr se přepne
v polovině. Globální úprava přičítá stejný rozdíl i k výjimkám (v mezích rozsahu).
Volitelný `offset` je posun masky v původních pixelech bitmapy, `angle` natočení
od osy dílu ve stupních. Starší nastavení bez nich znamená nuly. Oba konce
jsou nezávislé; nastavení jednoho nesahá na druhý. Pravý klik u konce právě
vybrané bitmapy vybere tento konec a pravý tah mění sílu. Pole X/Y, úhel,
poloměr a směr umožňují masku přizpůsobit. Při zobrazené kostře mají všechny
aktivní konce tyrkysový symbol půlkruhu (včetně přehrávání), nikoli jen vybraný díl.

Renderer násobí původní alfu maskou v souřadnicích zdrojového obrázku.
Maska působí jen uvnitř půlkruhu včetně jeho oblouku. Za poloměrem ani na druhé
straně rovné hrany alfu nemění; nezprůhledňuje tedy celý prostor za spojem.
Detail, herní díly, miniatura, snímky i oba PNG exporty používají stejný postup.
RGB a originální PNG soubory se nikdy nemění. Textury jsou omezeně cachované;
PNG export neobsahuje tyrkysovou pomůcku. Swift prototyp tento pokus zatím
nepoužívá; starý skript `export_cutout_poses.cjs` je jen export původní předlohy.

## Přepínače a koš

### Rotační střed bitmapy a klávesy

V režimu Bitmapa drž **Shift** a táhni za středový kroužek nebo aktivní díl.
Přesune se samostatný rotační střed, nikoli kloub kostry. Obrázek při změně
středu zůstává na místě, i když je už otočený nebo nestejnoměrně zvětšený.
Následující otáčení (myší i Q/E) používá nový střed. Rozsah Snímek / Animace,
Zpět / Znovu, uložení, export a načtení zálohy jej respektují.

Data `pivot_offset: [x,y]` jsou relativní k původnímu `part.start`, v původních
pixelech bitmapy. Chybějící hodnota znamená `[0,0]`. Změna středu kompenzuje
posun bitmapy; při společné změně může kvůli odlišným otočením snímků přidat
jejich vlastní kompenzace `offset`. Kostra ani délky kostí se nemění.

- **A / D**: předchozí / další snímek, včetně přechodu konec–začátek.
- **Shift + W/A/S/D**: posun aktivní bitmapy o jednu jednotku náhledu nahoru,
  doleva, dolů, doprava. Shift rozlišuje kolidující požadavek na A/D pro snímky.
- **Q / E**: rotace aktivní bitmapy o −1° / +1°; se Shiftem o 10°.
- Držení klávesy je jedna změna pro Zpět. Posun a rotace platí podle přepínače
  Snímek / Animace. Zkratky nezasahují při psaní do polí nebo výběru v seznamu.

Dlouhé vysvětlivky ovládání, průhlednosti, pohybu vpřed, rychlosti a pořadí
vrstev jsou pod **?** (najetí nebo fokus/kliknutí, na telefonu spodní bublina).

Panel nad plátnem má dva přepínače ve stylu iOS: vlevo Kostra / vpravo Bitmapa
a vlevo Snímek / vpravo Animace. Zelená poloha znamená pravou volbu. Posun,
rotace a velikost zůstávají samostatné nástroje.
Vybraná kost má plně žlutou výplň svých existujících koncových úchytů;
barevné obrysy dál rozlišují stranu. Výběr zůstává při přepínání snímků
i po puštění myši a přenáší se mezi kostrou a odpovídajícím bitmapovým dílem.
Bitmapový výběr dál používá původní obdélníkový rámeček.

Animátor nabízí **Smazat vybranou postavu / animaci** a **Koš postav a animací**.
Editor Pózy má **Smazat vybranou animaci** a **Smazat pózu** u každé karty.
V obou místech lze smazané položky obnovit. Smazání vyžaduje potvrzení,
kontroluje aktuální verzi záznamu a atomicky jej přesouvá do `trash` téhož
JSON katalogu. Obnova odmítne přepsat už existující ID. Není tu trvalé mazání.
Zdrojové PNG, vložené pózy ani snímkové kopie animace v uložených postavách
se nemažou. Neuložená pracovní kopie při smazání zůstává v editoru, už ale
nepřepisuje smazaný záznam; lze ji uložit jako novou. Prázdná knihovna dovolí
začít novou dvousnímkovou animací nebo obnovit položku z koše.

## Editor: poloelipsy, hlava a knihovna koster (2026-09-16)

- Přechod má `radius` (R1, hloubka ve směru dílu) a `radius2` (R2, šířka).
  Starý záznam bez R2 zůstává kruhový (R2 = R1). Maska končí na hranici
  poloelipsy; mimo ni nechává původní alfu. Obě osy mají rozsah 1–2000.
  Rozsah Snímek / Animace, interpolace, hit-test i export používají stejnou geometrii.
- Nově načtený základ má oba konce všech bitmapových dílů zapnuté na 65 %.
  Uložená vypnutí se při běžném načítání respektují. Dle výslovného zadání byly
  jednorázově zapnuty přechody ve třech uložených postavách (nulová síla → 65 %,
  nenulové síly a geometrie zachované). Předchozí celý katalog je v
  `history/game-characters-before-all-ellipse-20260916.json`.
- V režimu Bitmapa jsou u obou konců vybraného dílu klikací × / +.
  × nastaví sílu 0, + 65 %. Ostatní parametry se nemění; platí vybraný rozsah
  a krok lze vrátit. Úchyty rotace/velikosti/středu mají přednost.
  V režimu Kostra tyto tlačítkové zásahy nekradou úchyty kloubů.
- Hlava, krk a trup mají nyní nastavitelné délky `head`, `neck`, `torso`
  (výchozí 21, 18, 94). Ctrl nebo Velikost mění délku bez rotace.
  Posun hlavy/krku používá vlastní `headOffsetX/Y`, `neckOffsetX/Y`,
  nikoliv posun celé postavy. Úchyt v místě středu ramen ovládá `bodyLean`;
  střed trupu dál přesouvá celou postavu. Náklon hlavy zůstává ±30°.
- Kostry je nový samostatný katalog `rigs` v existujícím `poses.json`.
  Obsahuje pojmenované rozměry kostí, ne pohybové snímky nebo bitmapy.
  Uložit / Uložit jako / Smazat používá zálohy, kontrolu konfliktu a vratný koš.
  Načtení kostry po potvrzení nahradí rozměry v animaci, zruší snímkové
  délkové výjimky a ponechá úhly a pohyb. Načtení lze vrátit přes Zpět.
- Sekce Kostry, Postavy, Animace, Koš a export jsou orámované a skládací.
  Původní editor „Pózy“ je v navigaci pojmenovaný „Kostry“; staré URL zůstávají platné.
  Seznam dílů má vlastní přetahovatelný panel vpravo od Úprav, výchozí sbalený.
  Výběr je obousměrný a zachovává režim Kostra/Bitmapa.
- Editor roste se šířkou okna bez pevného maxima. Snímky, zoom a ikonový reset
  jsou v kompaktní řadě. Ikona `tool/reset-icon.png` je kopie dodaného pngegg.png.
