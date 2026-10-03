// Rentun Ruusu — staattisen sivuston tarkistukset. Aja repon juuresta: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "website");
const PAGES = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const css = readFileSync(join(ROOT, "css/styles.css"), "utf8");
const page = (f) => readFileSync(join(ROOT, f), "utf8").replace(/<!--[\s\S]*?-->/g, "");
const tags = (src, name) => src.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) || [];
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
};

test("ei Google Fonts -kutsuja", () => {
  for (const f of PAGES) assert.doesNotMatch(page(f), /fonts\.(googleapis|gstatic)\.com/, f);
  assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com/);
});

test("jokainen @font-face osoittaa olemassa olevaan woff2-tiedostoon", () => {
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)];
  assert.ok(faces.length >= 8, `@font-face-sääntöjä ${faces.length}`);
  for (const [, body] of faces) {
    const url = body.match(/url\("?([^")]+)"?\)/)[1];
    assert.ok(existsSync(join(ROOT, "css", url)), url);
    assert.match(body, /font-display:\s*swap/);
  }
});

const isLocal = (src) => src && !/^(https?:|data:)/.test(src);
const file = (src) => join(ROOT, src.split("?")[0]);

test("jokaisella kuvalla on width ja height", () => {
  for (const f of PAGES)
    for (const t of tags(page(f), "img")) {
      if (!attr(t, "src")) continue; // galleria-valoboksin tyhjä <img>
      assert.ok(attr(t, "width") && attr(t, "height"), `${f}: ${t}`);
    }
});

test("kaikki kuvatiedostot ja srcset-versiot ovat olemassa", () => {
  for (const f of PAGES)
    for (const t of [...tags(page(f), "img"), ...tags(page(f), "source")]) {
      const src = attr(t, "src");
      if (isLocal(src)) assert.ok(existsSync(file(src)), `${f}: ${src}`);
      for (const part of (attr(t, "srcset") || "").split(",").filter(Boolean)) {
        const url = part.trim().split(/\s+/)[0];
        assert.ok(existsSync(file(url)), `${f}: ${url}`);
      }
    }
});

test("yli 30 kt:n kuvat tarjotaan myös WebP:nä", () => {
  for (const f of PAGES) {
    const p = page(f);
    const covered = new Set();
    for (const [, inner] of p.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi))
      if (/<source\b[^>]*type="image\/webp"/i.test(inner)) tags(inner, "img").forEach((t) => covered.add(t));
    for (const t of tags(p, "img")) {
      const src = attr(t, "src");
      if (isLocal(src) && statSync(file(src)).size > 30 * 1024)
        assert.ok(covered.has(t), `${f}: ${src} ilman WebP-versiota`);
    }
  }
});

test("alatunnisteen kuvat latautuvat laiskasti", () => {
  for (const f of PAGES)
    for (const t of tags(page(f), "img"))
      if (/class="(footer-house|brand-logo footer-logo)"/.test(t)) assert.equal(attr(t, "loading"), "lazy", `${f}: ${t}`);
});

test("etusivun LCP-kuva on <img>, ei taustakuva, ja latautuu heti", () => {
  const p = page("index.html");
  assert.doesNotMatch(p, /style="[^"]*background-image/i);
  const hero = tags(p, "img").find((t) => /class="hero-bg"/.test(t));
  assert.ok(hero, "hero-bg-kuva puuttuu");
  assert.equal(attr(hero, "fetchpriority"), "high");
  assert.notEqual(attr(hero, "loading"), "lazy");
});

test("tapahtumasivun ensimmäinen juliste latautuu heti korkealla prioriteetilla", () => {
  const first = tags(page("tapahtumat.html"), "img").find((t) => /class="event-poster"/.test(t));
  assert.equal(attr(first, "fetchpriority"), "high");
  assert.notEqual(attr(first, "loading"), "lazy");
});

test("aria-label vain elementeillä, joilla on rooli", () => {
  for (const f of PAGES)
    for (const t of tags(page(f), "(?:span|div|i|p)"))
      if (attr(t, "aria-label") !== null) assert.ok(attr(t, "role"), `${f}: ${t}`);
});

test("heron arvostelulinkin nimi on sen näkyvä teksti", () => {
  const a = tags(page("index.html"), "a").find((t) => /class="hero-arvio"/.test(t));
  assert.equal(attr(a, "aria-label"), null);
});

test("otsikkotasot etenevät ilman hyppyjä", () => {
  for (const f of PAGES) {
    const lv = [...page(f).matchAll(/<h([1-6])\b/gi)].map((m) => +m[1]);
    lv.forEach((l, i) => i && assert.ok(l <= lv[i - 1] + 1, `${f}: h${lv[i - 1]} → h${l}`));
  }
});

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const [r, g, b] = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const tokens = Object.fromEntries([...css.matchAll(/(--rr-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const colorOf = (selector, bg) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = [...css.matchAll(new RegExp(`(?:^|\\n|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, "g"))];
  assert.ok(blocks.length, `sääntöä ${selector} ei löydy`);
  let v = blocks.at(-1)[1].match(/(?:^|[;{\s])color:\s*([^;]+)/)[1].trim();
  const t = v.match(/^var\((--rr-[\w-]+)\)$/);
  if (t) v = tokens[t[1]];
  const a = v.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  return a ? [1, 2, 3].map((i, k) => Math.round(+a[4] * +a[i] + (1 - +a[4]) * bg[k])) : rgb(v);
};

test("pienen tekstin kontrasti on vähintään 4,5:1", () => {
  for (const [sel, bg] of [
    [".ticker span", "#f4efe5"],
    [".event-details dt", "#fffaf0"],
    [".on-light .eyebrow", "#ece5d6"], // tummin vaalea pohja (.alt-osiot)
    [".form-card .eyebrow", "#2b364a"],
    [".footer-bottom", "#2b364a"],
    [".room-card .room-more", "#222b3c"],
  ]) {
    const r = ratio(colorOf(sel, rgb(bg)), rgb(bg));
    assert.ok(r >= 4.5, `${sel} ${r.toFixed(2)}:1`);
  }
});
