# Prdel světa — fáze 1: fyzický prototyp

Tři soubory Swift, jeden nový iOS projekt v Xcode. Cíl fáze: ověřit, že stavění
z dílů s reálnou fyzikou a lámáním baví, ještě než se přidají nepřátelé.

## Založení projektu (Xcode 15+)

1. File → New → Project → iOS → **App**. Product Name `PrdelSveta`,
   Interface **SwiftUI**, Language **Swift**. Testy nepotřebuješ.
2. V nastavení targetu → General → Deployment Info: zaškrtni jen
   **Landscape Left** a **Landscape Right**, vypni Portrait.
3. Do projektu přetáhni `Part.swift` a `GameScene.swift`
   (zaškrtni "Copy items if needed" a target PrdelSveta).
4. Obsah vygenerovaného `ContentView.swift` nahraď tímto `ContentView.swift`.
5. Spusť na simulátoru (iPhone 15 v landscape) nebo rovnou na telefonu —
   na telefonu funguje i haptika.

Nemám tu Xcode, takže kód není zkompilovaný. Pokud se něco nesejde, pošli mi
chybu a opravím to.

## Co prototyp umí

- Lišta dole: 3 konstrukce (Klacek, Trám, Železo), 3 pláty (Papír, Dřevo, Plech).
- Tažení prstem nad lištou = ghost dílu, čas běží 0,25×. Puštění = díl se
  usadí, přichytí ke koncům/rohům jiných dílů nebo k zemi a vzniknou čepové spoje.
- **Otočit** přepíná vodorovný/svislý díl.
- **Nálož**: klepnutí kamkoli = výbuch. Spoje blízko centra prasknou, díly dostanou
  impulz a poškození `base × (1 − d/r)²`, jádro také.
- Spoje se lámou, když síla ve spoji překročí `breakForce` slabšího z obou dílů.
  Kotvení do země má dvojnásobek. Prasknutí = jiskra.
- Díly s HP ≤ 0 zmizí, díly tmavnou podle poškození.
- Jádro (žlutý kruh) má 1000 HP, poškozuje ho výbuch i náraz dílu. Po zničení
  "JÁDRO V PRDELI", tlačítko Reset.
- Vpravo nahoře: počet dílů, spojů a **max síla ve spoji** — to je kalibrační číslo.

## Kalibrace (Part.swift → Tuning a Catalog)

Jednotky SpriteKitu: 150 pt ≈ 1 m, hmotnost v kg, síla v N, impulz v N·s.

1. Postav vodorovný Klacek na dva svislé Klacky (bránu). Sleduj max sílu.
   Měla by být pod `breakForce` klacku (180). Když praská sama od sebe,
   zvedni `breakForce` nebo sniž hmotnosti.
2. Na tu bránu polož Plech (4 kg). Klacky by měly prasknout, Trámy vydržet.
   Pokud ne, uprav poměr `breakForce` mezi materiály — cíl je, aby se hráč
   naučil "ocel na klacky nepatří" během dvou vln.
3. Nálož do papírové zdi: papír pryč, dřevo poškozené, plech skoro nic.
   Ladí se `explosionDamage` a `explosionRadius`.
4. Nálož vedle klacků: mají odletět. `explosionImpulse` 12 = klacek (1 kg)
   dostane až 12 m/s. Železo (8 kg) jen 1,5 m/s. To je záměr.

## Známé zjednodušení prototypu

- Spoje jsou jen čepové (pin). Plát má 4 rohy, takže dva čepy k témuž dílu
  fungují jako pevný spoj. Pevný spoj (`SKPhysicsJointFixed`) přijde s
  upgradem "kování".
- Díl puštěný do vzduchu bez kotvy prostě spadne. Test stability se řeší až
  ve fázi 3 (stavěcí UI).
- Nálož nemá omezení umístění — v prototypu je to ladicí nástroj, ne zbraň nepřítele.
- Bez undo, bez obchodu, bez nepřátel.

## Další fáze

Fáze 2: lehcí nepřátelé bez fyzických těl (pole struktur, vlastní update,
kolize kruh/obdélník), cíl 300 kusů při 60 fps, útok na nejbližší díl,
poškození padajícím dílem = hmotnost × rychlost × 3.
