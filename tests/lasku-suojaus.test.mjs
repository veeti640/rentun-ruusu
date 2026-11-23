// Laskutyökalun suojaus (oma kirjautumissivu + allekirjoitettu eväste, middleware.js).
// Aja repon juuresta: node --test tests/*.test.mjs
// Salasana on tekaistu: oikea salasana on vain Vercelin ympäristömuuttujassa LASKU_SALASANA, ei koskaan repossa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import middleware, { config } from "../middleware.js";

const SALASANA = "testi-Salasana!ä";
const POHJA = "https://rentunruusu.com";
const WEBSITE = fileURLToPath(new URL("../website/", import.meta.url));

// Odotettu evästeen arvo lasketaan tässä itsenäisesti Noden cryptolla, ei middlewaren omalla koodilla:
// HMAC-SHA256, avain = salasana (UTF-8, NFC), viesti = "rr-lasku-v1", heksana.
const tunniste = (salasana) =>
  createHmac("sha256", Buffer.from(salasana.normalize("NFC"), "utf8")).update("rr-lasku-v1").digest("hex");

async function ymparistolla(arvo, fn) {
  const ennen = process.env.LASKU_SALASANA;
  if (arvo === undefined) delete process.env.LASKU_SALASANA;
  else process.env.LASKU_SALASANA = arvo;
  try {
    return await fn();
  } finally {
    if (ennen === undefined) delete process.env.LASKU_SALASANA;
    else process.env.LASKU_SALASANA = ennen;
  }
}

const hae = (polku, { method = "GET", eväste } = {}) =>
  new Request(POHJA + polku, { method, headers: eväste === undefined ? {} : { cookie: eväste } });

const kirjaudu = (salasana, polku = "/lasku") =>
  new Request(POHJA + polku, { method: "POST", body: new URLSearchParams({ salasana }) });

async function ajastettu(fn) {
  const alku = performance.now();
  const tulos = await fn();
  return { tulos, ms: performance.now() - alku };
}

// Kaikille kieltäville vastauksille yhteiset: 401, no-store, EI selaimen Basic-ikkunaa, EI jatkoa.
function onKielto(v) {
  assert.ok(v instanceof Response);
  assert.equal(v.status, 401);
  assert.equal(v.headers.get("www-authenticate"), null, "ei WWW-Authenticate → ei selaimen ponnahdusikkunaa");
  assert.equal(v.headers.get("cache-control"), "no-store");
  assert.equal(v.headers.get("x-middleware-next"), null);
}

async function kirjautumissivu(v) {
  onKielto(v);
  assert.match(v.headers.get("content-type"), /^text\/html; charset=utf-8$/i);
  const html = await v.text();
  assert.match(html, /<form method="post" action="\/lasku">/);
  assert.match(html, /<meta name="robots" content="noindex/);
  assert.match(html, /Kirjaudu/);
  return html;
}

const evasteet = (v) => v.headers.getSetCookie();

// --- kirjautumissivu ---------------------------------------------------------

test("GET /lasku ilman evästettä → 401-kirjautumissivu, ei Basic-ikkunaa", async () => {
  await ymparistolla(SALASANA, async () => {
    for (const polku of ["/lasku", "/lasku/"]) {
      const html = await kirjautumissivu(await middleware(hae(polku)));
      assert.match(html, /<html lang="fi">/);
    }
  });
});

test("lomakkeessa on vain yksi näkyvä kenttä: salasana", async () => {
  await ymparistolla(SALASANA, async () => {
    const html = await kirjautumissivu(await middleware(hae("/lasku")));
    const kentat = html.match(/<input\b[^>]*>/g) ?? [];
    const salasanat = kentat.filter((k) => /type="password"/.test(k));
    assert.equal(salasanat.length, 1);
    const [kentta] = salasanat;
    for (const attr of ['name="salasana"', 'autocomplete="current-password"', "autofocus", "required"]) {
      assert.ok(kentta.includes(attr), `salasanakentässä pitää olla ${attr}: ${kentta}`);
    }
    // Ainoa nimetty kenttä on salasana; muut (esim. salasanamanagerin käyttäjänimi) ovat piilossa kaikilta.
    const nimetyt = kentat.filter((k) => /\bname="/.test(k));
    assert.deepEqual(nimetyt, [kentta]);
    for (const muu of kentat.filter((k) => k !== kentta)) {
      assert.match(muu, /aria-hidden="true"/, muu);
      assert.match(muu, /tabindex="-1"/, muu);
    }
    assert.doesNotMatch(html, /käyttäjä(nimi|tunnus)/i, "mikään näkyvä teksti ei kysy käyttäjänimeä");
  });
});

test("HEAD /lasku ilman evästettä → 401", async () => {
  await ymparistolla(SALASANA, async () => onKielto(await middleware(hae("/lasku", { method: "HEAD" }))));
});

test("kirjautumissivu käyttää vain julkisia tiedostoja (ei /lasku/logo.png), ja ne ovat olemassa", async () => {
  await ymparistolla(SALASANA, async () => {
    const html = await kirjautumissivu(await middleware(hae("/lasku")));
    const viitteet = [...html.matchAll(/(?:src|srcset|href)="([^"]+)"|url\("?([^")]+)"?\)/g)]
      .flatMap((m) => (m[1] ?? m[2]).split(",").map((s) => s.trim().split(/\s+/)[0]))
      .filter((u) => u.startsWith("/"));
    assert.ok(viitteet.some((u) => u.startsWith("/assets/fonts/")), "fontit julkisesta kansiosta");
    assert.ok(viitteet.some((u) => u.startsWith("/assets/img/")), "logo julkisesta kansiosta");
    for (const u of viitteet) {
      assert.ok(!u.startsWith("/lasku/"), `suojattu tiedosto ei lataudu kirjautumissivulle: ${u}`);
      assert.ok(existsSync(WEBSITE + u.slice(1)), `puuttuu website/${u.slice(1)}`);
    }
  });
});

// --- muut suojatut polut -----------------------------------------------------

test("tiedosto /lasku/* ilman evästettä → 401 (myös POST), ei kirjautumista", async () => {
  await ymparistolla(SALASANA, async () => {
    for (const polku of ["/lasku/lasku.js", "/lasku/hinnasto.js", "/lasku/logo.png", "/lasku/index.html"]) {
      onKielto(await middleware(hae(polku)));
    }
    const v = await middleware(kirjaudu(SALASANA, "/lasku/lasku.js"));
    onKielto(v);
    assert.deepEqual(evasteet(v), [], "vain /lasku ottaa kirjautumisen vastaan");
  });
});

// --- POST /lasku --------------------------------------------------------------

test("POST väärä salasana → ~500 ms viive, 401 + ”Väärä salasana.”, ei evästettä", async () => {
  await ymparistolla(SALASANA, async () => {
    const { tulos: v, ms } = await ajastettu(() => middleware(kirjaudu("testi-Salasana!a")));
    assert.ok(ms >= 450, `viive ${ms.toFixed(0)} ms`);
    const html = await kirjautumissivu(v);
    assert.match(html, /Väärä salasana\./);
    assert.match(html, /#8e5b59/i, "virhe rose-deep-värillä");
    assert.deepEqual(evasteet(v), []);
  });
});

test("POST melkein oikea salasana hylätään (kirjainkoko, pituus, tyhjä)", async () => {
  await ymparistolla(SALASANA, async () => {
    const vaarat = ["testi-salasana!ä", SALASANA + "x", SALASANA.slice(0, -1), "", " " + SALASANA];
    // Rinnakkain, ettei jokainen 500 ms:n viive summaudu testiaikaan (middleware on tilaton).
    const vastaukset = await Promise.all(vaarat.map((vaara) => middleware(kirjaudu(vaara))));
    vastaukset.forEach((v, i) => {
      onKielto(v);
      assert.deepEqual(evasteet(v), [], JSON.stringify(vaarat[i]));
    });
  });
});

test("POST oikea salasana → 303 /lasku + HttpOnly/Secure/SameSite=Lax-eväste polulle /lasku", async () => {
  await ymparistolla(SALASANA, async () => {
    const v = await middleware(kirjaudu(SALASANA));
    assert.equal(v.status, 303);
    assert.equal(new URL(v.headers.get("location"), POHJA).href, POHJA + "/lasku");
    assert.equal(v.headers.get("cache-control"), "no-store");
    assert.equal(v.headers.get("x-middleware-next"), null);
    const [keksi, ...muut] = evasteet(v);
    assert.deepEqual(muut, []);
    const [arvo, ...attr] = keksi.split(/;\s*/);
    assert.equal(arvo, `rr_lasku=${tunniste(SALASANA)}`);
    const a = attr.map((x) => x.toLowerCase());
    for (const pakollinen of ["path=/lasku", "httponly", "secure", "samesite=lax", "max-age=2592000"]) {
      assert.ok(a.includes(pakollinen), `${pakollinen} puuttuu: ${keksi}`);
    }
  });
});

test("POST /lasku/ (kauttaviivalla) ja multipart-lomake käyvät myös", async () => {
  await ymparistolla(SALASANA, async () => {
    assert.equal((await middleware(kirjaudu(SALASANA, "/lasku/"))).status, 303);
    const lomake = new FormData();
    lomake.set("salasana", SALASANA);
    const v = await middleware(new Request(POHJA + "/lasku", { method: "POST", body: lomake }));
    assert.equal(v.status, 303);
  });
});

test("POST: hajotettu ä (NFD) kelpaa, ympäristömuuttujan loppurivinvaihto ei haittaa", async () => {
  await ymparistolla(SALASANA, async () => {
    assert.equal((await middleware(kirjaudu(SALASANA.normalize("NFD")))).status, 303);
  });
  for (const env of [SALASANA + "\n", SALASANA + "\r\n"]) {
    await ymparistolla(env, async () => {
      const v = await middleware(kirjaudu(SALASANA));
      assert.equal(v.status, 303);
      assert.ok(evasteet(v)[0].startsWith(`rr_lasku=${tunniste(SALASANA)};`));
    });
  }
});

test("POST jota ei voi lukea lomakkeena → 401, ei evästettä, ei kaatumista", async () => {
  await ymparistolla(SALASANA, async () => {
    const rungot = [["text/plain", SALASANA], ["application/json", JSON.stringify({ salasana: SALASANA })]];
    const vastaukset = await Promise.all(rungot.map(([tyyppi, runko]) =>
      middleware(new Request(POHJA + "/lasku", { method: "POST", headers: { "content-type": tyyppi }, body: runko }))));
    for (const v of vastaukset) {
      assert.match(await kirjautumissivu(v), /Lomaketta ei voitu lukea/);
      assert.deepEqual(evasteet(v), []);
    }
  });
});

test("syötettyä salasanaa ei koskaan kaiuteta sivulle", async () => {
  await ymparistolla(SALASANA, async () => {
    const syote = '<script>alert(1)</script>"vaara';
    const html = await kirjautumissivu(await middleware(kirjaudu(syote)));
    assert.ok(!html.includes(syote));
    assert.ok(!html.includes("alert(1)"));
  });
});

// --- eväste -------------------------------------------------------------------

test("voimassa oleva eväste → pyyntö jatkuu (x-middleware-next), myös tiedostoille ja HEADille", async () => {
  await ymparistolla(SALASANA, async () => {
    const keksi = `rr_lasku=${tunniste(SALASANA)}`;
    for (const [polku, method, evaste] of [
      ["/lasku", "GET", keksi],
      ["/lasku/", "GET", keksi],
      ["/lasku/hinnasto.js", "GET", keksi],
      ["/lasku/logo.png", "HEAD", keksi],
      ["/lasku", "GET", `_ga=GA1.1.123; ${keksi}; muu=1`],
    ]) {
      const v = await middleware(hae(polku, { method, eväste: evaste }));
      assert.ok(v instanceof Response);
      assert.equal(v.headers.get("x-middleware-next"), "1", `${method} ${polku}`);
      assert.equal(v.status, 200);
      assert.equal(v.body, null);
    }
  });
});

test("väärennetty tai rikkinäinen eväste → 401-kirjautumissivu", async () => {
  await ymparistolla(SALASANA, async () => {
    const oikea = tunniste(SALASANA);
    const kaannetty = (oikea[0] === "a" ? "b" : "a") + oikea.slice(1);
    for (const evaste of [
      `rr_lasku=${kaannetty}`,
      `rr_lasku=${oikea.slice(0, -1)}`,
      `rr_lasku=${oikea}0`,
      `rr_lasku=${oikea.toUpperCase()}`,
      "rr_lasku=",
      "rr_lasku",
      `rr_lasku=${tunniste("joku-muu")}`,
      `rr_laskux=${oikea}`,
      `xrr_lasku=${oikea}`,
      `muu=${oikea}`,
      `rr_lasku=${createHmac("sha256", "").update("rr-lasku-v1").digest("hex")}`,
    ]) {
      await kirjautumissivu(await middleware(hae("/lasku", { eväste: evaste })));
    }
  });
});

test("salasanan vaihto mitätöi vanhat evästeet", async () => {
  await ymparistolla("uusi-Salasana-2027", async () => {
    await kirjautumissivu(await middleware(hae("/lasku", { eväste: `rr_lasku=${tunniste(SALASANA)}` })));
    onKielto(await middleware(hae("/lasku/lasku.js", { eväste: `rr_lasku=${tunniste(SALASANA)}` })));
  });
});

// --- ympäristömuuttuja puuttuu (fail closed) ---------------------------------

test("ympäristömuuttuja puuttuu tai on tyhjä → mikään ei kelpaa, sivu kertoo ettei työkalua ole otettu käyttöön", async () => {
  for (const env of [undefined, "", "\n", "\r\n"]) {
    await ymparistolla(env, async () => {
      const yritykset = ["", SALASANA, "undefined", "null"];
      const vastaukset = await Promise.all(yritykset.map((yritys) => middleware(kirjaudu(yritys))));
      for (const [i, v] of vastaukset.entries()) {
        const html = await kirjautumissivu(v);
        assert.deepEqual(evasteet(v), [], `env=${JSON.stringify(env)} yritys=${JSON.stringify(yritykset[i])}`);
        assert.match(html, /ei ole otettu käyttöön/);
      }
      // Tyhjällä (tai "null"/"undefined"-merkkijono-) avaimella laskettu HMAC on kenen tahansa laskettavissa
      // → ei saa kelvata, vaikka koodi vahingossa HMAC:ttaisi puuttuvan arvon merkkijonona.
      for (const avain of ["", "null", "undefined", String(env)]) {
        const arvaus = `rr_lasku=${createHmac("sha256", avain).update("rr-lasku-v1").digest("hex")}`;
        await kirjautumissivu(await middleware(hae("/lasku", { eväste: arvaus })));
        onKielto(await middleware(hae("/lasku/lasku.js", { eväste: arvaus })));
      }
    });
  }
});

test("middleware lukee salasanan pyyntöhetkellä, ei latushetkellä", async () => {
  const keksi = { eväste: `rr_lasku=${tunniste(SALASANA)}` };
  await ymparistolla(undefined, async () => onKielto(await middleware(hae("/lasku", keksi))));
  await ymparistolla(SALASANA, async () =>
    assert.equal((await middleware(hae("/lasku", keksi))).headers.get("x-middleware-next"), "1"));
});

// --- uloskirjautuminen ----------------------------------------------------------

test("/lasku?ulos poistaa evästeen ja näyttää kirjautumissivun, vaikka eväste olisi voimassa", async () => {
  await ymparistolla(SALASANA, async () => {
    const v = await middleware(hae("/lasku?ulos", { eväste: `rr_lasku=${tunniste(SALASANA)}` }));
    const html = await kirjautumissivu(v);
    assert.match(html, /kirjauduit ulos/i);
    const [keksi] = evasteet(v);
    assert.match(keksi, /^rr_lasku=;/);
    assert.match(keksi, /Max-Age=0/i);
    assert.match(keksi, /Path=\/lasku(;|$)/i);
  });
});

test("matcher kattaa /lasku ja kaiken sen alla, ei muuta", () => {
  assert.deepEqual(config, { matcher: ["/lasku", "/lasku/:path*"] });
});
