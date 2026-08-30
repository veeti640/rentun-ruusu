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

## Google-arvostelut

Etusivulla arvostelut näkyvät kahdessa kohdassa:

1. **Herossa** nappien alla pieni nosto (`.hero-arvio`): tähtipalkki, keskiarvo
   ja arvostelujen määrä.
2. **Oma osio** (`#arvostelut`) heti heron ja nauhan jälkeen, ennen
   ”Tervetuloa taloon” -osiota: otsikko ”Ruusuja, ei risuja” ja sen alla
   Google-paneeli (`.google-panel`).

Osio on tarkoituksella heti heron perässä: arvostelut ovat vahvin yksittäinen
myyntiargumentti, joten ne luetaan ennen muuta sisältöä. Otsikko nojaa sanontaan
”risut ja ruusut”, ja sivun myöhemmän varausosion ”Haluaisitko ruusun poskille?”
jatkaa samaa kuvaa. Jos toista muutetaan, katso toinenkin.

### Google-paneeli

`.google-panel` on tarkoituksella eri näköinen kuin muu sivusto: valkoinen pohja,
pyöristetyt kulmat, Googlen nelivärinen G, Googlen keltaiset tähdet (`#fbbc04`,
luokka `.tahdet-google`) ja sininen tekstilinkki. Sen **kuuluu** näyttää
upotetulta Googlen moduulilta, jotta lukija näkee heti mistä arvostelut ovat
peräisin. Älä siis ”korjaa” sitä brändiväreihin. Leipäteksti käyttää silti
sivuston omaa kirjasinta, jottei sivulle tule neljättä fonttia.

Paneelissa on kolme osaa: tunniste- ja arvosanarivi (`.google-panel-head`),
arvostelukortit (`.google-arvostelut`) ja napit (`.google-panel-cta`).

### Arvostelukorttien lisääminen

Kortit ovat oikeita Googlen arvosteluja, kopioituna profiilista. Säännöt:

- Teksti, kirjoittajan nimi ja **kirjoitusasu kopioidaan sellaisenaan**: ei
  tiivistämistä, ei kielenhuoltoa, ei emojien poistoa. Nimi kirjoitetaan niin
  kuin arvostelija on sen itse kirjoittanut, myös pienellä alkukirjaimella.
- Vieraskielinen arvostelu jätetään omalle kielelleen ja merkitään
  `lang`-attribuutilla (`<blockquote lang="en">`). Älä käännä sitä.
- Tähtipalkin täyttö on **kyseisen arvostelun oma** arvosana: 5★ = `100%`,
  4★ = `80%`, 3★ = `60%`. Sama luku myös `aria-label`-tekstiin.
- Avatar on nimen alkukirjain. Väri valitaan luokalla `.google-avatar-rose`,
  `-navy` tai `-brass`, jotta vierekkäiset kortit erottuvat.
- **Ikä kirjoitetaan kuukautena ja vuotena** (”joulukuu 2025”), vaikka Google
  näyttää sen suhteellisena (”8 kuukautta sitten”). Staattisella sivulla
  suhteellinen aika vanhenee itsestään vääräksi.

Arvostelujen tekstejä ei voi hakea automaattisesti: Google estää sekä
`listugcposts`-rajapinnan (403) että sivun raapimisen. Ne kopioidaan käsin.

Talon Google-tunnisteet (älä keksi näitä uudelleen — Google antaa ne itse
karttaupotuksen datassa):

| Tunniste | Arvo |
|---|---|
| Place ID | `ChIJu1qup21pjkYR0VKYxbZ9m1g` |
| CID (JSON-LD:n `sameAs`) | `6384835120680424145` |
| Lue arvostelut | `https://search.google.com/local/reviews?placeid=<Place ID>` |
| Jätä arvostelu | `https://search.google.com/local/writereview?placeid=<Place ID>` |

**Lukujen päivitys.** Keskiarvo ja määrä ovat `index.html`-tiedostossa **kahdessa
lohkossa**: `.hero-arvio` (hero) ja `.google-panel-head` (paneelin yläreuna).
Päivitä molemmat samalla kertaa, ja kummassakin kaikki kolme kohtaa:

- tähtipalkin täyttö `<i style="width:…%">`, eli **keskiarvo / 5 prosentteina**
  (esim. 4,7 / 5 = `94%`),
- näkyvä keskiarvo ja sen perässä arvostelujen määrä,
- linkin `aria-label`, jossa samat luvut sanallisesti ruudunlukijoille.

Tähtipalkki `.tahdet` on yhteinen komponentti (herossa lisäksi `.tahdet-dark`
tummaa taustaa varten), joten tähtien ulkoasua ei tarvitse tehdä kahdesti.

Ajantasaiset luvut näkee Googlen omasta datasta:

```sh
curl -s "https://www.google.com/maps?q=Rentun%20Ruusu,%20Kauppakuja%2016,%2014200%20Turenki&output=embed&hl=fi" \
  | grep -o '.\{40\}arvostelua'
```

**Älä lisää `aggregateRating`-skeemaa.** Google ei hyväksy yrityksen omilla
sivuilla julkaistua tähtimerkintää omasta itsestään (self-serving review), joten
tähdet näytetään vain näkyvänä sisältönä — ei rakenteisena datana.

## Yhteydenottolomake

Lomake (`yhteystiedot.html`) lähettää viestit **FormSubmit**-palvelun kautta
osoitteeseen `rentunruusu16@gmail.com`. Ensimmäisen lähetyksen jälkeen
FormSubmit lähettää tuohon osoitteeseen **vahvistussähköpostin** — klikkaa
siinä olevaa Activate-linkkiä kerran, minkä jälkeen viestit tulevat perille.

## Tarkista ennen julkaisua

- [ ] FormSubmit-vahvistus klikattu (ks. yllä).
- [ ] **sanni nymanin arvostelun tähtimäärä tarkistettu Googlesta.** Kortissa on
      nyt 5★, mutta arvosana ei tullut mukaan tekstiä kopioitaessa, toisin kuin
      kahdessa muussa. Jos se on jokin muu, korjaa kortin `width`-prosentti ja
      `aria-label`.
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
