/* Rentun Ruusu — yhteinen käyttöliittymälogiikka */

(function () {
  "use strict";

  /* Mobiilivalikko */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Vierityspaljastukset */
  var revealed = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealed.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("shown");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add("shown"); });
  }

  /* Alatunnisteen vuosiluku */
  var year = document.getElementById("footer-year");
  if (year) year.textContent = new Date().getFullYear();
})();

/* Apufunktiot tapahtumille (käytössä etusivulla ja tapahtumasivulla) */

var RR = window.RR || {};

RR.MONTHS_SHORT = ["tammi", "helmi", "maalis", "huhti", "touko", "kesä",
  "heinä", "elo", "syys", "loka", "marras", "joulu"];

RR.parseDate = function (iso) {
  var p = iso.split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
};

RR.formatLong = function (iso) {
  var d = RR.parseDate(iso);
  return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear();
};

RR.eventTicketHTML = function (ev) {
  var d = RR.parseDate(ev.date);
  var meta = (ev.meta || []).slice();
  if (ev.time) meta.unshift(ev.time);

  var metaHtml = meta.length
    ? '<div class="event-meta">' + meta.map(function (m) {
        return "<span>" + m + "</span>";
      }).join("") + "</div>"
    : "";

  var sideParts = [];
  if (ev.price) sideParts.push('<span class="event-price">' + ev.price + "</span>");
  if (ev.poster) {
    sideParts.push('<a class="event-poster-link" href="' + ev.poster + '" target="_blank" rel="noopener">katso juliste</a>');
  }

  return (
    '<article class="event-ticket reveal">' +
      '<div class="event-date">' +
        '<span class="day">' + d.getDate() + "</span>" +
        '<span class="month">' + RR.MONTHS_SHORT[d.getMonth()] + "kuu</span>" +
        '<span class="year">' + d.getFullYear() + "</span>" +
      "</div>" +
      '<div class="event-info">' +
        "<h3>" + ev.title + "</h3>" +
        '<p class="event-desc">' + ev.desc + "</p>" +
        metaHtml +
      "</div>" +
      '<div class="event-side">' + sideParts.join("") + "</div>" +
    "</article>"
  );
};

RR.splitEvents = function (events) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var upcoming = [];
  var past = [];
  events.forEach(function (ev) {
    (RR.parseDate(ev.date) >= today ? upcoming : past).push(ev);
  });
  upcoming.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  past.sort(function (a, b) { return a.date > b.date ? -1 : 1; });
  return { upcoming: upcoming, past: past };
};
