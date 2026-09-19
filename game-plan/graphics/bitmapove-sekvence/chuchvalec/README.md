# Aktuálně: první styl, brusle, osm snímků

Nejnovější pokyn zamítl rigovanou ride-v3. Aktuálních osm PNG je v `ride-eight/frames/` a přehrávač je načítá jako výchozí. Bez přidaného stínování a bez mezifází. Zadání pro ImageGen: `source/prompt-eight-brusle.txt`. Níže je historický popis starších návrhů.

# Chuchvalec — první návrh vzhledu a dýchání

**Aktuální návrh je [ride-v3 — brusle a jízda](ride-v3/README.md).** Má otáčení velkého kola i tří koleček brusle v poměru 1 : 3, pohyb paže a obou hlav. Přehrávač v `game-plan/tool/index.html` jej načítá jako výchozí. Verzi [idle-v2](idle-v2/README.md) uživatel zamítl jako příliš nehybnou. Obě starší varianty jsou zachované k porovnání. Následující popis dokumentuje původní osmifázový návrh, nikoli aktuální export.

Stav: návrh k doladění s uživatelem. Zpracován je pouze finální boss a jeho klidová animace. Ostatní obsah čeká na pokyn. Zdroj: design v `other`, kapitoly 16 a 18; balanc, list Bossové, řádek 15. Starší geometrický styl mění aktuální zadání uživatele na kreslené bitmapové sprity.

## Vzhled

První zvolená kombinace: Babička s válečkem + Traktor + Kolos z ledniček + Profesor Relativita. Čitelná levostranná silueta, rezavý motor a pneumatika, ledničky na zádech, dvě výrazné hlavy, montérky, ostnatý drát a zelený sliz. Kreslený arkádový vzhled vychází z uživatelovy preference bitmapových animací Street Fighter II/III. Postava je původní návrh pro Prdel světa.

Montérky zakrývají celý trup. Jde o výtvarný návrh jedné kombinace, nikoli zatím o modulární systém skládající všechny kombinace čtyř bossů.

## Soubory

- `../../tool/index.html` — přehrávač: detail, herní velikost a schéma obrazovky na šířku, krokování a rychlost. Původní `preview/index.html` přesměrovává na toto umístění.
- `chuchvalec-neutral@3x.png` — základní póza, 384 × 480 px, skutečný alfa kanál.
- `frames/` — osm jednotlivých snímků stejné velikosti, PNG bez ztrátové komprese.
- `chuchvalec-idle-sheet@3x.png` — arch 1536 × 1024 px, 4 × 2 políčka po 384 × 512 px.
- `preview/chuchvalec-idle.webp` — bezztrátově zabalená animace pro rychlé prohlížení, osm snímků, smyčka 1 s.
- `animation.json` — rozměry, kotva, pořadí, délka a původ snímků.
- `source/` — použité prompty, pracovní varianty a reprodukovatelné rozdělení archu. Pracovní varianta v2 má nakreslenou šachovnici a není exportem do hry.

## Rozměry pro iPhone

Herní obdélník spritu je **128 × 160 pt**. Dodaná bitmapa má **384 × 480 px**, tedy přesně třikrát tolik v každé ose. Tělo bez průhledných okrajů má přibližně 144 pt na výšku; běžná postava podle zadání 24 pt. Směr doleva, čára kontaktu se zemí na y = 468 px shora; kotva pro SpriteKit `(0.5, 0.025)`.

Velikost v bodech a počet pixelů jsou různé veličiny; princip škálování popisuje [Apple](https://developer.apple.com/documentation/UIKit/UIImage/scale). Rozměry spritu v herních jednotkách je třeba nastavit výslovně, neodvozovat je z velikosti celého archu. Referenční náhledy obrazovek jsou rozvržení v bodech, ne screenshot konkrétního telefonu. Skutečná hra musí číst rozměr obrazovky a safe area ze zařízení.

**Žádný snímek nebyl zmenšen ani převzorkován.** Generátor vytvořil arch v cílové velikosti; export pouze oddělil osm obdélníků 384 × 480 px. Z dolního okraje každého políčka zůstává mimo snímek 32 px bez viditelné kresby (u několika míst je zanedbatelná alfa 1/255). Shoda pixelů všech exportovaných PNG s odpovídajícím výřezem archu je automaticky ověřena. Velký arch je soubor osmi malých snímků, není to velký návrh jedné postavy určený ke zmenšení.

Dodaná sada je nativní **@3×**. Pro zařízení @2× zatím samostatná sada vytvořená není; po schválení stylu má vzniknout ve velikosti 256 × 320 px se samostatnou kontrolou hran. Nejde zatím o balíček otestovaný na všech iPhonech. Zvětšení v přehrávači slouží jen k prohlížení a nemění soubory.

## Animace a další doladění

Dýchání používá 8 jedinečných bitmap, výchozí rychlost 8 snímků/s a smyčku 1 s. Přehrávač dovoluje porovnat 6–16 snímků/s. Jsou vidět drobné změny ramen, obličejů, vlasů a slizu. Při zvětšení se mezi kreslenými snímky mění i malé detaily; tato sada je kalibrační návrh, nikoli tvrzení o hotové produkční animaci.

Cíl pro budoucí herní renderer je 60 fps; počet kreslených snímků je nezávislý. Plynulý posun postavy ve světě běží každý herní frame, kresby se střídají vlastním tempem. Pouhé zrychlení osmi obrázků nepřidá nové mezifáze. Po odsouhlasení vzhledu doporučený rozsah: chůze 10–12 kreseb, těžký útok 12–16 s čitelným nápřahem a dopadem, reakce na zásah 3–4, rozpad samostatnými čtyřmi částmi. Tyto animace nyní nejsou vytvořeny.

Ověřeno: skutečná průhlednost, rozměry všech osmi PNG, jedinečnost snímků, beze změny pixelů při oddělení, osm snímků v animovaném WebP a syntaxe přehrávače. Automatickou vizuální kontrolu HTML nešlo dokončit: lokální testovací prohlížeč není nainstalován a vestavěný prohlížeč blokuje místní adresy `file://`. Z tohoto důvodu nejsou ovládání a responzivní rozložení přehrávače označeny jako vizuálně otestované. PNG a animovaný WebP jsou nezávislé soubory. Výkon na fyzickém iPhonu a začlenění do Swift/SpriteKit zatím ověřeny nejsou.

Vytvořeno vestavěným nástrojem ImageGen. Přesné znění úspěšných promptů je v `source/prompt-idle.txt`, `source/prompt-revision-2.txt` a `source/prompt-alpha.txt`. Jedna mezilehlá oprava okrajů byla odmítnuta automatickou kontrolou obsahu; použitý návrh má následně celý trup v oblečení.
