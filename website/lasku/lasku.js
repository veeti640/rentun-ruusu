import {
  TILAT, LASKUTTAJA, laskeRivit, euro, euroSyotteesta, viite, fiPvm, lisaaPaivia, tiedostonimi,
} from "./hinnasto.js";

const AVAIN = "rr-lasku-luonnos-v1";
const lomake = document.getElementById("lomake");
const kehys = document.getElementById("kehys");
const esikatselu = document.getElementById("esikatselu");
const TYHJA = "—";

const tanaan = () => {
  const d = new Date(), p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function lue() {
  const f = new FormData(lomake);
  const o = Object.fromEntries(f.entries());
  o.astiat = f.has("astiat");
  o.liinat = f.has("liinat");
  return o;
}

function kirjoita(o) {
  for (const el of lomake.elements) {
    if (!el.name || !(el.name in o)) continue;
    if (el.type === "checkbox") el.checked = !!o[el.name];
    else if (el.type === "radio") el.checked = el.value === o[el.name];
    else el.value = o[el.name];
  }
}

function aseta(k, teksti) {
  for (const el of document.querySelectorAll(`[data-k="${k}"]`)) el.textContent = teksti;
}

function piirra() {
  const o = lue();
  const tila = TILAT[o.tila] || TILAT.sali;
  const { rivit, summa, huomautukset } = laskeRivit({
    tila: o.tila, pvm: o.pvm, hlo: o.hlo, astiat: o.astiat, liinat: o.liinat,
    muuKuvaus: o.muuKuvaus, muuSnt: euroSyotteesta(o.muuEur),
  });

  aseta("viite", viite(o.pvm));
  aseta("asiakas", o.asiakas.trim() || TYHJA);
  aseta("email", o.email.trim());
  aseta("pvm", fiPvm(o.pvm) || TYHJA);
  aseta("lisatieto", o.lisatieto.trim());
  aseta("tilanimi", tila.nimi);
  aseta("genetiivi", tila.genetiivi);
  aseta("jarjestely", o.jarjestely.trim());
  aseta("kuuluu", o.kuuluu.trim());
  aseta("tavarat", o.tavarat.trim());
  aseta("avaimet", o.avaimet.trim());
  aseta("laskuttaja", LASKUTTAJA.nimi);
  aseta("iban", LASKUTTAJA.iban);
  aseta("erapaiva", fiPvm(o.erapaiva) || TYHJA);
  aseta("summa", euro(summa).replace(" €", " €"));
  aseta("liinahinta", tila.liinat.tapa === "kiintea" ? "50 € / kerta" : "1,50 € / hlö");

  const ol = document.getElementById("rivit");
  ol.replaceChildren(...(rivit.length ? rivit : [null]).map((r) => {
    const li = document.createElement("li");
    if (!r) { li.className = "tyhja"; li.textContent = "Valitse päivä, niin rivit lasketaan."; return li; }
    const a = document.createElement("span"); a.textContent = r.selite;
    const v = document.createElement("span"); v.className = "viiva";
    const b = document.createElement("span"); b.className = "snt"; b.textContent = euro(r.snt);
    li.append(a, v, b);
    return li;
  }));

  document.getElementById("huom").textContent = huomautukset.join(" ");
  try { localStorage.setItem(AVAIN, JSON.stringify(o)); } catch {}
}

function sovita() {
  const leveys = esikatselu.clientWidth - 56;
  const blatt = kehys.offsetWidth; // 210mm in px
  const s = Math.min(1, leveys / blatt);
  kehys.style.transform = `scale(${s})`;
  kehys.style.height = `${kehys.scrollHeight * s}px`;
}

const OLETUS = lue();

function uusi() {
  try { localStorage.removeItem(AVAIN); } catch {}
  kirjoita({ ...OLETUS, erapaiva: lisaaPaivia(tanaan(), 14) });
  piirra();
}

document.getElementById("uusi").addEventListener("click", () => {
  if (confirm("Tyhjennetäänkö lomake?")) uusi();
});

document.getElementById("tallenna").addEventListener("click", () => {
  const o = lue();
  const vanha = document.title;
  document.title = tiedostonimi(o.pvm, o.asiakas);
  window.addEventListener("afterprint", () => { document.title = vanha; }, { once: true });
  window.print();
});

lomake.addEventListener("input", piirra);
lomake.addEventListener("change", piirra);

let luonnos = null;
try { luonnos = JSON.parse(localStorage.getItem(AVAIN) || "null"); } catch {}
if (luonnos) kirjoita(luonnos);
if (!lomake.elements.erapaiva.value) lomake.elements.erapaiva.value = lisaaPaivia(tanaan(), 14);
piirra();
new ResizeObserver(sovita).observe(esikatselu);
sovita();
