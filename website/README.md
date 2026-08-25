# Rentun Ruusu — verkkosivusto

Staattinen sivusto: ei asennuksia, ei palvelinvaatimuksia. Avaa `index.html`
selaimessa tai lataa koko `website/`-kansio mille tahansa webhotellille
(tuotannossa https://rentunruusu.com). Vercel-deploy on määritelty
repon juuren `vercel.json`-tiedostossa.

## Sivut

| Tiedosto | Sivu |
|---|---|
| `index.html` | Etusivu |
| `tapahtumat.html` | Tapahtumat (tulevat tapahtumat julisteineen) |
| `galleria.html` | Galleria (suodatus + kuvien suurennos) |
| `yhteystiedot.html` | Yhteystiedot, kartta ja varauskysely |
| `robots.txt` | Robottiohjeet (myös tekoälyhauille) + sitemap-viittaus |
| `sitemap.xml` | Sivukartta hakukoneille |
| `llms.txt` | Tiivistetyt perustiedot tekoälyhakuja varten |

## Tapahtumasivu

Tapahtumat listataan `tapahtumat.html`-sivulla. Yhden tapahtuman tiedot ovat
kolmessa paikassa — muista päivittää kaikki:

1. `article.event-card` (juliste, päivä, kellonaika ja lippujen hinta)
2. Sivun JSON-LD-tapahtumadata `head`-osiossa
3. `llms.txt`-tiedoston "Ajankohtaiset tapahtumat" -osio (tekoälyhakuja varten)

Julisteet: `assets/img/events/`. Kun tapahtuma on ohi, poista sen
`article.event-card` ja vastaava JSON-LD-lohko.

Aiempi ylätunnisteen lippunappi (`.ticket.header-ticket`) ja etusivun
tapahtumanosto (`.openday-card`) on poistettu, mutta niiden tyylit ovat
yhä `css/styles.css`-tiedostossa seuraavaa tapahtumaa varten.

## Gallerian päivitys

Kuvat ovat **suoraan `galleria.html`-tiedostossa** HTML:nä, jotta haku- ja
tekoälyrobotit näkevät ne ilman JavaScriptiä. `js/gallery.js` vain lukee ne
DOMista ja lisää päälle suodatuksen ja valoboksin — siellä ei ole enää
erillistä kuvalistaa.

1. Lisää kuva kansioon `assets/img/gallery/` kahtena kokona:
   `nimi.jpg` (iso, n. 1600 px leveä) ja `nimi_t.jpg` (pikkukuva, n. 640 px).
2. Lisää `galleria.html`-tiedoston `#gallery-grid`-lohkoon uusi rivi:

   ```html
   <figure class="gallery-item" data-cat="sali" data-index="27"
           data-id="nimi" data-caption="Lyhyt kuvateksti">
     <img src="assets/img/gallery/nimi_t.jpg"
          alt="Kuvaava alt-teksti hakukoneille"
          width="640" height="480" loading="lazy" decoding="async">
   </figure>
   ```

   - `data-index` juoksee nollasta ylöspäin — pidä numerot peräkkäisinä.
   - `data-caption` näkyy valoboksissa, `alt` on hakukoneita varten (saa olla
     pidempi ja kuvaavampi).
   - `width`/`height` ovat pikkukuvan **todelliset** mitat. Ne estävät sivun
     hyppimisen latauksen aikana (Core Web Vitals). Tarkista mitat komennolla
     `sips -g pixelWidth -g pixelHeight assets/img/gallery/nimi_t.jpg`.
3. Päivitä kuvamäärä `galleria.html`-sivun `description`-metatiedossa ja
   JSON-LD-lohkon `associatedMedia`-listassa.

## Yhteydenottolomake

Lomake (`yhteystiedot.html`) lähettää viestit **FormSubmit**-palvelun kautta
osoitteeseen `rentunruusu16@gmail.com`. Ensimmäisen lähetyksen jälkeen
FormSubmit lähettää tuohon osoitteeseen **vahvistussähköpostin** — klikkaa
siinä olevaa Activate-linkkiä kerran, minkä jälkeen viestit tulevat perille.

## Tarkista ennen julkaisua

- [ ] FormSubmit-vahvistus klikattu (ks. yllä).
- [ ] Osoite: sivustolla **Kauppakuja 16, 14200 Turenki** (talon kyltin
      mukaan). Korjaa, jos virallinen osoite on eri.

## Brändi

Värit, fontit ja graafiset elementit: ks. `../brand-guidelines.md`.
Logo: `assets/img/logo.png` (läpinäkyvä, norsunluu — tummille taustoille).

## Hakukoneet ja tekoälyhaut

| Tiedosto | Mitä pitää muistaa |
|---|---|
| `robots.txt` | Sallii kaikki hakurobotit sekä tekoälyrobotit (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot ym.). |
| `sitemap.xml` | Neljä sivua + tärkeimmät kuvat. Päivitä `<lastmod>`-päivämäärä kun sivun sisältö muuttuu olennaisesti. |
| `llms.txt` | Talon perustiedot tiiviisti tekoälyhauille. Päivitä kun yhteystiedot, tilat tai tapahtumat muuttuvat. |

Jokaisella sivulla on `head`-osiossa:

- `<link rel="canonical">` — osoittaa aina `https://rentunruusu.com`-osoitteeseen.
- Open Graph- ja Twitter-kortit (jaettaessa Facebookissa, WhatsAppissa ja Instagramissa
  näkyy kuva `assets/img/og-rentun-ruusu.jpg`, 1200 × 630 px).
- JSON-LD-rakenteinen data. Etusivulla `LocalBusiness` + `EventVenue` (osoite,
  koordinaatit, puhelinnumerot, tilat) ja `FAQPage`.

**Tärkeää:** UKK-vastaukset ovat sekä näkyvässä tekstissä että `FAQPage`-skeemassa.
Jos muutat vastauksen tekstiä, muuta se **molempiin** — Google vaatii, että skeeman
vastaus löytyy sivulta myös näkyvänä tekstinä.

**Sisäiset linkit** kirjoitetaan ilman `.html`-päätettä (`/tapahtumat`, ei
`tapahtumat.html`). `vercel.json`-asetus `cleanUrls` ohjaisi `.html`-osoitteet
308-uudelleenohjauksella, mikä hidastaa sivustoa ja hukkaa hakukonearvoa.
