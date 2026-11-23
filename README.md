# Rentun Ruusu · Turenki

Juhla- ja tapahtumatalo Rentun Ruusun brändi ja verkkosivusto.

## Sisältö

| Polku | Kuvaus |
|---|---|
| [`website/`](website/) | Valmis staattinen verkkosivusto (etusivu, galleria, yhteystiedot) — ks. [website/README.md](website/README.md) |
| [`brand-guidelines.md`](brand-guidelines.md) | Brändiohjeisto: värit, typografia, logo, graafiset elementit |
| `saal/`, `cafe/`, `flur/`, `küche/`, `außen/`, `toilette/` | Alkuperäiset miljöökuvat huoneittain |
| `events/` | Tapahtumajulisteet ja -materiaalit |
| `banner.png`, `Design ohne Titel.pdf*` | Logo- ja banneritiedostot |

## Sivuston julkaisu

`website/`-kansio on julkaisuvalmis sellaisenaan: lataa sen sisältö
webhotellin juureen. Tuotannossa sivusto on osoitteessa
https://rentunruusu.com. Ei riippuvuuksia, ei
build-vaihetta.

### Laskutyökalu `/lasku` on salasanan takana

`middleware.js` (Vercel Routing Middleware) suojaa `/lasku`-polun ja kaiken
sen alla HTTP Basic Authilla. Salasana on **vain** Vercelin
ympäristömuuttujassa `LASKU_SALASANA` (repo on julkinen, ei koskaan tänne).
Käyttäjänimellä ei ole väliä. Ilman muuttujaa kaikki saavat 401:n, ja
muuttujan muutos tulee voimaan vasta uudessa deployssa. Suojaus toimii vain
Vercelissä: pelkkä `website/`-kansio muualle ladattuna jättää `/lasku`-polun
auki.
