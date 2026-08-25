/* Rentun Ruusu — galleria: suodatus + valoboksi (galleria.html) */

(function () {
  "use strict";

  /* Kuvat ovat galleria.html:ssä valmiina HTML:nä, jotta haku- ja
     tekoälyrobotit näkevät ne ilman JavaScriptiä. Tämä tiedosto lukee
     ne DOMista ja lisää päälle suodatuksen sekä valoboksin. */
  var grid = document.getElementById("gallery-grid");
  var bar = document.getElementById("filter-bar");
  if (!grid || !bar) return;

  var items = Array.prototype.slice.call(grid.querySelectorAll(".gallery-item"));
  if (!items.length) return;

  var PHOTOS = items.map(function (el) {
    return { id: el.dataset.id, caption: el.dataset.caption || "" };
  });

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
