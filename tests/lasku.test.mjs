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

test("index.html: kaikki resurssipolut absoluuttisia (/lasku ilman kauttaviivaa rikkoo suhteelliset)", async () => {
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../website/lasku/index.html", import.meta.url), "utf8");
  const refs = [...html.matchAll(/\b(?:src|href)="([^"#]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, `löytyi ${refs.length}`);
  for (const r of refs) assert.match(r, /^\//, `suhteellinen polku: ${r}`);
});
