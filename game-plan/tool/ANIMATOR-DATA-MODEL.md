# Animátor: datový model a pravidla

Tento dokument je zdroj pravdy pro vztah mezi bitmapovými díly, kostrou, animací a herní postavou. Při změně editoru nebo ukládání se musí aktualizovat společně s kódem.

## Samostatné datové banky

- `graphics/postavy/game-characters.json`: herní postavy a odkazy na animace.
- `graphics/animace/animations.json`: hotové animace z Animátoru.
- `graphics/bitmapove-sekvence/`: klasické snímkové animace tvořené hotovými bitmapami.
- `graphics/bitmapove-predlohy/`: rozsekané zdrojové postavy pro kostrový Animátor.
- `graphics/levely/`: levely, jejich varianty a herní export.
- `graphics/kostry/skeletons.json`: banka pojmenovaných kosterních animací.

Tyto katalogy se nesmějí znovu sloučit do jednoho souboru. Jednorázový převod `tools/reorganize_graphics_data.py` odstranil staré postavy, hotové animace, pózy, archivy i koše, zachoval tři pojmenované kosterní animace a jednu bitmapovou předlohu Běžce.

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
- Obsahuje 2 až 32 póz, tempo, rychlost vpřed, délky kostí, limity kloubů a pouze kosterní výjimky snímků.
- Stejný seznam `clips` ukazuje editor Koster i sekce Kostry v Animátoru. Bitmapová předloha se sem neukládá.

### Hotová animace (`finished_animation`)

- Je v `graphics/animace/animations.json`, kolekce `finished_animations`.
- Je to kombinace vlastního úplného snapshotu kostry a nastavení jedné bitmapové předlohy, včetně bitmapových výjimek snímků a povinného odkazu `skin_id`.
- `skeleton_id` je volitelný. Je vyplněný jen tehdy, pokud interní kostra animace stále přesně odpovídá pojmenované kostře v bance. První změna kostry odkaz odstraní, ale uložená animace dál obsahuje všechny své snímky, délky a limity. Bitmapová změna odkaz na kostru neodpojuje.
- Zdrojové PNG se do animace nekopírují. Animace ukládá jen pozice, deformace, měřítka, rotační středy, pořadí a masky průhlednosti bitmapových dílů.
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

- **Snímek**: změna se uloží jako výjimka aktuálního snímku. U bitmapy je posun relativní k základnímu uchycení a velikost relativní k základnímu měřítku.
- **Animace**: změna se promítne do všech snímků se zachováním jejich rozdílů. U bitmapy mění společný základ ve snapshotu rozpracované hotové animace. Výjimkou je přechod průhlednosti: vybraný konec dostane jednu společnou masku v místních souřadnicích dílu a jeho staré snímkové výjimky se odstraní, aby maska ve všech pózách stejně následovala kost. Druhý konec a ostatní vlastnosti snímků se nemění.
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
- Před přepsáním se uloží záloha do `history/` uvnitř příslušné datové banky. Katalog se zapisuje přes dočasný soubor a atomické přejmenování.
- Všechny akce Uložit, Uložit jako a Smazat vyžadují potvrzení uživatele.

## Ovládání panelu Úpravy

- `1` nebo `+`: Kostra / Bitmapa.
- `2` nebo `ě`: tento Snímek / celá Animace.
- `3` nebo `š`: Posun → Rotace → Velikost → Posun.
- Mezerník: přehrát nebo pozastavit. `Y`: předchozí snímek. `X` nebo `C`: další snímek. `WASD`: posun. `Q` / `E`: rotace.
- Zkratky neplatí při psaní do pole, výběru nebo textové oblasti. Přepínače v záhlaví a uvnitř rozbaleného panelu ovládají stejný stav.

## Známá omezení a další záměry

- Postava zatím nemá definované herní atributy mimo rozptyl rychlosti.
- Knihovna hotových animací je jediným vlastníkem kombinace kostry a bitmapy. Seznam animací postavy je jen filtrovaný seznam odkazů do této knihovny.
- Fyzika může později převzít `joint_limits`; oddělení částí těla po zásahu ani fyzikální vazby zatím implementované nejsou.
- Při změně schématu se zvýší `schema_version`, doplní validace, test starého záznamu a tento dokument.
