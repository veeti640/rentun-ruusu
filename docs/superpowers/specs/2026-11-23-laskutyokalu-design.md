# Laskutyökalu — Rechnungs-Tool für Rentun Ruusu

Stand 2026-11-23 · von Veeti freigegeben

## Ziel

Olli erstellt Raumvermietungs-Rechnungen selbst, ohne KI, immer im selben Design
(`laskut/lasku-pohja.html`: navy/gold, Ticket-Zahlungsblock). Links Formular,
rechts Live-Vorschau des A4-Blatts, Knopf „Tallenna PDF“.

## Rahmen

- Nutzer: Olli, am Computer (Desktop-Layout reicht, keine Handy-Optimierung).
- Ort: `website/lasku/` → `https://rentunruusu.com/lasku` (Vercel, `cleanUrls`).
- Nicht indexiert: `<meta name="robots" content="noindex, nofollow">` + `Disallow: /lasku` in `robots.txt`; nicht in `sitemap.xml`.
- Statisch, kein Build, keine Bibliotheken, kein Server. Formular-UI auf Finnisch.
- PDF über `window.print()`; Druck-CSS zeigt nur das Blatt (`@page { size: A4; margin: 0 }`).
  Dateiname-Vorschlag über `document.title` = `lasku-VVVV-KK-PP-asiakas` (Datum = Veranstaltungstag, Name als ASCII-Slug).
- Letzter Entwurf bleibt in `localStorage` (try/catch, Seite funktioniert ohne); Knopf „Uusi lasku“ leert ihn.

## Preise (Hinnasto 2026) — einzige Quelle: `website/lasku/hinnasto.js`

| Tila | ma–to + su | pe | la | Siivous |
|---|---|---|---|---|
| Pianotupa + keittiö | 195 € | 225 € | 270 € | inklusive (keine Zeile) |
| Sali + alakerta | 195 € | 225 € | 295 € | 95 € immer als eigene Zeile |

Lisäpalvelut (Häkchen, brauchen Personenzahl `hlö`):
- Astiat: 2 €/hlö (beide Räume)
- Valkoiset pöytäliinat: Pianotupa 50 € pauschal · Sali 1,50 €/hlö

Wochentag-Klasse kommt aus dem Veranstaltungsdatum (lokales Datum, keine UTC-Verschiebung).

**Muu rivi** (optional): freie Beschreibung + Betrag (darf negativ sein, z. B. Rabatt). Das ersetzt
ein „Preis von Hand überschreiben“ — Summe und Erittely bleiben immer konsistent.

Beträge: finnisches Format, ganze Euro ohne Nachkommastellen (`295 €`), sonst Komma (`82,50 €`),
Tausender mit schmalem Leerzeichen (`1 234 €`). Rechnen in Cent (Ganzzahlen).

## Formular (links)

Asiakas · Sähköposti · Tilaisuuden päivä (date) · Tila (2 Optionen) · Vuokra-aika lisätieto ·
Henkilömäärä · ☐ Astiat · ☐ Pöytäliinat · Muu rivi (kuvaus, €) · Eräpäivä (date, Standard heute+14) ·
Salin järjestely · Vuokraan kuuluu · Tavarat ja nouto · Avaimet (Textareas, vorausgefüllt mit den
Texten der Emmi-Anttila-Rechnung).

Validierung leise: Extras pro Person ohne Personenzahl → Hinweis am Feld, Zeile wird nicht berechnet.
Leere Pflichtfelder (Asiakas, päivä) → Platzhalter „—“ in der Vorschau, PDF-Knopf trotzdem möglich.

## Vorschau (rechts) — Design 1:1 aus `lasku-pohja.html`

Masthead, Facts (Asiakas / Vuokra-aika / Vuokrakohde), Lede, 4 Terms, Ticket, Fineprint, Colophon
unverändert im Aussehen. Vuokrakohde-Name = Raumname. Viite/Viesti = `RR d.m.yyyy`.
Ticket: Nimi Olli Hurskainen · IBAN FI55 3939 0069 8453 45 · Eräpäivä · Summe groß · „+ alv 0 %“.
Footer-Domain: rentunruusu.com.

**Neu: Erittely-Block** zwischen Terms und Ticket: eine Zeile pro Position, Beschriftung links,
gepunktete Linie, Betrag rechts (Stil wie Hinnasto), z. B. „Tilavuokra · la 31.10.2026 … 295 €“,
„Siivous … 95 €“, „Astiat · 60 hlö × 2 € … 120 €“. Muss mit bis zu 5 Zeilen auf **eine** A4-Seite passen.

Schriften aus `website/assets/fonts/` (nicht base64), Logo aus der Vorlage extrahiert nach
`website/lasku/logo.png`. Vorschau am Bildschirm per CSS-`transform: scale()` in die rechte Spalte eingepasst.

## Dateien

- `website/lasku/index.html` — Formular + Blatt-Markup
- `website/lasku/lasku.css` — Blatt-Design (aus Vorlage) + Tool-Layout + Druck
- `website/lasku/hinnasto.js` — ES-Modul, rein: Preise, `paivaLuokka`, `laskeRivit`, `euro`, `viite`, `tiedostonimi`
- `website/lasku/lasku.js` — DOM: Formular ↔ Vorschau, localStorage, Druck
- `tests/lasku.test.mjs` — `node --test`, testet `hinnasto.js`

## Erfolgskriterien

1. Preistests grün (alle 6 Raum×Tag-Kombinationen, Siivous, Extras, Muu rivi, Format, Slug).
2. Bestehende `tests/sivusto.test.mjs` bleiben grün.
3. Headless-Chrome-PDF der Seite = genau 1 A4-Seite, sieht aus wie die Emmi-Rechnung + Erittely.
4. Screenshot der Tool-Ansicht 1440 px breit: Formular links, Blatt rechts, ganz sichtbar.
