// Laskutyökalun suojaus (HTTP Basic Auth, middleware.js). Aja repon juuresta: node --test tests/*.test.mjs
// Salasana on tekaistu: oikea salasana on vain Vercelin ympäristömuuttujassa LASKU_SALASANA, ei koskaan repossa.
import { test } from "node:test";
import assert from "node:assert/strict";
import middleware, { sallittu, config } from "../middleware.js";

const SALASANA = "testi-Salasana!ä";
const b64 = (tavut) => Buffer.from(tavut).toString("base64");
const basic = (kayttaja, salasana) => "Basic " + b64(Buffer.from(`${kayttaja}:${salasana}`, "utf8"));

test("oikea salasana päästää läpi, käyttäjänimellä ei ole väliä", () => {
  assert.equal(sallittu(basic("olli", SALASANA), SALASANA), true);
  assert.equal(sallittu(basic("", SALASANA), SALASANA), true);
  assert.equal(sallittu(basic("kuka-tahansa", SALASANA), SALASANA), true);
});

test("väärä salasana hylätään", () => {
  assert.equal(sallittu(basic("olli", "testi-Salasana!a"), SALASANA), false);
  assert.equal(sallittu(basic("olli", "testi-salasana!ä"), SALASANA), false);
  assert.equal(sallittu(basic("olli", SALASANA + "x"), SALASANA), false);
  assert.equal(sallittu(basic("olli", SALASANA.slice(0, -1)), SALASANA), false);
  assert.equal(sallittu(basic("olli", ""), SALASANA), false);
  assert.equal(sallittu(basic(SALASANA, ""), SALASANA), false); // salasana käyttäjänimen paikalla
});

test("puuttuva Authorization-otsake hylätään", () => {
  assert.equal(sallittu(null, SALASANA), false);
  assert.equal(sallittu(undefined, SALASANA), false);
  assert.equal(sallittu("", SALASANA), false);
});

test("muu kuin Basic-skeema hylätään (skeeman kirjainkoolla ei väliä)", () => {
  const tunnus = basic("olli", SALASANA).slice("Basic ".length);
  assert.equal(sallittu(`Bearer ${tunnus}`, SALASANA), false);
  assert.equal(sallittu(`Digest ${tunnus}`, SALASANA), false);
  assert.equal(sallittu(`Basicx ${tunnus}`, SALASANA), false);
  assert.equal(sallittu(tunnus, SALASANA), false); // ei skeemaa lainkaan
  assert.equal(sallittu(`basic ${tunnus}`, SALASANA), true); // RFC 7617: skeema ei ole kirjainkokoherkkä
});

test("rikkinäinen base64 tai rikkinäinen UTF-8 hylätään", () => {
  assert.equal(sallittu("Basic %%%%", SALASANA), false);
  assert.equal(sallittu("Basic ", SALASANA), false);
  assert.equal(sallittu("Basic", SALASANA), false);
  assert.equal(sallittu("Basic abc", SALASANA), false); // väärä pituus
  assert.equal(sallittu("Basic ab=c", SALASANA), false); // täyte keskellä
  assert.equal(sallittu(basic("olli", SALASANA) + " ylimääräistä", SALASANA), false);
  // ei kaksoispistettä lainkaan
  assert.equal(sallittu("Basic " + b64(Buffer.from(SALASANA, "utf8")), SALASANA), false);
  // "o:" + tavu 0xFF: löysä dekoodaus tekisi siitä U+FFFD:n ja päästäisi läpi salasanalla "�"
  assert.equal(sallittu("Basic " + b64([0x6f, 0x3a, 0xff]), "�"), false);
  // Latin-1-koodattu ä (0xE4) ei ole UTF-8:aa
  const latin1 = Buffer.concat([Buffer.from("olli:testi-Salasana!"), Buffer.from([0xe4])]);
  assert.equal(sallittu("Basic " + b64(latin1), SALASANA), false);
});

test("tyhjä tai puuttuva ympäristömuuttuja → aina hylkäys (fail closed)", () => {
  assert.equal(sallittu(basic("olli", ""), ""), false);
  assert.equal(sallittu(basic("olli", ""), undefined), false);
  assert.equal(sallittu(basic("olli", ""), null), false);
  assert.equal(sallittu(basic("olli", "undefined"), undefined), false);
  assert.equal(sallittu(basic("olli", "null"), null), false);
  assert.equal(sallittu(basic("olli", SALASANA), ""), false);
  assert.equal(sallittu(basic("olli", ""), "\n"), false);
});

test("kaksoispiste salasanassa: jaetaan vain ensimmäisestä kaksoispisteestä", () => {
  const s = "a:b::c!ä:";
  assert.equal(sallittu(basic("olli", s), s), true);
  assert.equal(sallittu(basic("", s), s), true);
  assert.equal(sallittu(basic("olli", "b::c!ä:"), s), false);
});

test("ei-ASCII: hajotettu ä (NFD) vastaa koottua (NFC), RFC 7617", () => {
  assert.equal(sallittu(basic("olli", "testi-Salasana!ä"), SALASANA), true);
  assert.equal(sallittu(basic("olli", SALASANA), "testi-Salasana!ä"), true);
  assert.equal(sallittu(basic("olli", "Ünïcødé ✓ 🌹"), "Ünïcødé ✓ 🌹"), true);
});

test("ympäristömuuttujan loppurivinvaihto ei estä kirjautumista (echo | vercel env add)", () => {
  assert.equal(sallittu(basic("olli", SALASANA), SALASANA + "\n"), true);
  assert.equal(sallittu(basic("olli", SALASANA), SALASANA + "\r\n"), true);
});

// --- middleware itse ---------------------------------------------------------

function ymparistolla(arvo, fn) {
  const ennen = process.env.LASKU_SALASANA;
  if (arvo === undefined) delete process.env.LASKU_SALASANA;
  else process.env.LASKU_SALASANA = arvo;
  try {
    return fn();
  } finally {
    if (ennen === undefined) delete process.env.LASKU_SALASANA;
    else process.env.LASKU_SALASANA = ennen;
  }
}

const pyynto = (polku, otsakkeet = {}) =>
  new Request(`https://rentunruusu.com${polku}`, { headers: otsakkeet });

async function onKieltava(vastaus) {
  assert.ok(vastaus instanceof Response);
  assert.equal(vastaus.status, 401);
  assert.equal(vastaus.headers.get("www-authenticate"), 'Basic realm="Rentun Ruusu lasku", charset="UTF-8"');
  assert.equal(vastaus.headers.get("cache-control"), "no-store");
  assert.match(vastaus.headers.get("content-type"), /^text\/plain; charset=utf-8$/i);
  assert.equal(vastaus.headers.get("x-middleware-next"), null);
  const runko = await vastaus.text();
  assert.match(runko, /salasana/i);
  assert.ok(runko.length < 200, "lyhyt runko");
}

test("middleware: ilman tunnuksia 401 + WWW-Authenticate + no-store + suomenkielinen runko", async () => {
  await ymparistolla(SALASANA, () => onKieltava(middleware(pyynto("/lasku"))));
  await ymparistolla(SALASANA, () => onKieltava(middleware(pyynto("/lasku/lasku.js"))));
});

test("middleware: väärä salasana → 401", async () => {
  await ymparistolla(SALASANA, () =>
    onKieltava(middleware(pyynto("/lasku", { authorization: basic("olli", "väärä") }))));
});

test("middleware: oikea salasana jatkaa pyyntöä (x-middleware-next, kuten @vercel/functions next())", () => {
  ymparistolla(SALASANA, () => {
    const v = middleware(pyynto("/lasku/hinnasto.js", { authorization: basic("olli", SALASANA) }));
    assert.ok(v instanceof Response);
    assert.equal(v.headers.get("x-middleware-next"), "1");
    assert.equal(v.status, 200);
    assert.equal(v.body, null);
  });
});

test("middleware: ympäristömuuttuja puuttuu tai on tyhjä → 401 kaikille", async () => {
  await ymparistolla(undefined, () =>
    onKieltava(middleware(pyynto("/lasku", { authorization: basic("olli", "") }))));
  await ymparistolla("", () =>
    onKieltava(middleware(pyynto("/lasku", { authorization: basic("olli", "") }))));
});

test("middleware lukee salasanan pyyntöhetkellä, ei latushetkellä", async () => {
  const otsake = { authorization: basic("olli", SALASANA) };
  await ymparistolla(undefined, () => onKieltava(middleware(pyynto("/lasku", otsake))));
  ymparistolla(SALASANA, () => assert.equal(middleware(pyynto("/lasku", otsake)).headers.get("x-middleware-next"), "1"));
});

test("matcher kattaa /lasku ja kaiken sen alla, ei muuta", () => {
  assert.deepEqual(config, { matcher: ["/lasku", "/lasku/:path*"] });
});
