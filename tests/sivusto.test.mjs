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
