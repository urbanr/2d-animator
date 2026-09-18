# Potvrzené požadavky na grafiku a animace

Zdroj: přímé pokyny uživatele v této úloze, 12. 9. 2026. Tyto body jsou potvrzené požadavky, nikoli návrhy asistenta.

## Nový postup pro kosterní postavy — 17. 9. 2026

Pro nové kosterní postavy chce uživatel jeden celkový návrh z ImageGen a samostatné
bitmapové díly, nikoli další kreslené osmifázové sekvence. Stránka Bitmapové
předlohy musí ukazovat nejprve celou postavu a potom její díly. Stávající sekvence
se zachovávají jako starší podklady.

Animátor i Kostry mají při vytvoření animace výchozích osm snímků a dovolují
snímky přidávat i odebírat. Kostru lze rozšířit o další navázané větve a k jedné
kosti přilepit více nezávislých bitmap ze seznamu dílů. Tyto bitmapy následují
pohyb a rotaci kosti, ale nedědí zmenšení ani zprůhlednění jiné bitmapy. Nový
přilepený díl má vlastní velikost i při změně délky kosti. Jednotlivé díly lze
v animaci nepoužít bez jejich smazání. Do předloh lze přidávat další PNG.
Starší data se obohacují aditivně se zálohou, nikoli nahrazují od začátku.

Matka všech krys: uživatelem schválený vzpřímený návrh bosse na zadních a
schválený atlas 19 dílů, včetně krku, ocasu, nádrže a tří samostatných malých
krys. Uloženo v `graphics/bitmapove-predlohy/matka-vsech-krys-v1/`.
Schválení grafiky není schválením finálního pohybu; ten vzniká v editoru.

## Výtvarný styl a rozměry

- Inspirace Metal Slug, zejména díly 3, 4 a 5: výtvarný styl, groteskní postavy, stroje a živé animace. Není požadována kostičkovaná pixelovost. Zachovat současnou kvalitu kresby postav.
- Upřesnění uživatele 12. 9. 2026: mapa je 2D, ale kresba postav a strojů nemusí mít dokonale boční ani geometricky správnou perspektivu. Šikmý, prostorově působící až „izometrický“ vzhled, přehánění a záměrné prostorové nesmysly jsou žádoucí, pokud vypadají dobře. Výtvarný účinek má přednost před striktním 2D profilem.
- Hra je pro iPhone na šířku. Grafiku navrhovat rovnou pro skutečnou velikost použití, nevyrábět zbytečně velké obrazy k pozdějšímu pracnému zmenšování.
- Nejprve doladit finálního Chuchvalce, teprve po dalším výslovném pokynu vyrábět ostatní obsah. Přehrávač patří do `game-plan/tool/`.

## Chuchvalec: přijaté a zamítnuté

- Původní animace měla žádoucí živost: pohyb ruky babičky, profesorovy hlavy a dalších částí.
- Její měnící se stíny, překreslované detaily a boční ujíždění stojícího kola jsou chyby.
- Varianta idle-v2, která jen jemně deformuje jednu kresbu při dýchání, je uživatelem zamítnutá. Nesmí být dále vydávána za cílovou úroveň animace.
- Ruka babičky se má zřetelně pohybovat. Profesor má pohybovat hlavou. Požadovaný výsledek není pouze dýchání celého obrázku.
- Nahradit přední botu kolečkovou bruslí; ponechat charakteristický vzhled Chuchvalce.
- Velké kolo se má při jízdě plynule otáčet kolem pevné osy. Kola brusle se mají také otáčet.
- Uživatel výslovně preferuje šikmo/prostorově zobrazené velké kolo z původního návrhu `graphics/chuchvalec/chuchvalec-neutral@3x.png`. Zachovat viditelnou šířku pneumatiky a tento úhel pohledu. Nepředělávat kolo na plochý kruh v dokonale bočním pohledu jen kvůli snazší animaci; tímto se odmítá pozdější požadavek asistenta na čistě ortografický kruhový disk. Otáčení přizpůsobit zvolené kreslené perspektivě.
- Menší kolečka se musí otáčet rychleji v poměru odpovídajícím jejich skutečným průměrům; všechna kola vycházejí ze stejné ujeté vzdálenosti, bez prokluzu.
- Oprava konzistence nesmí odstranit výrazný pohyb končetin a hlav. Stíny a textura nesmějí nezávisle blikat nebo cestovat po povrchu.
- Povolená nadsázka v perspektivě neruší požadavek na konzistentní animaci: žádné náhodné ujíždění os, blikání stínů nebo překreslování pevných detailů.

## Kontrola před předáním

- Ověřit polohu os a správný směr otáčení při jízdě doleva.
- Zkontrolovat skutečný poměr úhlových rychlostí kol, včetně návaznosti smyčky.
- Zkontrolovat pohyb ruky a hlavy v reálné herní velikosti, nejen ve velkém detailu.
- Ponechat starší verze pro porovnání a jasně označit zamítnutou v2.
- Nepotvrzovat konkrétní verzi ImageGen modelu bez důkazu; vestavěný nástroj ji ve své odpovědi neuvádí.

## Aktuální podklad k posouzení

12. 9. 2026 vznikl návrh `graphics/chuchvalec/ride-v3/`: brusle, společné odvalování kol v poměru 1 : 3, šikmá široká pneumatika, samostatný pohyb paže a obou hlav. Přehrávač jej nabízí jako výchozí. Je to návrh asistenta čekající na hodnocení uživatele, nikoli schválení vzhledu nebo pokyn k výrobě ostatních postav.

## Nejnovější pokyn — přednost před předchozím návrhem

Uživatel následně zamítl ride-v3 i 120 snímků. Chce první výtvarnou verzi a její živost, pouze s bruslí a otáčením kol, **maximálně osm kreslených snímků**. Stínování namalované přímo v pixelech je žádoucí; žádná přidaná vrstva stínu, dopočítané osvětlení ani generované mezisnímky. Neprovádět dlouhé mezikontroly a další iterace bez pokynu. Aktuální sada je `graphics/chuchvalec/ride-eight/frames/`, přesně osm PNG. Přehrávač střídá tyto bitmapy bez rigování a dodatečného stínování. Předchozí ride-v3 je zamítnutá.

## Oprava okrajů a otáčení — 13. 9. 2026

Uživatel upozornil na bílý lem po ořezu a měnící se namalované stíny na botě. Požaduje průhledný výstup, komiksový černý obrys, při nemožnosti průhlednosti tmavé až černé pracovní pozadí. Bílý podklad nepoužívat. Bota má sdílet tutéž kresbu mezi osmi snímky. Kola se musejí skutečně otáčet: velké po 45 stupních (0 až 315, uzavření smyčky na 360), malá třikrát rychleji. Nezaměňovat poslední osmý snímek za kopii prvního; dokončení otáčky je přechod osmého na první. Aktuální oprava je `graphics/chuchvalec/ride-eight-fixed/frames/`. Výsledky zůstávají návrhem k hodnocení.

## Zkouška jednodušších barev — 13. 9. 2026

Uživatel požaduje maximálně 2–3 tóny na barvu, žádný dithering, žádnou texturu a žádné ambient occlusion. Formulaci „bez flat shading“ asistent vyložil jako bez hranatého polygonového stínování; tento výklad zatím uživatel nepotvrdil. Aktuální zkouška je `graphics/chuchvalec/ride-eight-clean/frames/`, osm PNG v černě obtaženém komiksovém stylu, průhledné pozadí, bez dodatečné stínovací vrstvy. Samotný návrh není schválený.

## Pevná paleta a vyplněné tvary

Po vysvětlení příčiny šumu uživatel schválil vyzkoušet postup s vynucenou paletou a souvislými vyplněnými tvary. Samotný prompt nestačí. Varianta `graphics/chuchvalec/ride-eight-solid/frames/` vzniká z existujících osmi snímků: 37 pevných barev (černá + 12 skupin po třech tónech), sloučení drobných ostrůvků odstínů do okolních ploch stejného materiálu a pevně definované tři plochy kůže boty. Následuje kontrola uložených PNG proti paletě. Výřez boty 35 × 15 px na (150,400) má místo 88 barev přesně 2 a je shodný ve všech osmi snímcích. Nejde o nové generování kresby; původní pohyb je zachovaný. Výtvarné schválení uživatelem teprve čeká.

## Podklady pro Cadmium a srovnání vybarvení

Uživatel chce osm černobílých kreseb a jeden barevný referenční snímek se shodnými obrysy. Při generování nikdy nepoužívat šachovnicový podklad. Požadovat skutečný průhledný alfa kanál; pokud jej generátor nedodá, použít jednolitý černý pracovní podklad a ten deterministicky odstranit. Výstupní PNG musí být skutečně průhledné. Náhledy zobrazovat na černém pozadí. Barevný vzor má vzniknout vyplněním oblastí původní černobílé kresby, nikoli jejím překreslením.

Opravená zkouška je v `graphics/chuchvalec/coloring-test-v2/`: osm průhledných snímků 384 × 480 px a `reference-00.png`. Velké kolo má ve všech snímcích zachovat stejný šikmý tvar, šířku, osu a pohled; mění se běhoun a značka ráfku, ne perspektiva celého kola. Návrh čeká na výtvarné posouzení.

## Oprava pracovního pozadí — přednost před předchozím bodem

Uživatel odmítl černé pracovní pozadí, protože splývá s černou obrysovou linkou. Černobílou kresbu generovat na čistém bílém podkladu. Následně odstranit pouze bílou plochu dosažitelnou od okrajů, zachovat černý obrys a uložit skutečně průhledné PNG. Uživateli ukazovat přímo průhledné PNG, nikoli pomocný obrázek na černém pozadí. Aktuální oprava je `graphics/chuchvalec/coloring-test-v3/`.

## Konečné pravidlo pozadí a počtu souborů — nejvyšší priorita

Pokyn uživatele 13. 9. 2026 nahrazuje všechny předchozí volby pracovního pozadí:

- Generovat rovnou s průhledností. Pokud je nutný pracovní podklad, smí být pouze jednolitá šedá RGB(80,80,80), tedy `#505050`.
- Nikdy nepoužívat bílé pozadí, černé pozadí ani nakreslenou šachovnici.
- Finální soubory každé animace: přesně osm samostatných průhledných černobílých PNG a jeden samostatný průhledný barevný referenční PNG.
- Nevytvářet ani uživateli neukazovat další PNG s kontaktním listem, černým náhledem, bílým náhledem nebo šachovnicí.
- Přehrávač zobrazuje průhledné PNG na jednolité šedé ploše `#505050`; šedá není součástí PNG.
- Čistá předávací složka je `graphics/chuchvalec/cadmium-final/` a obsahuje právě těchto devět PNG.

## Nové konečné balení — nahrazuje pravidlo devíti souborů

Nejnovější pokyn uživatele 13. 9. 2026:

- Každá animace má v předávací složce přesně dva PNG soubory.
- První PNG je list 4 × 2 se všemi osmi snímky. Obsahuje pouze černé obrysové čáry; bílé vnitřní plochy ani pozadí v něm nejsou. Každý pixel mimo čáry má alfa 0.
- Druhý PNG je jeden vybarvený referenční snímek. Okolí postavy má alfa 0.
- Jednolitá šedá RGB(80,80,80) je pouze pracovní a zobrazovací podklad. Není zapsaná do žádného finálního PNG.
- Čistá předávací složka `graphics/chuchvalec/cadmium-final/` tedy obsahuje jen `chuchvalec-lines-sheet.png` a `chuchvalec-color-reference.png`.

## Finální zadání souborů — nahrazuje všechny předchozí počty

Potvrzená změna uživatele 13. 9. 2026:

- Osm obrysových snímků musí být rozdělených do osmi samostatných PNG 384 × 480 px.
- Obrysové PNG obsahují pouze černé čáry. Všechny pixely mimo čáry, včetně vnitřních ploch postavy, mají alfa 0.
- Devátý soubor je jeden samostatný vybarvený referenční PNG 384 × 480 px s průhledným okolím.
- Předávací složka tedy obsahuje přesně devět PNG: `chuchvalec-line-00.png` až `chuchvalec-line-07.png` a `chuchvalec-color-reference.png`.
- Žádný společný list snímků se finálně nepředává.
- Zobrazovací pozadí zůstává RGB(80,80,80) a není součástí PNG.

## Hlavní způsob výroby barevných animací — potvrzeno 13. 9. 2026

Tento postup je nyní výchozí pro další barevné animace spritů:

1. ImageGen dostane pouze požadavek na osm barevných fází na jednolitém, plně neprůhledném pozadí RGB `(80,80,80)` (`#505050`). V generovacím promptu se nezmiňuje průhlednost, alfa kanál ani šachovnice.
2. Plátno musí vzniknout v rozlišení přesně odpovídajícím mřížce osmi cílových snímků. Výsledek se pouze rozdělí na osm samostatných PNG; při dělení se nesmí použít resize, převzorkování ani změna DPI. U plátna 1536 × 1024 px jsou buňky 384 × 512 px a lze pouze odříznout prázdných spodních 32 px na výsledných 384 × 480 px.
3. Šedé pozadí se odstraní deterministickou maskou mimo generátor.
4. Každý pixel mimo postavu se uloží jako RGBA `(80,80,80,0)`. Přehrávač pod PNG zobrazuje tutéž šedou RGB `(80,80,80)`.
5. Jednotlivé snímky se ukládají do samostatné složky dané postavy, v podsložce `rage-gray-v2/frames/`. Původní a starší pokusy se nepřepisují.

Alternativní, nyní nepoužívaný postup: nejprve vytvořit osm samostatných průhledných černých obrysů a jeden barevný referenční snímek, potom animaci vybarvovat podle reference. Tento postup zůstává zachovaný pro případné pozdější použití, ale pro nové animace se nyní nepoužívá.

## Postapokalyptické doplňky všech postav — potvrzeno 13. 9. 2026

- Svět hry je postapokalyptický. Každá nová postava, boss i běžný nepřítel musí mít několik jasně čitelných doplňků z tohoto prostředí, ne pouze obecnou podobu zvířete nebo člověka.
- Vhodné doplňky jsou rezavé pláty, řetězy, dráty, provizorní chrániče, masky, dozimetry, kabely, nádoby, opravené nářadí a jiné předměty odpovídající konkrétní postavě. Doplňky nesmějí zničit čitelnost siluety v herní velikosti.
- Postavy mají působit otrhaně, zanedbaně a špinavě. Oblečení tvoří hadry, cáry a visící cáry látky; mohou mít provazy, nitě, záplaty a rozpárané švy.
- Na těle, oblečení a vybavení mají být čitelné nánosy špíny a nechutné stopy postapokalyptického světa, například výkaly, zvratky, sliz a zaschlé skvrny. Používat je záměrně jako součást groteskního vzhledu postavy, ne jako náhodný obrazový šum.
- Přerostlý kanec zůstává zachovaný jako první návrh. Další vyráběná postava má být běžný nepřítel, nikoli boss.
- Při exportu žádné postavy se hotová kresba dodatečně nezmenšuje. Herní velikost v bodech se nastaví až v enginu. Pokud bude potřeba menší bitmapa, musí vzniknout novým generováním rovnou na plátně s přesnými menšími buňkami; nesmí vzniknout zmenšením schválené kresby.

## Návaznost osmisnímkové smyčky — potvrzeno 13. 9. 2026

- První a osmý snímek nesmějí být stejné. Jejich zopakování by při přehrávání vytvořilo viditelnou pauzu.
- Osm snímků představuje osm rovnoměrných fází jednoho cyklu: `0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°`.
- Fáze `360°`, která odpovídá prvnímu snímku, se nekreslí jako devátý ani osmý snímek. Smyčka se uzavře přímo přechodem z fáze `315°` zpět na `0°`.
- Před předáním ověřit, že všech osm PNG je unikátních a že přechod `8 → 1` pohybově navazuje bez zastavení.

## Velikost generovacího plátna podle herní velikosti — potvrzeno 13. 9. 2026

Toto pravidlo má přednost před dosavadním používáním stejného velkého plátna pro různé postavy:

- Rozměr jednoho generovaného snímku se určuje ze skutečné herní šířky a výšky postavy. Pro cílový iPhone s měřítkem `@3×` platí: fyzický rozměr v pixelech = herní rozměr v bodech × 3.
- Zdrojové plátno s osmi fázemi musí být odvozené z tohoto fyzického rozměru. Při mřížce 4 × 2 má šířku čtyř fyzických šířek snímku a výšku dvou fyzických výšek snímku.
- Běžný malý nepřítel proto musí mít menší generovací buňku i menší plátno než velká postava nebo boss. Nesmí se pro všechny postavy automaticky používat buňka 384 × 480 px.
- Po rozdělení plátna se snímky nezmenšují ani nepřevzorkovávají. Rozdělení a odstranění šedého pozadí jsou jediné povolené následné operace s rozměrem.
- Při aktuálně zvoleném měřítku je Bába 128 × 160 pt, tedy 384 × 480 fyzických px na snímek. Černobylák přibližně 26 × 32 pt potřebuje přibližně 78 × 96 fyzických px. Kopáč 32 × 32 pt potřebuje 96 × 96 fyzických px.
- Současné sady Černobyláka 384 × 480 px a Kopáče 444 × 444 px toto pravidlo nesplňují. Zůstávají pouze jako pracovní výtvarné návrhy; finální animace musejí být nově vygenerované rovnou v rozměru odvozeném z jejich herní velikosti.

## Oprava velikosti generování a čitelnosti linek — nejnovější pokyn 13. 9. 2026

Tento pokyn nahrazuje předchozí požadavek na generování malých nepřátel rovnou ve fyzickém rozměru 96 px:

- Všechny postavy a nepřátele zatím generovat ve velkém rozlišení obdobně jako Bábu. U osmisnímkové animace je výchozí velikost jednoho snímku 384 × 480 px; zmenšení není součástí generování ani následného automatického zpracování.
- Uživatel později samostatně rozhodne, jakým způsobem se velké podklady zmenší do herní fyzické velikosti.
- Nepřátelé musí mít výrazný tmavý vnější obrys a černé vnitřní neboli středové kreslicí čáry. Linky mají být dostatečně silné a souvislé, aby zůstaly čitelné i po budoucím zmenšení.
- Nepoužívat pro důležité obrysy tenké světle šedé čáry, které by při zmenšení zanikly. Černé vnitřní linky mají popisovat obličej, končetiny, záhyby, vybavení a důležité oddělení tvarů.
- Silné linky nesmějí vznikat jako náhodná textura, stínový šum nebo blikající detail. Jejich poloha a tloušťka musí být mezi animačními snímky stabilní.

## Pohyb končetin, ruční výškové srovnání a okraje — potvrzeno 14. 9. 2026

- Výšku postavy mezi snímky automaticky nevyhodnocovat ani nedorovnávat. Nové alternativy dostanou výchozí posuny všech snímků `x=0`, `y=0`; konečné srovnání provede uživatel ručně v editoru polohy snímků.
- ImageGen má stále dostat požadavek na přirozenou, záměrnou změnu výšky těla podle fáze pohybu. Rozdíl mezi stlačením, průchodem a letovou fází není chyba, kterou má následné zpracování odstranit.
- U každé kráčející nebo běžící dvounohé postavy musí prompt výslovně popsat střídání obou nohou. Jedna polovina cyklu patří došlapu a přenosu váhy jedné nohy, druhá polovina protilehlé noze. Postava nesmí pouze opakovaně poskakovat se stejným postavením nohou.
- U bočního pohledu rozlišovat končetiny jako bližší a vzdálenější nohu, případně podle jasného stálého prvku postavy, aby se anatomické „levá/pravá“ nezaměnilo se stranami plátna.
- Výchozí osmisnímková chůze nebo běh dvounohé postavy popíše osm rozdílných fází: kontakt první nohy, stlačení, průchod, zdvih nebo let; kontakt druhé nohy, stlačení, průchod, zdvih nebo let před návratem k prvnímu snímku. Poslední snímek se k prvnímu pouze blíží a není jeho kopií.
- Také čtyřnohé postavy potřebují výslovně zadaný chod. Pomalá chůze má čtyřdobé postupné došlapy jednotlivých nohou, klus střídá diagonální páry a cval má určené pořadí došlapů včetně letové fáze. Konkrétní chod se vybere podle charakteru postavy; nepoužívá se na všechny čtyřnohé jeden univerzální cyklus.
- Úplná postava, končetiny a doplňky musejí zůstat uvnitř vlastní buňky s volnou mezerou od sousedních snímků. Tento požadavek se uvede přímo v prvním promptu pro ImageGen.
- Během výtvarných iterací neprovádět opakované programové měření okrajů. Import provede pouze jednu levnou závěrečnou bezpečnostní kontrolu, která má zabránit skutečnému přesahu nebo příměsi sousedního snímku.

## Větší plátno při stejné velikosti postav; oprava osmé fáze — 14. 9. 2026

- Při nedostatku místa zvětšit plátno a buňky kolem postav. Nikdy nezmenšovat postavy kvůli mezerám. Velikost postavy v herním měřítku musí zůstat srovnatelná mezi alternativami stejné postavy.
- Přidaná vnější rezerva slouží k ořezu a nesmí ovlivňovat herní měřítko. Import ukládá společný výřez pro všech osm buněk; žádné jednotlivé přizpůsobování velikosti ani výškové dorovnávání snímků.
- Když generátor nerespektuje rozměr velkého atlasu, lze vytvořit dvě čtveřice v rozložení 2×2 a jejich buňky sestavit beze změny pixelů do atlasu 4×2. Zachovat shodné rozměry buněk, velikost kresby a explicitní pořadí.
- U Běžce uživatel požádal prohodit původní snímky 4 a 5. Nová kresba může toto pořadí obsahovat přímo; neprohazovat je potom ještě jednou v přehrávači.
- Osmou fázi Běžce skutečně překreslit: pohybová vzdálenost 7→8 má být přibližně stejná jako 8→1. Osmá má být pokrčený přechod k prvnímu došlapu, ne téměř shodná první póza. Nestačí problém pouze popsat nebo změnit pořadí 4/5.
- Nové alternativy mají nulové ruční posuny. Uložené uživatelské posuny předchozích verzí se zachovávají.

## Reklamace kompozice herních pozadí — 15. 9. 2026

- Zachovat dosavadní detailní ilustrovaný styl pozadí; jeho větší realističnost oproti postavám zatím neměnit. Sprite preprocessing se na pozadí automaticky nepřenáší.
- Herní průchod vede zprava doleva. Cesta má být vodorovná napříč obrazem, nikoli izometrická nebo ubíhající do hloubky; oba boční okraje dovolují příchod a odchod.
- Hřbitov: průchozí hřbitovní cesta, bez slepého zakončení vstupem do krypty vlevo.
- Přehrada: přímý čelní pohled na hráz, chodí se vodorovně po její koruně.
- Sídliště: čelní fasáda paneláku a před ní rovná ulice zprava doleva.
- Střecha paneláku: střecha i fasáda pokračují za oba boční okraje; nezobrazovat pravý ani levý konec budovy.
- Opravy uložit jako alternativy `composition-v2`, zachovat `concept-v1` a nepřepínat produkční výběr bez schválení. Přesná zadání: `graphics/levely/composition-v2-prompts.json`.

## Editovatelná kostra pohybu — 15. 9. 2026

- Před dalším generováním postav nejprve připravit a ručně doladit geometrickou kostru chůze a sprintu. Editor `tool/poses.html`, knihovna `graphics/kostry/skeletons.json`.
- Hlava je kruh s viditelnou značkou směru, krátký krk, krátká příčná ramena, svislý trup a krátká příčná pánev. Paže mají lokty, nohy kolena; délky kostí jsou pevné.
- Bližší paže i noha vždy červená, vzdálenější vždy zelená. Totožnost končetiny se nemění, když přejde před/za druhou. Vzdálenější kreslit pod bližší.
- Ramena a pánev se naklánějí od vodorovné roviny nejvýše ±20°, hlava od úchytu vůči krku nejvýše ±30°. Ramenní klouby, lokty, kyčle, kolena a krk lze otáčet. Posun celé postavy nahoru/dolů je samostatný parametr každého snímku.
- Jednotlivý upravený snímek lze uložit jako novou pojmenovanou pózu, celou smyčku jako novou alternativu. Původní záznamy zachovat. Výchozí kostry jsou návrhy k posouzení, nikoli schválené animace.
