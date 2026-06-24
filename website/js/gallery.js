/* Rentun Ruusu — galleria: suodatus + valoboksi (galleria.html) */

(function () {
  "use strict";

  /* Kuvat: tiedostot assets/img/gallery/-kansiossa.
     Jokaisesta kuvasta on pikkukuva (_t.jpg) ja iso versio (.jpg). */
  var PHOTOS = [
    { id: "sali-01", cat: "sali", caption: "Juhlasali katettuna" },
    { id: "sali-02", cat: "sali", caption: "Pöytärivi kohti näyttämöä" },
    { id: "sali-03", cat: "sali", caption: "Pitkät pöydät ja samettiverhot" },
    { id: "sali-04", cat: "sali", caption: "Katettu sali" },
    { id: "sali-05", cat: "sali", caption: "Salin yksityiskohdat" },
    { id: "kahvila-01", cat: "kahvila", caption: "Kahvilan tunnelmaa" },
    { id: "kahvila-02", cat: "kahvila", caption: "Piano ja kaakeliuuni" },
    { id: "kahvila-03", cat: "kahvila", caption: "Vanha piano ja seinäkello" },
    { id: "kahvila-04", cat: "kahvila", caption: "Antiikkisenkki ja taulut" },
    { id: "kahvila-05", cat: "kahvila", caption: "Pitsiverhojen nurkkaus" },
    { id: "kahvila-06", cat: "kahvila", caption: "Saksofoni seinällä" },
    { id: "kahvila-07", cat: "kahvila", caption: "Pöytä taulun alla" },
    { id: "kahvila-08", cat: "kahvila", caption: "Kahvilan kattauspöytä" },
    { id: "kahvila-09", cat: "kahvila", caption: "Nojatuolit ja senkki" },
    { id: "kahvila-10", cat: "kahvila", caption: "Kahvilan pöydät ja buffet" },
    { id: "aula-01", cat: "aula", caption: "Aulan nojatuolit" },
    { id: "aula-02", cat: "aula", caption: "Vanha kaappi aulassa" },
    { id: "aula-03", cat: "aula", caption: "Aulan istuinryhmä" },
    { id: "aula-04", cat: "aula", caption: "Samettituolit" },
    { id: "keittio-01", cat: "keittio", caption: "Keittiön työtilat" },
    { id: "keittio-02", cat: "keittio", caption: "Keittiö" },
    { id: "keittio-03", cat: "keittio", caption: "Uunit ja liedet" },
    { id: "wc-01", cat: "wc", caption: "WC ja Coca-Cola-kyltti" },
    { id: "wc-02", cat: "wc", caption: "Kultakehyksinen peili" },
    { id: "wc-03", cat: "wc", caption: "WC-tilojen aula" },
    { id: "piha-01", cat: "piha", caption: "Rentun Ruusu kesäpäivänä" },
    { id: "piha-02", cat: "piha", caption: "Talo Kauppakujalta" },
    { id: "piha-03", cat: "piha", caption: "Punainen puutalo" },
    { id: "piha-04", cat: "piha", caption: "Kauppakuja 16" }
  ];

  var CATS = {
    kaikki: "Kaikki",
    sali: "Juhlasali",
    kahvila: "Kahvila",
    aula: "Aula",
    keittio: "Keittiö",
    wc: "WC-tilat",
    piha: "Piha"
  };

  var grid = document.getElementById("gallery-grid");
  var bar = document.getElementById("filter-bar");
  if (!grid || !bar) return;

  /* Rakenna suodatusnapit */
  bar.innerHTML = Object.keys(CATS).map(function (key) {
    return '<button class="filter-btn' + (key === "kaikki" ? " active" : "") +
      '" data-cat="' + key + '">' + CATS[key] + "</button>";
  }).join("");

  /* Rakenna ruudukko */
  grid.innerHTML = PHOTOS.map(function (p, i) {
    return (
      '<figure class="gallery-item" data-cat="' + p.cat + '" data-index="' + i + '">' +
        '<img src="assets/img/gallery/' + p.id + '_t.jpg" alt="' + p.caption + '" loading="lazy">' +
        "<figcaption>" + p.caption + "</figcaption>" +
      "</figure>"
    );
  }).join("");

  var items = Array.prototype.slice.call(grid.querySelectorAll(".gallery-item"));

  /* Suodatus */
  bar.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;
    bar.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    var cat = btn.dataset.cat;
    items.forEach(function (el) {
      el.classList.toggle("hidden", cat !== "kaikki" && el.dataset.cat !== cat);
    });
  });

  /* Valoboksi */
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  var lbCaption = lb.querySelector(".lightbox-caption");
  var current = 0;

  function visiblePhotos() {
    return items
      .filter(function (el) { return !el.classList.contains("hidden"); })
      .map(function (el) { return Number(el.dataset.index); });
  }

  function show(index) {
    var p = PHOTOS[index];
    current = index;
    lbImg.src = "assets/img/gallery/" + p.id + ".jpg";
    lbImg.alt = p.caption;
    lbCaption.textContent = p.caption;
  }

  function open(index) {
    show(index);
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.classList.remove("open");
    lbImg.src = "";
    document.body.style.overflow = "";
  }

  function step(dir) {
    var vis = visiblePhotos();
    var pos = vis.indexOf(current);
    if (pos === -1) return;
    show(vis[(pos + dir + vis.length) % vis.length]);
  }

  grid.addEventListener("click", function (e) {
    var fig = e.target.closest(".gallery-item");
    if (fig) open(Number(fig.dataset.index));
  });

  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", function () { step(-1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { step(1); });

  lb.addEventListener("click", function (e) {
    if (e.target === lb) close();
  });

  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();
