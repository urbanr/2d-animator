# Prdel světa — design dokument

*Verze 0.7, 12. 9. 2026. MVP zrušeno — cílem je celá hra. Přidán zvukový design. Balanc v samostatném sešitu `prdel_sveta_balanc.xlsx`.*

## 1. Přehled

**Jednou větou:** Postav z klacků, plechu a zoufalství pevnost na konci světa, osaď ji zbraněmi a bráníš ji proti nekonečným vlnám idiotů, zatímco ti ji rozebírají pod rukama.

| | |
|---|---|
| Platforma | iOS 17+, iPhone na šířku (iPad později) |
| Technologie | Swift, SpriteKit (fyzika pevnosti + rendering), SwiftUI (menu, obchod) |
| Grafika | 2D boční pohled, vektor/geometrie, spousta malých postaviček |
| Režim | Offline, jeden hráč, jedna nekonečná obrana s vlnami |
| Tón | Postapo, drze přehnané, sprosté, rating 17+ |
| Monetizace | Zdarma |

**Pilíře**
1. Pevnost je fyzická — staví se, nese váhu, praská a padá. Zbytek světa je lehký a rychlý.
2. Stavíš pod palbou — stavba, opravy a pasti jedou naživo (jen zpomalení času, když držíš díl v ruce). Jediná pauza je obchod: ikona krámu zastaví hru, tam se v klidu utrácí za zbraně a upgrady.
3. Všechno škáluje — zbraně mají levely, nepřátelé sílí, ekonomika tě nutí volit.
4. Všechno je přehnané — každá hláška, jednotka i smrt je vtip.

## 2. Herní smyčka

```
START: postav základní pevnost (60 s zpomaleného času, startovní rozpočet)
   │
   ▼
 VLNA n (nepřetržitě) ──► nepřátelé jdou zprava, útočí na zeď, bránu, zbraně
   │        ▲
   │        │  během vlny: sbíráš prachy a šrot, stavíš, opravuješ, kupuješ,
   │        │  vysíláš protiútok, mezi vlnami 8 s "nádech"
   ▼        │
 VLNA n+1 ──┘   každá 5. minibos, každá 10. boss
   │
   ▼
 KONEC: jádro zničeno → statistika, hláška, znovu (s meta-odemčením)
```

**Čas:** normálně 1×. Když hráč drží díl nebo zbraň (táhne prstem), čas běží 0,25× — pocit "stavím, zatímco mi to hoří pod rukama". Tlačítko 2× pro nudné fáze.

**Obchod = jediná pauza.** Ikona krámu v rohu zastaví hru úplně. V obchodě hráč kupuje zbraně, levely zbraní, upgrady brány, protiútokové jednotky a odemyká vyšší stupně dílů. Po zavření hra běží dál a nakoupené věci se umisťují naživo. Naopak samotné stavění dílů, izolepa, hroudy hlíny a vysílání protiútoku nikdy hru nezastaví.

Aby pauza nebyla zneužitelná jako "oddech zadarmo": otevření obchodu během vlny má 2 s animaci (chlap za pultem se probouzí), takže se nedá otevírat a zavírat každou sekundu. Mezi vlnami (8 s nádech) je okamžité.

**Délka jednoho běhu:** cíl 15–40 minut. Hra je "kolik vln vydržíš" + meta-odemykání mezi běhy.

**Žádný tutoriál.** Stará škola: první tři vlny jsou mírné, obchod má u každé věci jednu větu, zbytek se hráč naučí umíráním. Hláška při první prohře: "Tak co, už víš, jak se to hraje?"

## 3. Pevnost

### 3.1 Stavba
- Stavební zóna vlevo (cca 40 % obrazovky), nepřátelé přicházejí zprava.
- Díly se táhnou z lišty, přichytávají k mřížce (16 pt) a k jiným dílům. Spoje se vytvářejí automaticky při dotyku konců (kloub) nebo překrytí (pevný spoj).
- Každý díl má hmotnost, HP a cenu. Konstrukce nese pláty, pláty chrání konstrukci, hnízda nesou zbraně.
- Undo posledních 10 kroků (jen během stavby daného dílu, ne po zásahu).

### 3.2 Konstrukce (nosné prvky)
| Stupeň | Materiál | HP | Hmotnost | Cena | Poznámka |
|---|---|---|---|---|---|
| 1 | Klacky | 40 | 1 | 5 | hoří |
| 2 | Trámy | 120 | 3 | 20 | hoří pomalu |
| 3 | Železo | 350 | 8 | 80 | vodí elektřinu |
| 4 | Grafit | 900 | 4 | 300 | lehké, nehoří, vzácné |

Konstrukce definuje, kolik hmotnosti unese spoj. Ocel na klaccích spadne — fyzika to udělá sama, hráč se to naučí za dvě vlny.

### 3.3 Pláty (ochrana)
| Stupeň | Materiál | HP | Hmotnost | Cena |
|---|---|---|---|---|
| 1 | Papír / karton | 30 | 0,5 | 3 |
| 2 | Dřevo | 100 | 2 | 15 |
| 3 | Plech | 250 | 4 | 50 |
| 4 | Ocel | 600 | 9 | 180 |
| 5 | Kolejnice | 1400 | 16 | 500 |

### 3.4 Speciální pláty
| Plát | Efekt | Cena |
|---|---|---|
| Horký | nepřítel při dotyku hoří (DoT 5/s po 4 s) | 60 |
| Ostnatý | útočník dostává 30 % svého dmg zpět | 45 |
| Kluzký | Lezci padají, pád = dmg podle výšky | 40 |
| Lepkavý | zpomalení 50 % na 3 s | 35 |
| Elektrický | řetězový výboj na 3 nepřátele, potřebuje autobaterii (spotřebovává prachy/s) | 120 |
| Gumový | odráží projektily nepřátel zpět | 90 |
| Zrcadlový | odráží laser bosse | 150 |

### 3.5 Hnízda zbraní
- Hnízdo je díl s hmotností 2 + hmotnost zbraně. Umisťuje se na konstrukci nebo plát.
- Zbraň má **zpětný ráz** — každý výstřel dá impulz do hnízda. Raketomet na klacících pevnost rozklepe. Hráč musí podepřít.
- Výška hnízda: obloukové zbraně nahoře mají +dostřel, přímé zbraně dole vidí na nepřátele u paty zdi.
- Hnízdo má vlastní HP; když padne, zbraň letí (fyzicky) dolů a zničí se — nebo přistane na nepříteli.

### 3.6 Brána
Samostatný díl u paty pevnosti, cíl většiny nepřátel. Upgrady: závora (+HP) → kování (+HP, odolnost proti Boxerům) → mříž (Lezci neprolezou) → padací vrata (jednorázově rozmáčkne, co je pod nimi) → dveře z ledničky ("ZAVÍREJ, JDE CHLAD").

### 3.7 Jádro
- Uprostřed pevnosti, HP 1000, nelze přesouvat. Když padne, konec běhu.
- Kosmetika (odemykatelná): generátor z pračky, poslední pivo v kraji, děda v křesle s ovladačem, socha bývalého starosty.

### 3.8 Opravy a upgrady za běhu
- **Izolepa** (šrot): tap na poškozený díl, +40 % HP, ale max HP dílu klesne o 10 % (opravovat donekonečna nejde).
- **Výměna na místě** (prachy): díl se nahradí vyšším stupněm bez bourání, spoje zůstanou. Trvá 3 s, během nich díl nechrání.
- **Padající díly zraňují:** utržený plát rozmáčkne nepřátele pod sebou. Dmg = hmotnost × rychlost × 3.

### 3.9 Pasti před zdí
| Past | Efekt | Cena |
|---|---|---|
| Hrouda hlíny (hoď prstem) | zpomalení 40 % v okruhu, 6 s | 8 |
| Příkop s olejem | zpomalení; + zápalka = ohnivá stěna 10 s | 30 + 10 |
| Past na medvědy | zastaví jednoho, 4 s, 25 dmg | 20 |
| Sud na rampě | skutálí se (fyzika), sráží řadu | 40 |
| Vlčí jáma | pohltí 3 nepřátele, pak se zaplní | 60 |

### 3.10 Protiútok ("vzácné jednotky")
Jednorázové, drahé, cooldown 60–120 s, vybíhají z brány.
| Jednotka | Efekt |
|---|---|
| Bába s koštětem | omráčí kužel před bránou na 3 s, nadává |
| Kozel | naráží, odhazuje nepřátele o 60 pt dozadu |
| Pes | drží jednoho nepřítele na místě, dokud jeden z nich nezemře |
| Chlap na sekačce | jede doprava 5 s, seká vše v řadě, pak dojde benzín |
| Tlouštík | stoupne si před bránu, tankuje 400 HP, pak jde domů |

## 4. Zbraně hráče

Kategorie: **P** přímá, **O** obloukem, **L** létající, **S** podpora. Dmg za výstřel / rychlost palby (za s) / dostřel v pt.

| Zbraň | Typ | Dmg | Palba | Dostřel | Splash | Cena | Zpětný ráz |
|---|---|---|---|---|---|---|---|
| Kamenář (chlap s prakem) | P | 8 | 1,5 | 250 | – | 30 | 0 |
| Luk | O | 12 | 1,2 | 400 | – | 50 | 0 |
| Kuš | P | 30 | 0,5 | 350 | – | 90 | 1 |
| Dědova vzduchovka | P | 60 | 0,3 | 600 | – | 150 | 1 |
| Kulomet z traktoru | P | 6 | 8 | 300 | – | 250 | 3 |
| Plamenomet | P kužel | 4/s DoT | plynulá | 120 | kužel 40° | 200 | 1 |
| Harpuna | P | 20 + přitáhne + odhodí | 0,3 | 300 | – | 180 | 4 |
| Laser z DVD | P průraz | 90 | 0,15 | 500 | řada | 400 | 0 |
| Minomet | O | 40 | 0,5 | 500 | r 50 | 220 | 3 |
| Katapult (hází ledničky) | O fyzický | 120 + rozmáčknutí | 0,2 | 550 | r 40 | 350 | 6 |
| Babka s hrncem | O | 25 | 0,7 | 150 | r 35 | 80 | 0 |
| Ohňostroj | O náhodný | 15 | 3 | 100–450 | r 25 | 60 | 0 |
| Raketomet | P / naváděné | 80 | 0,4 | 500 | r 60 | 450 | 8 |
| Trebuchet na kravky | O | 400 | 0,08 | 700 | r 80 | 900 | 12 |
| Holub s granáty | L | 20 | 1 | letí 3 s | r 30 | 120 | – |
| Rogalo | L | 60 | 0,5 | letí 5 s | r 45 | 300 | – |
| Balón se sudy | L | 150 | 0,2 | letí 8 s | r 70 | 500 | – |
| Kutil | S | opravuje 10 HP/s | – | dosah 100 | – | 150 | – |
| Křikloun s megafonem | S | omráčí kužel 2 s | 0,2 | 200 | kužel | 110 | 0 |
| Magnet | S | přitáhne kovové nepřátele k plátu | plynulý | 250 | – | 200 | 0 |

### 4.1 Další zbraně (brainstorm, odsouhlaseno)
| Zbraň | Typ | Efekt | Poznámka |
|---|---|---|---|
| Hasičská stříkačka na hnůj | P proud | odhazuje (i bossy), lepí; zapálený hnůj = oheň + lepení | kombo s plamenometem |
| Vrhač včelích úlů | O | úl praskne, roj 5 s honí nejbližšího, ignoruje štíty | proti Štítonošům |
| Prak na kočky | O | kočka 3 s škrábe cíl, pak uteče k tvé bráně a blokuje ji, dokud ji nepustíš | vtip s cenou |
| Kanón na kapustu | O | kapusta se rozletí na 6 kusů, malý splash každý | levné proti Rojnici |
| Zvonice | S | úder omráčí vše v okruhu na 1 s včetně tvých jednotek | tvrdý reset, cooldown 45 s |
| Střílna s dědou a slivovicí | P | dmg roste +5 % za každou přežitou vlnu ("děda se rozjel") | ztráta dědy = ztráta bonusu |
| Vyhazovač | S u brány | každé 4 s chytne nepřítele u brány a hodí ho zpět do davu (fyzicky sráží ostatní) | brána jako zbraň |
| Ventilátor z kombajnu | S | vítr doprava: nepřátelé −30 % rychlost, plamenomet +dosah, holubi rychlejší, Rogalo odfoukne | mění pravidla vzduchu |
| Lepidlový minomet | O | nezraňuje, přilepí skupinu k zemi na 4 s | kombo s jakýmkoli splash |
| Zrcadlový periskop | P | střílí "za roh", trefí nepřátele za Štítonošem | jediná přímá zbraň proti štítu |
| Kříž z autobaterií | pasivní | každých 10 s výboj na nejbližší kovový cíl; nasazuje se na plát, ne do hnízda | neblokuje slot |
| Dělo na Špekouna | O | vystřelí zajatého Špekouna (drop po zabití ohněm), výbuch tuku + hoření | munice z nepřítele |
| Rotační kulomet na šipky | P | 12 šipek/s, dmg 3, dostřel 280, roztáčí se 1,5 s; každá zabodnutá šipka −2 % rychlost (max 20) | L2 dvě hlavně, L3 bez dobíjení, L4 háčky (průraz štítu), L5 jed |

### 4.2 Varianty pro levely 4–5 (aby každá zbraň měla tvář)
| Zbraň | L4 | L5 |
|---|---|---|
| Kuš | Tříšípová | Balista (prostřelí 3 v řadě) |
| Plamenomet | Naftový (+dosah) | Napalmový (země hoří 6 s) |
| Luk | Zápalné šípy | Déšť šípů (8 na plochu) |
| Minomet | Kazetový (4 malé výbuchy) | Fosforový (oheň + slepota, 2 s stojí) |
| Kamenář | Chlap s cihlami | Chlap s dlažebními kostkami (sráží bossy) |
| Holub | Holub s náloží (sebevražedný, velký splash) | Hejno holubů (3 naráz) |
| Raketomet | naváděné už od L3 | Salva 3 raket po sinusoidě |
| Harpuna | Dvojitá | Řetězová (přitáhne 3 spojené) |

### 4.3 Levely zbraní (jednotný strom, 5 levelů)
| Level | Efekt | Cena (× základ) |
|---|---|---|
| 2 | +1 projektil na výstřel | 0,8 |
| 3 | +40 % rychlost palby | 1,2 |
| 4 | +50 % splash / průraz +1 | 1,8 |
| 5 | hoření nebo "velký kalibr" (dmg ×2) | 2,5 |

Rakety: L1 rovně, L3 naváděné, L5 salva 3 raket po sinusoidě.
Létající jednotky: level zvyšuje počet shozů za let a odolnost proti Puškařům.

### 4.4 Projektily a trajektorie
- Přímé: přímka, nekonečná rychlost pro kulky (raycast), viditelná stopa. Šípy z kuše a harpuna jsou pomalé projektily.
- Obloukové: balistická křivka, cíl = předpokládaná pozice nepřítele (predikce podle jeho rychlosti). Šípy z luku mají malý rozptyl.
- Fyzické projektily (ledničky, sudy, kravky): mají tělo, zůstávají na zemi 3 s jako překážka, drtí.
- Naváděné rakety: sledují cíl s omezenou zatáčkou, mohou minout a trefit vlastní zeď.

## 5. Nepřátelé

Bez fyzických těl — pohyb po zemi zprava doleva, lehký update. Jen bossové mají fyzická těla.

| Nepřítel | HP | Dmg/s | Rychlost | Cíl | Trik | Odměna |
|---|---|---|---|---|---|---|
| Loudač | 30 | 4 | 40 | zeď | drápe, nadává | 5 |
| Běžec | 15 | 3 | 110 | brána | proběhne past | 4 |
| Boxer | 80 | 15 | 45 | brána | 2× dmg proti bráně | 12 |
| Štítonoš | 60 (+dveře 100) | 5 | 35 | zeď | blokuje přímou palbu zepředu | 15 |
| Lezec | 40 | 8 | 50 / šplh 30 | hnízda zbraní | šplhá po zdi, nesnáší kluzké pláty | 14 |
| Házeč | 45 | 12/hod | 40 | horní patra | hází cihly obloukem, zastaví se v dosahu | 16 |
| Puškař | 35 | 10/výstřel | 35 | zbraně | střílí z 350 pt, přednostně létající | 18 |
| Sebevrah s bombou | 25 | 200 splash r 60 | 90 | zeď | vybuchne při dotyku nebo smrti u zdi | 20 |
| Zloděj | 30 | 0 | 100 | brána | u brány ukradne 15 % prachů a uteče | 30 (když ho chytíš) |
| Vozík | 300 | 40 | 30 | brána | nákupní košík + 3 tlačiči, když zemřou, stojí | 40 |
| Rojnice (30 krys) | 1 každá | 1 každá | 90 | vše | test proti splash zbraním | 1 každá |
| Šaman | 50 | 0 | 40 | – | +30 % rychlost ostatním v okruhu 80 pt | 25 |

**Škálování:** HP × 1,15^(vlna), počet × 1,08^(vlna), nové typy od vlny 3, 6, 9, 12, 15, 18. Od vlny 20 míchané složení s náhodným "tématem" (jen Běžci, jen Lezci…).

**HP bar:** tenká čárka 2 pt pod nohama, jen po zásahu, mizí po 1,5 s. Bossové mají segmentovaný bar nahoře, jednotlivé segmenty jsou fáze.

### 5.1 Další nepřátelé (brainstorm, odsouhlaseno)
| Nepřítel | Trik | Protihra |
|---|---|---|
| Důchodce s holí | pomalý, ignoruje zpomalení ("pomaleji už to nejde") | cokoli s dmg |
| Kopáč | podkopává spodní díl, patro sjede (fyzika) | přímé zbraně dole, past na medvědy |
| Černobylák | čtyřnohý ozářený mutant, rychlý, svítí; pláty v okolí radiační DoT; po smrti zářící louže 8 s zpomaluje tvůj protiútok | zabít daleko od zdi |
| Nosič žebříku | dvojice opře žebřík, lezou po něm i Loudači | zabít nosiče dřív, Vyhazovač |
| Hejno holubů (nepřátelské) | serou na hnízda, zbraň −50 % přesnost, dokud ji Kutil neočistí | vzduchovka, Ventilátor |
| Kněz zkázy | každých 10 s vzkřísí mrtvého jako Zombíka (½ HP) | oblouk přes dav |
| Chlap s traktorovou pneumatikou | pneumatika jako štít i zbraň, po uvolnění se kutálí (fyzická) do zdi | kluzký plát, past |
| Prodavač | u brány nabídne obchod: zaplatíš, vlna odejde; nezaplatíš, otevře pytel krys | ekonomické rozhodnutí |
| Ožrala | cikcak, přímé zbraně míjí, oblouk trefí; při smrti hoří (alkohol) | oblouk, ne u papírové zdi |
| Fotograf | nedělá nic; přežije-li vlnu, další vlna útočí na nejméně chráněný díl | zabít za každou cenu |
| Špekoun | zelený ozářený tlusťoch, hází kusy vlastního špeku, každý hod −10 % HP, nakonec z něj Běžec; špek se lepí a hoří (plamenomet = výbuch, zraní jeho kamarády) | oheň, drop "náboj" pro Dělo |
| Sekta zrcadel | tři nesou zrcadlo, laser se odráží do tvé zdi | cokoli kromě laseru |
| Babka dealerka | u brány "prodá" tvým obráncům něco, zbraně v okolí 6 s střílí náhodně | Vyhazovač, past |
| Chlap v bublině | kutálí se, imunní vůči přímým střelám (klouzají) | oblouk, oheň |
| Sněhulák z popela | hasí horké pláty a ohnivé pasti, kudy projde | přímé zbraně, minibos vlny "zima" |
| Kříženec prasete a motorky | rychlý, naráží do brány, při zásahu ztrácí součástky = šrot pro tebe | kuš, harpuna |
| Zubař | u brány každé 4 s odstraní nejmenší díl v dosahu bez ohledu na HP; těžší než trám nezvedne | stavět těžce dole |
| Chlap s mikrovlnkou | ohřívá kovové pláty, ty pak zraňují tvé jednotky | elektrický plát ho usmaží |
| Kolona důchodců na vozících | 6 za sebou, první tankuje; když padne, vozíky do sebe narazí a 2 s stojí | splash na hromadu |
| Ex | jde jen po jádru, ignoruje vše, prochází mezerami mezi díly | pevnost bez mezer |
| Vlk v přestrojení za Kutila | jde k hnízdu a "opravou" sníží level zbraně; poznáš ho, že jde zprava | pozornost, vzduchovka |

### 5.2 Bossové
Žádné zbraně, obrovská výdrž, každý má jeden trik a fyzické tělo (může tlačit pevnost).

| Boss | HP | Trik | Fáze |
|---|---|---|---|
| Babička s válečkem | 3000 | úder do zdi = impulz, díly odletí | 50 %: začne házet válečkem obloukem |
| Traktor | 6000 | obrněný zepředu, tlačí zeď fyzicky | zbývá 30 %: přehřátý, hoří, rychlejší |
| Kolos z ledniček | 8000 | při zásahu odpadne lednička (fyzická, padá na tvé lidi) | každých 25 %: menší a rychlejší |
| Bývalý starosta | 4000 | mluví, projev omračuje zbraně v dosahu na 2 s | 50 %: vytáhne slib, léčí nepřátele |
| Přerostlý kanec | 10000 | rozběh a náraz, zpětný ráz do celé pevnosti | 40 %: rozzuřený, dvojitý náraz |
| Tchyně | 4000 | jde k bráně a mluví, brána ztrácí HP z beznaděje; jediný boss, kterého zastaví mříž | 50 %: začne mluvit i na zbraně |
| Zeppelin z matrací | 5000 | letí nad pevností, shazuje matrace: tlumí tvé obloukové projektily a zatěžují střechu (fyzika) | trefí jen létající a vzduchovka |
| Dvojčata | 2 × 3000, sdílený bar | dva střední bossové | když jeden zemře, druhý 2× rychlost a jde na jádro |
| Ty z minulého běhu | HP tvé bývalé pevnosti | kopie tvé pevnosti z poslední prohry na kolečkách, tlačená davem | musíš rozbořit vlastní dílo |
| Matka všech krys | 7000 | každých 5 s plodí Rojnici | jen splash; přímé zbraně krmí krysy mrtvolami |
| Řetěz | 20 × Loudač | 20 Loudačů spojených řetězem (fyzika jen na řetězu) | přetržení = dvě vlny jdoucí jinam |
| Soudruh Generalissimus | 5000 | knír, dýmka, růžový oblek, lodičky, medaile po kolena; garda 2 Štítonoši; neútočí | Pětiletka: označí díl, celá vlna jde po něm. Gulag: každých 15 s "zmizí" tvá jednotka, vrátí se za 20 s s ½ HP. Lodičky: na kluzkém plátu, hroudě nebo šrotu padá a 4 s se zvedá – jediná chvíle bez gardy |
| Profesor Relativita | 5000 | rozcuchaný, plášť, papuče; hází obloukem černé díry | Černá díra: 6 s, `SKFieldNode.radialGravityField` r 150: táhne volné díly, projektily (dráhy se ohýbají), sudy; slabě i pevnost (klacky prasknou). Nasytí se po 30 kg hmoty (lednička z katapultu ji zavře, kravka okamžitě). Spolknutou zbraň vyplivne mezi nepřátele. Fáze: 60 % dvě díry naráz s opačnou rotací, 30 % díra před sebou jako štít (přímé střely spolkne, oblouk shora trefí) |

Hlášky bossů: Soudruh mluví jen o zrnu, ocelárnách a o tom, kdo bude příště na řadě ("Historie mě… ále, hovno."). Profesor: "E se rovná mc… kurva, co?"

## 6. Matematika poškození

**Splash:** `dmg = base × max(0, 1 − d/r)²`. Platí na nepřátele i na vlastní díly. Vlastní raketa u vlastní zdi bolí (× 0,5, ať to není frustrující, ale je to cítit).

**Účinnost (násobič dmg):**
| | Papír/dřevo | Plech/ocel | Grafit | Nepřítel | Boss |
|---|---|---|---|---|---|
| Drápání/pěst | 1,0 | 0,3 | 0,5 | – | – |
| Oheň | 2,0 | 0,2 | 0 | 1,0 (DoT) | 0,5 |
| Výbuch | 1,5 | 1,0 | 0,8 | 1,5 | 1,0 |
| Průraz (vzduchovka, laser) | 1,0 | 1,0 | 1,0 | 1,0 | 1,5 |
| Elektřina | 0 | 1,5 (vodí) | 0 | 1,2 | 0,3 |
| Rozmáčknutí (fyzika) | – | – | – | hmotnost × rychlost × 3 | × 0,2 |

**Pád dílu:** dmg na nepřátele pod ním = hmotnost × rychlost × 3. Díl sám dostane dmg = hmotnost × rychlost.

**Rozpočet DPS:** cílová vlna má součet HP; zbraně hráče by měly při dobré stavbě dávat cca 70 % potřebného DPS, zbytek dodělají pasti a pláty. To je ladicí konstanta, ne pravidlo.

## 7. Ekonomika

**Prachy** — z nepřátel (viz odměny), za vlnu bonus 20 + 5 × vlna. Za zbraně, upgrady, díly, protiútok.

**Odměny škálují s vlnou:** odměna × (1,15^(vlna−1))^0,7. Bez toho příjem hráče roste lineárně, zatímco HP vln exponenciálně, a od vlny 12 je hra na papíře neprůchozí (ověřeno v sešitu `prdel_sveta_balanc.xlsx`, list Vlny). S exponentem 0,7 drží poměr koupitelné/potřebné DPS mezi 1,0 a 1,4 a ke konci klesá k 0,93 — ten zbytek má hráč dohnat splash zbraněmi a levely, které model nezná.
**Šrot** — z padlých vlastních dílů (50 % ceny) a z Vozíků/Traktoru. Jen na opravy izolepou.

Startovní rozpočet: 200 prachů. Cílem je, aby hráč ve vlně 1 měl na klacky, papír a jednoho Kamenáře — a musel se rozhodovat.

**Meta mezi běhy** (permanentní): za dosažené vlny "Šrotovné" → odemykání nových zbraní, plátů a kosmetiky jádra. Nikdy nezvyšuje statistiky, jen otevírá možnosti.

## 8. Tón a humor

- Rating 17+ (App Store: časté vulgarismy a hrubý humor). Bez sexuálního obsahu, bez reálných osob, bez cílení na skupiny — sprostě, ne hnusně.
- Každá jednotka má hlášky pro spawn, zásah, smrt (kapitola 17). Obrysový font bez bubliny, max 4 naráz na obrazovce.
- Hlášky nepřátel jsou proti hráči, hlášky obránců proti nepřátelům i proti hráči ("Ty ses na tu zeď vysral, co?").
- Příklady tónu: Loudač při smrti: "Do prdele, zase." Boxer u brány: "Otevři, ty svině, jdu jen pro cukr." Babka s hrncem: "Polívka! Kdo nechce, dostane dvakrát." Bába s koštětem: cenzurovaný proud nadávek, ve kterém není jediné slušné slovo. Starosta: "Slibuju vám… (2 s ticha)… něco."
- Smrt = groteska: Sebevrah vybuchne na konfety, Kolos se rozpadne na fungující ledničky, Traktor odjede sám na šrotiště.
- Konec hry: jedna věta statistiky + jedna urážka hráče podle příčiny prohry.

## 9. Technické řešení

**Dvě vrstvy simulace v jedné scéně:**
1. **Fyzika pevnosti** — `SKPhysicsBody` + `SKPhysicsJoint`, jen díly, hnízda, brána, bossové, fyzické projektily. Cíl: max ~150 těl. Bossů naráz max 4 (Dvojčata, rozpad Chuchvalce), viz Rizika.
2. **Lehcí nepřátelé** — vlastní pole struktur (pozice, HP, stav, cíl), update vlastním loopem, žádné fyzické tělo. Kolize projektil ↔ nepřítel = test kruh/bod, kolize nepřítel ↔ zeď = průnik s obdélníkem nejbližšího dílu. Cíl: 300 nepřátel při 60 fps.
3. **Padající díly** — každý frame se u těl s rychlostí > 100 pt/s testuje překryv s nepřáteli pod ním.

Rendering nepřátel: `SKSpriteNode` s jednoduchými tvary, sdílené textury, žádné individuální fyzické tělo. Krysy = jeden "hejnový" node s vlastními offsety.

**Datové soubory:** zbraně, díly, nepřátelé a vlny v JSON, aby se ladilo bez rebuildu.

## 10. Rozsah

Žádné MVP. Cílem je celá hra tak, jak je v tomto dokumentu: všechny díly, zbraně, nepřátelé, bossové, mapy, počasí, meta, bestiář, statistiky, Chuchvalec. Obsah je datový (JSON), takže se přidává průběžně, ale hra se nevydává, dokud není kompletní.

Jediné, co se dělá v pořadí, je **hratelnost před obsahem**: nejdřív musí bavit stavět pod palbou s jedním materiálem a jednou zbraní, teprve pak se přidává zbytek.

## 11. Plán vývoje

Upřímný odhad celé hry: **~250 hodin** čistého vývoje (bez grafiky bossů a ladění hlášek, které jdou dělat bokem). Při 2 h týdně je to 2,5 roku, při 5 h týdně necelý rok. Fáze místo týdnů; hodiny jsou odhad.

| Fáze | Obsah | Hodin |
|---|---|---|
| 1 | Fyzický prototyp: díly, spoje, lámání, pád dílu, jádro (hotovo v `PrdelSveta/`) | 6 |
| 2 | Lehcí nepřátelé: pohyb, HP, útok na zeď, 300 ks při 60 fps | 8 |
| 3 | Stavba za běhu: lišta, tažení, zpomalení, přichytávání, undo, kolečko akcí | 12 |
| 4 | Zbraně: hnízdo, zpětný ráz, přímé + obloukové + fyzické projektily, 6 zbraní | 12 |
| — | **Test "baví to?"** — hrát 2 hodiny jen s tímhle. Když ne, přehodnotit. | — |
| 5 | Splash, účinnostní matice, pasti, padající díly zraňují, splash na vlastní díly | 8 |
| 6 | Vlny, škálování, náhled vlny, 12 základních nepřátel, HP bary | 12 |
| 7 | Ekonomika, obchod s pauzou, levely zbraní 1–5, izolepa, výměna na místě | 14 |
| 8 | Bossové s fyzickými těly: 5 základních | 15 |
| 9 | Zbývajících ~25 zbraní a speciálních plátů (datově + specifické mechaniky) | 25 |
| 10 | Zbývajících ~20 nepřátel a 8 bossů | 25 |
| 11 | Mapy: 14 terénů, vlastní mechaniky, kotvy, noční styl | 30 |
| 12 | Počasí 6 typů, tři vrstvy pozadí, parallax, den | 12 |
| 13 | Protiútok, brána s upgrady, jádra map | 8 |
| 14 | Chuchvalec: srostlina, střídání triků, drát, rozpad, nekonečno | 12 |
| 15 | Hlášky (~300), nářečí, obrysový font, systémové texty, titulky | 10 |
| 16 | Zvuk: ~120 zvuků, mixování, haptika | 10 |
| 17 | Ukládání: 5 pozic + autosave, serializace fyziky, načítání | 10 |
| 18 | Meta: Šrotovné, dílna, bestiář, statistiky | 14 |
| 19 | Balanc podle sešitu, headless simulátor vln, ladění 30 vln × 14 map | 20 |
| 20 | Polish, ikona, App Store (17+), TestFlight s kamarády | 10 |
| | **Celkem** | **~270** |

## 12. Mapy

Kamera je fixní, jedna obrazovka. Každá mapa mění tři věci: **terén** (jak se staví), **cestu nepřátel** (kudy a jak jdou) a **jednu vlastní mechaniku**. Každá má vlastní jádro s vlastní hláškou, HP je vždy stejné (1000).

### 12.1 Rovina u dálnice — základní
- **Terén:** rovná betonová plocha, vlevo betonová svodidla jako pevná kotva zadarmo (díly se k nim přichytí bez spoje do země).
- **Cesta:** rovně zprava po dálnici.
- **Mechanika:** žádná — mapa pro tutoriál a učení fyziky.
- **Jádro:** poslední fungující automat na kafe.
- **Odemčení:** od začátku.

### 12.2 Svah
- **Terén:** rovina zleva přechází ve svah (cca 20°) doprava. Pevnost stojí částečně nakloněná — díly na svahu kloužou, spoje dostávají boční tah. Vodorovný základ si hráč musí postavit z trámů.
- **Cesta:** nepřátelé jdou do kopce, −20 % rychlost, o to víc jich je.
- **Mechanika:** obloukové zbraně nahoře dostřelí o 25 % dál. Sud na rampě tu má dvojnásobný dojezd a sráží celou řadu. Kopáč podkopává zespodu a svah pak sjede celý.
- **Jádro:** koza, která nechce dolů.
- **Odemčení:** vlna 10 na Rovině.

### 12.3 Most přes propast
- **Terén:** úzká plošina mostu, na výšku jen 2 patra (nad tím drátovody). Po obou stranách propast.
- **Cesta:** po mostě zprava, v jedné řadě, žádné obcházení.
- **Mechanika:** cokoli shozené z mostu je pryč — nepřátelé, tvé díly i šrot (nulový šrot z padlých dílů). Harpuna a Vyhazovač házejí do propasti = okamžitá smrt bez ohledu na HP. Kopáč tu je nejnebezpečnější nepřítel: podkopaný pilíř = celé patro do propasti.
- **Jádro:** dopravní značka "Konec obce", kterou nikdo neposlouchá.
- **Odemčení:** vlna 15 na Svahu.

### 12.4 Skládka
- **Terén:** hromada odpadků jako fyzický terén — sestavená z desítek malých těl (pneumatiky, plechovky, pračky). Pod tíhou pevnosti se sesouvá; stavba na Skládce je stavba na písku.
- **Cesta:** přes hromadu, nerovně, nepřátelé se zpožďují a shlukují.
- **Mechanika:** šrot zadarmo — Kopáč na tvé straně (koupitelná jednotka) vykopává 5 šrotu za vlnu. Speciální díl "Pračka" (těžký blok zadarmo, 1× za vlnu). Vozíky a Traktor tu jsou pomalejší (kola v odpadcích).
- **Jádro:** hromada, ve které někdo bydlí.
- **Odemčení:** vlna 12 na Rovině.

### 12.5 Střecha paneláku
- **Terén:** rovná střecha s komínem a anténou (pevné kotvy), po stranách sráz.
- **Cesta:** nepřátelé lezou po fasádě zprava — všichni se chovají jako Lezci, dorazí na úroveň střechy a útočí odshora i zespodu okraje.
- **Mechanika:** létající nepřátelé (Hejno holubů, Zeppelin) 2× častěji. Kluzký plát na okraji střechy shazuje Lezce do 12. patra. Vítr tu fouká vždy.
- **Jádro:** satelit, který chytá jediný kanál — teleshopping.
- **Odemčení:** vlna 20 na Sídlišti.

### 12.6 Zamrzlý rybník
- **Terén:** celá zem je led = kluzký plát s třením 0,05. Díly položené na zem kloužou, dokud nejsou ukotvené spojem. Kotvit lze jen do "děr" v ledu (4 body).
- **Cesta:** po ledu, všichni nepřátelé kloužou, Běžci sami padají.
- **Mechanika:** oheň taje led: ohnivá stěna nebo napalm vytvoří díru, do které se nepřátelé propadají (i tvé jednotky). Po 10 s zamrzne. Tvůj protiútok klouže stejně. Sněhulák z popela je tu minibos každé 5. vlny.
- **Jádro:** rybář, který nevěří, že je apokalypsa.
- **Odemčení:** meta za 300 Šrotovného.

### 12.7 Vrakoviště aut
- **Terén:** rovina posetá vraky aut — představěné pevné díly (HP 400, hmotnost 15), které hráč může zapojit do stavby jako základ.
- **Cesta:** mezi vraky, nepřátelé se kryjí (Štítonoš za autem je nezasažitelný přímo).
- **Mechanika:** vrak, který hoří, po 3 s vybuchne (splash 80, r 90) — zraní obě strany. Kříženec prasete a motorky tu drop dvojnásobek šrotu. Katapult může házet vraky (pokud je hráč uvolní nálož).
- **Jádro:** Trabant, který ještě nastartuje.
- **Odemčení:** vlna 15 na Skládce.

### 12.8 Tunel metra
- **Terén:** nízký strop = jen 2 patra, koleje jako vodorovná pevná kotva po celé délce.
- **Cesta:** po kolejích v jedné řadě, žádné obcházení, žádní létající (ani tvoji).
- **Mechanika:** průraz a laser tu jsou 2× účinnější (řada). Každých 90 s projede souprava metra zprava doleva — rozmáčkne vše na kolejích na obou stranách, ohlášeno 5 s předem hukotem. Stavět mimo koleje = na nástupiště.
- **Jádro:** eskalátor, co jede jen nahoru.
- **Odemčení:** vlna 18 na Rovině. Noční mapa.

### 12.9 Přehrada
- **Terén:** hráz jako pevný terén s vlastními HP 3000, voda vlevo za tebou.
- **Cesta:** po koruně hráze zprava.
- **Mechanika:** hráz dostává poškození ze všech výbuchů (tvých i jejich). Při 0 HP se protrhne: voda smete všechny nepřátele na mapě, ale i tvou pevnost (zůstane jádro s 50 % HP). Jednou za běh, pak je mapa "vypuštěná" — bahno, všichni pomalejší. Hasičská stříkačka tu má nekonečnou munici.
- **Jádro:** poslední pivo v kraji.
- **Odemčení:** vlna 20 na Mostě.

### 12.10 Kolotoč z pouti
- **Terén:** kruhová plošina, která se pomalu otáčí (1 otáčka za 60 s), fyzicky. Pevnost se staví do kruhu kolem středu, díly cítí odstředivou sílu.
- **Cesta:** nepřátelé nastupují z obou stran střídavě podle natočení.
- **Mechanika:** zbraně na okraji se otáčejí s kolotočem — směr palby se mění, chvíli míří pryč. Vysoká rychlost otáčení (boss "Pouťák" pustí plyn) = díly odletí. Vzducholoď tu nemůže přistát.
- **Jádro:** střed kolotoče — motor s páskou "Nezastavovat!".
- **Odemčení:** meta za 600 Šrotovného.

### 12.11 Tělocvična
- **Terén:** uvnitř, rovná podlaha, žebřiny na stěnách jako kotvy, strop.
- **Cesta:** dveřmi zprava.
- **Mechanika:** volné fyzické objekty na ploše: medicinbaly, žíněnky, kozy na přeskok. Nepřátelé po žíněnkách kloužou, medicinbaly lze katapultem házet (hmotnost 10). Žíněnka pod padajícím dílem tlumí — dmg z pádu 0. Vyhazovač tu hází do koše: trefa = bonus 20 prachů.
- **Jádro:** tělocvikář s píšťalkou.
- **Odemčení:** vlna 10 na Sídlišti.

### 12.12 Hřbitov
- **Terén:** nerovný, náhrobky jako malé pevné kotvy, hrobka vlevo jako hotový blok.
- **Cesta:** mezi hroby zprava, nepřátelé se kryjí za náhrobky.
- **Mechanika:** každý nepřítel, který zemře a neshoří, se po 20 s zvedne jako Zombík (½ HP, pomalý). Oheň je tu strategie, ne volba. Kněz zkázy tu křísí 2× rychleji. Vlčí jáma je tu hrob = pohltí 5.
- **Jádro:** děda, který ještě neumřel a nehodlá.
- **Odemčení:** vlna 15 na Rovině. Noční mapa.

### 12.13 Benzinka
- **Terén:** rovina, 4 pumpy a cisterna jako představěné objekty s HP 50.
- **Cesta:** zprava kolem pump.
- **Mechanika:** pumpa po zničení vybuchne (splash 150, r 120) a zapálí sousední — řetězová reakce přes celou mapu. Nepřátelé i hráč to vědí: Sebevrah cílí pumpy, hráč může pumpu odpálit sám včas. Zapálená cisterna = konec mapy pro obě strany kromě jádra. Ožrala tu chodí rovně (je střízlivý ze strachu).
- **Jádro:** kasa, kde ještě mají cigarety.
- **Odemčení:** vlna 12 na Vrakovišti.

### 12.14 Sídliště
- **Terén:** ulice mezi šedými paneláky, pevnost ve vchodu s nefunkčním výtahem. Fasády jako svislé kotvy. 3 balkony nad ulicí jako hnízda zadarmo (unesou max kuš, jinak balkon fyzicky spadne).
- **Cesta:** ulicí zprava, nelze obcházet; Lezci šplhají po fasádách a skáčou z balkonů.
- **Mechanika:** sousedi — náhodně z okna vyletí květináč nebo sud kvašáků, padá na kohokoli. Kanál uprostřed: otevřený poklop = past (pohltí 3); nálož do kanálu = vyleze Matka všech krys. Domácí půda Soudruha Generalissima: přichází ve vlně 8 s gardou 4 Štítonošů. Hláška z oken "Ztište to, pracující lidi spí!" — hluk nad limit = další vlna +10 % rychlost (domovní důvěrník).
- **Jádro:** rozhlas po drátě, který vysílá hymnu. Když padne, hymna dohraje.
- **Odemčení:** vlna 8 na Rovině.

## 13. Počasí

Náhodné, ohlášené 15 s předem ikonou a hláškou ("Bude pršet, ty debile, schovej papír"). Trvá 2–4 vlny. Každá mapa má vlastní pravděpodobnosti (na Rybníku zima 40 %, na Benzince vedro 40 %).

| Počasí | Efekt na obranu | Efekt na nepřátele | Vizuál (vrstvy) |
|---|---|---|---|
| Déšť | hasí oheň, horké pláty nefungují, elektřina 2× dosah (mokří), papír −30 % HP | −10 % rychlost, Špekoun klouže | kapky v hlavní vrstvě, šedé nebe vzadu, mokrý lesk plátů |
| Zima | papír křehne −50 % HP, lepkavý plát zamrzá (nefunguje), plamenomet +20 % dmg | −25 % rychlost všem, Sněhulák z popela častěji | sníh ve všech 3 vrstvách, pára z komínů, bílé hory |
| Mlha | dostřel −40 %, oblouk bez predikce cíle | Puškaři dostřel −40 %, Fotograf nevidí | mlha mezi střední a hlavní vrstvou, daleká vrstva skoro pryč |
| Vítr | ohýbá oblouk a létající jednotky, Ventilátor ruší nebo zdvojuje, oheň se šíří po směru | létající nepřátelé sfouknuti, Chlap v bublině zrychlí | mraky rychle, listí a odpadky letí přes hlavní vrstvu |
| Radioaktivní spad | kovové pláty rezaví (DoT 1/s), grafit imunní | Černobyláci +50 % HP a častěji | zelené nebe, zelený déšť, svítící nepřátelé |
| Vedro | dřevo a papír se samy vznítí od horkých plátů a plamenometu, Kutil pomalejší | Sněhulák neexistuje, Ožrala rychlejší (spěchá do stínu) | tetelení vzduchu ve střední vrstvě, oranžové nebe |

Kombinace: Zima + Déšť = ledovka (vše kluzké); Mlha + Vítr = nejtěžší. Max 2 naráz.

**Noc není počasí, ale styl mapy.** Nestřídá se. Mapa je buď denní, nebo noční natrvalo: Hřbitov a Tunel metra jsou noční, ostatní denní (Sídliště má noční variantu jako meta-odemčení). Noční pravidla: vidíš jen na dosah ohňů a horkých plátů (kruhy světla), Puškaři neviditelní do prvního výstřelu, nepřátelé mají svítící oči, Černobylák svítí celý a osvětluje své okolí. Vizuál: tmavé vrstvy, hvězdy a měsíc vzadu, světla oken ve střední vrstvě.

## 14. Pozadí a vrstvy

Kamera je fixní, ale scéna má tři hloubkové vrstvy, aby svět nebyl placka a aby počasí, čas a mapa měly kde žít.

| Vrstva | Obsah | Pohyb | Účel |
|---|---|---|---|
| **1. Hlavní** (popředí) | terén, pevnost, nepřátelé, projektily, pasti, počasí u země | žádný (herní vrstva) | hra samotná |
| **2. Střední** | blízké kulisy mapy: paneláky, vraky, stromy, sloupy, ploty, okna se světly, cedule s hláškami | parallax 0,3× při otřesu kamery a při zoomu, pomalé vlastní animace (blikající neon, houpající se cedule) | identita mapy, humor v pozadí |
| **3. Daleká** | nebe, hory, siluety měst, slunce/měsíc, mraky, kouř z dálky | parallax 0,1×, mraky plují, den/noc cyklus, počasí (déšť, sníh, zelené nebe) | atmosféra, čitelnost počasí a času |

Pravidla:
- Vrstva 1 je jediná s fyzikou a jediná, kde se hráč dotýká. Vrstvy 2 a 3 nikdy nepřekrývají nic herního; kontrast je daný barvou: hra je sytá, střední vrstva ztlumená, daleká skoro monochromatická.
- Kamera dělá jen otřes při výbuchu bosse a mírný zoom (0,9×) při zpomalení stavby — i to stačí, aby parallax byl cítit.
- Den/noc se nestřídá. Denní mapy mají v daleké vrstvě pomalý posun slunce podle vlny (ráno → večer za 30 vln), noční mapy měsíc a hvězdy natrvalo.
- Humor v pozadí: reklamní tabule mění text podle toho, jak se ti daří ("Pojistěte si dům. Pozdě."), okna ve střední vrstvě reagují na výbuchy (rozsvítí se, někdo zatáhne záclonu).
- Technicky: tři `SKNode` kontejnery s `zPosition` −200, −100, 0; parallax = posun kontejnerů podle offsetu kamery × koeficient. Pozadí jako pár velkých `SKSpriteNode` s jednoduchou vektorovou grafikou, ne stovky nodů.

## 15. Ovládání stavby na telefonu

Nejrizikovější část hry — stavíš pod palbou jedním prstem na 6 palcích.

**Rozvržení obrazovky (na šířku)**
- Dole **lišta dílů**: 8 slotů, horizontálně posuvná. Kategorie přepínáš dvěma záložkami vlevo od lišty: Konstrukce / Pláty / Speciální / Pasti. Zbraně a jednotky se neberou z lišty, ale z obchodu (pauza) a pak se pokládají stejně jako díl.
- Vlevo nahoře **ikona obchodu** (pauza) a **ikona nastavení**. Vpravo nahoře prachy, šrot, číslo vlny a náhled další vlny (ikonky nepřátel, 8 s předem).
- Uprostřed hra. Stavební zóna je vlevo, vyznačená slabou mřížkou, která se zobrazí jen při tažení.

**Tažení dílu**
- Prst na slot v liště → díl se "přilepí" k prstu a čas jde na 0,25×.
- Díl se zobrazuje **40 pt nad prstem**, ne pod ním, aby ho prst nezakrýval. Přichycení (ke kotvě, k zemi) se ukáže zeleným kroužkem, neplatná pozice červeným.
- Zoom: při tažení se kamera přiblíží na 0,9× kolem stavební zóny. Ruční zoom dvěma prsty není — jedna obrazovka, jeden prst.
- **Otočení:** druhý prst klepne kamkoli během tažení = otočí o 90°. Alternativa pro jednu ruku: dlouhé podržení bez pohybu 0,4 s = otočí.
- **Puštění do vzduchu:** díl bez kotvy prostě spadne, protože fyzika. Žádné zákazy, žádný "neplatný tah" — hráč zaplatil, díl letí. Stará škola.
- **Puštění mimo stavební zónu** (nad nepřáteli): díl se položí a spadne jim na hlavu. Dmg z pádu platí. Drahý, ale legitimní trik.
- **Puštění zpět na lištu**: zrušení, žádná platba.

**Rychlé akce na položených dílech**
- Klepnutí na díl: malé kolečko se 3 akcemi — Izolepa (šrot), Výměna za vyšší stupeň (prachy), Zbourat (vrátí 30 % ceny jako šrot). Kolečko zmizí za 2 s nebo klepnutím jinam.
- Dlouhé podržení dílu = chytit a přetáhnout jinam (jen pokud nemá nic nad sebou; jinak se zatřese a zůstane).
- Undo: tlačítko vedle lišty, posledních 10 stavebních akcí, jen dokud díl nedostal zásah.

**Pasti a hrouda hlíny**
- Hrouda: slot v liště, táhneš doprava, pustíš = hodí se obloukem tam, kam ukazuje čára. Přímo z prstu, žádné míření na dvakrát.
- Pasti: kladou se na zem před zeď stejně jako díl, jen se přichytávají pouze k zemi.

**Protiútok**
- Ikony jednotek vpravo dole nad lištou, klepnutí = vyběhne z brány. Cooldown jako kruh na ikoně.

**Chyby, kterým se vyhnout**
- Žádné potvrzovací dialogy. Nikdy.
- Žádný text během vlny kromě hlášek. Ceny jsou v liště, ne v pop-upu.
- Nic důležitého v rozích, kde má hráč palce (spodní rohy jsou mrtvá zóna 60×60 pt).

## 16. Vizuální styl postav

Stovky postaviček ve výšce 20–28 pt. Pravidlo, aby šly rozeznat bez čtení:

**Silueta + jedna barva + jeden doplněk.**
- **Silueta** říká roli: hubený a vysoký = rychlý, široký = tank, přikrčený = lezec/kopáč, s něčím nad hlavou = nese (žebřík, zrcadlo, pneumatika), na kolech = vozidlo.
- **Barva** říká chování: šedá = obyčejný, červená = útočí na bránu, žlutá = útočí na zbraně, zelená = ozářený/jed, fialová = podpora (Šaman, Kněz, Fotograf), modrá = ignoruje pasti, černá = výbušný. Tvé jednotky jsou vždy v odstínech hnědé a oranžové, aby se nikdy nepletly s nepřáteli.
- **Doplněk** je vtip a identita: hůl, dveře, žebřík, hrnec, mikrovlnka, bublina, montérky, jehly.

Postavy jsou geometrické: hlava kruh, tělo obdélník nebo lichoběžník, nohy dvě čáry. Animace chůze = kývání těla ±6° a přeskakování nohou, 4 snímky. Bossové mají 3–4× výšku a jako jediní detail v obličeji.

Poškození: postava ztmavne a začne se "drolit" (odpadávají pixely), HP bar jen po zásahu. Smrt: 3 varianty na typ (rozpad na kostičky, výbuch konfet, odlet mimo obraz), náhodně.

Hláška: text v **obrysovém fontu** (bílý font, černý obrys 2 pt, bez bubliny, bez pozadí), plave 30 pt nad postavou, stoupá a mizí za 1,5 s. Maximálně 4 hlášky na obrazovce naráz, další se zahodí.

## 17. Hlášky

Zásady: krátké (max 6 slov), jedna pointa, sprosté, nikdy vysvětlující. Tři situace: **spawn** / **zásah** / **smrt**. Bossové mají navíc fázi. Uprav si volně, tohle je první nástřel.

**Nářeční mix.** Hlášky nejsou jen spisovné. Každá jednotka má domovské nářečí a mluví v něm vždy: ostravsky (krátce, tvrdě), hanácky (pomalu, samohlásky), pražsky (protahuje, "vole") a slovensky. Rozdělení: Boxer, Vozík, Kopáč — ostravsky; Důchodce, Babka s hrncem, Šaman — hanácky; Zloděj, Fotograf, Prodavač — pražsky; Štítonoš, Puškař, Kutil — slovensky; ostatní spisovně sprostě. Bossové mají vlastní řeč (Soudruh úřednicky, Profesor rovnicemi). Níže je nástřel spisovně; převod do nářečí je poslední krok, až budou hlášky finální.

| Jednotka | Spawn | Zásah | Smrt |
|---|---|---|---|
| Loudač | "Jdu. Někam." | "Au, ty píčo." | "Do prdele, zase." |
| Běžec | "Z cesty, kokoti!" | "Nestíhám umřít!" | "…a je to." |
| Boxer | "Otevři, jdu jen pro cukr." | "To bylo všechno?" | "Tak dobrou." |
| Štítonoš | "Dveře. Mám dveře." | "Dveře drží!" | "Dveře nedržely." |
| Lezec | "Kdo má zbraň, má problém." | "Nekopej, kurva!" | "Padám, hahaha… ne." |
| Házeč | "Cihla zdarma, dvě za stovku." | "Trefil jsi cihlu, blbe." | "Poslední cihla. Moje." |
| Puškař | "Vidím tě, holube." | "Tohle nebylo ve smlouvě." | "Tak jsem mířil špatně." |
| Sebevrah | "Mám v batohu překvapení!" | "Ještě ne! Ještě ne!" | "PŘEKVAPENÍ!" |
| Zloděj | "Jen se dívám." | "Nic jsem nevzal!" | "Vezměte si to zpátky. Ne." |
| Vozík | "Sleva! Sleva! Sleva!" | "Kolečko! Kolečko se zaseklo!" | "Košíky vracejte na místo." |
| Rojnice | "Píp." | "Píp!" | "píp." |
| Šaman | "Rychleji, mí ovečky!" | "Nemám čas krvácet!" | "Bez šamana ještě rychleji…" |
| Důchodce s holí | "Pomaleji už to nejde." | "V mé době to bolelo víc." | "Konečně důchod." |
| Kopáč | "Kopu, kopu, do Kopeček." | "Písek v očích!" | "Pohřbi mě, když jsi tady." |
| Černobylák | "Sssvítím." | "Ňam." | (svítí ještě 3 s) "…ssspát." |
| Kněz zkázy | "Vstaňte, hovada!" | "Amen. Do prdele." | "Kdo vzkřísí mě?" |
| Prodavač | "Dohoda? Levně." | "Tohle si připočtu." | "Reklamace nebude." |
| Ožrala | "Kde je… ta zeď?" | "Tos byl ty, nebo já?" | (vzplane) "Tepleji!" |
| Fotograf | "Úsměv, kreténi." | "Objektiv! Můj objektiv!" | "Fotky jsou v cloudu." |
| Špekoun | "Hubnu, hubnu, hubnu." | "To je jen voda!" | (jako Běžec) "Jsem fit! Jsem…" |
| Babka dealerka | "Něco na kuráž, mládenci?" | "To nebylo v ceně!" | "Zboží pod pultem." |
| Zubař | "Otevřete, prosím." | "Nebolí to. Vás." | "Příště za půl roku." |
| Ex | "Jdu si pro věci." | "Ty ses vůbec nezměnil." | "Tak si to nech." |
| Vlk v přestrojení | "Já jsem Kutil. Fakt." | "Kutil to bere osobně." | "Nebyl jsem Kutil." |

**Obránci**
| Jednotka | Při stavbě/koupi | Při palbě (občas) | Při zničení |
|---|---|---|---|
| Kamenář | "Kameny mám. Cíle dodej." | "Trefa, ty svině!" | "Kameny… tak zůstanou." |
| Babka s hrncem | "Polívka! Kdo nechce, dostane dvakrát." | "Horká! Horká!" | "Hrnec byl od babičky." |
| Děda se slivovicí | "Ještě jednu a jdu na to." | "Rozjel jsem se!" | "Slivovice přežila. Já ne." |
| Kutil | "Izolepa řeší všechno." | "To drží. Ne. Drží." | "Kdo teď opraví mě?" |
| Bába s koštětem | (proud nadávek bez jediného slušného slova, 4 s) | – | "Ty čuráci… koště… vraťte…" |
| Vyhazovač | "Seznam hostů. Nejsi na něm." | "Letí!" | "Zavírám." |
| Holub | "Vrkú, hajzlové." | "Bomba doručena." | "Vrk." |

**Systémové**
- Start vlny: "Vlna {n}. Nedělej z toho vědu."
- Boss: "Ticho. Jde {jméno}."
- Počasí: "Bude pršet, ty debile, schovej papír." / "Mrzne. Zapal něco." / "Mlha. Střílej a doufej."
- Nemáš prachy: "Chudý jako kostelní myš. Mrtvá."
- Prohra podle příčiny: brána — "Zamykat se má."; jádro výbuchem — "Postavit to blíž jsi nemohl?"; Lezci — "Nahoru se taky střílí."; Zloděj — "Okradli tě. Dvakrát."
- Rekord: "Nový rekord. Nikoho to nezajímá."

## 18. Po vlně 30: Chuchvalec

Turbo mega boss, konec "kampaně" a začátek nekonečna.

- **Vzhled:** srostlina čtyř bossů, které hráč v běhu porazil (náhodně, pokud jich bylo víc). Těla propletená, smotaná ostnatým drátem, hnusný sliz kape a tvoří louže, na jednom z těl zbyly montérky. Krev, pixely hrůzy, oči na špatných místech. Výška 6× postava, fyzické tělo složené ze 4 spojených kusů.
- **HP:** 40 000, segmentovaný bar se čtyřmi barvami podle srostlých bossů.
- **Triky:** má všechny triky srostlých bossů, střídá je každých 12 s. Babička = údery, Traktor = tlačení, Kolos = odpadávající kusy, Soudruh = Gulag, Profesor = díry atd.
- **Padá z něj bordel:** při každém zásahu nad 100 dmg odpadne fyzický kus (lednička, pneumatika, kus těla) — padá na nepřátele i na tvé díly, po dopadu je z něj šrot (10). Jediný boss, ze kterého se během boje dá vydělat.
- **Sliz:** louže pod ním jsou lepkavé pro tvůj protiútok a kluzké pro nepřátele — ano, obojí naráz.
- **Drát:** každých 20 s vystřelí drát na nejbližší díl a trhá ho k sobě (fyzika). Ocel odolá, klacky ne.
- **Fáze 25 %:** rozpadne se na 4 původní bossy s 20 % HP každý, všichni naráz, každý jde jinam. Poslední žijící zesílí.
- **Smrt:** rozpadne se na pixely, sliz, montérky a jednu fungující ledničku. Hláška: "Byli jsme… čtyři… idioti."
- **Po vítězství:** nekonečný režim — vlny pokračují se škálováním, každá 10. vlna nový Chuchvalec z jiných čtyř bossů, HP +25 % pokaždé. Rekord = počet vln. Meta odměna: kosmetika "Montérky" na jádro.

## 19. Nastavení a ukládání

**Tlačítko nastavení** (vlevo nahoře, vedle obchodu) — pauza. Obsah:
- Uložit stav / Načíst stav — **5 pozic**, každá s náhledem (obrázek pevnosti, mapa, vlna, prachy, datum).
- Zvuk, hudba, haptika (posuvníky).
- Slušný režim (hlášky s pípáním, rating obsahu se nemění).
- Levák/pravák (přehodí ikonu protiútoku a undo na druhou stranu).
- Statistiky běhu, Vzdát se.

**Co se ukládá:** mapa, vlna a čas ve vlně, počasí, prachy a šrot, všechny díly (typ, pozice, rotace, HP), všechny spoje, zbraně a jejich levely, pasti, cooldowny, nepřátelé na obrazovce (typ, pozice, HP), boss a jeho fáze, meta.

**Jak:** při uložení se fyzika zastaví, rychlosti se vynulují a stav se zapíše jako JSON. Při načtení se pevnost postaví se vypnutou gravitací, spoje se vytvoří, první frame se gravitace zapne. Nepřátelé se obnoví na místě, ale s 1 s "omámení", aby se hráč zorientoval.

**Autosave:** při přechodu aplikace do pozadí (hovor, zamčení) do zvláštní 6. pozice "Naposledy", přepisuje se. Při startu nabídne pokračovat.

Ukládání mezi vlnami i uprostřed vlny je dovoleno. Save-scumming je hráčova věc, hra je offline a stará škola.

## 20. Meta mezi běhy

Konec hry je Chuchvalec ve vlně 30. Meta slouží k tomu, aby hráč měl důvod jít do dalšího běhu a aby se každý běh lišil tím, co si odemkl.

### 20.1 Šrotovné
Jediná meta měna. Prohra nikdy nic nevrací.

**Základ za běh:** 10 × dosažená vlna + 50 za každého poraženého bosse + 100 za první dosažení vlny 10, 20 a 30 (jednorázově).

**Násobiče za styl** (sčítají se, vyhodnocují se na konci běhu):
| Podmínka | Násobič |
|---|---|
| Jádro mělo na konci každé vlny ≥ 80 % HP | ×1,5 |
| Brána nikdy nepadla | ×1,3 |
| Žádná izolepa za celý běh | ×1,2 |
| Každý boss zabit do 60 s | ×1,2 |
| Žádný vlastní díl zničen vlastní zbraní | ×1,1 |
| Běh dokončen Chuchvalcem | ×2 |

Průměrný běh bez bonusů = 200–400. Dobrý běh = 800+. Celý strom dílny stojí zhruba 6 000, tedy 10–20 běhů.

### 20.2 Dědova dílna
Strom odemčení. Všechno se kupuje za Šrotovné, žádné výzvy ani podmínky — kdo má prachy, má věc. Pět větví, v každé se odemyká po řadě, přeskakovat nelze. Nic v dílně nezvyšuje statistiky, jen otevírá možnosti.

| Větev | Pořadí a ceny |
|---|---|
| **Zbraně** | základních 6 zdarma → Kuš 200 → Kulomet z traktoru 250 → Harpuna 300 → Rotační kulomet na šipky 300 → Katapult 400 → Raketomet 450 → Babka s hrncem 200 → Ohňostroj 200 → Laser 500 → Rogalo 400 → Balón 500 → Trebuchet 800 → speciální (Stříkačka, Úly, Kočky, Kapusta, Zvonice, Děda, Vyhazovač, Ventilátor, Lepidlo, Periskop, Kříž, Dělo) po 250–400 |
| **Díly** | Klacky, Papír, Dřevo zdarma → Trámy 100 → Plech 150 → Horký plát 200 → Kluzký 200 → Železo 300 → Ocel 350 → Ostnatý 250 → Lepkavý 250 → Gumový 300 → Elektrický 400 → Grafit 500 → Kolejnice 600 → Zrcadlový 400 |
| **Jednotky a pasti** | Hrouda, Past na medvědy zdarma → Bába s koštětem 150 → Kozel 200 → Příkop s olejem 200 → Pes 250 → Sud na rampě 250 → Tlouštík 300 → Vlčí jáma 300 → Chlap na sekačce 400 → Kutil 300 → Křikloun 300 → Magnet 400 → Husy 250 |
| **Mapy** | Rovina zdarma → Sídliště 300 → Svah 300 → Skládka 400 → Tělocvična 400 → Most 500 → Vrakoviště 500 → Hřbitov 500 → Tunel 600 → Benzinka 600 → Střecha 700 → Rybník 700 → Přehrada 800 → Kolotoč 900 → Sídliště v noci 400 |
| **Kosmetika** | jádra po 150 (pračka, pivo, děda, starosta, montérky…), barvy plátů po 100, styly obrysu hlášek po 100, skiny protiútoku po 150 (koza místo kozla, dvě báby místo jedné) |

Podmínky odemčení map z kapitoly 12 ("vlna 10 na Svahu") se ruší — platí jen ceny výše.

**Co v dílně není a nebude:** žádná "pohodlí" (sloty, undo, náhled vlny) — všichni hrají se stejným rozhraním. Žádný denní běh ani seedy — jeden režim, jeden rekord: nejvyšší vlna a nejrychlejší Chuchvalec.

### 20.3 Bestiář
- Po první smrti nepřítele se otevře karta: silueta, domovské nářečí, tři hlášky, jedna věta "čím na něj". Otevřená karta = +20 Šrotovného jednorázově.
- Bossové mají kartu až po první výhře nad nimi (+50).
- **Celý odhalený bestiář** se dá koupit v dílně za 1 500 nebo se otevře sám po prvním poražení Chuchvalce — pak jsou vidět i nepřátelé, které hráč ještě nepotkal, včetně map, kde se objevují.
- Bestiář je i mapou nepřátel: u každého, na kterých mapách chodí a od které vlny.

### 20.4 Statistiky za život
Bez odměn, jen pro ego. Detailně, protože čísla jsou taky humor.

**Boj:** zabito celkem a podle typu, zabito ohněm / výbuchem / pádem dílu / vlastním protiútokem, nejdelší řada zabití bez ztráty dílu, bossové poraženi a nejrychlejší zabití každého, Chuchvalců poraženo a jejich složení, nejvíc nepřátel na obrazovce naráz, krys zabito jednou ranou.

**Stavba:** dílů postaveno celkem a podle materiálu, nejvíc dílů v jedné pevnosti, nejvyšší pevnost v patrech, nejtěžší pevnost v kg, dílů zničených nepřáteli / vlastní zbraní / vlastní blbostí (puštěno do vzduchu), izolep použito, dílů vyměněno na místě, spojů prasklo, nejdelší doba, co jedna pevnost stála beze změny.

**Ekonomika:** prachů vyděláno a utraceno, šrotu sebráno, nejdražší nákup, ukradeno Zloději, zaplaceno Prodavači, nejvíc prachů v jednu chvíli, Šrotovného celkem.

**Běhy:** běhů celkem, dokončených, průměrná a nejlepší vlna, celkový čas ve hře, čas ve zpomalení při stavbě, nejdelší běh, nejkratší prohra, prohry podle příčiny (brána / jádro výbuchem / Lezci / Ex / vlastní raketa), uložení stavu použito.

**Absurdní:** nejdelší hláška, kolikrát řekl Loudač "do prdele", holubů odesláno, ledniček vystřeleno, koček vyhozeno, kravek obětováno, kolikrát spadl balkon na Sídlišti, kolikrát Soudruh upadl na jehlách, kolikrát hráč otevřel obchod během jedné vlny (rekord), matrací zachyceno.

### 20.5 Konec hry
Po Chuchvalci titulky: běží seznam všech, kdo v tomto běhu zemřeli (jménem typu a počtem), každý s jednou hláškou. Šrotovné ×2. Ikona hry v menu dostane montérky. Za titulky nabídka: Nekonečno (vlny pokračují, každá 10. nový Chuchvalec z jiných čtyř bossů, HP +25 %), nebo nový běh.

## 21. Zvuk

**Žádná hudba.** Hra zní jen tím, co se v ní děje, plus jednou ambientní vrstvou na mapu. Ticho mezi vlnami je záměr — nádech před další várkou.

### 21.1 Zásady
- Každý zvuk je krátký (pod 0,5 s kromě ambientu a bossů) a má 2–3 varianty, aby se neopakoval stejný sample stokrát.
- Stovky nepřátel = limit: max 12 zvuků nepřátel naráz, priorita podle vzdálenosti od pevnosti. Rojnice má jeden zvuk za celé hejno.
- Zvuk pevnosti má vždy přednost před zvukem nepřátel: praskající spoj musí být slyšet přes cokoli.
- Haptika: lehký tap při položení dílu, střední při prasknutí spoje, těžký při výbuchu a při úderu bosse. Nic jiného.
- Hlášky nejsou namluvené. Doprovází je "mumlání" à la Sims: 3–4 slabiky nesmyslu v barvě hlasu jednotky (nízký, vysoký, chraplavý, pisklavý), nářečí se pozná jen z textu.

### 21.2 Pevnost a díly
| Událost | Zvuk |
|---|---|
| Položení dílu | klacky: suché klepnutí; trám: tupé buchnutí; železo/ocel: zazvonění; papír: šustnutí; plech: plechové zadrnčení |
| Spoj pod zátěží (síla nad 70 % limitu) | tiché vrzání, roste s tlakem — varování před prasknutím |
| Prasknutí spoje | klacky: lupnutí jako zlomená větev; trám: hlasité křupnutí; železo: kovové prasknutí s dozvukem |
| Pád dílu | podle hmotnosti: od plesknutí po dunivý dopad; na nepřítele navíc mokré křupnutí |
| Izolepa | odvíjení pásky, 3 trhnutí |
| Výměna na místě | vrtačka 3 s |
| Horký plát | syčení při dotyku, hlasitější než hoření |
| Kluzký plát | zasvištění + pád |
| Elektrický plát | bzučení + praskavý výboj |
| Brána zásah | duté rány, u dveří z ledničky cinknutí lahví uvnitř |
| Jádro zásah | podle jádra: pračka drnčí, pivo cinkne, děda zanadává (mumlání) |
| Jádro zničeno | ticho 1 s, pak jeden hluboký úder a hláška |

### 21.3 Zbraně
| Zbraň | Výstřel | Dopad |
|---|---|---|
| Kamenář | zafunění + svist | tupé cvaknutí |
| Luk / Kuš | brnknutí tětivy / tvrdé cvaknutí | zabodnutí |
| Vzduchovka | suchý výstřel s ozvěnou | – |
| Kulomet z traktoru | rachot dieselu pod dávkou | řada plechových cinknutí |
| Plamenomet | hukot plynu, při zapnutí "fuf" | praskání hořících |
| Harpuna | výstřel + řetěz drnčí | zaseknutí + tažení po zemi |
| Laser z DVD | vysoké pískání nabíjení 1 s, pak "zzt" | spálený zvuk |
| Minomet | duté "tunk" | výbuch střední |
| Katapult | vrzání ramene, rána zarážky | lednička: dunivá rána + rozbité sklo |
| Babka s hrncem | zamumlání + šplouchnutí | syčení polévky |
| Ohňostroj | pískání rakety | malé prasknutí, náhodná výška |
| Raketomet | "fšš" + hukot letu | výbuch velký, ozvěna |
| Trebuchet | dlouhé vrzání, zabučení kravky v letu | dunivá rána + zabučení |
| Holub / Rogalo / Balón | vrkání / plachta ve větru / hoření hořáku | výbuch podle nálože |
| Rotační kulomet na šipky | roztáčení (vzestupné bzučení 1,5 s), pak rychlé "tk tk tk" | zabodnutí do kůže |
| Stříkačka na hnůj | čerpadlo + mokrý proud | šplouchnutí, při zapálení "fuf" |
| Vrhač úlů | hod + bzučení roje | bzučení sílí a slábne s rojem |
| Prak na kočky | zamňoukání v letu | prskání + škrábání |
| Zvonice | jeden hluboký úder, dozvuk 3 s, všechno ostatní na 1 s ztlumit | – |
| Kutil | klepání kladívkem, občas "aha" | – |
| Křikloun | pískání zpětné vazby megafonu | – |

### 21.4 Nepřátelé
- **Chůze davu:** jeden smyčkový zvuk šouravých kroků, hlasitost podle počtu nepřátel na obrazovce. Ne jednotlivé kroky.
- **Útok na zeď:** drápání (Loudač), údery pěstí (Boxer), škrábání kovu (Lezec na plechu).
- **Charakteristické:** Běžec supí; Štítonoš klepe dveřmi; Házeč hvízdne před hodem; Puškař cvakne závěrem 0,5 s před výstřelem (varování); Sebevrah pípá zrychleně 2 s před výbuchem; Vozík skřípe kolečkem; Rojnice pištění jako jeden zvuk; Šaman chrastí; Černobylák tiché praskání Geigera; Kopáč lopata do hlíny; Ožrala škytá; Fotograf cvakání spouště; Špekoun mlaskavý hod; Zubař vrtačka; Chlap s mikrovlnkou "ding"; Ex neslyšně (jediný nepřítel bez zvuku).
- **Smrt:** 3 varianty na typ, krátké, komické (pšouknutí, cinknutí, "au"), nikdy naturalistické.

### 21.5 Bossové
Každý má vlastní ambient, který přehluší mapu, dokud žije: Babička — vrzání kolen a mlácení válečkem; Traktor — diesel a řetězy; Kolos — drnčení ledniček a bzučení kompresorů; Starosta — nekonečný projev jako mumlání do echa; Kanec — chrochtání a dupot; Tchyně — jedno dlouhé mumlání bez pauzy; Zeppelin — hukot vzduchu a pleskání matrací; Dvojčata — hádka; Matka krys — pištění tisíce krys; Řetěz — řinčení; Soudruh — potlesk z reproduktoru po každé větě; Profesor — hučení díry, vysoké, roste s velikostí; Chuchvalec — všechny ambienty srostlých bossů naráz, rozladěné, plus kapající sliz.

### 21.6 Mapy (ambient, tichý, pod vším)
Rovina — dálnice bez aut, vítr v svodidlech; Svah — vítr, kamínky; Most — vítr v lanech, ozvěna; Skládka — racci, praskání odpadků; Střecha — vítr, antény; Rybník — praskání ledu, který je dobře slyšet, když je ticho; Vrakoviště — plechy ve větru; Tunel — kapání, občas hukot soupravy; Přehrada — voda přes přeliv; Kolotoč — flašinet, který se zasekává; Tělocvična — ozvěna, zapadlé míče; Hřbitov — sovy, vítr; Benzinka — bzučení neonu; Sídliště — televize z oken, pes, výtah, který se snaží.

### 21.7 Rozhraní
Obchod: otevření = závěs a "no?" od chlapa za pultem; koupě = cinknutí kasy; nedostatek peněz = prázdné cvaknutí. Lišta: vybrání dílu tiché ťuknutí. Undo: přetočení pásky. Uložení: cvaknutí fotoaparátu. Vlna: jeden úder do plechu + hláška. Konec: ticho, pak jeden dlouhý tón.

## 22. Rizika

| Riziko | Dopad | Řešení |
|---|---|---|
| Stavba za běhu je stresující, ne zábavná | Jádro hry nefunguje | Zpomalení 0,25× je ladicí; případně 0,1×. Pauza zůstává jen v obchodě, stavba samotná nikdy hru nezastaví. Otestovat ve fázi 3. |
| Fyzika pevnosti se sype při stovkách kontaktů | Propady fps | Nepřátelé nemají těla. Rozpočet těl místo počtu bossů: bossů naráz max 4 (Chuchvalec po rozpadu), každý max 6 fyzických částí, Řetěz 20 malých těl bez vzájemných kolizí. Při přítomnosti bosse se snižuje limit volných objektů (odpadlé díly, ledničky, sudy) — nejstarší mizí dřív. Celkový strop 150 těl. `usesPreciseCollisionDetection` jen u rychlých projektilů. |
| Hráč staví "krabici" a hra je vyřešená | Nuda | Lezec, Házeč a Puškař trestají jednu strategii; zpětný ráz a hmotnost brání věžím z oceli. |
| Balanc 33 zbraní × 33 nepřátel × 14 map | Nekonečné ladění | Sešit `prdel_sveta_balanc.xlsx` jako jediný zdroj čísel, export do JSON, headless simulátor vln. |
| 17+ rating omezí publikum | Méně stažení | Pro rodinu a kamarády nevadí; slušný režim v nastavení (jen pípání). |
| Rozsah přeteče | Nedokončená hra | MVP pevně daný, obsah v JSON, po fázi 4 rozhodnutí jít dál. |

## 23. Otevřené otázky

- Ikona (název Prdel světa potvrzen).
- Mapy: do MVP Rovina a Sídliště, počasí Déšť a Zima. Ostatní mapy odemykané vlnami a Šrotovným (viz kapitola 12).
- Má hráč vidět, co přijde v další vlně? (Návrh: ano, ikonky 8 s předem — stavba pod palbou potřebuje informaci.)
- Má obchod ukazovat i náhled, kam se nakoupená zbraň vejde (volná hnízda)? (Návrh: ano, ať se po zavření neztrácí čas hledáním místa.)
- Denní výzva se seedem a lokální tabulka rekordů? (Bez online, jen v telefonu.)
- Přepínač "slušný režim" ano/ne.
