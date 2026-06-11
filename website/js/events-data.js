/* =====================================================================
   RENTUN RUUSU — TAPAHTUMAT
   Muokkaa tapahtumia tästä tiedostosta. Sivusto lajittelee ne
   automaattisesti tuleviin ja menneisiin päivämäärän perusteella.

   Kentät:
     date:   "VVVV-KK-PP" (esim. "2026-07-11")
     time:   esim. "klo 19.00" (vapaa teksti, voi jättää pois)
     title:  tapahtuman nimi
     desc:   lyhyt kuvaus
     price:  esim. "Liput 10 € ovelta" (voi jättää pois)
     meta:   lisätiedot listana, esim. ["K-18", "Kahvila avoinna"]
     poster: julisteen kuvatiedosto assets/img/events/-kansiossa
             (voi jättää pois)

   HUOM! Tulevat tapahtumat ovat ESIMERKKEJÄ — korvaa ne oikeilla
   tapahtumilla ennen sivuston julkaisua.
   ===================================================================== */

const RR_EVENTS = [
  /* ----- ESIMERKKI — muokkaa tai poista ----- */
  {
    date: "2026-06-19",
    time: "klo 19.00",
    title: "Juhannustanssit",
    desc: "Tanssitaan juhannus sisään elävän musiikin tahdissa. Kahvila palvelee koko illan.",
    price: "Liput 12 € ovelta",
    meta: ["Elävää musiikkia", "Kahvila avoinna"]
  },
  /* ----- ESIMERKKI — muokkaa tai poista ----- */
  {
    date: "2026-07-11",
    time: "klo 18.00",
    title: "Iskelmäilta",
    desc: "Kotimaisen iskelmän klassikoita vanhan pianon ja hyvän seuran äärellä.",
    price: "Vapaa pääsy",
    meta: ["Kahvila avoinna"]
  },
  /* ----- ESIMERKKI — muokkaa tai poista ----- */
  {
    date: "2026-08-22",
    time: "klo 15.00",
    title: "Syyskauden avajaiset",
    desc: "Tervetuloa tutustumaan taloon! Esittelemme salin, kahvilan ja syksyn ohjelman.",
    price: "Vapaa pääsy",
    meta: ["Koko perheelle"]
  },

  /* ----- Mennyt tapahtuma (näkyy arkistossa) ----- */
  {
    date: "2025-12-31",
    time: "klo 19.00",
    title: "New Years Party — Low Sounds",
    desc: "Tunnelman takaa Low Sounds: 40 vuotta iskelmää, mm. Juha Tapio, Yö, Lauri Tähkä, Kari Tapio ja Kirka.",
    price: "Liput 10 € ovelta",
    meta: ["K-18", "Kahvila suljettu — piknik"],
    poster: "assets/img/events/uudenvuoden-juhla-2025.jpg"
  }
];
