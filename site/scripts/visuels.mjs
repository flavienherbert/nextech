// Fabrique les visuels de marque du site : image de partage (Open Graph, 1200 × 630), favicon et icône d'application.
// Usage (depuis le dossier site) : node scripts/visuels.mjs
// Aucun prix ni aucune donnée chiffrée n'y figure : ces fichiers ne deviennent jamais faux quand l'offre change.
// Sorties : public/media/og-studio-accroche.jpg · app/icon.svg · app/apple-icon.png · app/favicon.ico
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = createRequire(import.meta.url)("playwright");
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const police = (p) => pathToFileURL(path.join(racine, "node_modules", p)).href;

const ACCENT = "#ff5a2b";
const FOND = "#0b0a09";

// Le logo : un « A » dont le trou central est un triangle de lecture.
const LOGO_PATH = "M32 11 L52 53 H43.4 L39.4 44 H24.6 L20.6 53 H12 Z M32 26.5 L27.6 37 H36.4 Z";
const iconeSvg = (rayon) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rayon}" fill="${FOND}"/><path d="${LOGO_PATH}" fill="${ACCENT}" fill-rule="evenodd"/></svg>`;

fs.writeFileSync(path.join(racine, "app", "icon.svg"), iconeSvg(14) + "\n");

const maquette = `
<svg viewBox="0 0 200 300" width="100%" height="100%" preserveAspectRatio="xMidYMax slice">
  <defs>
    <radialGradient id="lueur" cx="50%" cy="42%" r="55%"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.55"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
    <linearGradient id="peau" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0cfae"/><stop offset="100%" stop-color="#c99872"/></linearGradient>
    <linearGradient id="pull" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f3efe8"/><stop offset="100%" stop-color="#b9b1a4"/></linearGradient>
    <linearGradient id="bouteille" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#6f9a85"/><stop offset="100%" stop-color="#4d7a65"/></linearGradient>
  </defs>
  <circle cx="100" cy="120" r="96" fill="url(#lueur)"/>
  <path d="M24 300 C24 214 58 178 100 178 C142 178 176 214 176 300 Z" fill="url(#pull)"/>
  <rect x="88" y="150" width="24" height="34" rx="10" fill="url(#peau)"/>
  <ellipse cx="100" cy="118" rx="33" ry="38" fill="url(#peau)"/>
  <path d="M66 112 C64 78 84 70 102 70 C124 70 138 86 134 112 C128 96 118 90 100 90 C84 90 72 98 66 112 Z" fill="#3b2a20"/>
  <rect x="132" y="196" width="28" height="92" rx="11" fill="url(#bouteille)"/>
  <rect x="136" y="184" width="20" height="16" rx="5" fill="#d9d2c3"/>
</svg>`;

const pagePartage = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face{font-family:"Instrument Serif";font-style:normal;src:url("${police("@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2")}")}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url("${police("@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2")}")}
@font-face{font-family:"Inter";font-weight:100 900;src:url("${police("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")}")}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:${FOND};color:#f3efe8;font-family:"Inter",sans-serif;position:relative;overflow:hidden}
.fond{position:absolute;inset:0;background:radial-gradient(48% 70% at 80% 45%,rgba(255,90,43,.30),transparent 72%),radial-gradient(40% 50% at 0% 0%,rgba(255,90,43,.10),transparent 70%)}
.texte{position:absolute;left:84px;top:0;bottom:0;width:690px;display:flex;flex-direction:column;justify-content:center}
.marque{display:flex;align-items:center;gap:16px;font-weight:600;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:#a8a094;margin-bottom:34px}
.marque svg{width:46px;height:46px}
h1{font-family:"Instrument Serif",serif;font-weight:400;font-size:86px;line-height:.98;letter-spacing:-.015em}
h1 em{font-style:italic;color:${ACCENT}}
.sous{margin-top:30px;font-size:27px;line-height:1.4;color:rgba(243,239,232,.82);max-width:600px}
.tel{position:absolute;right:92px;top:56px;width:260px;height:518px;border-radius:44px;padding:11px;background:linear-gradient(160deg,#2a2623,#0f0d0c);box-shadow:0 0 0 1px rgba(243,239,232,.18),0 40px 80px -24px rgba(255,90,43,.45);transform:rotate(4deg)}
.ecran{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:linear-gradient(180deg,#2b1a12,#150e0b 55%,#0b0a09)}
.prog{position:absolute;top:16px;left:18px;right:18px;height:4px;border-radius:2px;background:rgba(255,255,255,.25)}.prog i{display:block;height:100%;width:62%;border-radius:2px;background:#fff}
.puce{position:absolute;top:32px;font-size:12px;font-weight:600;color:#fff;background:rgba(0,0,0,.45);border-radius:999px;padding:5px 11px}
.sous-titre{position:absolute;left:14px;right:14px;bottom:84px;text-align:center;font-weight:800;font-size:31px;line-height:1.12;text-transform:uppercase;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.sous-titre mark{background:#ffd84a;color:#111;padding:0 8px;border-radius:5px}
.cta{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);background:#fff;color:#111;font-weight:700;font-size:16px;padding:12px 30px;border-radius:999px}
</style></head><body>
<div class="fond"></div>
<div class="texte">
  <div class="marque"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#171514"/><path d="${LOGO_PATH}" fill="${ACCENT}" fill-rule="evenodd"/></svg>Studio Accroche</div>
  <h1>Des pubs vidéo avec <em>présentateur IA</em> pour votre boutique.</h1>
  <p class="sous">Publicités verticales prêtes pour TikTok, Reels et Meta Ads.</p>
</div>
<div class="tel"><div class="ecran">${maquette}
  <div class="prog"><i></i></div><span class="puce" style="left:18px">Généré par IA</span><span class="puce" style="right:18px">0:03</span>
  <p class="sous-titre">Arrête de <mark>défiler.</mark></p><span class="cta">Découvrir</span>
</div></div>
</body></html>`;

const navigateur = await chromium.launch();
try {
  // Image de partage : 1200 × 630, JPEG (les réseaux sociaux lisent mal le WebP).
  const p = await navigateur.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.setContent(pagePartage, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(racine, "public", "media", "og-studio-accroche.jpg"), type: "jpeg", quality: 88 });
  await p.close();

  // Icône d'application (180 × 180, fond plein, sans coins arrondis : le système les arrondit lui-même).
  const q = await navigateur.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await q.setContent(`<body style="margin:0">${iconeSvg(0).replace("<svg ", '<svg width="180" height="180" ')}</body>`);
  await q.screenshot({ path: path.join(racine, "app", "apple-icon.png"), type: "png" });
  // favicon.ico : trois tailles (16, 32, 48), chacune une image PNG rangée dans le conteneur ICO.
  const png = [];
  for (const t of [16, 32, 48]) {
    const r = await navigateur.newPage({ viewport: { width: t, height: t }, deviceScaleFactor: 1 });
    await r.setContent(`<body style="margin:0;background:transparent">${iconeSvg(Math.round((14 * t) / 64)).replace("<svg ", `<svg width="${t}" height="${t}" `)}</body>`);
    png.push({ t, donnees: await r.screenshot({ type: "png", omitBackground: true }) });
    await r.close();
  }
  const entete = Buffer.alloc(6 + 16 * png.length);
  entete.writeUInt16LE(0, 0); entete.writeUInt16LE(1, 2); entete.writeUInt16LE(png.length, 4);
  let decalage = entete.length;
  png.forEach(({ t, donnees }, i) => {
    const o = 6 + 16 * i;
    entete.writeUInt8(t, o); entete.writeUInt8(t, o + 1); entete.writeUInt8(0, o + 2); entete.writeUInt8(0, o + 3);
    entete.writeUInt16LE(1, o + 4); entete.writeUInt16LE(32, o + 6); entete.writeUInt32LE(donnees.length, o + 8); entete.writeUInt32LE(decalage, o + 12);
    decalage += donnees.length;
  });
  fs.writeFileSync(path.join(racine, "app", "favicon.ico"), Buffer.concat([entete, ...png.map((x) => x.donnees)]));
} finally {
  await navigateur.close();
}
console.log("Visuels générés : public/media/og-studio-accroche.jpg, app/icon.svg, app/apple-icon.png, app/favicon.ico");
