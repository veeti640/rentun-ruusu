// Vercel Routing Middleware: laskutyökalu (/lasku ja kaikki sen alla) oman kirjautumissivun taakse.
// Salasana tulee VAIN Vercelin ympäristömuuttujasta LASKU_SALASANA (repo on julkinen!).
//
// Kulku: ilman voimassa olevaa evästettä /lasku näyttää brändätyn kirjautumissivun (401, vain salasana).
// Lomake POSTaa osoitteeseen /lasku. Oikea salasana → 303 takaisin /laskuun ja eväste
// rr_lasku = HMAC-SHA256(avain = salasana, viesti = "rr-lasku-v1") heksana, 30 päivää, vain polulle /lasku.
// Väärä salasana → ~500 ms viive ja sama sivu virheilmoituksella. Salasanan vaihto mitätöi kaikki evästeet.
// Muuttuja puuttuu tai on tyhjä → mikään ei kelpaa (fail closed). /lasku?ulos poistaa evästeen.
// Muuttujan muutos tulee voimaan vasta uudessa deployssa. Testit: tests/lasku-suojaus.test.mjs
// Ei riippuvuuksia: jatko on sama vastaus, jonka @vercel/functions next() palauttaa.

export const config = { matcher: ["/lasku", "/lasku/:path*"] };

const EVASTE = "rr_lasku";
const VIESTI = "rr-lasku-v1";
const VOIMASSA_S = 60 * 60 * 24 * 30; // 30 päivää = 2592000 s
const VIIVE_MS = 500;
const SIVUPOLUT = new Set(["/lasku", "/lasku/"]);
const TAVUIKSI = new TextEncoder();
const ATTRIBUUTIT = "Path=/lasku; HttpOnly; Secure; SameSite=Lax";

/** LASKU_SALASANA pyyntöhetkellä (loppurivinvaihto pois, NFC), tai null jos puuttuu/tyhjä. */
export function asetettuSalasana() {
  const arvo = typeof process !== "undefined" ? process.env.LASKU_SALASANA : undefined;
  if (typeof arvo !== "string") return null;
  const salasana = arvo.replace(/[\r\n]+$/, "").normalize("NFC");
  return salasana === "" ? null : salasana;
}

/** HMAC-SHA256(avain = salasana, "rr-lasku-v1") heksana. Salasana ei saa olla tyhjä. */
async function tunniste(salasana) {
  const avain = await crypto.subtle.importKey(
    "raw", TAVUIKSI.encode(salasana), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const tavut = new Uint8Array(await crypto.subtle.sign("HMAC", avain, TAVUIKSI.encode(VIESTI)));
  return Array.from(tavut, (t) => t.toString(16).padStart(2, "0")).join("");
}

// Vertailu, jonka kesto ei riipu siitä, missä kohtaa ensimmäinen ero on.
function samat(a, b) {
  const x = TAVUIKSI.encode(a);
  const y = TAVUIKSI.encode(b);
  let ero = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) ero |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return ero === 0;
}

function evasteenArvot(otsake) {
  if (typeof otsake !== "string") return [];
  return otsake.split(";").map((osa) => osa.trim())
    .filter((osa) => osa.startsWith(EVASTE + "="))
    .map((osa) => osa.slice(EVASTE.length + 1));
}

export async function kirjautunut(request, salasana) {
  if (salasana === null) return false;
  const arvot = evasteenArvot(request.headers.get("cookie"));
  if (arvot.length === 0) return false;
  const odotettu = await tunniste(salasana);
  return arvot.some((arvo) => samat(arvo, odotettu));
}

async function kirjautuminen(request, salasana) {
  let syote = null; // null = lomaketta ei voitu lukea
  try {
    const arvo = (await request.formData()).get("salasana");
    syote = typeof arvo === "string" ? arvo.normalize("NFC") : "";
  } catch {
    syote = null;
  }
  if (salasana !== null && syote) {
    const [annettu, odotettu] = await Promise.all([tunniste(syote), tunniste(salasana)]);
    if (samat(annettu, odotettu)) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: "/lasku",
          "Set-Cookie": `${EVASTE}=${odotettu}; ${ATTRIBUUTIT}; Max-Age=${VOIMASSA_S}`,
          "Cache-Control": "no-store",
        },
      });
    }
  }
  await new Promise((valmis) => setTimeout(valmis, VIIVE_MS)); // hidastaa arvailua
  return kirjautumissivu(salasana === null ? "puuttuu" : syote === null ? "lukuvirhe" : "vaara");
}

export default async function middleware(request) {
  const salasana = asetettuSalasana();
  const url = new URL(request.url);
  const sivu = SIVUPOLUT.has(url.pathname);

  if (sivu && request.method === "POST") return kirjautuminen(request, salasana);
  if (sivu && url.searchParams.has("ulos")) {
    return kirjautumissivu(salasana === null ? "puuttuu" : "ulos",
      { "Set-Cookie": `${EVASTE}=; ${ATTRIBUUTIT}; Max-Age=0` });
  }
  if (await kirjautunut(request, salasana)) {
    return new Response(null, { headers: { "x-middleware-next": "1" } });
  }
  if (sivu) return kirjautumissivu(salasana === null ? "puuttuu" : "perus");
  return new Response("Laskutyökalu vaatii kirjautumisen: /lasku\n", {
    status: 401,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
  });
}

// --- kirjautumissivu ------------------------------------------------------------

const VIESTIT = {
  perus: null,
  vaara: { teksti: "Väärä salasana.", luokka: "virhe", rooli: "alert" },
  lukuvirhe: { teksti: "Lomaketta ei voitu lukea. Yritä uudelleen.", luokka: "virhe", rooli: "alert" },
  puuttuu: { teksti: "Laskutyökalua ei ole otettu käyttöön: salasanaa ei ole asetettu.", luokka: "tieto", rooli: "status" },
  ulos: { teksti: "Kirjauduit ulos.", luokka: "tieto", rooli: "status" },
};

function kirjautumissivu(tila, lisaOtsakkeet = {}) {
  return new Response(sivunHtml(tila), {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; " +
        "form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      ...lisaOtsakkeet,
    },
  });
}

function sivunHtml(tila) {
  const viesti = VIESTIT[tila];
  const suljettu = tila === "puuttuu";
  const kentanLisat = (tila === "vaara" ? ' aria-invalid="true"' : "") + (viesti ? ' aria-describedby="viesti"' : "");
  const viestiHtml = viesti
    ? `<p class="viesti ${viesti.luokka}" id="viesti" role="${viesti.rooli}">${viesti.teksti}</p>`
    : "";
  return `<!doctype html>
<html lang="fi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#222B3C">
<title>Kirjaudu · Laskutyökalu · Rentun Ruusu</title>
<link rel="icon" href="/favicon.png">
<style>
@font-face { font-family: "Fraunces"; font-style: normal; font-weight: 400 700; font-display: swap; src: url("/assets/fonts/fraunces-latin.woff2") format("woff2"); }
@font-face { font-family: "Fraunces"; font-style: italic; font-weight: 400 700; font-display: swap; src: url("/assets/fonts/fraunces-italic-latin.woff2") format("woff2"); }
@font-face { font-family: "Alegreya Sans"; font-style: normal; font-weight: 400; font-display: swap; src: url("/assets/fonts/alegreya-sans-400-latin.woff2") format("woff2"); }
@font-face { font-family: "Alegreya Sans"; font-style: normal; font-weight: 700; font-display: swap; src: url("/assets/fonts/alegreya-sans-700-latin.woff2") format("woff2"); }
@font-face { font-family: "Alegreya Sans SC"; font-style: normal; font-weight: 700; font-display: swap; src: url("/assets/fonts/alegreya-sans-sc-700-latin.woff2") format("woff2"); }
:root {
  --navy: #2B364A; --night: #222B3C; --night-deep: #1A2230;
  --lace: #F4EFE5; --paper: #FBF8F2; --edge: #8C7E68;
  --gold: #E6B488; --brass: #C08A57; --brass-ink: #825C33; --rose-deep: #8E5B59;
  --display: "Fraunces", Georgia, serif;
  --body: "Alegreya Sans", "Trebuchet MS", sans-serif;
  --caps: "Alegreya Sans SC", "Alegreya Sans", "Trebuchet MS", sans-serif;
  color-scheme: light;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0;
  min-height: 100vh; min-height: 100dvh;
  display: grid; place-items: center;
  padding: clamp(28px, 7vh, 88px) 16px;
  background-color: var(--night);
  background-image: radial-gradient(120% 75% at 50% 0%, var(--navy) 0%, var(--night) 62%, var(--night-deep) 100%);
  background-attachment: fixed;
  color: var(--navy);
  font: 400 17px/1.5 var(--body);
}
main { width: 100%; max-width: 420px; display: flex; flex-direction: column; align-items: center; gap: 30px; }
.koti { display: block; border-radius: 4px; }
.koti:focus-visible { outline: 2px solid var(--gold); outline-offset: 6px; }
.logo { display: block; width: 210px; height: auto; }
.kortti {
  position: relative; width: 100%;
  background: var(--lace);
  border-radius: 6px;
  padding: 46px 42px 40px;
  box-shadow: 0 30px 70px -30px rgba(8, 12, 20, .85), 0 2px 0 rgba(230, 180, 136, .08);
}
.kortti::before {
  content: ""; position: absolute; inset: 10px;
  border: 1px solid var(--brass); border-radius: 3px; opacity: .55;
  pointer-events: none;
}
.eyebrow { margin: 0 0 12px; font: 700 13px/1.2 var(--caps); letter-spacing: .16em; color: var(--brass-ink); }
h1 { margin: 0; font: 600 36px/1.05 var(--display); letter-spacing: -.01em; color: var(--navy); }
h1 em { font-style: italic; font-weight: 400; color: var(--rose-deep); }
.ohje { margin: 12px 0 28px; color: rgba(43, 54, 74, .78); }
fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
label { display: block; margin-bottom: 8px; font: 700 13px/1.2 var(--caps); letter-spacing: .12em; color: var(--navy); }
input[type="password"] {
  display: block; width: 100%; height: 52px;
  padding: 0 16px;
  font: 400 19px/1 var(--body); color: var(--navy);
  background: var(--paper);
  border: 1px solid var(--edge); border-radius: 4px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
input[type="password"]:focus { outline: none; border-color: var(--brass-ink); box-shadow: 0 0 0 3px rgba(192, 138, 87, .38); }
input[aria-invalid="true"] { border-color: var(--rose-deep); }
input[aria-invalid="true"]:focus { border-color: var(--rose-deep); box-shadow: 0 0 0 3px rgba(142, 91, 89, .25); }
.viesti { margin: 12px 0 0; font-size: 16px; font-weight: 700; }
.virhe { color: var(--rose-deep); }
.tieto { color: var(--brass-ink); }
button {
  display: block; width: 100%; height: 54px; margin-top: 24px;
  font: 700 15px/1 var(--caps); letter-spacing: .16em;
  color: var(--gold); background: var(--navy);
  border: 0; border-radius: 4px;
  cursor: pointer;
  transition: background-color .2s ease, transform .1s ease;
}
button:hover { background: var(--night-deep); }
button:active { transform: translateY(1px); }
button:focus-visible { outline: 2px solid var(--brass-ink); outline-offset: 3px; }
fieldset:disabled input, fieldset:disabled button { opacity: .5; cursor: not-allowed; }
.alaviite { margin: 0; font: 700 12px/1.3 var(--caps); letter-spacing: .18em; color: var(--gold); opacity: .8; text-align: center; }
.nakymaton {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; opacity: 0;
}
@media (max-width: 440px) {
  body { font-size: 16px; }
  .logo { width: 176px; }
  .kortti { padding: 38px 26px 30px; }
  h1 { font-size: 31px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
<main>
  <a class="koti" href="/" aria-label="Rentun Ruusu, etusivu">
    <picture>
      <source type="image/webp" srcset="/assets/img/logo-280.webp 280w, /assets/img/logo-420.webp 420w" sizes="210px">
      <img class="logo" src="/assets/img/logo.png" alt="Rentun Ruusu" width="700" height="222">
    </picture>
  </a>
  <section class="kortti" aria-labelledby="otsikko">
    <p class="eyebrow">Rentun Ruusu · Turenki</p>
    <h1 id="otsikko">Lasku<em>työkalu</em></h1>
    <p class="ohje">Kirjoita salasana jatkaaksesi.</p>
    <form method="post" action="/lasku">
      <fieldset${suljettu ? " disabled" : ""}>
        <input class="nakymaton" type="text" autocomplete="username" value="Rentun Ruusu" readonly tabindex="-1" aria-hidden="true">
        <label for="salasana">Salasana</label>
        <input id="salasana" type="password" name="salasana" autocomplete="current-password" autofocus required${kentanLisat}>
        ${viestiHtml}
        <button type="submit">Kirjaudu</button>
      </fieldset>
    </form>
  </section>
  <p class="alaviite">Sisäinen työkalu</p>
</main>
</body>
</html>
`;
}
