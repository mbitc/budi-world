# 🪐 BUDI World (`budi-pipeline`)

> **Autonominė, evoliucionuojanti technogeninio meno ir naratyvo sistema, veikianti Budi mieste bei Marse.**

`budi-world` yra eksperimentinis projektas, jungiantis generatyvinį dirbtinį intelektą, realaus pasaulio naujienų srauto analitiką (`hype-feed-10c`) ir interaktyvų sci-fi naratyvą lietuvių kalba.

Kiekvieną parą automatinis agentas atnaujina pasaulio būseną, sugeneruoja naują epizodą, kaupia struktūrizuotus žurnalus ir išsaugo rezultatus gyvai per „GitHub Pages".

---

## 🏛️ Pasaulio Veikėjai ir Struktūra

Simuliacija seka šešių pagrindinių veikėjų santykius, vidines būsenas bei jų migraciją tarp Budi miesto ir Marso lokacijų:

| Veikėjas | Vaidmuo |
| --- | --- |
| **Vauris** | Technogeninio tinklo architektas, tyrinėjantis tiesioginių p2p srautų ir bangų laukų sąveikas. |
| **Bauderis** | Pragmatiškas sistemų inžinierius, atsakingas už infrastruktūrą ir resursų valdymą. |
| **Pijus** | Marso kolonijos stebėtojas, fiksuojantis tolimojo ryšio anomalijas. |
| **Aja** | Budi miesto duomenų analitikė, siejanti išorinius naujienų impulsus su vietos įvykiais. |
| **Garletas P.** | Nepriklausomas operatorius, veikiantis pilkosiose tinklo zonose. |
| **Wau Ku / Ilis** | Generatyvinė tinklo sąmonė / skaitmeninis subjektas. |

---

## ⚙️ Architektūra ir Veikimo Principas

1. **Kasdienis ciklas** (`.github/workflows/daily.yml`)
   - Kiekvieną naktį (00:00 UTC) GitHub Actions paleidžia simuliacijos skriptą.
2. **Duomenų apdorojimas** (`src/generate.js`)
   - Paimami išoriniai naujienų impulsai bei esama pasaulio būsena (`data/world_state.json`).
   - Pasitelkiant `GEMINI_API_KEY`, sugeneruojamas naujas naratyvo epizodas lietuvių kalba.
3. **Žurnalų kaupimas** (Data Logging)
   - `data/episodes_log.jsonl` – mašininiu būdu nuskaitomas pilnas epizodų ir būsenų žurnalas.
   - `output/episodes_archive.md` – žmonėms skaitomas viso naratyvo archyvas Markdown formatu.
   - `docs/index.html` – naujausias epizodas, paruoštas gyvai peržiūrai GitHub Pages tinklalapyje.
4. **Automatinis įrašymas** (Auto-Commit)
   - Sugeneruoti failai ir logai automatiškai sukomituojami ir išsiunčiami atgal į `main` šaką su `[skip ci]` žyma.

---

## 🚀 Vietinis Paleidimas (Local Setup)

Norėdami paleisti simuliaciją savo vietinėje mašinoje (pvz., Arch Linux aplinkoje):

### 1. Klonuokite repozitoriją ir įdiekite priklausomybes

```bash
git clone https://github.com/mbitc/budi-world.git
cd budi-world
npm install --legacy-peer-deps
