# Rentun Ruusu — verkkosivusto

Staattinen sivusto: ei asennuksia, ei palvelinvaatimuksia. Avaa `index.html`
selaimessa tai lataa koko `website/`-kansio mille tahansa webhotellille
(esim. rentunruusu.vip-domainin juureen). Vercel-deploy on määritelty
repon juuren `vercel.json`-tiedostossa.

## Sivut

| Tiedosto | Sivu |
|---|---|
| `index.html` | Etusivu |
| `avoimet-ovet.html` | Avoimet ovet to 6.8.2026 klo 16–18 (julistesivu) |
| `galleria.html` | Galleria (suodatus + kuvien suurennos) |
| `yhteystiedot.html` | Yhteystiedot, kartta ja varauskysely |

## Avoimet ovet -tapahtuma

Tapahtuman tiedot ovat kolmessa paikassa — muista päivittää kaikki, jos
päivä tai kellonaika muuttuu:

1. `avoimet-ovet.html` (julistehero, faktarivi ja sivun JSON-LD-tapahtumadata)
2. `avoimet-ovet.ics` (kalenteritiedosto, ajat UTC:nä — kesäaikaan −3 h)
3. Lippunappi ylätunnisteessa ja etusivun nosto (`index.html`)

Kun tapahtuma on ohi: poista lippunappi `header`-osiosta kaikilta neljältä
sivulta, etusivun `#avoimet-ovet`-sektio ja linkit alatunnisteista.

## Gallerian päivitys

1. Lisää kuva kansioon `assets/img/gallery/` kahtena kokona:
   `nimi.jpg` (iso, n. 1600 px leveä) ja `nimi_t.jpg` (pikkukuva, n. 640 px).
2. Lisää rivi `js/gallery.js`-tiedoston `PHOTOS`-listaan
   (`id`, kategoria ja kuvateksti).

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
