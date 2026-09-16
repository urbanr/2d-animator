# Animátor: datový model a pravidla

Tento dokument je zdroj pravdy pro vztah mezi bitmapovými díly, kostrou, animací a herní postavou. Při změně editoru nebo ukládání se musí aktualizovat společně s kódem. Uživatelské JSON soubory se nemigrují hromadně; převod proběhne až při výslovném uložení konkrétní položky.

## Pojmy a vlastnictví dat

### Bitmapová předloha (`skin`)

- Katalog je v `graphics/characters2/skins.json`, konkrétní předloha v adresáři postavy jako `skin.json`.
- Obsahuje zdrojové soubory dílů, jejich rozměry, počáteční a koncový bod, výchozí ukotvení, pořadí vrstev a výchozí přechody průhlednosti.
- `pelvis` a `shoulders` jsou pouze geometrické body kostry. Nemají vlastní vykreslovanou bitmapu.
- Zdrojové cesty a kontrolní součty editor nikdy nepřepisuje z dat poslaných prohlížečem.
- Herní postava si ukládá vlastní snapshot předlohy. Díky tomu může mít jiné pořadí, ukotvení, rotační středy, natočení, měřítko a přechody než jiná postava ze stejného zdroje.

### Póza (`pose`)

- Póza je jeden stavební snímek v `graphics/poses/poses.json`, kolekci `poses`. Je vidět v knihovně uvnitř editoru Koster, ale v Animátoru se už nevydává za celou kostru.
- Póza ukládá polohu kloubů jednoho snímku (`frame`) a může nést také délky kostí (`rig_lengths`) a úhlové limity (`joint_limits`).
- Výchozí kloubové limity jsou nyní maximální, −180° až +180°. Jsou připravené i pro budoucí fyziku, ale editor je zatím používá hlavně při tažení kloubů.
- Délka jedné kosti je 5 až 250 jednotek kostry. Ramena a pánev mají pracovní šířku −300 až +300 %, aby šlo strany prohodit přes střed a použít až trojnásobný rozestup.
- Póza neobsahuje obrázky, pořadí vrstev ani rychlost pohybu postavy.

### Kostra / kosterní animace (`clip`)

- Je v `graphics/poses/poses.json`, kolekce `clips`.
- Obsahuje 2 až 32 póz, tempo, rychlost vpřed, délky kostí, limity kloubů a pouze kosterní výjimky snímků.
- Stejný seznam `clips` ukazuje editor Koster i sekce Kostry v Animátoru. Bitmapová předloha se sem neukládá.

### Hotová animace (`finished_animation`)

- Je v `graphics/poses/poses.json`, samostatná kolekce `finished_animations`.
- Je to kombinace celé kosterní animace s bitmapovou předlohou, včetně bitmapových výjimek snímků a odkazů `skin_id` a `skeleton_id`.
- Je to globální zásobník bez vlastnictví konkrétní postavou. Načtení nastaví uloženou bitmapovou předlohu i kosterní animaci a odpojí aktivní animaci postavy.

### Animace postavy

- Je samostatný snapshot pohybu uvnitř `character.animations` v `graphics/characters2/game-characters.json`.
- Jedna postava může mít libovolný počet pojmenovaných animací; každá má stabilní ID. `default_animation_id` ukazuje na výchozí animaci postavy.
- Animace vlastní `frames`, `fps`, `move_speed_pt_s`, `rig_lengths`, `joint_limits`, `frame_edits` a informativní `source_clip_id`.
- `frame_edits` dovolují výjimky konkrétního snímku ve třech oddílech: `pose_base` pro pózu, `lengths` pro poměr délky kostí a `parts` pro bitmapové transformace či přechody.
- Uložení animace mění pouze vybranou animaci vybrané postavy. „Uložit jako“ přidá další animaci. Koš v horním řádku ji odebere pouze z postavy; globální předloha zůstane beze změny.

### Herní postava (`character`)

- Katalog je v `graphics/characters2/game-characters.json`; aktuální zapisované schéma je `schema_version: 2` a renderer `cutout-rig-v2`.
- Postava vlastní jméno, snapshot bitmapové předlohy, budoucí herní atributy, `motion.variation_percent` a kolekci přiřazených animací.
- Rozptyl rychlosti je 0 až 90 %. Je vlastností postavy, zatímco tempo a základní rychlost vpřed patří jednotlivé animaci.
- Uložení postavy nemá tiše přepsat její animace. Uložení animace nemá měnit bitmapovou předlohu, jinou animaci ani globální clip.
- Smazání postavy nesmí mazat zdrojové bitmapy ani globální kostry a pohybové předlohy.
- Herní atributy postavy jsou plánované, ale zatím nemají v editoru ani schématu konkrétní pole.

## Rozsah úprav

- **Snímek**: změna se uloží jako výjimka aktuálního snímku. U bitmapy je posun relativní k základnímu uchycení a velikost relativní k základnímu měřítku.
- **Animace**: změna se promítne do všech snímků se zachováním jejich rozdílů. U bitmapy mění společný základ ve snapshotu postavy. Výjimkou je přechod průhlednosti: vybraný konec dostane jednu společnou masku v místních souřadnicích dílu a jeho staré snímkové výjimky se odstraní, aby maska ve všech pózách stejně následovala kost. Druhý konec a ostatní vlastnosti snímků se nemění.
- Režimy **Kostra** a **Bitmapa** jsou výlučné a nikdy se nepřepnou pouhým kliknutím do plátna.
- Změna režimu, rozsahu nebo nástroje sama nemění data a nevytváří krok Zpět. Jeden souvislý tah je jeden krok Zpět.

## Pracovní postup knihoven

1. Uživatel samostatně vybere **Kostru** a **Bitmapovou předlohu**.
2. Jejich kombinací sestaví rozpracovanou obecnou animaci. Kostra ani bitmapová předloha tím nezačnou patřit žádné herní postavě.
3. Rozpracovaný pohyb lze uložit do globálního zásobníku **Hotové animace** nebo ho zvláštním tlačítkem přiřadit vybrané herní postavě.
4. Seznam koster i hotových animací se po uložení, uložení jako, smazání a obnovení ihned znovu sestaví z aktuálního katalogu.
5. Disketa přepisuje vybranou položku se zálohou, plus vytváří novou položku a koš ji přesouvá do vratného koše.
6. Výběr Kostry je začátek nové práce: po potvrzení načte všechny snímky vybrané kosterní animace, ponechá zvolenou bitmapovou předlohu a odpojí animaci vybranou u postavy.
7. Jakákoli datová změna okamžitě odpojí hodnotu **Animace postavy**. Upravený pohyb lze k postavě uložit pouze jako novou animaci; původní zůstává beze změny, dokud ji uživatel samostatně nesmaže.
8. Jakákoli datová změna v animačním panelu rozsvítí červenou hvězdičku za popisem pole Kostry i Hotové animace. Hvězdička není součást názvu ani položky seznamu.

## Kompatibilita a bezpečnost zápisu

- Starší záznam s jediným polem `animation` se při prvním zápisu načte jako jedna položka `animations`.
- Pole `animation` se dočasně zachovává jako kopie výchozí animace pro starší čtečky. Kanonická data jsou `animations` a `default_animation_id`.
- Každá změna postavy nebo její animace posílá `expectedRecord`. Pokud mezitím jiná karta záznam změnila, zápis se odmítne místo tichého přepsání.
- Před přepsáním nebo smazáním se uloží záloha do `graphics/characters2/history/`. Katalog se zapisuje přes dočasný soubor a atomické přejmenování.
- Všechny akce Uložit, Uložit jako a Smazat vyžadují potvrzení uživatele.

## Ovládání panelu Úpravy

- `1` nebo `+`: Kostra / Bitmapa.
- `2` nebo `ě`: tento Snímek / celá Animace.
- `3` nebo `š`: Posun → Rotace → Velikost → Posun.
- Mezerník: přehrát nebo pozastavit. `Y`: předchozí snímek. `X` nebo `C`: další snímek. `WASD`: posun. `Q` / `E`: rotace.
- Zkratky neplatí při psaní do pole, výběru nebo textové oblasti. Přepínače v záhlaví a uvnitř rozbaleného panelu ovládají stejný stav.

## Známá omezení a další záměry

- Postava zatím nemá definované herní atributy mimo rozptyl rychlosti.
- `animation` je pouze dočasná kompatibilní kopie a má být odstraněna teprve po převodu všech herních čteček na `animations`.
- Knihovna globálních hotových animací a animace přiřazené postavám jsou záměrně dvě různé vrstvy. Editor nesmí jejich názvy ani tlačítka znovu sloučit do jedné nejasné operace.
- Fyzika může později převzít `joint_limits`; oddělení částí těla po zásahu ani fyzikální vazby zatím implementované nejsou.
- Při změně schématu se zvýší `schema_version`, doplní validace, test starého záznamu a tento dokument.
