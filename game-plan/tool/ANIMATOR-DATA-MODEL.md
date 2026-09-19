# Animátor: datový model a pravidla

Tento dokument je zdroj pravdy pro vztah mezi bitmapovými díly, kostrou, animací a herní postavou. Při změně editoru nebo ukládání se musí aktualizovat společně s kódem.

## Samostatné datové banky

- `graphics/postavy/game-characters.json`: herní postavy a odkazy na animace.
- `graphics/animace/`: hotové animace z Animátoru — `animations.json` je index, celé záznamy jsou v `items/<id>.json` a smazané v `trash/<token>.json`.
- `graphics/bitmapove-sekvence/`: klasické snímkové animace tvořené hotovými bitmapami.
- `graphics/bitmapove-predlohy/`: rozsekané zdrojové postavy pro kostrový Animátor.
- `graphics/levely/`: levely, jejich varianty a herní export.
- `graphics/kostry/skeletons.json`: banka pojmenovaných kosterních animací.

Tyto katalogy se nesmějí znovu sloučit do jednoho souboru. Jednorázový převod `tools/reorganize_graphics_data.py` odstranil staré postavy, hotové animace, pózy, archivy i koše, zachoval tři pojmenované kosterní animace a jednu bitmapovou předlohu Běžce.

### Stav po rozdělení 2026-09-16

- `postavy`: 0 uložených postav, prázdný koš.
- `animace`: 0 hotových animací, prázdný koš.
- `kostry`: 3 pojmenované kosterní animace, 0 samostatných póz, prázdný koš.
- `bitmapove-predlohy`: jediná předloha `bezec-zombie-v1`, 13 vykreslovaných dílů.
- `bitmapove-sekvence`: všechny původní hotové snímkové animace, jejich varianty, ruční posuny a generovaný herní katalog.
- `levely`: všechny levelové obrázky, varianty, linky podlahy a generovaný herní katalog.

Velké PNG a další obrazové podklady byly už před rozdělením lokální nesledované soubory. Zůstávají fyzicky v nových adresářích, ale nejsou automaticky přidány do Gitu. Git sleduje kód, dokumentaci a hlavní JSON katalogy. Přepnutí větve proto nesmí nesledované obrazové podklady mazat ani přesouvat zpět.

### Pravidla cest

- Každá cesta ke klasické snímkové animaci začíná `graphics/bitmapove-sekvence/`.
- Každá cesta k rozsekané bitmapové předloze začíná `graphics/bitmapove-predlohy/`.
- Cesty levelů začínají `graphics/levely/`; kostry, hotové animace a postavy používají své samostatné katalogy uvedené výše.
- Generovaný `tool/sprite-variants.generated.js` používá z HTML cestu `../graphics/bitmapove-sekvence/...`.
- Pevně zadané cesty Chuchvalce v `tool/gallery.html` a `tool/index.html` musí rovněž obsahovat podadresář `bitmapove-sekvence`; nesmějí mířit přímo do `graphics/chuchvalec/`.
- Po přesunu se nesmí znovu objevit staré cesty `graphics/characters2/`, `graphics/poses/` ani `graphics/levels/`.

## Pojmy a vlastnictví dat

### Bitmapová předloha (`skin`)

- Katalog je v `graphics/bitmapove-predlohy/skins.json`, konkrétní předloha v adresáři postavy jako `skin.json`.
- Obsahuje zdrojové soubory dílů, jejich rozměry, počáteční a koncový bod, výchozí ukotvení, pořadí vrstev a výchozí přechody průhlednosti.
- `pelvis` a `shoulders` jsou pouze geometrické body kostry. Nemají vlastní vykreslovanou bitmapu.
- Zdrojové cesty a kontrolní součty editor nikdy nepřepisuje z dat poslaných prohlížečem.
- Upravený snapshot předlohy patří hotové animaci, nikoli herní postavě. Díky tomu každá animace přesně zachová své pořadí, ukotvení, rotační středy, natočení, měřítko a přechody.

### Póza (`pose`)

- Póza je jeden stavební snímek v `graphics/kostry/skeletons.json`, kolekci `poses`. Je vidět v knihovně uvnitř editoru Koster, ale v Animátoru se už nevydává za celou kostru.
- Póza ukládá polohu kloubů jednoho snímku (`frame`) a může nést také délky kostí (`rig_lengths`) a úhlové limity (`joint_limits`).
- Výchozí kloubové limity jsou nyní maximální, −180° až +180°. Jsou připravené i pro budoucí fyziku, ale editor je zatím používá hlavně při tažení kloubů.
- Délka jedné kosti je 5 až 250 jednotek kostry. Ramena a pánev mají pracovní šířku −300 až +300 %, aby šlo strany prohodit přes střed a použít až trojnásobný rozestup.
- Póza neobsahuje obrázky, pořadí vrstev ani rychlost pohybu postavy.

### Kostra / kosterní animace (`clip`)

- Je v `graphics/kostry/skeletons.json`, kolekce `clips`.
- Nová animace má výchozích 8 snímků. Obsahuje 1 až 256 póz, tempo, rychlost vpřed, délky kostí, limity kloubů, přidané větve a kosterní výjimky snímků.
- Stejný seznam `clips` ukazuje editor Koster i sekce Kostry v Animátoru. Bitmapová předloha se sem neukládá.

### Hotová animace (`finished_animation`)

- Je v bance `graphics/animace/`, kolekce `finished_animations`.
- **Banka je rozdělená.** `animations.json` je jen index: u každé animace drží
  `id`, `name`, `skin_id`, `fps`, `move_speed_pt_s`, časy, počet snímků v `frames`
  a `file` s cestou k celému záznamu. Celý záznam je v `items/<id>.json`, smazaný
  v `trash/<token>.json`. Index tak zůstává v jednotkách kB místo stovek.
- Kdo bankou prochází, musí použít `tools/animation_store.py` (Python) nebo
  `tool/animation-store.js` (prohlížeč). Obojí složí v paměti stejný tvar jako dřív,
  takže volající kód se nemění. **Syrové `json.loads` nad `animations.json` vrátí
  stuby, ne animace.** Výjimka je kontrola pouhé existence `id` — na tu index stačí.
- Starší plochý formát (celé záznamy přímo v indexu) se načte beze změny; stub se
  pozná podle klíče `file`. Převod udělal `tools/split_animation_store.py`.
- Je to kombinace vlastního úplného snapshotu kostry a nastavení jedné bitmapové předlohy, včetně bitmapových výjimek snímků a povinného odkazu `skin_id`.
- `skeleton_id` je volitelný. Je vyplněný jen tehdy, pokud interní kostra animace stále přesně odpovídá pojmenované kostře v bance. První změna kostry odkaz odstraní, ale uložená animace dál obsahuje všechny své snímky, délky a limity. Bitmapová změna odkaz na kostru neodpojuje.
- Zdrojové PNG se do animace nekopírují. Animace ukládá jen pozice, čtyřbodové deformace, měřítka, rotační středy, pořadí a masky průhlednosti bitmapových dílů. Čtyřbodová deformace je volitelné `warp: [[dx,dy], …]` v pořadí levý horní, pravý horní, pravý dolní, levý dolní roh; chybějící hodnota znamená čtyři nulové posuny.
- Je to globální zásobník bez vlastnictví konkrétní postavou. Načtení nastaví uloženou bitmapovou předlohu i kosterní animaci a odpojí aktivní animaci postavy.

### Animace přiřazená postavě

- Není to další kopie dat. Postava má jen pole `animation_ids` s odkazy na globální `finished_animations` a `default_animation_id`.
- Jedna postava může odkazovat na libovolný počet hotových animací. Jedna hotová animace může být odkazovaná více postavami.
- Odebrání animace z postavy smaže jen odkaz. Samotná hotová animace zůstává v globální knihovně.
- Po úpravě načtené animace se vazba na postavu odpojí. Uživatel změnu uloží jako novou hotovou animaci a teprve tu přilinkuje; stará animace se tiše nepřepisuje.

### Herní postava (`character`)

- Katalog je v `graphics/postavy/game-characters.json`; aktuální zapisované schéma je `schema_version: 3` a renderer `cutout-rig-v2`.
- Postava vlastní jméno, budoucí herní atributy, `motion.variation_percent`, `animation_ids` a `default_animation_id`.
- Postava neobsahuje `skin`, `skin_id`, `animation` ani `animations`. Bitmapová předloha i její konkrétní nastavení se načtou z vybrané hotové animace.
- Rozptyl rychlosti je 0 až 90 %. Je vlastností postavy, zatímco tempo a základní rychlost vpřed patří jednotlivé animaci.
- Uložení postavy nemá přepsat žádnou animaci. Uložení nové hotové animace nemá měnit jinou animaci ani zdrojovou kostru.
- Smazání postavy nesmí mazat zdrojové bitmapy ani globální kostry a pohybové předlohy.
- Herní atributy postavy jsou plánované, ale zatím nemají v editoru ani schématu konkrétní pole.

## Rozsah úprav

### Přidané kosti a nezávislé bitmapy (formát 2)

- Kostra i hotová animace nesou `extra_bones`: slovník ID `extra_*` s `label`, `parent`, `at` (0–1), místním `offset: [x,y]`, základním `angle` a `length`. Rodič může být základní i přidaná kost; chybějící rodiče a cykly jsou zakázané. Nejvýše 128 přidaných kostí.
- Snímek může mít `extra_pose[id]: {angle,x,y}`. Posuny jsou v osách rodiče, natočení je relativní k základnímu úhlu. Přidané kosti mají zlaté úchyty, lze je táhnout a s Ctrl měnit délku. Úpravy se ukládají i do samostatných póz.
- Každý bitmapový díl má vlastní `bone`. Více bitmap smí sledovat stejnou kost. Žádná bitmapa nedědí měřítko, průhlednost, deformaci ani zapnutí od jiné bitmapy.
- Nové instance mají unikátní ID `attachment_*` a `source_part` odkazující na původní díl předlohy. PNG se neduplikuje. Všechny vlastní transformace i přiřazení se ukládají do `bitmap.parts` hotové animace.
- `enabled: false` vypne díl v celé animaci bez smazání PNG. `opacity` (0–1) je vlastní krytí. `fixed_length` drží vlastní velikost při změně délky kosti; nové přilepené bitmapy mají tuto volbu zapnutou. Poloha a rotace nadále sledují kost. Staré díly bez `fixed_length` zachovávají původní škálování podle kosti.
- Bitmapy se v editoru zobrazují jako seznam podle kosti: ukazuje všechny díly, jejichž `bone` odpovídá zvolené kosti, včetně dílů s `enabled: false`. Každý řádek ovládá jen `fixed_length` a odebrání. Vlastnictví dat se tím nemění — jde o pohled na `bitmap.parts`. `opacity` a změna `bone` už v tomto panelu ovládací prvek nemají; uložené hodnoty zůstávají platné a beze změny se ukládají dál.
- Přilepenou bitmapu (`attachment_*`) lze smazat. Zmizí z `bitmap.parts` i z pořadí vrstev a s ní i její snímkové výjimky; zdrojový díl předlohy, jeho PNG ani ostatní instance se nemění. Díl pocházející z předlohy se tímto tlačítkem smazat nedá — vypíná se pouze `enabled: false`, aby snapshot zůstal shodný s předlohou.
- Odebrání větve odebere také její potomky a snímkové pózy těchto kostí; připojené bitmapy vypne a převede na trup. Přepnutí na kostru bez dané větve rovněž bezpečně vypne osiřelé díly.
- `＋ Snímek` vloží kopii aktuálního snímku včetně výjimek, `🗑 Snímek` jej odebere a přečísluje výjimky. Zůstane minimálně jeden snímek. `◀ Přesunout` a `Přesunout ▶` prohodí snímek se sousedním cyklicky přes konec smyčky; prohodí se s ním i jeho snímkové výjimky, počet snímků se nemění. Vše podporuje Zpět.

### Rozšiřování bitmapových předloh a migrace

- Stránka Bitmapové předlohy zobrazuje `reference_image` (celý návrh), potom díly. Formulář přidá další PNG nebo nastaví nový celkový návrh; předchozí soubor ani díly nemaže.
- Nový PNG díl dostane unikátní ID a je výchozím stavem vypnutý. Existující animace při načtení doplní nové díly jako vypnuté, takže se jejich vzhled nezmění. Obrázky musí být běžné neprokládané 8bitové RGB/RGBA PNG, nejvýše 16 MB a 16 megapixelů.
- Režim `replace-part` vymění PNG existujícího dílu předlohy: přepíše `file`, `size` a `sha256`, poměrně přepočítá `start` a `end` při jiném rozměru a ostatní hodnoty dílu nechá beze změny. Nová PNG se ukládá vedle staré, původní soubor se nemaže. Instance `attachment_*` tímto režimem měnit nelze.
- Zápis ověřuje `expectedRecord`, zálohuje předchozí JSON do `history` a nahrazuje jej atomicky.
- `tools/migrate_rig_extensions.py` je opakovatelná aditivní migrace. Zachovává transformace, klipy i obrázky, doplňuje metadata formátu 2. Před prvním zápisem vytváří úplné kopie měněných souborů v `graphics/migration-backups/rig-v2-*`. Původní počty snímků se nemění.

- **Snímek**: změna se uloží jako výjimka aktuálního snímku. U bitmapy je posun i čtyřbodový `warp` relativní ke společnému základu a velikost relativní k základnímu měřítku.
- **Animace**: změna se promítne do všech snímků se zachováním jejich rozdílů. U bitmapy mění společný základ ve snapshotu rozpracované hotové animace; platí to i pro jednotlivé rohy `warp`. Výjimkou je přechod průhlednosti: vybraný konec dostane jednu společnou masku v místních souřadnicích dílu a jeho staré snímkové výjimky se odstraní, aby maska ve všech pózách stejně následovala kost. Druhý konec a ostatní vlastnosti snímků se nemění.
- Režimy **Kostra** a **Bitmapa** jsou výlučné a nikdy se nepřepnou pouhým kliknutím do plátna.
- Změna režimu, rozsahu nebo nástroje sama nemění data a nevytváří krok Zpět. Jeden souvislý tah je jeden krok Zpět.

## Pracovní postup knihoven

1. Uživatel samostatně vybere **Kostru** a **Bitmapovou předlohu**.
2. Jejich kombinací sestaví rozpracovanou obecnou animaci. Kostra ani bitmapová předloha tím nezačnou patřit žádné herní postavě.
3. Rozpracovaný pohyb se uloží do globálního zásobníku **Hotové animace**. Při přiřazení postavě se do postavy uloží pouze ID této animace.
4. Seznam koster i hotových animací se po uložení, uložení jako, smazání a obnovení ihned znovu sestaví z aktuálního katalogu.
5. Disketa přepisuje vybranou položku se zálohou, plus vytváří novou položku a koš ji přesouvá do vratného koše.
6. Výběr Kostry je začátek nové práce: po potvrzení načte všechny snímky vybrané kosterní animace, ponechá zvolenou bitmapovou předlohu a odpojí animaci vybranou u postavy.
7. Jakákoli datová změna okamžitě odpojí hodnotu **Animace postavy**. Upravený pohyb lze k postavě uložit pouze jako novou animaci; původní zůstává beze změny, dokud ji uživatel samostatně nesmaže.
8. Změna kostry rozsvítí hvězdičku Kostry i Hotové animace a zruší `skeleton_id`. Změna bitmapového nastavení rozsvítí jen Hotovou animaci a případný platný `skeleton_id` ponechá. Hvězdička není součást názvu ani položky seznamu.
9. Uložení aktuální interní kostry do banky nastaví nový `skeleton_id`; není však podmínkou pro uložení hotové animace.

## Kompatibilita a bezpečnost zápisu

- Staré vložené animace, postavy, pózy, archivy a koše byly při schváleném čistém startu odstraněny; nejsou kompatibilní součástí nového modelu.
- Kanonická vazba postavy je pouze `animation_ids` + `default_animation_id`; staré vložené kopie ani snapshot bitmapy se do postavy už nezapisují.
- Každá změna postavy nebo její animace posílá `expectedRecord`. Pokud mezitím jiná karta záznam změnila, zápis se odmítne místo tichého přepsání.
- Před přepsáním se uloží záloha do `history/` uvnitř příslušné datové banky. Katalog se zapisuje přes dočasný soubor a atomické přejmenování; u rozdělené banky animací to platí pro index i pro každý soubor v `items/` a `trash/`. Soubory po smazaných záznamech se při zápisu mažou, aby je nenacházel fulltext ani grep.
- Předchozí verze přepsané kosterní nebo hotové animace se zároveň vloží do `trash` s `saved_at` a odkazem na soubor `history`. Koš ji zobrazuje s datem a časem. Obnova verze nejdřív přesune právě aktivní verzi do další položky Koše, takže je vratná i obnova samotná.
- Všechny akce Uložit, Uložit jako a Smazat vyžadují potvrzení uživatele.

## Ovládání panelu Úpravy

- `1` nebo `+`: Kostra / Bitmapa.
- `2` nebo `ě`: tento Snímek / celá Animace.
- `3` nebo `š`: Posun → Rotace → Velikost → Posun.
- Mezerník: přehrát nebo pozastavit. `Y`: předchozí snímek. `Z` nebo `C`: další snímek. `WASD`: posun. `Q` / `E`: rotace.
- Jen v režimu Bitmapa: při držení `X` se zobrazí čtyři rohové úchyty vybraného dílu. Tažení rohu mění jeho `warp`; puštění `X` pouze skryje úchyty. Rozsah Snímek / Animace, Zpět, ukládání, náhled i export zůstávají stejné jako u ostatních bitmapových úprav.
- Zkratky neplatí při psaní do pole, výběru nebo textové oblasti. Přepínače v záhlaví a uvnitř rozbaleného panelu ovládají stejný stav.

### Ikony a navigace

- Režim Kostra má v záhlaví ikonu dvou spojených čar s kloubem.
- Režim Bitmapa má tečkovanou ikonu; obdélník se pro tento režim už nepoužívá.
- Hlavní preview má samostatné sekce **Bitmapové sekvence**, **Bitmapové předlohy**, **Animátor**, **Levely** a **Kostry**.
- „Bitmapové sekvence“ jsou původní galerie hotových bitmapových snímků. „Bitmapové předlohy“ jsou rozsekané zdroje pro Animátor a aktuálně zobrazují jen Běžce.
- Starý název **Postavy2** se v uživatelském rozhraní ani aktuální dokumentaci nepoužívá. Kompatibilní URL alias může zůstat pouze v routeru.
- Lokální editor se otevírá přes `http://127.0.0.1:8765/tool/preview.html`; přímé `file://` se přesměruje na místní server, protože ukládání používá jeho API.

## Známá omezení a další záměry

- Postava zatím nemá definované herní atributy mimo rozptyl rychlosti.
- Knihovna hotových animací je jediným vlastníkem kombinace kostry a bitmapy. Seznam animací postavy je jen filtrovaný seznam odkazů do této knihovny.
- Fyzika může později převzít `joint_limits`; oddělení částí těla po zásahu ani fyzikální vazby zatím implementované nejsou.
- Při změně schématu se zvýší `schema_version`, doplní validace, test starého záznamu a tento dokument.
