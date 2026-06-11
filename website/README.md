# Rentun Ruusu — verkkosivusto

Staattinen sivusto: ei asennuksia, ei palvelinvaatimuksia. Avaa `index.html`
selaimessa tai lataa koko `website/`-kansio mille tahansa webhotellille
(esim. rentunruusu.vip-domainin juureen).

## Sivut

| Tiedosto | Sivu |
|---|---|
| `index.html` | Etusivu |
| `tapahtumat.html` | Tapahtumat (tulevat + menneet) |
| `galleria.html` | Galleria (suodatus + kuvien suurennos) |
| `yhteystiedot.html` | Yhteystiedot, kartta ja varauskysely |

## Tapahtumien päivitys

Muokkaa tiedostoa **`js/events-data.js`** — lisää tapahtuma listaan ja
sivusto lajittelee sen automaattisesti tuleviin tai menneisiin päivämäärän
perusteella. Ohjeet ja kenttien selitykset ovat tiedoston alussa.

⚠️ Nykyiset tulevat tapahtumat ovat **esimerkkejä** — korvaa ne oikeilla
ennen julkaisua.

## Gallerian päivitys

1. Lisää kuva kansioon `assets/img/gallery/` kahtena kokona:
   `nimi.jpg` (iso, n. 1600 px leveä) ja `nimi_t.jpg` (pikkukuva, n. 640 px).
2. Lisää rivi `js/gallery.js`-tiedoston `PHOTOS`-listaan
   (`id`, kategoria ja kuvateksti).

## Tarkista ennen julkaisua

- [ ] Sähköpostiosoite (`yhteystiedot.html` — kahdessa kohdassa, merkitty
      kommentilla `PÄIVITÄ`). Nyt: `info@rentunruusu.vip`.
- [ ] Osoite: sivustolla **Kauppakuja 16, 14200 Turenki** (talon kyltin
      mukaan). Korjaa, jos virallinen osoite on eri.
- [ ] Korvaa esimerkkitapahtumat (`js/events-data.js`).

## Brändi

Värit, fontit ja graafiset elementit: ks. `../brand-guidelines.md`.
