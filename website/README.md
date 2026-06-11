# Rentun Ruusu — verkkosivusto

Staattinen sivusto: ei asennuksia, ei palvelinvaatimuksia. Avaa `index.html`
selaimessa tai lataa koko `website/`-kansio mille tahansa webhotellille
(esim. rentunruusu.vip-domainin juureen). Vercel-deploy on määritelty
repon juuren `vercel.json`-tiedostossa.

## Sivut

| Tiedosto | Sivu |
|---|---|
| `index.html` | Etusivu |
| `galleria.html` | Galleria (suodatus + kuvien suurennos) |
| `yhteystiedot.html` | Yhteystiedot, kartta ja varauskysely |

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
