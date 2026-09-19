# iPhone prototyp — Prdel světa

Samostatný Swift / SwiftUI / SpriteKit projekt, iPhone naležato, iOS 17+.
Není to webová galerie ve WebView. Adresář `protoyp` odpovídá zadání.

## Co umí

- Výběr mapy včetně variant a nepřítele včetně animačních alternativ.
- Jeden vybraný druh nepřítele, 1–100 kusů, pohyb **zleva doprava** v nekonečném průchodu.
- Žlutá linka z `graphics/levely/levels.json`, počítaná vůči skutečně zobrazenému obrázku.
- Mapa bez ořezu, při jiném poměru stran s černými okraji.
- Původní herní výška postav v bodech, ruční posuny a pořadí snímků z galerie.
- Zrcadlení původních levostranných animací doprava (včetně X posunů); možnost zrcadlení vypnout.
- Pauza, restart, rychlost, zkušební násobek velikosti a skrytí žluté linky.
- Offline balíček; aplikace nic nezapisuje zpět do galerie ani nemění produkční výběr.

## Podklady a opakované sestavení

Z kořene repozitáře:

```sh
swift game-plan/protoyp/Tools/ExportAssets.swift
open game-plan/protoyp/PrdelPrototype.xcodeproj
```

Exporter je rovněž ve Swiftu. Kopíruje již zpracované PNG beze změny;
brightness/contrast/darken se podruhé neaplikují. Kopíruje pouze katalogové animace,
ne staré experimentální obrázky mimo katalog. Čte aktuální linky přímo z `levels.json`
a ruční úpravy přímo ze `sprite-frame-offsets.json`. Seznam variant přebírá z
`tool/sprite-variants.generated.js`; po přidání nové postavy nejprve obnov tuto galerii.
Exportované `GameData/` a sestavení `.build*/` jsou obnovitelné a nepatří do Gitu.

Po změně linek či posunů na Macu znovu exportovat, sestavit a nainstalovat.
Telefon nepřebírá změny automaticky po síti.

## Simulátor

Vyber a spusť iPhone simulátor v Xcode. Alternativně s jeho UUID:

```sh
swift game-plan/protoyp/Tools/RunPrototype.swift --simulator UUID
```

## Fyzický iPhone

1. Připojit a odemknout telefon, potvrdit důvěru Macu a mít zapnutý Developer Mode.
2. Xcode → Settings → Apple Accounts: přihlásit svůj účet.
3. V projektu → target PrdelPrototype → Signing & Capabilities vybrat svůj Team.
4. Vybrat připojený iPhone a Run. Bundle ID: `cz.urbanradovan.prdelsveta.prototype`.

Nebo explicitně zadat UUID telefonu a Team ID (skript znovu exportuje podklady):

```sh
swift game-plan/protoyp/Tools/RunPrototype.swift --device UUID --team TEAM_ID
```

Skript používá automatické provisioning nastavení zvoleného týmu; žádné certifikáty
ani hesla se do projektu neukládají. Je-li bundle ID už obsazený, změnit jej na vlastní.

## Kontroly

```sh
swiftc game-plan/protoyp/Sources/PrototypeData.swift game-plan/protoyp/Tools/TestData.swift -o game-plan/protoyp/.build/verify-data
game-plan/protoyp/.build/verify-data
xcodebuild -project game-plan/protoyp/PrdelPrototype.xcodeproj -scheme PrdelPrototype -destination 'platform=iOS Simulator,id=UUID' -derivedDataPath game-plan/protoyp/.build -parallel-testing-enabled NO CODE_SIGNING_ALLOWED=NO test
```

Datový test kontroluje načtení všech PNG, rozměry map, osm unikátních cest snímků,
rozsah linek, převod souřadnic a cyklický pohyb. UI test otevře výběr, změní počet
a zkontroluje pauzu/restart. Screenshoty jsou součástí výsledku testu.

## Omezení

Jde o vizuální prototyp, bez kolizí, boje, profilů svahu a generování terénu.
Žlutá linka je kotevní výška plátna postavy; zachovává schválené ruční posuny,
neprovádí automatickou detekci chodidel. Výchozí animace běží 12 snímků/s.
Rychlost posunu je zkušební a není kalibrovaná na délku kroku každé postavy.

Apple dokumentace: https://developer.apple.com/documentation/xcode/building-and-running-an-app
