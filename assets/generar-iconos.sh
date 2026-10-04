#!/usr/bin/env bash
# Genera todos los iconos (sitio web y app movil) desde assets/icono-app.png,
# la firma en un circulo blanco sobre fondo negro (500x500). Requiere
# ImageMagick (`convert`). Uso: bash assets/generar-iconos.sh
# Despues: pnpm cap:sync y recompilar la app (Android Studio / Xcode).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/icono-app.png
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Circulo recortado justo en el borde exterior del anillo blanco (radio 208.5
# en la imagen de 500 px), con esquinas transparentes.
convert "$SRC" -colorspace sRGB -alpha set \
  \( -size 500x500 xc:none -fill white -draw "circle 250,250 250,41.5" \) \
  -compose DstIn -composite -crop 418x418+41+41 +repage -type TrueColorAlpha PNG32:"$TMP/circulo.png"

png() { convert "$@"; }

# ---- Web (pestana y accesos directos) ----
mkdir -p public/icons
for s in 192 512; do png "$TMP/circulo.png" -resize ${s}x${s} -type TrueColorAlpha PNG32:public/icons/icon-$s.png; done
png "$TMP/circulo.png" -resize 32x32 -type TrueColorAlpha PNG32:public/icons/favicon-32.png
convert "$TMP/circulo.png" -type TrueColorAlpha -define icon:auto-resize=48,32,16 public/favicon.ico
png "$SRC" -colorspace sRGB -resize 180x180 -background black -alpha remove -alpha off -type TrueColor PNG24:public/apple-touch-icon.png
png "$SRC" -colorspace sRGB -resize 440x440 -background black -gravity center -extent 512x512 -alpha remove -alpha off -type TrueColor PNG24:public/icons/icon-maskable-512.png

# ---- Android ----
# Iconos clasicos (cuadrado y redondo): el circulo completo, esquinas transparentes.
# Icono adaptativo: fondo negro y el circulo al 92 % del lienzo (con el inset de
# 16.7 % de ic_launcher.xml queda dentro de la zona segura de cualquier mascara).
RES=android/app/src/main/res
for par in ldpi:36:81 mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  IFS=: read -r d legacy capa <<<"$par"
  png "$TMP/circulo.png" -resize ${legacy}x${legacy} -type TrueColorAlpha PNG32:$RES/mipmap-$d/ic_launcher.png
  png "$TMP/circulo.png" -resize ${legacy}x${legacy} -type TrueColorAlpha PNG32:$RES/mipmap-$d/ic_launcher_round.png
  frente=$(( capa * 92 / 100 ))
  png "$TMP/circulo.png" -resize ${frente}x${frente} -background none -gravity center -extent ${capa}x${capa} \
    -type TrueColorAlpha PNG32:$RES/mipmap-$d/ic_launcher_foreground.png
  png -size ${capa}x${capa} xc:black -type TrueColorAlpha PNG32:$RES/mipmap-$d/ic_launcher_background.png
done

# ---- iOS (1024 px, sin transparencia: iOS redondea las esquinas) ----
png "$SRC" -colorspace sRGB -resize 1024x1024 -background black -alpha remove -alpha off -type TrueColor \
  PNG24:ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

echo "Iconos generados (web, Android e iOS)."
