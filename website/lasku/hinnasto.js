// Rentun Ruusu — hinnasto 2026 ja laskun laskenta. Kaikki summat sentteinä.
// Hinnat muuttuvat? Muokkaa vain TILAT- ja ASTIAT-vakioita.

export const TILAT = {
  pianotupa: {
    nimi: "Pianotupa & keittiö",
    genetiivi: "Pianotuvan ja keittiön",
    hinnat: { arki: 19500, pe: 22500, la: 27000 },
    siivous: 0, // sisältyy hintaan
    liinat: { tapa: "kiintea", snt: 5000 },
  },
  sali: {
    nimi: "Sali & alakerta",
    genetiivi: "salin ja alakerran",
    hinnat: { arki: 19500, pe: 22500, la: 29500 },
    siivous: 9500, // lisätään aina
    liinat: { tapa: "hlo", snt: 150 },
  },
};

export const ASTIAT_SNT_HLO = 200;
export const LASKUTTAJA = { nimi: "Olli Hurskainen", iban: "FI55 3939 0069 8453 45" };

const LYHYET = ["su", "ma", "ti", "ke", "to", "pe", "la"];

function paiva(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function viikonpaiva(iso) {
  const d = paiva(iso);
  return d ? LYHYET[d.getDay()] : "";
}

export function paivaLuokka(iso) {
  const vp = viikonpaiva(iso);
  if (!vp) return null;
  return vp === "pe" || vp === "la" ? vp : "arki";
}

export function fiPvm(iso) {
  const d = paiva(iso);
  return d ? `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}` : "";
}

export function lisaaPaivia(iso, n) {
  const d = paiva(iso);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function euro(snt) {
  const a = Math.abs(Math.round(snt));
  const e = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const c = a % 100;
  return (snt < 0 ? "−" : "") + e + (c ? "," + String(c).padStart(2, "0") : "") + " €";
}

export function euroSyotteesta(str) {
  const s = String(str ?? "").trim().replace(/\s/g, "").replace(",", ".").replace("−", "-");
  if (s === "") return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

const hloTeksti = (snt) => euro(snt).replace(" €", " €");

export function laskeRivit({ tila, pvm, hlo, astiat, liinat, muuKuvaus, muuSnt } = {}) {
  const rivit = [];
  const huomautukset = [];
  const t = TILAT[tila];
  const luokka = paivaLuokka(pvm);
  const n = Number.isInteger(Number(hlo)) && Number(hlo) > 0 ? Number(hlo) : 0;

  if (!t || !luokka) {
    huomautukset.push("Valitse tila ja tilaisuuden päivä, niin vuokra lasketaan.");
  } else {
    rivit.push({ selite: `Tilavuokra · ${viikonpaiva(pvm)} ${fiPvm(pvm)}`, snt: t.hinnat[luokka] });
    if (t.siivous) rivit.push({ selite: "Siivous", snt: t.siivous });

    if (astiat) {
      if (n) rivit.push({ selite: `Astiat · ${n} hlö × ${hloTeksti(ASTIAT_SNT_HLO)}`, snt: n * ASTIAT_SNT_HLO });
      else huomautukset.push("Astiat: anna henkilömäärä.");
    }
    if (liinat) {
      if (t.liinat.tapa === "kiintea") rivit.push({ selite: "Valkoiset pöytäliinat", snt: t.liinat.snt });
      else if (n) rivit.push({ selite: `Valkoiset pöytäliinat · ${n} hlö × ${hloTeksti(t.liinat.snt)}`, snt: n * t.liinat.snt });
      else huomautukset.push("Pöytäliinat: anna henkilömäärä.");
    }
  }

  if (Number.isNaN(muuSnt)) huomautukset.push("Muu rivi: summa ei ole luku.");
  else if (Number.isFinite(muuSnt) && muuSnt !== 0)
    rivit.push({ selite: (muuKuvaus || "").trim() || "Muu", snt: muuSnt });

  return { rivit, summa: rivit.reduce((s, r) => s + r.snt, 0), huomautukset };
}

export function viite(iso) {
  const p = fiPvm(iso);
  return p ? `RR ${p}` : "RR";
}

export function tiedostonimi(iso, asiakas) {
  const slug = String(asiakas || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return ["lasku", paiva(iso) ? iso : "", slug].filter(Boolean).join("-");
}
