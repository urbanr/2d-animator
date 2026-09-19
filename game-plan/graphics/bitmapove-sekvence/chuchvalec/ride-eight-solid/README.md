# Chuchvalec — souvislé plochy, osm snímků

Aktuální pokus s pevnou paletou, čeká na výtvarné posouzení. Přehrávač je v `../../../tool/index.html`.

Existující osmice má zjednodušené souvislé oblasti barev; žádný nový obraz nebyl generován. Paleta má černou a dvanáct skupin po maximálně třech tónech. Drobné ostrůvky odstínů se slučují do sousedního odstínu stejného materiálu, černá kresba a odlišně barevné detaily zůstávají zachované. Kůže boty používá tři pevně definované výplně. Po tomto kroku se barvy už nemíchají a nepřidává se stínování ani dithering.

Osm PNG má 384 × 480 px a průhledné pozadí. Exportovaná data prošla kontrolou: všechny neprůhledné pixely patří do palety; výřez boty 35 × 15 px na (150,400) obsahuje 2 barvy a je shodný napříč osmi snímky. Tím se neprohlašuje za schválenou kvalita pohybu nebo kresby celé postavy. Všechny výsledky jsou v `animation.json`, paleta v `palette.json` a opakovatelné sestavení v `../source/solid-eight.mjs`.
