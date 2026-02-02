# Návod na úpravu obsahu webstránky

Tento dokument slúži ako jednoduchý manuál na úpravu obsahu webstránky priamo cez webové rozhranie GitHub. Po uložení zmien sa webstránka automaticky zaktualizuje do niekoľkých minút.


## Ako upravovať obsah

Všetky dôležité súbory pre úpravu textov a projektov sa nachádzajú v adresári `src/`.

### 1. Úprava a pridávanie projektov

Projekty sa nachádzajú v adresári: `src/content/projects/`.

Každý projekt má svoj vlastný podadresár, ktorého názov slúži ako jeho unikátne ID (napr. `dom-pod-borovicami`). Vnútri každého adresára projektu sú nasledujúce súbory:

- `index.sk.md`: Hlavný textový obsah projektu v **slovenčine**.
- `index.cz.md`: Hlavný textový obsah projektu v **češtine**.
- `data.json`: Spoločné dáta pre oba jazyky, ako napríklad `order`, `headerImageNumber`, `lokalita`, atď.
- `gallery/`: Adresár s obrázkami a fotografiami k projektu.

**Dátové polia v projektoch**
Každý projekt môže mať nasledujúce dátové polia:
  - `title`: Názov projektu, môžete v ňom pridať `<br/>` na mieste, kde sa má zalomiť riadok
  - `description`: Popis projektu
  - `tags`: Pole tagov, povolené sú hodnoty "domov-na-mieru" a "habitat-konfigurator".
  - `order`: Poradie projektu v celkovom zozname projektov
  - `otherProjects`: Zoznam projektov, ktoré sa majú zobraziť na stránke tohto projektu na spodu
  - `headerImageNumber`: Koľký obrázok v galérii má byť hlavným obrázkom projektu (default je prvý).
  - `lokalita`: Lokalita projektu
  - `vykurovanaPlocha`: Metre štvorcové
  - `vykurovanaPlochaSuffix`: Čo má byť ešte za m2, napr. " / dom" pri radovej zástavbe viacerých domov
  - `uzitkovaPlocha`: Metre štvorcové
  - `uzitkovaPlochaSuffix`: Čo má byť ešte za m2, napr. " / dom" pri radovej zástavbe viacerých domov
  - `pocetIzieb`: Počet izieb
  - `pocetIziebSuffix`: Čo má byť ešte za počtom izieb, napr. " / dom" pri radovej zástavbe viacerých domov
  - `rozmeryDomu`: Rozmery domu, napr. "20 x 15 m"
  - `slug`: Čo má byť v URL projektu za "https://habitat.sk/projekty/", napr. "dom-pod-borovicami"

Tieto dáta môžu byť uložené:
  - buď v `index.sk.md` a `index.cz.md`, hlavne v prípade, že ide o prekladané texty,
  - alebo v `data.json`, hlavne pre polia, ktoré majú rovnaké hodnoty bez ohľadu na jazyk.

**Ako upraviť existujúci projekt:**

1.  Prejdite do adresára konkrétneho projektu.
2.  Kliknite na súbor, ktorý chcete upraviť (`index.sk.md`, `data.json`, ...).
3.  Kliknite na ikonu ceruzky (Edit this file) vpravo hore.
4.  Vykonajte zmeny a uložte ich kliknutím na zelené tlačidlo "Commit changes".

**Ako pridať nový projekt:**

1.  Prejdite do adresára `src/content/projects/`.
2.  Vpravo hore kliknite na "Add file" -> "Create new file".
3.  Do poľa pre názov súboru napíšte názov nového adresára a za neho lomítko, napr. `nazov-noveho-projektu/`. Tým sa vytvorí nový adresár.
4.  Najjednoduchšie je skopírovať si štruktúru a obsah súborov (`index.sk.md`, `data.json` atď.) z existujúceho projektu a následne ich upraviť.
5.  Nezabudnite do podadresára `gallery/` nahrať obrázky.

### 2. Úprava a pridávanie blog postov

Blogy sa nachádzajú v adresári: `src/content/blog/`.

Každý blog post má svoj vlastný podadresár, podobne ako projekty. Vnútri každého adresára blogu sú nasledujúce súbory:

- `index.sk.mdx`: Hlavný textový obsah blogu v **slovenčine**.
- `index.cz.mdx`: Hlavný textový obsah blogu v **češtine**.
- `data.json`: Spoločné dáta pre oba jazyky, ako napríklad `order`, `date`, `otherBlogPosts`, atď.
- `gallery/`: Adresár s obrázkami použité v blog poste.

**Dátové polia v blogoch**
Každý blog môže mať nasledujúce dátové polia (v `data.json` alebo v záhlaví `.mdx` súborov):
  - `title`: Názov blogu
  - `description`: Krátky popis (zobrazuje sa v zozname blogov)
  - `date`: Dátum zverejnenia (formát napr. "2025-01-08")
  - `otherBlogPosts`: Zoznam blog postov, ktoré sa majú zobraziť na konci článku, napr. `"otherBlogPosts": ["novinky-tri-realizacie-domov-na-mieru", "vzduchotesnost-stavby-strasiak-alebo-ciel"]`
  - `headerImageNumber`: Poradie obrázku v galérii, ktorý sa má použiť ako náhľadový a titulný.
  - `order`: Manuálne poradie (ak chcete blog post posunúť hore nezávisle na dátume)
  - `slug`: URL adresa článku (napr. "ako-sa-stavia-pasivny-dom"). Mal by byť použitý v prekladaných index.cz.mdx, aby bola aj url článku v danom jazyku.

**Pridávanie obrázkov do textu blogu:**
Do blogov sa dajú pridávať obrázky z galérie priamo do textu:
- Jeden obrázok: `![](gallery/1.webp)`
- Viac obrázkov vedľa seba: 
  ```markdown
  <BlogImageRow>
  ![](gallery/2.webp)
  ![](gallery/3.webp)
  </BlogImageRow>
  ```

**Postup úpravy a pridávania** je rovnaký ako pri projektoch, len v adresári `src/content/blog/`.

### 3. Úprava ostatných častí webu

Ostatné texty sa upravujú v nasledujúcich súboroch. **Dôležité:** V týchto súboroch upravujte iba samotné texty, dávajte pozor, aby ste nezmenili okolitý kód.

- **Úvodná stránka**
  - SK: `src/pages/index.astro`
  - CZ: `src/pages/cz/index.astro`
- **Hlavné menu**: `src/components/Layout.astro`
- **Pätička stránky**: `src/components/Footer.astro`
- **Preklady textov použitých v komponentách**
  - SK: `src/i18n/sk.ts`
  - CZ: `src/i18n/cz.ts`

### Formátovanie obsahu (Markdown a JSON)

Texty v `.md` súboroch používajú jednoduchý formátovací jazyk Markdown. Dáta v `.json` súboroch majú tiež svoju štruktúru. Nemusíte sa ich učiť naspamäť, stačí sa držať štýlu, akým sú napísané ostatné texty.

-   [Stručný návod na Markdown syntax](https://www.markdownguide.org/cheat-sheet/)
-   [Stručný návod na JSON syntax](https://www.w3schools.com/js/js_json_syntax.asp)

### Automatické nahrávanie stránky na habitat.sk

Pri každej uloženej zmene sa celá stránka pregeneruje a nahrá na habitat.sk zvyčajne do minúty.

## Lokálne vývojové prostredie

Nie je nutné, stačí používať rozhranie github.com

Ak to ale chcete rozbehať na vlastnom počítači lokálne:
- Nainštalovať node js
- `npm install` nainštaluje potrebné balíčky
- `npm run dev` spustí lokálny webový server s automatickým pregenerovaním stránky pri každej zmene súboru
- `npm run build` vygeneruje celý web do adresára `dist/`