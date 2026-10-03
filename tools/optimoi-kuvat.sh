#!/usr/bin/env bash
# Rentun Ruusu — WebP-versiot sivuston kuvista. Vaatii cwebp:n (brew install webp).
# Aja repon juuresta: tools/optimoi-kuvat.sh
#
# Alkuperäiset JPG/PNG-tiedostot jäävät paikalleen: ne ovat <picture>-elementtien
# varakuvia ja schema/og-kuvia. Kun vaihdat kuvan, aja skripti uudelleen — HTML
# viittaa versioihin nimellä <nimi>-<leveys>.webp.
set -euo pipefail
cd "$(dirname "$0")/../website/assets/img"

webp() { # lähde kohde leveys [cwebp-optiot...]
  local src=$1 out=$2 w=$3; shift 3
  cwebp -quiet -mt -m 6 -sharp_yuv "$@" -resize "$w" 0 "$src" -o "$out"
}
kuva() { # lähde leveys... → <nimi>-<leveys>.webp
  local src=$1; shift
  for w in "$@"; do webp "$src" "${src%.*}-$w.webp" "$w" -q 72; done
}

# Etusivun hero: vaakaversiot + puhelimille pystyrajaus kuvan keskeltä (900×1200)
kuva hero-sali.jpg 960 1600
for w in 600 900; do webp hero-sali.jpg "hero-sali-p-$w.webp" "$w" -q 72 -crop 350 0 900 1200; done

# Kuvapinot ja tilakortit
kuva koti-kahvila.jpg 480 800
kuva koti-talo.jpg 480 800
kuva koti-aula.jpg 480 800 1200
kuva gallery/sali-01.jpg 480 800 1200
kuva gallery/kahvila-01.jpg 480 800 1200

# Logo (läpinäkyvä) ja alatunnisteen talo
for w in 280 420; do webp logo.png "logo-$w.webp" "$w" -q 90 -alpha_q 100; done
for w in 720 1280; do webp banner-talo.png "banner-talo-$w.webp" "$w" -q 80; done

# Tapahtumajulisteet
for p in events/sillalailla-poster.png events/luntatupaan-poster.jpg; do
  for w in 480 800; do webp "$p" "${p%.*}-$w.webp" "$w" -q 78; done
done

# Gallerian pikkukuvat samassa koossa (640 px)
for f in gallery/*_t.jpg; do
  cwebp -quiet -mt -m 6 -sharp_yuv -q 72 "$f" -o "${f%.jpg}.webp"
done
