# Ověření — 15. 9. 2026

- Xcode 26.1.1, simulátor iPhone 17 Pro / iOS 26.1.
- Swift sestavení pro simulátor: úspěšné.
- Swift datový test: 18 mapových variant a 48 osmifázových animací, všechny PNG načtené.
- Automatický UI test: 1 úspěšný, 0 neúspěšných; otevření výběru, změna počtu 8→9, pauza, pokračování a restart.
- Vizuální kontrola: hřbitov, žlutá linka a osm běžců. Přímý SKView odstranil šedé vykreslení původního SpriteView wrapperu.
- Fyzické zařízení: Brick2 bylo při ověření `unavailable`; 0 platných signing identities.
- Podepsané sestavení pro telefon zastavilo Xcode hláškou `Signing for PrdelPrototype requires a development team`.
- Na fyzický iPhone aplikace zatím **není nainstalovaná**. Pokračování vyžaduje dostupný odemčený telefon a uživatelem zvolený Apple vývojářský tým/podpis.

Výsledek UI testu je lokálně v `.build/Logs/Test/Test-PrdelPrototype-2026.09.15_17-07-57-+0200.xcresult`.
