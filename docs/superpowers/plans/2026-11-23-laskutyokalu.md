# Laskutyökalu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statische Seite `rentunruusu.com/lasku`, auf der Olli links ein Formular ausfüllt und rechts live die Rechnung im Design von `laskut/lasku-pohja.html` sieht und als PDF speichert.

**Architecture:** Reines ES-Modul `hinnasto.js` (Preise + Rechenlogik, mit `node --test` getestet) und dünne DOM-Schicht `lasku.js`. Blatt-CSS wird wörtlich aus der Vorlage übernommen, nur um den Erittely-Block ergänzt. PDF = `window.print()` mit Druck-CSS.

**Tech Stack:** HTML, CSS, Vanilla-JS (ES-Module), Node 22 `node:test`, Vercel static (`cleanUrls`).

**Spec:** `docs/superpowers/specs/2026-11-23-laskutyokalu-design.md`

## Global Constraints

- Keine Bibliotheken, kein Build, keine externen Requests (keine Google Fonts, kein CDN).
- Formular-UI auf Finnisch.
- Preise nur in `website/lasku/hinnasto.js`; gerechnet in Cent (Ganzzahlen).
- Seite: `<meta name="robots" content="noindex, nofollow">`; `robots.txt` bekommt `Disallow: /lasku`; nicht in `sitemap.xml`.
- PDF = genau **eine** A4-Seite.
- Repo-Regel (CLAUDE.md): nach Änderungen committen **und** `git push origin main`.
- Arbeitsverzeichnis: `~/Library/Mobile Documents/com~apple~CloudDocs/rentunruusu` (Pfad hat Leerzeichen → immer quoten).

---

### Task 1: `hinnasto.js` — Preise und Rechenlogik (TDD)

**Files:**
- Create: `website/lasku/hinnasto.js`
- Test: `tests/lasku.test.mjs`

**Interfaces:**
- Produces (alle `export`):
  - `TILAT: { pianotupa, sali }` je `{ nimi, genetiivi, hinnat:{arki,pe,la}, siivous, liinat:{tapa:"kiintea"|"hlo", snt} }`
  - `ASTIAT_SNT_HLO = 200`, `LASKUTTAJA = { nimi, iban }`
  - `paivaLuokka(iso) → "arki"|"pe"|"la"|null`
  - `viikonpaiva(iso) → "ma".."su"|""`
  - `fiPvm(iso) → "31.10.2026"|""`
  - `lisaaPaivia(iso, n) → iso`
  - `euro(snt) → string`
  - `euroSyotteesta(str) → snt (Number, NaN bei Unsinn, 0 bei leer)`
  - `laskeRivit({tila, pvm, hlo, astiat, liinat, muuKuvaus, muuSnt}) → { rivit:[{selite, snt}], summa, huomautukset:[string] }`
  - `viite(iso) → "RR 31.10.2026"`
  - `tiedostonimi(iso, asiakas) → "lasku-2026-10-31-emmi-anttila"`

- [ ] **Step 1: Failing test schreiben** — `tests/lasku.test.mjs`:

```js
// Laskutyökalu — hinnaston laskenta. Aja repon juuresta: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TILAT, paivaLuokka, viikonpaiva, fiPvm, lisaaPaivia, euro, euroSyotteesta,
  laskeRivit, viite, tiedostonimi,
} from "../website/lasku/hinnasto.js";

const NB = " ", TH = " ";

test("viikonpäivä → hintaluokka (paikallinen päivä, ei UTC-siirtymää)", () => {
  assert.equal(paivaLuokka("2026-10-26"), "arki"); // ma
  assert.equal(paivaLuokka("2026-10-29"), "arki"); // to
  assert.equal(paivaLuokka("2026-10-30"), "pe");
  assert.equal(paivaLuokka("2026-10-31"), "la");
  assert.equal(paivaLuokka("2026-11-01"), "arki"); // su
  assert.equal(paivaLuokka(""), null);
  assert.equal(paivaLuokka("31.10.2026"), null);
  assert.equal(viikonpaiva("2026-10-31"), "la");
  assert.equal(viikonpaiva("2026-11-01"), "su");
});

test("kaikki 6 tila × päivä -hintaa hinnastosta 2026", () => {
  const vuokra = (tila, pvm) => laskeRivit({ tila, pvm }).rivit[0].snt;
  assert.equal(vuokra("pianotupa", "2026-10-29"), 19500);
  assert.equal(vuokra("pianotupa", "2026-10-30"), 22500);
  assert.equal(vuokra("pianotupa", "2026-10-31"), 27000);
  assert.equal(vuokra("sali", "2026-11-01"), 19500);
  assert.equal(vuokra("sali", "2026-10-30"), 22500);
  assert.equal(vuokra("sali", "2026-10-31"), 29500);
});

test("salin siivous 95 € lisätään aina, pianotuvassa ei riviä", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31" });
  assert.deepEqual(s.rivit.map((r) => r.selite), ["Tilavuokra · la 31.10.2026", "Siivous"]);
  assert.equal(s.summa, 39000);
  const p = laskeRivit({ tila: "pianotupa", pvm: "2026-10-31" });
  assert.equal(p.rivit.length, 1);
  assert.equal(p.summa, 27000);
});

test("astiat 2 €/hlö, liinat: sali 1,50 €/hlö, pianotupa 50 € kiinteä", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", hlo: 60, astiat: true, liinat: true });
  assert.deepEqual(s.rivit.slice(2), [
    { selite: "Astiat · 60 hlö × 2 €", snt: 12000 },
    { selite: "Valkoiset pöytäliinat · 60 hlö × 1,50 €", snt: 9000 },
  ]);
  assert.equal(s.summa, 29500 + 9500 + 12000 + 9000);
  const p = laskeRivit({ tila: "pianotupa", pvm: "2026-10-30", hlo: 20, astiat: true, liinat: true });
  assert.deepEqual(p.rivit.slice(1), [
    { selite: "Astiat · 20 hlö × 2 €", snt: 4000 },
    { selite: "Valkoiset pöytäliinat", snt: 5000 },
  ]);
});

test("henkilöhintainen lisä ilman henkilömäärää → huomautus, ei riviä", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", astiat: true, liinat: true });
  assert.equal(s.rivit.length, 2);
  assert.equal(s.huomautukset.length, 2);
  const p = laskeRivit({ tila: "pianotupa", pvm: "2026-10-31", liinat: true });
  assert.equal(p.rivit.length, 2); // kiinteä liina ei tarvitse hlö-määrää
  assert.equal(p.huomautukset.length, 0);
});

test("muu rivi lisätään, myös negatiivinen; tyhjä ohitetaan", () => {
  const a = laskeRivit({ tila: "sali", pvm: "2026-10-31", muuKuvaus: "Lisätunti", muuSnt: 500 });
  assert.deepEqual(a.rivit.at(-1), { selite: "Lisätunti", snt: 500 });
  assert.equal(a.summa, 39500);
  const b = laskeRivit({ tila: "sali", pvm: "2026-10-31", muuSnt: -2000 });
  assert.deepEqual(b.rivit.at(-1), { selite: "Muu", snt: -2000 });
  const c = laskeRivit({ tila: "sali", pvm: "2026-10-31", muuKuvaus: "x", muuSnt: 0 });
  assert.equal(c.rivit.length, 2);
  const d = laskeRivit({ tila: "sali", pvm: "2026-10-31", muuSnt: NaN });
  assert.equal(d.rivit.length, 2);
  assert.equal(d.huomautukset.length, 1);
});

test("ilman päivää tai tilaa: ei vuokrariviä, huomautus", () => {
  const r = laskeRivit({ tila: "sali", pvm: "" });
  assert.equal(r.rivit.length, 0);
  assert.equal(r.summa, 0);
  assert.equal(r.huomautukset.length, 1);
  assert.equal(laskeRivit({ tila: "", pvm: "2026-10-31" }).rivit.length, 0);
});

test("euromuotoilu suomeksi", () => {
  assert.equal(euro(29500), `295${NB}€`);
  assert.equal(euro(8250), `82,50${NB}€`);
  assert.equal(euro(123400), `1${TH}234${NB}€`);
  assert.equal(euro(-2000), `−20${NB}€`);
  assert.equal(euro(0), `0${NB}€`);
});

test("euroSyotteesta", () => {
  assert.equal(euroSyotteesta("82,50"), 8250);
  assert.equal(euroSyotteesta("82.5"), 8250);
  assert.equal(euroSyotteesta(" -20 "), -2000);
  assert.equal(euroSyotteesta(""), 0);
  assert.ok(Number.isNaN(euroSyotteesta("abc")));
});

test("päivämäärät, viite ja tiedostonimi", () => {
  assert.equal(fiPvm("2026-10-01"), "1.10.2026");
  assert.equal(fiPvm(""), "");
  assert.equal(lisaaPaivia("2026-12-25", 14), "2027-01-08");
  assert.equal(viite("2026-10-31"), "RR 31.10.2026");
  assert.equal(tiedostonimi("2026-10-31", "Emmi Anttila"), "lasku-2026-10-31-emmi-anttila");
  assert.equal(tiedostonimi("2026-10-31", "Äijälä Öljy & Co"), "lasku-2026-10-31-aijala-oljy-co");
  assert.equal(tiedostonimi("", ""), "lasku");
  assert.equal(TILAT.sali.siivous, 9500);
});
```

- [ ] **Step 2: Test laufen lassen, muss scheitern**

Run: `node --test tests/lasku.test.mjs`
Expected: FAIL — `Cannot find module .../website/lasku/hinnasto.js`

- [ ] **Step 3: `website/lasku/hinnasto.js` schreiben**

```js
// Rentun Ruusu — hinnasto 2026 ja laskun laskenta. Kaikki summat sentteinä.
// Hinnat muuttuvat? Muokkaa vain TILAT- ja ASTIAT-vakioita.

export const TILAT = {
  pianotupa: {
    nimi: "Pianotupa & keittiö",
    genetiivi: "Pianotuvan ja keittiön",
    hinnat: { arki: 19500, pe: 22500, la: 27000 },
    siivous: 0, // sisältyy hintaan
    liinat: { tapa: "kiintea", snt: 5000 },
  },
  sali: {
    nimi: "Sali & alakerta",
    genetiivi: "salin ja alakerran",
    hinnat: { arki: 19500, pe: 22500, la: 29500 },
    siivous: 9500, // lisätään aina
    liinat: { tapa: "hlo", snt: 150 },
  },
};

export const ASTIAT_SNT_HLO = 200;
export const LASKUTTAJA = { nimi: "Olli Hurskainen", iban: "FI55 3939 0069 8453 45" };

const LYHYET = ["su", "ma", "ti", "ke", "to", "pe", "la"];

function paiva(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function viikonpaiva(iso) {
  const d = paiva(iso);
  return d ? LYHYET[d.getDay()] : "";
}

export function paivaLuokka(iso) {
  const vp = viikonpaiva(iso);
  if (!vp) return null;
  return vp === "pe" || vp === "la" ? vp : "arki";
}

export function fiPvm(iso) {
  const d = paiva(iso);
  return d ? `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}` : "";
}

export function lisaaPaivia(iso, n) {
  const d = paiva(iso);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function euro(snt) {
  const a = Math.abs(Math.round(snt));
  const e = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const c = a % 100;
  return (snt < 0 ? "−" : "") + e + (c ? "," + String(c).padStart(2, "0") : "") + " €";
}

export function euroSyotteesta(str) {
  const s = String(str ?? "").trim().replace(/\s/g, "").replace(",", ".").replace("−", "-");
  if (s === "") return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

const hloTeksti = (snt) => euro(snt).replace(" €", " €");

export function laskeRivit({ tila, pvm, hlo, astiat, liinat, muuKuvaus, muuSnt } = {}) {
  const rivit = [];
  const huomautukset = [];
  const t = TILAT[tila];
  const luokka = paivaLuokka(pvm);
  const n = Number.isInteger(Number(hlo)) && Number(hlo) > 0 ? Number(hlo) : 0;

  if (!t || !luokka) {
    huomautukset.push("Valitse tila ja tilaisuuden päivä, niin vuokra lasketaan.");
  } else {
    rivit.push({ selite: `Tilavuokra · ${viikonpaiva(pvm)} ${fiPvm(pvm)}`, snt: t.hinnat[luokka] });
    if (t.siivous) rivit.push({ selite: "Siivous", snt: t.siivous });

    if (astiat) {
      if (n) rivit.push({ selite: `Astiat · ${n} hlö × ${hloTeksti(ASTIAT_SNT_HLO)}`, snt: n * ASTIAT_SNT_HLO });
      else huomautukset.push("Astiat: anna henkilömäärä.");
    }
    if (liinat) {
      if (t.liinat.tapa === "kiintea") rivit.push({ selite: "Valkoiset pöytäliinat", snt: t.liinat.snt });
      else if (n) rivit.push({ selite: `Valkoiset pöytäliinat · ${n} hlö × ${hloTeksti(t.liinat.snt)}`, snt: n * t.liinat.snt });
      else huomautukset.push("Pöytäliinat: anna henkilömäärä.");
    }
  }

  if (Number.isNaN(muuSnt)) huomautukset.push("Muu rivi: summa ei ole luku.");
  else if (Number.isFinite(muuSnt) && muuSnt !== 0)
    rivit.push({ selite: (muuKuvaus || "").trim() || "Muu", snt: muuSnt });

  return { rivit, summa: rivit.reduce((s, r) => s + r.snt, 0), huomautukset };
}

export function viite(iso) {
  const p = fiPvm(iso);
  return p ? `RR ${p}` : "RR";
}

export function tiedostonimi(iso, asiakas) {
  const slug = String(asiakas || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return ["lasku", paiva(iso) ? iso : "", slug].filter(Boolean).join("-");
}
```

- [ ] **Step 4: Tests grün**

Run: `node --test tests/` → Expected: alle `lasku.test.mjs`-Tests PASS **und** die 19 bestehenden `sivusto.test.mjs`-Tests PASS.

- [ ] **Step 5: Commit + Push**

```bash
git add website/lasku/hinnasto.js tests/lasku.test.mjs
git commit -m "Laskutyökalu: hinnasto 2026 + laskenta testeineen"
git push origin main
```

---

### Task 2: Tool-Seite (Formular + Live-Blatt + PDF)

**Files:**
- Create: `website/lasku/index.html`, `website/lasku/lasku.css`, `website/lasku/lasku.js`, `website/lasku/logo.png`
- Modify: `website/robots.txt` (nach `User-agent: *` / `Allow: /` die Zeile `Disallow: /lasku` ergänzen)

**Interfaces:**
- Consumes: alle Exports aus Task 1.
- DOM-Vertrag: Formularfelder per `name`; Blattstellen per `data-k="<schlüssel>"` (Text wird per `textContent` gesetzt — nie `innerHTML` mit Nutzereingaben).

- [ ] **Step 1: Logo extrahieren.** Das erste `<img src="data:image/png;base64,…">` in `laskut/lasku-pohja.html` dekodieren nach `website/lasku/logo.png`:

```bash
python3 - <<'PY'
import re, base64, pathlib
src = pathlib.Path("laskut/lasku-pohja.html").read_text()
b64 = re.search(r'<img src="data:image/png;base64,([^"]+)"', src).group(1)
pathlib.Path("website/lasku/logo.png").write_bytes(base64.b64decode(b64))
PY
file website/lasku/logo.png   # Expected: PNG image data
```

- [ ] **Step 2: `website/lasku/lasku.css`** in dieser Reihenfolge:
  1. Die 8 `@font-face`-Regeln aus `website/css/styles.css` Zeilen 8–15 **wörtlich** (die Pfade `../assets/fonts/…` stimmen auch von `website/lasku/` aus).
  2. `laskut/lasku-pohja.html` Zeilen **148–372** (von `:root{` bis vor `</style>`) **wörtlich** kopieren:
     `sed -n '148,372p' laskut/lasku-pohja.html >> website/lasku/lasku.css`
  3. Dann diesen Block anhängen:

```css
/* ───────────────── Erittely (uusi) ───────────────── */
.erittely{ margin-top:6mm }
.erittely .eyebrow{ margin-bottom:1.6mm }
.erittely ol{ list-style:none }
.erittely li{
  display:flex; align-items:baseline; gap:3mm;
  padding:1.5mm 0; font-size:10.2pt; color:var(--navy);
  border-bottom:1px solid rgba(192,138,87,.22);
}
.erittely li:last-child{ border-bottom:0 }
.erittely .viiva{ flex:1; border-bottom:1px dotted rgba(43,54,74,.32); transform:translateY(-1.1mm) }
.erittely .snt{
  font-family:var(--display); font-weight:600; font-size:11pt;
  font-variation-settings:"SOFT" 40,"opsz" 24; font-variant-numeric:tabular-nums; white-space:nowrap;
}
.erittely .tyhja{ font-style:italic; color:rgba(43,54,74,.55) }

/* ───────────────── Työkalu-näkymä (vain näytöllä) ───────────────── */
html{ background:#6E7787 }
.tyokalu{ display:grid; grid-template-columns:440px minmax(0,1fr); min-height:100vh }
.lomake{
  position:sticky; top:0; height:100vh; overflow:auto;
  background:var(--lace); color:var(--navy); padding:22px 24px 40px;
  border-right:1px solid rgba(192,138,87,.5); font-size:15px;
}
.lomake h1{ font-family:var(--display); font-weight:600; font-size:26px; color:var(--navy) }
.lomake h1 em{ font-style:italic; font-weight:400; color:var(--rose-deep) }
.lomake .ohje{ margin:4px 0 14px; color:rgba(43,54,74,.75); line-height:1.45 }
.lomake fieldset{ border:0; border-top:1px solid rgba(192,138,87,.42); padding:12px 0 4px; margin-top:6px }
.lomake legend{ font-family:var(--caps); font-weight:700; font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:var(--rose-deep); padding-right:8px }
.lomake label{ display:block; margin-top:9px; font-weight:500 }
.lomake label small{ font-weight:400; color:rgba(43,54,74,.6) }
.lomake input[type=text], .lomake input[type=email], .lomake input[type=date],
.lomake input[type=number], .lomake textarea{
  display:block; width:100%; margin-top:4px; padding:8px 10px;
  font:inherit; font-weight:400; color:var(--navy);
  background:#fff; border:1px solid rgba(43,54,74,.25); border-radius:6px;
}
.lomake textarea{ min-height:58px; resize:vertical; line-height:1.4 }
.lomake input:focus, .lomake textarea:focus{ outline:2px solid var(--brass); outline-offset:1px; border-color:var(--brass) }
.lomake .rivi{ display:grid; grid-template-columns:1fr 1fr; gap:10px }
.lomake .rivi.muu{ grid-template-columns:1fr 110px }
.lomake .valinta{ display:flex; gap:8px; align-items:center; font-weight:400; margin-top:7px }
.lomake .valinta input{ width:18px; height:18px; accent-color:var(--rose-deep) }
.lomake .hinta{ font-weight:400; color:rgba(43,54,74,.6); margin-left:auto; font-size:13px }
.huom{ margin-top:12px; padding:10px 12px; border-radius:6px; background:rgba(180,120,118,.14); color:var(--rose-deep); font-size:14px; line-height:1.4 }
.huom:empty{ display:none }
.toiminnot{ display:flex; gap:10px; margin-top:18px; position:sticky; bottom:-40px; padding:12px 0 0; background:var(--lace) }
.toiminnot button{
  font:inherit; font-weight:700; padding:11px 16px; border-radius:8px; cursor:pointer;
  border:1px solid var(--navy); background:transparent; color:var(--navy);
}
.toiminnot button.paa{ flex:1; background:var(--navy); color:var(--gold); border-color:var(--navy) }
.toiminnot button:focus-visible{ outline:2px solid var(--brass); outline-offset:2px }

.esikatselu{ padding:28px; display:flex; justify-content:center; align-items:flex-start; overflow:hidden }
.kehys{ width:210mm; flex:none; transform-origin:top center }
.esikatselu .sheet{ margin:0 }

@media print{
  html{ background:none }
  .lomake{ display:none }
  .tyokalu{ display:block }
  .esikatselu{ padding:0; display:block; overflow:visible }
  .kehys{ transform:none !important; height:auto !important; width:auto }
  .esikatselu .sheet{ box-shadow:none } /* KEINE feste Höhe: Überlauf soll als 2. Seite sichtbar werden, nicht still abgeschnitten */
}
```

- [ ] **Step 3: `website/lasku/index.html`**

```html
<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Lasku · Rentun Ruusu</title>
<link rel="icon" href="../favicon.png">
<link rel="stylesheet" href="lasku.css">
<script type="module" src="lasku.js"></script>
</head>
<body>
<div class="tyokalu">

  <form class="lomake" id="lomake" autocomplete="off">
    <h1>Uusi <em>lasku</em></h1>
    <p class="ohje">Täytä kentät — lasku päivittyy oikealla. Lopuksi <strong>Tallenna PDF</strong> (valitse tulostimeksi ”Tallenna PDF-tiedostona”).</p>

    <fieldset>
      <legend>Asiakas</legend>
      <label>Nimi <input type="text" name="asiakas" placeholder="Etunimi Sukunimi"></label>
      <label>Sähköposti <input type="email" name="email" placeholder="nimi@esimerkki.fi"></label>
    </fieldset>

    <fieldset>
      <legend>Tilaisuus</legend>
      <div class="rivi">
        <label>Päivä <input type="date" name="pvm"></label>
        <label>Henkilömäärä <input type="number" name="hlo" min="0" step="1" placeholder="esim. 60"></label>
      </div>
      <label class="valinta"><input type="radio" name="tila" value="sali" checked> Sali &amp; alakerta <span class="hinta">195 / 225 / 295 € + siivous 95 €</span></label>
      <label class="valinta"><input type="radio" name="tila" value="pianotupa"> Pianotupa &amp; keittiö <span class="hinta">195 / 225 / 270 €</span></label>
      <label>Vuokra-aika, lisätieto <small>(näkyy päivän alla)</small>
        <input type="text" name="lisatieto" value="Tavarat noudettavissa seuraavana päivänä klo 12:00 mennessä"></label>
    </fieldset>

    <fieldset>
      <legend>Lisäpalvelut</legend>
      <label class="valinta"><input type="checkbox" name="astiat"> Astiat <span class="hinta">2 € / hlö</span></label>
      <label class="valinta"><input type="checkbox" name="liinat"> Valkoiset pöytäliinat <span class="hinta" data-k="liinahinta">1,50 € / hlö</span></label>
      <div class="rivi muu">
        <label>Muu rivi <small>(esim. alennus)</small> <input type="text" name="muuKuvaus" placeholder="Kuvaus"></label>
        <label>€ <input type="text" name="muuEur" inputmode="decimal" placeholder="0"></label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Maksu</legend>
      <label>Eräpäivä <input type="date" name="erapaiva"></label>
    </fieldset>

    <fieldset>
      <legend>Laskun tekstit</legend>
      <label>Salin järjestely <textarea name="jarjestely">Pöydät laitetaan saliin valmiiksi, henkilömäärä tarkentuu myöhemmin.</textarea></label>
      <label>Vuokraan kuuluu <textarea name="kuuluu">Musiikkilaitteet, mikrofoni, Pianotupa, aulatilat sekä keittiö koneineen (ei astioita).</textarea></label>
      <label>Tavarat ja nouto <textarea name="tavarat">Juhlatilaan voi jättää tavaroita juhlien jälkeen ja noutaa ne seuraavana päivänä klo 12:00 mennessä.</textarea></label>
      <label>Avaimet <textarea name="avaimet">Avainten luovutus edellisenä päivänä erikseen sovittavana ajankohtana.</textarea></label>
    </fieldset>

    <div class="huom" id="huom" role="status" aria-live="polite"></div>

    <div class="toiminnot">
      <button type="button" class="paa" id="tallenna">Tallenna PDF</button>
      <button type="button" id="uusi">Uusi lasku</button>
    </div>
  </form>

  <div class="esikatselu" id="esikatselu">
    <div class="kehys" id="kehys">
      <div class="sheet">

        <header class="masthead">
          <div class="mark">
            <img src="logo.png" alt="Rentun Ruusu">
            <div class="place">Juhlatalo · Turenki</div>
          </div>
          <div class="doctype">
            <div class="kicker">Tilavuokra</div>
            <h1>Lasku <em>&amp;</em> vahvistus</h1>
            <div class="ref" data-k="viite"></div>
          </div>
        </header>

        <main class="body">
          <section class="facts">
            <div class="fact">
              <div class="eyebrow">Asiakas</div>
              <div class="name" data-k="asiakas"></div>
              <div class="sub" data-k="email"></div>
            </div>
            <div class="fact">
              <div class="eyebrow">Vuokra-aika</div>
              <div class="name" data-k="pvm"></div>
              <div class="sub" data-k="lisatieto"></div>
            </div>
            <div class="fact">
              <div class="eyebrow">Vuokrakohde</div>
              <div class="name" data-k="tilanimi"></div>
              <div class="sub">Rentun Ruusu · Kauppakuja 16, 14200 Turenki</div>
            </div>
          </section>

          <p class="lede">
            Lasku koskee Rentun Ruusun <span data-k="genetiivi"></span> vuokrausta ajalle
            <strong data-k="pvm"></strong>, Kauppakuja 16, 14200 Turenki.
          </p>

          <div class="terms-list">
            <div class="item"><div class="eyebrow">Salin järjestely</div><p data-k="jarjestely"></p></div>
            <div class="item"><div class="eyebrow">Vuokraan kuuluu</div><p data-k="kuuluu"></p></div>
            <div class="item"><div class="eyebrow">Tavarat ja nouto</div><p data-k="tavarat"></p></div>
            <div class="item"><div class="eyebrow">Avaimet</div><p data-k="avaimet"></p></div>
          </div>

          <section class="erittely">
            <div class="eyebrow">Erittely</div>
            <ol id="rivit"></ol>
          </section>

          <section class="ticket">
            <div class="ticket-main">
              <div class="eyebrow">Laskutustiedot</div>
              <dl class="pay">
                <dt>Nimi</dt><dd data-k="laskuttaja"></dd>
                <dt>Viesti</dt><dd data-k="viite"></dd>
                <dt>IBAN</dt><dd class="iban" data-k="iban"></dd>
                <dt>Eräpäivä</dt><dd data-k="erapaiva"></dd>
              </dl>
            </div>
            <div class="stub">
              <div class="eyebrow">Maksettava</div>
              <div class="amount" data-k="summa"></div>
              <div class="vat">+ alv 0 %</div>
              <div class="star">✦</div>
            </div>
          </section>

          <section class="fineprint">
            <div>
              <h2>Maksu- / peruutusehdot</h2>
              <p>Tilaisuuden peruuntuessa vähintään 60 vrk ennen vuokra-aikaa, palautetaan vuokraajalle 50 % tilavuokrasta.</p>
            </div>
            <div>
              <h2>Korvausvelvollisuus</h2>
              <p>Vuokraaja sitoutuu korvaamaan täysimääräisenä vuokra-aikana vuokratulle tilalle tai vuokraajan käyttöön luovutetulle välineistölle aiheutetut vahingot ja vuokralaisen huolimattomuudesta, sääntöjen tai kirjallisesti annetun ohjeistuksen noudattamatta jättämisestä aiheutuvat erilliset kulut ja kustannukset.</p>
              <p class="warn">Tupakointi ja oikeiden kynttilöiden sytyttäminen sisätiloissa on ehdottomasti kielletty. Tupakan tumpit ja nikotiinipussit on kerättävä etuoven vieressä olevaan säiliöön.</p>
            </div>
          </section>
        </main>

        <footer class="colophon">
          <div class="sig">Rentun Ruusu</div>
          <div>
            Kauppakuja 16, 14200 Turenki<span class="dot">·</span>rentunruusu16@gmail.com<span class="dot">·</span>+358 40 724 4622<span class="dot">·</span>rentunruusu.com
          </div>
        </footer>

      </div>
    </div>
  </div>

</div>
</body>
</html>
```

- [ ] **Step 4: `website/lasku/lasku.js`**

```js
import {
  TILAT, LASKUTTAJA, laskeRivit, euro, euroSyotteesta, viite, fiPvm, lisaaPaivia, tiedostonimi,
} from "./hinnasto.js";

const AVAIN = "rr-lasku-luonnos-v1";
const lomake = document.getElementById("lomake");
const kehys = document.getElementById("kehys");
const esikatselu = document.getElementById("esikatselu");
const TYHJA = "—";

const tanaan = () => {
  const d = new Date(), p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function lue() {
  const f = new FormData(lomake);
  const o = Object.fromEntries(f.entries());
  o.astiat = f.has("astiat");
  o.liinat = f.has("liinat");
  return o;
}

function kirjoita(o) {
  for (const el of lomake.elements) {
    if (!el.name || !(el.name in o)) continue;
    if (el.type === "checkbox") el.checked = !!o[el.name];
    else if (el.type === "radio") el.checked = el.value === o[el.name];
    else el.value = o[el.name];
  }
}

function aseta(k, teksti) {
  for (const el of document.querySelectorAll(`[data-k="${k}"]`)) el.textContent = teksti;
}

function piirra() {
  const o = lue();
  const tila = TILAT[o.tila] || TILAT.sali;
  const { rivit, summa, huomautukset } = laskeRivit({
    tila: o.tila, pvm: o.pvm, hlo: o.hlo, astiat: o.astiat, liinat: o.liinat,
    muuKuvaus: o.muuKuvaus, muuSnt: euroSyotteesta(o.muuEur),
  });

  aseta("viite", viite(o.pvm));
  aseta("asiakas", o.asiakas.trim() || TYHJA);
  aseta("email", o.email.trim());
  aseta("pvm", fiPvm(o.pvm) || TYHJA);
  aseta("lisatieto", o.lisatieto.trim());
  aseta("tilanimi", tila.nimi);
  aseta("genetiivi", tila.genetiivi);
  aseta("jarjestely", o.jarjestely.trim());
  aseta("kuuluu", o.kuuluu.trim());
  aseta("tavarat", o.tavarat.trim());
  aseta("avaimet", o.avaimet.trim());
  aseta("laskuttaja", LASKUTTAJA.nimi);
  aseta("iban", LASKUTTAJA.iban);
  aseta("erapaiva", fiPvm(o.erapaiva) || TYHJA);
  aseta("summa", euro(summa).replace(" €", " €"));
  aseta("liinahinta", tila.liinat.tapa === "kiintea" ? "50 € / kerta" : "1,50 € / hlö");

  const ol = document.getElementById("rivit");
  ol.replaceChildren(...(rivit.length ? rivit : [null]).map((r) => {
    const li = document.createElement("li");
    if (!r) { li.className = "tyhja"; li.textContent = "Valitse päivä, niin rivit lasketaan."; return li; }
    const a = document.createElement("span"); a.textContent = r.selite;
    const v = document.createElement("span"); v.className = "viiva";
    const b = document.createElement("span"); b.className = "snt"; b.textContent = euro(r.snt);
    li.append(a, v, b);
    return li;
  }));

  document.getElementById("huom").textContent = huomautukset.join(" ");
  try { localStorage.setItem(AVAIN, JSON.stringify(o)); } catch {}
}

function sovita() {
  const leveys = esikatselu.clientWidth - 56;
  const blatt = kehys.offsetWidth; // 210mm in px
  const s = Math.min(1, leveys / blatt);
  kehys.style.transform = `scale(${s})`;
  kehys.style.height = `${kehys.scrollHeight * s}px`;
}

const OLETUS = lue();

function uusi() {
  try { localStorage.removeItem(AVAIN); } catch {}
  kirjoita({ ...OLETUS, erapaiva: lisaaPaivia(tanaan(), 14) });
  piirra();
}

document.getElementById("uusi").addEventListener("click", () => {
  if (confirm("Tyhjennetäänkö lomake?")) uusi();
});

document.getElementById("tallenna").addEventListener("click", () => {
  const o = lue();
  const vanha = document.title;
  document.title = tiedostonimi(o.pvm, o.asiakas);
  window.addEventListener("afterprint", () => { document.title = vanha; }, { once: true });
  window.print();
});

lomake.addEventListener("input", piirra);
lomake.addEventListener("change", piirra);

let luonnos = null;
try { luonnos = JSON.parse(localStorage.getItem(AVAIN) || "null"); } catch {}
if (luonnos) kirjoita(luonnos);
if (!lomake.elements.erapaiva.value) lomake.elements.erapaiva.value = lisaaPaivia(tanaan(), 14);
piirra();
new ResizeObserver(sovita).observe(esikatselu);
sovita();
```

- [ ] **Step 5: `robots.txt`** — direkt unter `User-agent: *` / `Allow: /` einfügen: `Disallow: /lasku`

- [ ] **Step 6: Verifizieren im Browser (headless Chrome)**

```bash
cd website && python3 -m http.server 8765 >/dev/null 2>&1 &   # Server im Hintergrund
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CH" --headless=new --disable-gpu --window-size=1440,1000 --screenshot=$SCRATCH/tool.png http://localhost:8765/lasku/
"$CH" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=$SCRATCH/lasku.pdf http://localhost:8765/lasku/
mdls -name kMDItemNumberOfPages $SCRATCH/lasku.pdf   # Expected: 1
```

Befüllte Version prüfen (kein Demo-Code in der echten Seite): eine Kopie `website/lasku/_test.html` von `index.html` anlegen (nicht committen, danach löschen), deren Inputs die Emmi-Daten als `value`/`checked` tragen (asiakas „Emmi Anttila“, pvm `2026-10-31`, Sali, hlö 60, Astiat + Liinat angehakt, Muu „Lisä“ / `5`), und `http://localhost:8765/lasku/_test.html` genauso screenshotten und als PDF drucken. Das PDF mit `pdftoppm -r 80 -png` oder `sips -s format png` in ein Bild wandeln und ansehen. Expected:
  - PDF genau 1 Seite; Screenshot zeigt Formular links, ganzes Blatt rechts.
  - Befüllte Version: Erittely 5 Zeilen (295, 95, 120, 90, 5), Summe **605 €**, Viite „RR 31.10.2026“, Eräpäivä gesetzt.
  - Falls 2 Seiten: in dieser Reihenfolge verkleinern, bis 1 Seite: `.lede{margin-top:4mm}`, `.terms-list{margin-top:4mm; gap:3.5mm 10mm}`, `.ticket{margin-top:6mm}`, `.fineprint{margin-top:6mm}`, `.body{padding-top:7mm}`.

- [ ] **Step 7: Tests + Commit + Push**

```bash
node --test tests/          # alles grün
git add website/lasku website/robots.txt
git commit -m "Laskutyökalu: lomake + live-esikatselu + PDF (rentunruusu.com/lasku)"
git push origin main
```
