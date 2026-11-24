// lib/luonnos.js: pilviluonnoksen GET/PUT. Salasana on tekaistu (oikea vain Vercelin ympäristömuuttujassa).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { kasittele, kelpaa, MAKS_TAVUT } from "../lib/luonnos.js";

const SALASANA = "testi-Salasana!ä";
const EVASTE = "rr_lasku=" + createHmac("sha256", SALASANA).update("rr-lasku-v1").digest("hex");
const URL_ = "https://rentunruusu.com/lasku/luonnos";

const pyynto = (method, { eväste = EVASTE, runko, tyyppi = "application/json" } = {}) =>
  new Request(URL_, {
    method,
    headers: { ...(eväste ? { cookie: eväste } : {}), ...(runko !== undefined ? { "content-type": tyyppi } : {}) },
    body: runko,
  });

function tekovarasto(alku = null) {
  let data = alku;
  return { kirjoitukset: 0, async lue() { return data; }, async kirjoita(o) { this.kirjoitukset++; data = structuredClone(o); } };
}

const LUONNOS = { asiakas: "Emmi", asiakasRivit: ["Katu 1"], astiat: true, jarjestely: "Pöydät valmiiksi." };

test("ilman evästettä tai väärällä evästeellä → 401, varastoon ei kosketa", async () => {
  const v = tekovarasto(LUONNOS);
  for (const e of [null, "rr_lasku=vaara"]) {
    assert.equal((await kasittele(pyynto("GET", { eväste: e }), v, SALASANA)).status, 401);
    assert.equal((await kasittele(pyynto("PUT", { eväste: e, runko: "{}" }), v, SALASANA)).status, 401);
  }
  assert.equal(v.kirjoitukset, 0);
});

test("salasana puuttuu ympäristöstä → 401 (fail closed)", async () => {
  assert.equal((await kasittele(pyynto("GET"), tekovarasto(), null)).status, 401);
});

test("ei varastoa (BLOB-token puuttuu) → 503", async () => {
  const v = await kasittele(pyynto("GET"), null, SALASANA);
  assert.equal(v.status, 503);
  assert.deepEqual(await v.json(), { virhe: "ei-tallennusta" });
});

test("PUT tallentaa, GET palauttaa saman; no-store", async () => {
  const v = tekovarasto();
  const tyhja = await kasittele(pyynto("GET"), v, SALASANA);
  assert.deepEqual(await tyhja.json(), { luonnos: null });
  const p = await kasittele(pyynto("PUT", { runko: JSON.stringify(LUONNOS) }), v, SALASANA);
  assert.equal(p.status, 200);
  const g = await kasittele(pyynto("GET"), v, SALASANA);
  assert.equal(g.headers.get("cache-control"), "no-store");
  assert.deepEqual(await g.json(), { luonnos: LUONNOS });
});

test("PUT hylkää: väärä tyyppi 415, rikkinäinen JSON 400, väärä muoto 400, liian iso 413", async () => {
  const v = tekovarasto();
  const s = async (runko, tyyppi) => (await kasittele(pyynto("PUT", { runko, tyyppi }), v, SALASANA)).status;
  assert.equal(await s(JSON.stringify(LUONNOS), "text/plain"), 415);
  assert.equal(await s("{rikki", undefined), 400);
  for (const huono of [[], "x", null, { a: 1 }, { a: { b: "c" } }, { "a-b": "x" }, { a: [1] }])
    assert.equal(await s(JSON.stringify(huono)), 400, JSON.stringify(huono));
  assert.equal(await s(JSON.stringify({ a: "x".repeat(MAKS_TAVUT) })), 413);
  assert.equal(v.kirjoitukset, 0);
});

test("muut metodit → 405", async () => {
  const v = await kasittele(pyynto("DELETE"), tekovarasto(), SALASANA);
  assert.equal(v.status, 405);
  assert.equal(v.headers.get("allow"), "GET, PUT");
});

test("varaston virhe → 502, ei kaatumista", async () => {
  const rikki = { async lue() { throw new Error("x"); }, async kirjoita() { throw new Error("x"); } };
  assert.equal((await kasittele(pyynto("GET"), rikki, SALASANA)).status, 502);
  assert.equal((await kasittele(pyynto("PUT", { runko: "{}" }), rikki, SALASANA)).status, 502);
});

test("kelpaa: lomakkeen oikea luonnos käy (merkkijonot, totuusarvot, rivilista)", () => {
  assert.ok(kelpaa({ ...LUONNOS, liinat: false, hlo: "60", muuEur: "-5", asiakasRivit: [] }));
  assert.ok(!kelpaa({ asiakasRivit: Array(31).fill("x") }));
});

test("vercel.json ohjaa /lasku/luonnos funktiolle, ja middleware suojaa polun", async () => {
  const conf = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
  assert.deepEqual(conf.rewrites, [{ source: "/lasku/luonnos", destination: "/api/lasku-luonnos" }]);
  const { config } = await import("../middleware.js");
  assert.ok(config.matcher.includes("/lasku/:path*"));
});
