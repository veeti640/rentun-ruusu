// Ohut kuori: Vercel Blob (yksityinen) lib/luonnos.js:lle. Polku /lasku/luonnos (rewrite vercel.jsonissa).
// BLOB_READ_WRITE_TOKEN tulee Vercelistä, kun Blob-varasto on liitetty projektiin; ilman sitä → 503.
import { get, put } from "@vercel/blob";
import { kasittele } from "../lib/luonnos.js";

const POLKU = "lasku/luonnos.json";

function varasto() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  return {
    async lue() {
      const b = await get(POLKU, { access: "private", useCache: false });
      if (!b || b.statusCode !== 200) return null;
      return JSON.parse(await new Response(b.stream).text());
    },
    async kirjoita(o) {
      await put(POLKU, JSON.stringify(o), {
        access: "private", addRandomSuffix: false, allowOverwrite: true,
        contentType: "application/json", cacheControlMaxAge: 60,
      });
    },
  };
}

export const GET = (request) => kasittele(request, varasto());
export const PUT = (request) => kasittele(request, varasto());
