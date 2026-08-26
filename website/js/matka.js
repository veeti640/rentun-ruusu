/* Matkakartta: lähtökaupungin valinta korostaa rataosuuden Turenkiin. */
(function () {
  "use strict";

  var kartta = document.querySelector("[data-matkakartta]");
  if (!kartta) return;

  // Asemien SVG-koordinaatit, projisoitu oikeista sijainneista (pohjoisesta etelään).
  var P = {
    toijala:     [64.0, 76.2],
    parola:      [313.6, 198.7],
    hameenlinna: [369.1, 247.0],
    turenki:     [448.0, 332.3],
    ryttyla:     [507.0, 434.1],
    riihimaki:   [518.4, 517.4],
    hyvinkaa:    [556.0, 623.8]
  };
  var JARJESTYS = ["toijala", "parola", "hameenlinna", "turenki", "ryttyla", "riihimaki", "hyvinkaa"];
  var TURENKI = JARJESTYS.indexOf("turenki");
  // Kartan ulkopuoliset päät: rata jatkuu nuolena.
  var TAMPERE_PAA = [28.1, 58.6];
  var HELSINKI_PAA = [571.0, 666.2];

  var korostus = kartta.querySelector("[data-korostus]");
  var napit = Array.prototype.slice.call(document.querySelectorAll("[data-kaupunki-nappi]"));
  var kortit = Array.prototype.slice.call(document.querySelectorAll("[data-kaupunki-kortti]"));
  var asemat = Array.prototype.slice.call(kartta.querySelectorAll("[data-asema]"));

  function pisteet(kaupunki) {
    var lista;
    if (kaupunki === "tampere") {
      lista = [TAMPERE_PAA].concat(JARJESTYS.slice(0, TURENKI + 1).map(function (k) { return P[k]; }));
    } else if (kaupunki === "helsinki") {
      lista = JARJESTYS.slice(TURENKI).map(function (k) { return P[k]; }).concat([HELSINKI_PAA]);
    } else {
      var i = JARJESTYS.indexOf(kaupunki);
      if (i < 0) return "";
      var a = Math.min(i, TURENKI);
      var b = Math.max(i, TURENKI);
      lista = JARJESTYS.slice(a, b + 1).map(function (k) { return P[k]; });
    }
    return lista.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
  }

  function valitse(kaupunki) {
    if (korostus) korostus.setAttribute("points", pisteet(kaupunki));

    napit.forEach(function (n) {
      var on = n.getAttribute("data-kaupunki-nappi") === kaupunki;
      n.classList.toggle("is-active", on);
      n.setAttribute("aria-pressed", on ? "true" : "false");
    });
    kortit.forEach(function (k) {
      k.classList.toggle("is-active", k.getAttribute("data-kaupunki-kortti") === kaupunki);
    });
    asemat.forEach(function (a) {
      a.classList.toggle("is-lahto", a.getAttribute("data-asema") === kaupunki);
    });
  }

  napit.forEach(function (n) {
    n.addEventListener("click", function () {
      valitse(n.getAttribute("data-kaupunki-nappi"));
    });
  });

  // JS käytössä: kortit vaihtuvat napeista, joten piilotetaan muut kuin valittu.
  kartta.classList.add("js-kaytossa");
  var oletus = document.querySelector("[data-kaupunki-nappi].is-active");
  valitse(oletus ? oletus.getAttribute("data-kaupunki-nappi") : "hameenlinna");
})();
