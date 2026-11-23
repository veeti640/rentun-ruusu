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
sen alla omalla, Rentun Ruusun näköisellä kirjautumissivulla: vain
salasanakenttä, ei käyttäjänimeä eikä selaimen ponnahdusikkunaa. Salasana on
**vain** Vercelin ympäristömuuttujassa `LASKU_SALASANA` (repo on julkinen, ei
koskaan tänne).

- Oikea salasana → eväste `rr_lasku` (HttpOnly, Secure, SameSite=Lax, polku
  `/lasku`, 30 päivää). Arvo on HMAC-SHA256 salasanasta, joten **salasanan
  vaihto kirjaa kaikki laitteet ulos**.
- Väärä salasana → puolen sekunnin viive ja ilmoitus ”Väärä salasana.”
- Uloskirjautuminen: avaa `rentunruusu.com/lasku?ulos`.
- Ilman muuttujaa mikään salasana ei kelpaa, ja sivu kertoo, ettei työkalua
  ole otettu käyttöön.

Muuttujan muutos tulee voimaan vasta uudessa deployssa. Suojaus toimii vain
Vercelissä: pelkkä `website/`-kansio muualle ladattuna jättää `/lasku`-polun
auki. Testit: `tests/lasku-suojaus.test.mjs`.
