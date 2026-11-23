// Vercel Routing Middleware: laskutyökalu (/lasku ja kaikki sen alla) HTTP Basic Authin taakse.
// Salasana tulee VAIN Vercelin ympäristömuuttujasta LASKU_SALASANA (repo on julkinen!).
// Käyttäjänimellä ei ole väliä. Jos muuttuja puuttuu tai on tyhjä, kaikki saavat 401:n (fail closed).
// Muuttujan muutos tulee voimaan vasta uudessa deployssa. Testit: tests/lasku-suojaus.test.mjs
// Ei riippuvuuksia: jatko on sama vastaus, jonka @vercel/functions next() palauttaa.

export const config = { matcher: ["/lasku", "/lasku/:path*"] };

const BASIC = /^Basic +([A-Za-z0-9+/]+={0,2}) *$/i;
const UTF8 = new TextDecoder("utf-8", { fatal: true });
const TAVUIKSI = new TextEncoder();

function base64Utf8(koodattu) {
  if (koodattu.length % 4 !== 0) return null;
  try {
    const binaari = atob(koodattu);
    return UTF8.decode(Uint8Array.from(binaari, (merkki) => merkki.charCodeAt(0)));
  } catch {
    return null; // ei base64:ää tai ei kelvollista UTF-8:aa
  }
}

// Vertailu, jonka kesto ei riipu siitä, missä kohtaa ensimmäinen ero on.
function samat(a, b) {
  const x = TAVUIKSI.encode(a);
  const y = TAVUIKSI.encode(b);
  let ero = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) ero |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return ero === 0;
}

/** Päästetäänkö pyyntö läpi? authorizationHeader = pyynnön Authorization-otsake, salasana = LASKU_SALASANA. */
export function sallittu(authorizationHeader, salasana) {
  if (typeof salasana !== "string") return false;
  const odotettu = salasana.replace(/[\r\n]+$/, "").normalize("NFC");
  if (odotettu === "") return false;
  if (typeof authorizationHeader !== "string") return false;
  const osuma = BASIC.exec(authorizationHeader);
  if (!osuma) return false;
  const tunnukset = base64Utf8(osuma[1]);
  if (tunnukset === null) return false;
  const kaksoispiste = tunnukset.indexOf(":"); // käyttäjä:salasana, jaetaan vain ensimmäisestä
  if (kaksoispiste === -1) return false;
  return samat(tunnukset.slice(kaksoispiste + 1).normalize("NFC"), odotettu);
}

export default function middleware(request) {
  const salasana = typeof process !== "undefined" ? process.env.LASKU_SALASANA : undefined;
  if (sallittu(request.headers.get("authorization"), salasana)) {
    return new Response(null, { headers: { "x-middleware-next": "1" } });
  }
  return new Response("Laskutyökalu vaatii salasanan.\n", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rentun Ruusu lasku", charset="UTF-8"',
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
