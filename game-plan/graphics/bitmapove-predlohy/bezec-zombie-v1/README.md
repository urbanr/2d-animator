# Animátor — Běžec / zombie, bitmapy na kostře

Samostatný experiment vytvořený 15. 9. 2026 na přímý návrh uživatele.
Nenahrazuje původní Postavy ani jejich PNG, produkční profil nebo vybrané varianty.

## Použití

Otevři společné preview a sekci **Animátor**. Výchozí pohyb je aktuálně uložená
`Zombie · šouravá chůze v1`. Lze vybrat i chůzi nebo sprint ze stejné knihovny.
Tlačítko „Načíst uložené pózy“ načte změny provedené v editoru Póz; nerozpracované
změny tohoto okna zahodí pouze po potvrzení.

- Přehrávání používá skutečné tempo klipu, volitelně interpoluje úhly mezi
  uloženými pózami nejkratší cestou. Poslední fáze přechází do první, nikoli
  do opakované koncové bitmapy.
- Barevná kostra ukazuje totožnost bližší a vzdálenější končetiny.
- „Upravit klouby myší“ zastaví přehrávání. Zvol ovládanou stranu, táhni za
  klouby. S rodičovským kloubem se pohybují jeho navázané části.
- Uložení vytváří **nový klip** v `graphics/kostry/skeletons.json` přes existující
  lokální službu. Nepřepisuje původní klip. Neuložené úpravy jsou pouze v okně.
- Lze stáhnout aktuální průhledné PNG, list přesných uložených póz nebo JSON
  obsahující skin a konkrétní klip. JSON odkazuje na zde uložené PNG díly;
  neobsahuje jejich obrazová data. Export nemá kostru, ovládací prvky ani zem.

## Bitmapové podklady a zadání

Použit byl **vestavěný ImageGen**, nikoli API/CLI. Není to vystřižení viditelných
částí jedné fotografie: model vytvořil samostatné kompletní díly podle Běžce,
aby kresba pokračovala také pod sousedním kloubem.

- [Zadání atlasu](source/prompt.txt), [původní atlas](source/parts-atlas.png).
  Model vrátil 1254 × 1254 px a skutečnou alfu navzdory požadavku na šedý podklad.
  Alfa byla zachována; díly se neškálovaly ani nepřekreslovaly při importu.
- [Oprava trupu](source/torso-v2-prompt.txt), [její původní obrázek](source/torso-v2-generated.png).
  První trup měl přikreslený rukáv. Druhý je bez paže; neutrální šedé okolí
  bylo odstraněno stejnou lokální metodou jako u spritů.
- [Skin](skin.json): 14 aktivních bitmap, souřadnice úchytů v pixelech,
  pořadí vrstev, rozměry a otisky souborů. Starý trup zůstává v `parts/torso.png`,
  aktivní je `parts/torso-v2.png`. Původní skin je v `source/skin-before-torso-fix.json`.
- [Kontrolní list](preview-snapshot-v2/sheet.png) a klip v téže složce odpovídají
  stavu při dokončení pokusu. Starší `preview-snapshot/` je kontrola před opravou
  trupu a není aktuální náhled.

## Jak to funguje

### Rychlost postupu a podlaha

Pózy i Animátor sdílejí pole klipu `move_speed_pt_s` (0–1000 herních bodů/s,
nezávislé na `fps`). Starší klip bez pole v náhledu používá návrhových 8 bodů/s;
soubor se sám nemigruje, hodnota se zapíše při výslovném uložení. Starý klient,
který pole při aktualizaci nepošle, už uloženou rychlost nezmění.

Přepínač „Pohyb vpřed“ je pouze nastavení náhledu: vypnuto znamená pohyb na
místě. Zapnutá postava se pohybuje ve směru kresby (kostra doprava, Běžec
doleva) a po odchodu mimo obraz se cyklicky vrací. Oba editory mají 16 jednotek
kostry na herní bod, tedy šířku plátna 32 bodů, nezávisle na velikosti okna.
Při zastavení nebo výběru snímku se postava vrací do středu pro ruční editaci.

Žlutá podlaha je v obou editorech pevně na `y=392`, bez automatického srovnávání
siluety. V Animátor je i v náhledech snímků. Tlačítka ↑/↓ a číselné pole výšky
mění pouze `bodyY` vybraného snímku; Shift znamená krok 10 jednotek. Podlaha,
vodorovný náhledový posun ani jeho přepínač se nezapisují do bitmapových exportů.
JSON export obsahuje rychlost i převod jednotek. Průhledné PNG zůstávají bez země.

`tool/cutout-rig.js` používá přímo `PoseRig.points()` a uložené klouby. Každý díl
má dva úchyty, které se podobnostní transformací (posun, rotace, jednotné měřítko)
napojí na dva body kosti. Délky končetin zůstávají stálé i mezi klíčovými pózami.
Červená bota je vždy součástí bližší nohy, hnědá vzdálenější. Směr doleva je
projekce geometrie, nikoli přebarvování nebo záměna bitmap. Vzdálenější vrstvy
se kreslí pod bližšími. Nádrž se otáčí s trupem, hlava s krkem a hlavovým kloubem.

Nové soubory nejsou v původním katalogu sprite variant a nejsou automaticky
exportované do iPhone prototypu. Přehrávač ani export tohoto pokusu neaplikuje
jas/kontrast/obrys ze starého produkčního pipeline; jde o kontrolu rigování.

## Omezení prvního pokusu

Kostra přesně určuje pohyb, neřeší ale všechny výtvarné problémy sama. Jde o
pevné bitmapové díly, bez deformovatelné sítě, změny pohledu nebo automatické
opravy překryvů. Poměry částí a švy jsou ručně kalibrovaný první návrh. U ramen
může být vidět nepřesnost mezi bočním průramkem trupu a geometrickou kostrou;
kolenní kryty, zápěstí a pas potřebují výtvarné posouzení. Ocas šátku a látkové
cáry jsou zatím pevnou součástí svých dílů. Skin je kalibrovaný pro zombie;
extrémní sprintové ohyby mohou odhalit spoje výrazněji.

## Ověření

- Geometrické testy všech úchytů, délek nohou, identity dílů, pořadí vrstev,
  průchodu šířky ramen nulou a interpolace přes 8 → 1.
- Test ovládání: myš v zrcadleném pohledu, krokování přes konec cyklu, undo,
  uložení nové kopie, zachování původních záznamů, selhání uložení a export.
- Kontrola načtení samostatné sekce přes běžící lokální server a vizuální
  kontrola osmi složených bitmapových póz.

Původní editor i původní Postavy zůstaly funkční; jejich regresní testy prošly.
