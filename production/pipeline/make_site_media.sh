#!/usr/bin/env bash
# Fabrique les médias du site à partir de la démonstration.
# Usage : make_site_media.sh <clip_source_propre.mp4> <publicite_finale.mp4> <dossier_sortie>
set -euo pipefail
SRC="$1"; AD="$2"; OUT="$3"; TMP="$(mktemp -d)"
GRADE="eq=contrast=1.07:saturation=1.06:gamma=0.97"
# Quatre plans de 3 s (A accroche, B sac, C glaçons ralenti, D produit)
cut() { ffmpeg -v error -y -ss "$2" -t "$3" -i "$SRC" -an -vf "setpts=$4*PTS,fps=30,scale=540:960:force_original_aspect_ratio=increase:flags=lanczos,crop=540:960,$GRADE,format=yuv420p" -t 3 -c:v libx264 -crf 17 -preset medium "$TMP/$1.mp4"; }
cut A 0.25 3.0 1.0; cut B 5.6 3.0 1.0; cut C 9.45 1.8 1.6667; cut D 11.95 3.0 1.0
# Extraits en boucle
for k in A B C D; do
  ffmpeg -v error -y -i "$TMP/$k.mp4" -an -c:v libx264 -crf 27 -preset slow -movflags +faststart "$OUT/plan-$k.mp4"
  ffmpeg -v error -y -ss 1.2 -i "$TMP/$k.mp4" -frames:v 1 -q:v 4 "$OUT/plan-$k.jpg"
done
# Film d'accueil large : trois volets désynchronisés, 9 s
seq3() { printf "file '%s'\nfile '%s'\nfile '%s'\n" "$TMP/$1.mp4" "$TMP/$2.mp4" "$TMP/$3.mp4" > "$TMP/$4.txt"; ffmpeg -v error -y -f concat -safe 0 -i "$TMP/$4.txt" -c copy "$TMP/$4.mp4"; }
seq3 A B C p1; seq3 C D A p2; seq3 D A B p3
ffmpeg -v error -y -i "$TMP/p1.mp4" -i "$TMP/p2.mp4" -i "$TMP/p3.mp4" -filter_complex \
 "[0:v]scale=532:946,pad=536:946:0:0:black[a];[1:v]scale=528:946,pad=532:946:0:0:black[b];[2:v]scale=532:946[c];[a][b][c]hstack=3,crop=1600:900:0:23,format=yuv420p[v]" \
 -map "[v]" -an -c:v libx264 -crf 27 -preset slow -movflags +faststart "$OUT/accueil-large.mp4"
ffmpeg -v error -y -ss 0.8 -i "$OUT/accueil-large.mp4" -frames:v 1 -q:v 5 "$OUT/accueil-large.jpg"
# Film d'accueil vertical (mobile) : A B C D, 12 s
printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" "$TMP/A.mp4" "$TMP/B.mp4" "$TMP/C.mp4" "$TMP/D.mp4" > "$TMP/m.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$TMP/m.txt" -an -c:v libx264 -crf 28 -preset slow -movflags +faststart "$OUT/accueil-vertical.mp4"
ffmpeg -v error -y -ss 0.8 -i "$OUT/accueil-vertical.mp4" -frames:v 1 -q:v 5 "$OUT/accueil-vertical.jpg"
# Film complet avec son
ffmpeg -v error -y -i "$AD" -vf "scale=720:1280:flags=lanczos,format=yuv420p" -c:v libx264 -crf 24 -preset slow -c:a aac -b:a 128k -movflags +faststart "$OUT/film.mp4"
ffmpeg -v error -y -ss 1.3 -i "$AD" -frames:v 1 -vf scale=720:1280 -q:v 4 "$OUT/film.jpg"
rm -rf "$TMP"
