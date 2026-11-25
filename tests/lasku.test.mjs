// Laskutyökalu — hinnaston laskenta. Aja repon juuresta: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TILAT, paivaLuokka, viikonpaiva, fiPvm, lisaaPaivia, euro, euroSyotteesta,
  laskeRivit, viite, tiedostonimi, oletusLisat, euroKenttaan, oletusHinnat,
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

const hlo = (snt) => ({ paalla: true, tapa: "hlo", snt });
const kiintea = (snt) => ({ paalla: true, tapa: "kiintea", snt });

test("oletuslisät huoneittain (hinnasto 2026)", () => {
  assert.deepEqual(oletusLisat("sali"), {
    astiat: { tapa: "hlo", snt: 200 }, liinat: { tapa: "hlo", snt: 150 },
  });
  assert.deepEqual(oletusLisat("pianotupa"), {
    astiat: { tapa: "hlo", snt: 200 }, liinat: { tapa: "kiintea", snt: 5000 },
  });
  assert.deepEqual(oletusLisat("tuntematon"), oletusLisat("sali"));
  // kopio, ei viittaus hinnastoon
  oletusLisat("sali").astiat.snt = 1;
  assert.equal(oletusLisat("sali").astiat.snt, 200);
});

test("astiat 2 €/hlö, liinat: sali 1,50 €/hlö, pianotupa 50 € kiinteä (oletukset)", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", hlo: 60, astiat: hlo(200), liinat: hlo(150) });
  assert.deepEqual(s.rivit.slice(2), [
    { selite: "Astiat · 60 hlö × 2 €", snt: 12000 },
    { selite: "Valkoiset pöytäliinat · 60 hlö × 1,50 €", snt: 9000 },
  ]);
  assert.equal(s.summa, 29500 + 9500 + 12000 + 9000);
  const p = laskeRivit({ tila: "pianotupa", pvm: "2026-10-30", hlo: 20, astiat: hlo(200), liinat: kiintea(5000) });
  assert.deepEqual(p.rivit.slice(1), [
    { selite: "Astiat · 20 hlö × 2 €", snt: 4000 },
    { selite: "Valkoiset pöytäliinat", snt: 5000 },
  ]);
});

test("lisä pois päältä → ei riviä, vaikka hinta annettu", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", hlo: 60,
    astiat: { paalla: false, tapa: "hlo", snt: 200 }, liinat: { paalla: false, tapa: "kiintea", snt: 5000 } });
  assert.equal(s.rivit.length, 2);
  assert.equal(s.huomautukset.length, 0);
});

test("kiinteät astiat ja kiinteät liinat salissa — ei tarvitse henkilömäärää", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", astiat: kiintea(18000), liinat: kiintea(15000) });
  assert.deepEqual(s.rivit.slice(2), [
    { selite: "Astiat", snt: 18000 },
    { selite: "Valkoiset pöytäliinat", snt: 15000 },
  ]);
  assert.equal(s.huomautukset.length, 0);
});

test("oma henkilöhinta, esim. 1,80 €/hlö", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", hlo: 120, astiat: hlo(180), liinat: hlo(100) });
  assert.deepEqual(s.rivit.slice(2), [
    { selite: "Astiat · 120 hlö × 1,80 €", snt: 21600 },
    { selite: "Valkoiset pöytäliinat · 120 hlö × 1 €", snt: 12000 },
  ]);
});

test("hinta ei ole luku → ei riviä + huomautus; hinta 0 → ei riviä, ei huomautusta", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", hlo: 60, astiat: hlo(NaN), liinat: kiintea(NaN) });
  assert.equal(s.rivit.length, 2);
  assert.deepEqual(s.huomautukset, ["Astiat: hinta ei ole luku.", "Pöytäliinat: hinta ei ole luku."]);
  const z = laskeRivit({ tila: "sali", pvm: "2026-10-31", hlo: 60, astiat: hlo(0), liinat: kiintea(0) });
  assert.equal(z.rivit.length, 2);
  assert.equal(z.huomautukset.length, 0);
});

test("henkilöhintainen lisä ilman henkilömäärää → huomautus, ei riviä", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", astiat: hlo(200), liinat: hlo(150) });
  assert.equal(s.rivit.length, 2);
  assert.deepEqual(s.huomautukset, ["Astiat: anna henkilömäärä.", "Pöytäliinat: anna henkilömäärä."]);
  const p = laskeRivit({ tila: "pianotupa", pvm: "2026-10-31", liinat: kiintea(5000) });
  assert.equal(p.rivit.length, 2); // kiinteä liina ei tarvitse hlö-määrää
  assert.equal(p.huomautukset.length, 0);
});

test("euroKenttaan: sentit lomakekenttään (2 / 1,50), takaisin euroSyotteesta", () => {
  assert.equal(euroKenttaan(200), "2");
  assert.equal(euroKenttaan(150), "1,50");
  assert.equal(euroKenttaan(5000), "50");
  assert.equal(euroKenttaan(12345), "123,45");
  for (const snt of [0, 150, 200, 5000, 12345]) assert.equal(euroSyotteesta(euroKenttaan(snt)), snt);
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
  assert.equal(tiedostonimi("2026-10-31", "Emmi Anttila"), "Emmi Anttila 31.10.2026");
  assert.equal(tiedostonimi("2026-10-31", "  Äijälä   Öljy & Co "), "Äijälä Öljy & Co 31.10.2026");
  assert.equal(tiedostonimi("2026-10-31", "A/B: Oy?"), "A-B Oy 31.10.2026");
  assert.equal(tiedostonimi("2026-10-31", ""), "31.10.2026");
  assert.equal(tiedostonimi("", "Emmi Anttila"), "Emmi Anttila");
  assert.equal(tiedostonimi("", ""), "Lasku");
  assert.equal(TILAT.sali.siivous, 9500);
});

test("index.html: kaikki resurssipolut absoluuttisia (/lasku ilman kauttaviivaa rikkoo suhteelliset)", async () => {
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../website/lasku/index.html", import.meta.url), "utf8");
  const refs = [...html.matchAll(/\b(?:src|href)="([^"#]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, `löytyi ${refs.length}`);
  for (const r of refs) assert.match(r, /^\//, `suhteellinen polku: ${r}`);
});

test("oletusHinnat: hinnaston vuokra ja siivous tilan ja päivän mukaan", () => {
  assert.deepEqual(oletusHinnat("sali", "2026-10-31"), { vuokra: 29500, siivous: 9500 });
  assert.deepEqual(oletusHinnat("pianotupa", "2026-10-30"), { vuokra: 22500, siivous: 0 });
  assert.deepEqual(oletusHinnat("sali", ""), { vuokra: null, siivous: 9500 });
});

test("oma vuokra ja siivous korvaavat hinnaston; 0 → ei riviä; ei luku → huomautus", () => {
  const s = laskeRivit({ tila: "sali", pvm: "2026-10-31", vuokraSnt: 25000, siivousSnt: 7000 });
  assert.deepEqual(s.rivit.map((r) => [r.selite, r.snt]), [["Tilavuokra · la 31.10.2026", 25000], ["Siivous", 7000]]);
  assert.equal(s.summa, 32000);
  const ilman = laskeRivit({ tila: "sali", pvm: "2026-10-31", siivousSnt: 0 });
  assert.deepEqual(ilman.rivit.map((r) => r.selite), ["Tilavuokra · la 31.10.2026"]);
  const p = laskeRivit({ tila: "pianotupa", pvm: "2026-10-31", siivousSnt: 5000 });
  assert.deepEqual(p.rivit.map((r) => [r.selite, r.snt]), [["Tilavuokra · la 31.10.2026", 27000], ["Siivous", 5000]]);
  const rikki = laskeRivit({ tila: "sali", pvm: "2026-10-31", vuokraSnt: NaN, siivousSnt: NaN });
  assert.equal(rikki.rivit.length, 0);
  assert.deepEqual(rikki.huomautukset, ["Tilavuokra: hinta ei ole luku.", "Siivous: hinta ei ole luku."]);
});
