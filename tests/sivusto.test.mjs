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
