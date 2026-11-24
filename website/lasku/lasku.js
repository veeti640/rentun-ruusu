import {
  TILAT, LASKUTTAJA, laskeRivit, euro, euroSyotteesta, euroKenttaan, oletusLisat,
  viite, fiPvm, lisaaPaivia, tiedostonimi,
} from "./hinnasto.js";

const AVAIN = "rr-lasku-luonnos-v2";
const lomake = document.getElementById("lomake");
const kehys = document.getElementById("kehys");
const esikatselu = document.getElementById("esikatselu");
const TYHJA = "—";
const LISAT = ["astiat", "liinat"];

const tanaan = () => {
  const d = new Date(), p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function lue() {
  const f = new FormData(lomake);
  const o = Object.fromEntries(f.entries());
  o.asiakasRivit = f.getAll("asiakasRivi");
  delete o.asiakasRivi;
  o.astiat = f.has("astiat");
  o.liinat = f.has("liinat");
  // Pois päältä olevat hintakentät ovat disabled → FormData ohittaa ne; luetaan suoraan.
  for (const k of LISAT) {
    o[k + "Tapa"] = lomake.elements[k + "Tapa"].value || "hlo";
    o[k + "Eur"] = lomake.elements[k + "Eur"].value;
  }
  return o;
}

function lisa(o, k) {
  return { paalla: o[k], tapa: o[k + "Tapa"], snt: euroSyotteesta(o[k + "Eur"]) };
}

// Tilan vaihto palauttaa lisäpalvelujen tavan ja hinnan tilan oletuksiin (hinnasto.js).
function oletuksetLisille(tila) {
  const ol = oletusLisat(tila);
  const o = {};
  for (const k of LISAT) { o[k + "Tapa"] = ol[k].tapa; o[k + "Eur"] = euroKenttaan(ol[k].snt); }
  kirjoita(o);
}

// Asiakkaan lisärivit (osoite, yritys …): Enter / „+ Lisää rivi“ lisää, × tai Backspace tyhjässä poistaa.
const asrivit = document.getElementById("asrivit");

function uusiRivi(arvo = "", paikka = "loppu") {
  const d = document.createElement("div");
  d.className = "asrivi";
  const i = document.createElement("input");
  i.type = "text"; i.name = "asiakasRivi"; i.value = arvo;
  i.placeholder = "esim. Katuosoite 1, 00100 Kaupunki";
  i.setAttribute("aria-label", "Asiakas, lisärivi");
  const x = document.createElement("button");
  x.type = "button"; x.className = "poista"; x.textContent = "×";
  x.setAttribute("aria-label", "Poista rivi");
  d.append(i, x);
  if (paikka === "alku") asrivit.prepend(d); else if (paikka === "loppu") asrivit.append(d); else paikka.after(d);
  return i;
}

function poistaRivi(d, kohdista) {
  const ed = d.previousElementSibling?.querySelector("input") || lomake.elements.asiakas;
  d.remove();
  if (kohdista) ed.focus();
  piirra();
}

document.getElementById("lisaarivi").addEventListener("click", () => {
  uusiRivi().focus();
  piirra();
});

asrivit.addEventListener("click", (e) => {
  if (e.target.classList.contains("poista")) poistaRivi(e.target.parentElement, true);
});

lomake.addEventListener("keydown", (e) => {
  const t = e.target;
  if (t.name !== "asiakas" && t.name !== "asiakasRivi") return;
  const rivi = t.name === "asiakasRivi" ? t.parentElement : null;
  if (e.key === "Enter" && !e.isComposing) {
    e.preventDefault();
    const seur = rivi ? rivi.nextElementSibling : asrivit.firstElementChild;
    const seurI = seur?.querySelector("input");
    (seurI && !seurI.value ? seurI : uusiRivi("", rivi || "alku")).focus();
    piirra();
  } else if (e.key === "Backspace" && rivi && !t.value) {
    e.preventDefault();
    poistaRivi(rivi, true);
  }
});

function kirjoita(o) {
  if (Array.isArray(o.asiakasRivit)) {
    asrivit.replaceChildren();
    for (const r of o.asiakasRivit) uusiRivi(r);
  }
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

function piirra(tallenna = true) {
  const o = lue();
  const tila = TILAT[o.tila] || TILAT.sali;
  const { rivit, summa, huomautukset } = laskeRivit({
    tila: o.tila, pvm: o.pvm, hlo: o.hlo, astiat: lisa(o, "astiat"), liinat: lisa(o, "liinat"),
    muuKuvaus: o.muuKuvaus, muuSnt: euroSyotteesta(o.muuEur),
  });

  aseta("viite", viite(o.pvm));
  aseta("asiakas", o.asiakas.trim() || TYHJA);
  aseta("asiakastiedot", [...o.asiakasRivit, o.email, o.puhelin]
    .map((r) => r.trim()).filter(Boolean).join("\n"));
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
  for (const k of LISAT) {
    const pois = !o[k];
    for (const el of lomake.querySelectorAll(`[name="${k}Tapa"], [name="${k}Eur"]`)) el.disabled = pois;
    aseta(k + "-yks", o[k + "Tapa"] === "kiintea" ? "€" : "€ / hlö");
  }

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
  if (tallenna) { muokattu = true; ajastaTallennus(); }
}

// --- pilvitallennus: sama luonnos jokaisella koneella (GET/PUT /lasku/luonnos, ks. lib/luonnos.js) ---
const tilarivi = document.getElementById("tallennus");
const TEKSTIT = ["lisatieto", "jarjestely", "kuuluu", "tavarat", "avaimet"]; // säilyvät „Uusi lasku“ -napissa
let pilvi = "odottaa"; // odottaa → paalla | pois. Ei tallenneta ennen kuin pilven luonnos on luettu.
let ajastin = null;
let muokattu = false;

function naytaTila(teksti, virhe = false) {
  tilarivi.textContent = teksti;
  tilarivi.classList.toggle("virhe", virhe);
}
const klo = () => new Date().toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });

async function tallennaPilveen(keepalive = false) {
  clearTimeout(ajastin);
  ajastin = null;
  if (pilvi !== "paalla") return;
  try {
    const v = await fetch("/lasku/luonnos", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lue()), keepalive, credentials: "same-origin",
    });
    if (!v.ok) throw new Error(String(v.status));
    naytaTila(`Tallennettu pilveen klo ${klo()}`);
  } catch {
    naytaTila("Pilveen tallennus epäonnistui — tallessa vain tällä koneella. Yritetään uudelleen seuraavasta muutoksesta.", true);
  }
}

function ajastaTallennus() {
  if (pilvi !== "paalla") return;
  clearTimeout(ajastin);
  naytaTila("Tallennetaan…");
  ajastin = setTimeout(tallennaPilveen, 1000);
}

async function haePilvesta() {
  naytaTila("Haetaan tallennettua luonnosta…");
  try {
    const v = await fetch("/lasku/luonnos", { cache: "no-store", credentials: "same-origin" });
    if (v.status === 503) {
      pilvi = "pois";
      naytaTila("Pilvitallennus ei ole vielä käytössä — tallessa vain tällä koneella.", true);
      return;
    }
    if (!v.ok) throw new Error(String(v.status));
    const { luonnos } = await v.json();
    pilvi = "paalla";
    if (muokattu) { ajastaTallennus(); return; } // ehdit jo kirjoittaa: oma muutos voittaa
    if (luonnos) { kirjoita(luonnos); piirra(false); naytaTila("Luonnos haettu pilvestä."); }
    else naytaTila("Pilvitallennus käytössä.");
  } catch {
    pilvi = "pois";
    naytaTila("Pilveen ei saatu yhteyttä — tallessa vain tällä koneella. Lataa sivu uudelleen.", true);
  }
}

addEventListener("pagehide", () => { if (ajastin) tallennaPilveen(true); });

function sovita() {
  const leveys = esikatselu.clientWidth - 56;
  const blatt = kehys.offsetWidth; // 210mm in px
  const s = Math.min(1, leveys / blatt);
  kehys.style.transform = `scale(${s})`;
  kehys.style.height = `${kehys.scrollHeight * s}px`;
}

oletuksetLisille(lue().tila);
const OLETUS = lue();

function uusi() {
  try { localStorage.removeItem(AVAIN); } catch {}
  const nyt = lue();
  const omat = Object.fromEntries(TEKSTIT.map((k) => [k, nyt[k]]));
  kirjoita({ ...OLETUS, ...omat, erapaiva: lisaaPaivia(tanaan(), 14) });
  piirra();
}

document.getElementById("uusi").addEventListener("click", () => {
  if (confirm("Tyhjennetäänkö lomake? Omat tekstit (vuokra-aika ja laskun tekstit) säilyvät.")) uusi();
});

document.getElementById("tallenna").addEventListener("click", () => {
  const o = lue();
  const vanha = document.title;
  document.title = tiedostonimi(o.pvm, o.asiakas);
  window.addEventListener("afterprint", () => { document.title = vanha; }, { once: true });
  window.print();
});

lomake.addEventListener("change", (e) => {
  if (e.target.name === "tila") oletuksetLisille(e.target.value);
});
lomake.addEventListener("input", piirra);
lomake.addEventListener("change", piirra);

let luonnos = null;
try { luonnos = JSON.parse(localStorage.getItem(AVAIN) || "null"); } catch {}
if (luonnos) kirjoita(luonnos);
if (!lomake.elements.erapaiva.value) lomake.elements.erapaiva.value = lisaaPaivia(tanaan(), 14);
piirra(false);
haePilvesta();
new ResizeObserver(sovita).observe(esikatselu);
sovita();
