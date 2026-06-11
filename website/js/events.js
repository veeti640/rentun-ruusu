/* Rentun Ruusu — tapahtumasivun renderöinti (tapahtumat.html) */

(function () {
  "use strict";

  var split = RR.splitEvents(RR_EVENTS);

  /* Tulevat tapahtumat lippuina */
  var upWrap = document.getElementById("upcoming-events");
  if (upWrap) {
    if (split.upcoming.length) {
      upWrap.innerHTML = split.upcoming.map(RR.eventTicketHTML).join("");
    } else {
      upWrap.innerHTML =
        '<div class="events-empty">Uusia tapahtumia ei ole juuri nyt kalenterissa — ' +
        "seuraa meitä Instagramissa <strong>@rentunruusu</strong>, niin kuulet ensimmäisenä seuraavista juhlista!</div>";
    }
  }

  /* Menneet tapahtumat julistearkistona */
  var pastWrap = document.getElementById("past-events");
  if (pastWrap) {
    if (split.past.length) {
      pastWrap.innerHTML = split.past.map(function (ev) {
        var img = ev.poster
          ? '<img src="' + ev.poster + '" alt="' + ev.title + ' — juliste" loading="lazy">'
          : '<img src="assets/img/koti-lava.jpg" alt="' + ev.title + '" loading="lazy">';
        return (
          '<figure class="past-card reveal">' + img +
          "<figcaption>" + ev.title + " · " + RR.formatLong(ev.date) + "</figcaption>" +
          "</figure>"
        );
      }).join("");
    } else {
      var sec = document.getElementById("past-section");
      if (sec) sec.style.display = "none";
    }
  }

  /* Paljasta dynaamisesti lisätyt elementit */
  document.querySelectorAll("#upcoming-events .reveal, #past-events .reveal")
    .forEach(function (el, i) {
      setTimeout(function () { el.classList.add("shown"); }, 90 * i + 60);
    });
})();
