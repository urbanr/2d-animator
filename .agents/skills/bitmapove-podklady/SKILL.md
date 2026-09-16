---
name: bitmapove-podklady
description: Generuje oddelene bitmapove dily postav pro 2D kostru v projektu ai-prdel-sveta. Pouzij pri tvorbe nebo oprave atlasu hlavy, trupu, panve, koncetin, bot a charakteroveho doplnku podle existujici postavy; nepouzivej pro bezne osmickove sprite animace ani herni pozadi.
---

# Bitmapove podklady pro kostru

Vytvarej znovupouzitelne oddelene bitmapove dily postavy pro rigovani v projektu `ai-prdel-sveta`. Cilem neni hotova animacni sekvence ani vyrez viditelnych casti jednoho snimku. Kazdy dil musi byt kompletne dokresleny i v mistech, ktera budou po slozeni prekryta sousednim dilem.

## Pred generovanim

1. Precti aktualni `game-plan/POZADAVKY-ANIMACE.md`; tento soubor ma prednost pred zdejsim shrnutim.
2. Najdi a vizualne prohledni nejaktualnejsi zdrojovou sekvenci pozadovane postavy. Ta urcuje identitu, proporce, kostym, barvy, vybaveni a vytvarny styl.
3. Pro strukturu atlasu prohledni `game-plan/graphics/bitmapove-predlohy/bezec-zombie-v1/README.md`, `source/prompt.txt` a `source/parts-atlas.png`. Bezec je pouze sablona deleni a rozlozeni, ne vytvarny vzor jine postavy.
4. V zadani pro ImageGen oznac role vstupu: zdroj postavy je reference identity; atlas Bezce je pouze reference rozlozeni a uplnosti dilu.
5. Pri oprave atlasu se vzdy vrat k prvnimu cistemu atlasu jako jedinému editovanemu zakladu. Nevstupuj do retezce opakovanych editaci posledniho vystupu, protoze se hromadi obrazove artefakty. Pozdejsi varianta smi byt pouze presne oznacenou referenci jednoho uz schvaleneho dilu; vsechny potvrzene invarianty zadej znovu v jedinem pruchodu.

## Vychozi atlas

Pouzij ctvercovou mrizku 4 x 4 s jednim izolovanym dilem v bunce:

- Radek 1: hlava s kratkym krkem, trup bez koncetin a hlavy, kratka panev, samostatny charakterovy doplnek.
- Radek 2: blizsi nadlokti, blizsi predlokti s rukou, vzdalenejsi nadlokti, vzdalenejsi predlokti s rukou.
- Radek 3: blizsi stehno, blizsi holen, vzdalenejsi stehno, vzdalenejsi holen.
- Radek 4: blizsi bota, vzdalenejsi bota, dve prazdne bunky.

Charakterovy doplnek vyber podle postavy. U Generalissima je to samostatny amplion s pevnym drzatkem pro sevreni rukou, nikoli Bezcova nadrz. Amplion nema zadny reminek, popruh, zaves ani smycku. V samostatne bunce nema byt k drzatku prikreslena lidska ruka; drzatko musi zustat cele a citelne, aby je pri slozeni mohla sevrit oddelena ruka.

Nevkladej do atlasu sestavenou postavu, dalsi rekvizity, popisky, mrizku ani znacky kloubu. Zachovej dostatecne okraje bunek a nedovol presah do sousedni bunky.

## Spoje bez der

- Dily kresli cele a pocitej s prekrytim sousednich casti zhruba o 15 procent. Spojovaci konce maji byt zaoblene a barevne navazovat na mistni material.
- Nikde nekresli sedou nebo cernou dutinu, prazdny otvor, zasuvku, prstenec ani vnitrni stenu. To plati zejmena pro boky trupu v ramenou, limec a krk, pas, kycle, lokty, kolena, kotniky a boty.
- Trup nema mit viditelny bocni pruramkem ani diru po krku. Ramena a krk zakoncuj plnou latkou nebo plnym telovym napojenim, ktere pozdeji prekryje dalsi dil.
- U Generalissima patri obe epaulety pouze na samostatna nadlokti. Trup musi byt bez epolet, ramennich frcek a zlatych trasni; po jejich odstraneni zustanou oba boky ramen plne uzavrene ruzovou latkou bez der.
- U bot zachovej viditelnou kuzi chodidla nebo kotniku v telove barve, pokud ji ma zdrojova postava. Kuze musi otvor zcela vyplnit a zakryt podklad; nesmi pusobit jako pohled do dute boty. Nenahrazuj spravne telove vyplneni jednobarevnym plastovym nastavcem boty.
- Zadna krev, maso ani dojem useknute koncetiny.

## Blizsi a vzdalenejsi koncetiny

- Vytvor skutecne samostatnou blizsi i vzdalenejsi pazi a nohu. Neslucuj celou pazi nebo celou nohu do jedine bitmapy.
- Totoznost blizsi a vzdalenejsi koncetiny se pri pohybu nemeni; vzdalenejsi se ve slozene postave kresli pod blizsi.
- Blizsi a vzdalenejsi strana jsou dve samostatne kresby prave a leve koncetiny. Nejsou totozne kopie ani zrcadla. Maji stejnou zakladni pozu, meritko a smer, ale mirne se lisi siluetou, zahyby, viditelnosti prstu, palce a vnitrnich detailu tak, jak se prirozene lisi prava a leva koncetina.
- U postavy obracene doleva museji vsechny parove dily smerovat doleva: obe ruce a pesti, predni strana obou kolen i spicky obou bot. Vzdalenejsi ruku nebo nohu nikdy neotacej do opacneho smeru jen proto, aby se odlisila od blizsi. Koleno na stehne i na holeni musi byt citelne na leve strane siluety.
- U Generalissima leva sevrena pest ukazuje hrbet ruky, zatimco prava sevrena pest ukazuje dlanovou stranu s polstarkem dlane a palcem pres prsty. Obe pesti zustavaji v teze zakladni poze a smeruji doleva, ale prava neni zrcadlena leva a leva neni zrcadlena prava.
- U Generalissima ma vzdalenejsi prave nadlokti rameno vpravo nahore a loket vlevo dole; osa dilu vede sikmo dolu doleva. Epauleta lezi na vnejsi prave strane tohoto ramene, nikoli na vnitrni leve strane.
- Nadlokti je dil od ramene k lokti. Epauleta patri pouze k rameni na hornim konci; dolni konec je obycejny plny ruzovy loket bez bile manzety, bileho pasu, lemu nebo zapesti.
- Predlokti je dil od anatomickeho lokte po zapesti a ruku. Jeho horni konec je primo loket: zadna dalsi napodobenina ramene, zadna epauleta, zadny druhy ramenny navlek ani ozdobny lem rukavu. Latka rukavu muze byt na lokti plne a zaoblene uzavrena pro prekryti, ale silueta musi citelne zacinat loktem.
- Bila manzeta patri pouze na dolni konec predlokti mezi ruzovy rukav a ruku, tedy k zapesti. Manzetu nikdy nekresli na konec nadlokti u lokte.
- Stehno je pouze dil od kycle po koleno a konci presne kolenem. Nesmí obsahovat ani kratky kus holene, lytka nebo kotniku pod kolenem. Holen je samostatny dil od kolena po kotnik a nesmi obsahovat kus stehna.
- U vzdalenejsi prave nohy Generalissima musi stehno vest od kycle vpravo nahore ke kolenu vlevo dole; koleno i jeho predni vyklenuti jsou na leve strane. Samostatna prava holen vede od kolena vpravo nahore ke kotniku vlevo dole, takze kotnik je vlevo od kolena a cely dil miri doleva, nikoli doprava.
- U Generalissima ruku neodvozuj od amplionu a neprizpusobuj ji jeho drzatku.
- Dlouhe segmenty koncetin drz primarne rovne nebo jen mirne zakrivene. Nekresli do dilu hotovou fazi chuze.

### Schvalena orientacni oprava aktualniho Generalissima

- V aktualni projektove sade se po rozrezani zdrojoveho atlasu vodorovne
  prevraceji pouze `farUpperArm`, `farThigh` a `farShin`, kazdy kolem sve svisle
  osy. `farForearm` ani `farFoot` se timto krokem nemeni.
- Spolu s pixely se musi stejne zrcadlit souradnice `start` a `end` a obnovit
  SHA ve `parts.json`, `skin.json` a `source/import-v1.json`.
- Pouzij lokalni `game-plan/tools/flip_generalissimus_far_parts.py`; rucni flip
  bez aktualizace navazujicich dat neni platna oprava.

## Styl a pozadi

- Zachovej identitu a kresbu zdrojove postavy: silny tmavy obrys, stabilni cerne vnitrni linky a nejvyse 2 az 3 zamerne tony na material, pokud aktualni pozadavky neurci jinak.
- Rid se aktualnim pravidlem pozadi v `POZADAVKY-ANIMACE.md`. Pro pracovni barevny atlas je vychozi jednolite plne nepruhledne `RGB(80,80,80)` / `#505050`; v promptu nezminuj pruhlednost, alfu ani sachovnici, pokud uzivatel vyslovne nechce jiny vystup.
- Pokud ImageGen navzdory promptu vrati skutecnou alfu, zachovej ji pri pozdejsim importu a obraz neprevzorkovavej.

## Kontrola a schvaleni

Pred ukazanim vysledku zkontroluj:

- presny pocet, poradi a oddeleni dilu;
- vernost hlavy, trupu, kostymu, barev a charakteroveho doplnku;
- zadne diry v ramenou, krku, spoji trupu, koncetinach ani botach;
- telove vyplneni bot bez viditelne dutiny;
- u parovych rukou a nohou stejny smer doleva, ale dve samostatne prirozene odlisne kresby leve a prave strany;
- obe pesti, obe kolena a obe spicky bot smeruji doleva; zadny vzdaleny dil nesmeruje doprava;
- leva pest ukazuje hrbet a prava pest dlanovou stranu; obe jsou sevrene a miri doleva;
- obe nadlokti konci u lokte plnou ruzovou latkou bez bile manzety; bile manzety zustavaji pouze na predloktich u zapesti;
- obe predlokti zacinaji loktem bez ramennich prvku a obe stehna konci presne kolenem bez kusu lytka;
- trup Generalissima je bez obou epolet a zlatych trasni; epaulety jsou pouze na nadloktich;
- vzdalene prave nadlokti ma rameno vpravo nahore a loket vlevo dole; vzdalene prave stehno ma kycel vpravo nahore a koleno vlevo dole; vzdalena prava holen ma koleno vpravo nahore a kotnik vlevo dole;
- u Generalissima amplion bez reminku a s celym pevnym drzatkem; tvar rukou se podle amplionu nemeni;
- rozliseni blizsich a vzdalenych dilu a dostatecne okraje.

Je-li chyba lokalni, proved jednu cilenou editaci a znovu zkontroluj kriticke invarianty. Uzivateli ukaz vedle sebe aktualni referencni postavu a novy atlas dilu. Dokud uzivatel vystup vyslovne neschvali, neukladej jej do projektove sady, neupravuj `skin.json`, manifesty, varianty ani data preview aplikace.
