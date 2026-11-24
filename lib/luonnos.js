// Laskutyökalun luonnos pilvessä: GET /lasku/luonnos lukee, PUT tallentaa (yksi yhteinen luonnos).
// Vercel ohjaa /lasku/luonnos → /api/lasku-luonnos (vercel.json). Middleware tarkistaa kirjautumisen
// ensin; tämä tarkistaa evästeen vielä itse, koska /api/-polkuun pääsee myös suoraan.
// Varasto (Vercel Blob, yksityinen) annetaan ulkoa → testit käyttävät tekovarastoa. Ei varastoa → 503.

import { asetettuSalasana, kirjautunut } from "../middleware.js";

export const MAKS_TAVUT = 32 * 1024;
const AVAIN = /^[A-Za-z]{1,40}$/;

/** Luonnos = tavallinen olio: merkkijonot (≤ 4000), totuusarvot tai ≤ 30 merkkijonon lista (≤ 300). */
export function kelpaa(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  const avaimet = Object.keys(o);
  if (avaimet.length > 60) return false;
  return avaimet.every((k) => {
    const v = o[k];
    if (!AVAIN.test(k)) return false;
    if (typeof v === "string") return v.length <= 4000;
    if (typeof v === "boolean") return true;
    if (Array.isArray(v)) return v.length <= 30 && v.every((r) => typeof r === "string" && r.length <= 300);
    return false;
  });
}

function json(status, runko, lisa = {}) {
  return new Response(JSON.stringify(runko), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...lisa },
  });
}

/** varasto: { lue(): Promise<object|null>, kirjoita(o): Promise<void> } tai null. */
export async function kasittele(request, varasto, salasana = asetettuSalasana()) {
  if (!(await kirjautunut(request, salasana))) return json(401, { virhe: "kirjaudu" });
  if (request.method !== "GET" && request.method !== "PUT") {
    return json(405, { virhe: "metodi" }, { Allow: "GET, PUT" });
  }
  if (!varasto) return json(503, { virhe: "ei-tallennusta" });

  if (request.method === "GET") {
    try {
      return json(200, { luonnos: await varasto.lue() });
    } catch {
      return json(502, { virhe: "varasto" });
    }
  }

  if (!(request.headers.get("content-type") || "").startsWith("application/json")) {
    return json(415, { virhe: "tyyppi" });
  }
  const raaka = await request.text();
  if (new TextEncoder().encode(raaka).length > MAKS_TAVUT) return json(413, { virhe: "koko" });
  let o;
  try { o = JSON.parse(raaka); } catch { return json(400, { virhe: "json" }); }
  if (!kelpaa(o)) return json(400, { virhe: "sisalto" });
  try {
    await varasto.kirjoita(o);
  } catch {
    return json(502, { virhe: "varasto" });
  }
  return json(200, { ok: true });
}
