// Test de bout en bout des médias du site (Administration → Médias), contre le site lancé.
// Prérequis : site sur BASE (mêmes variables que scripts/e2e.mjs), ffmpeg pour fabriquer les fichiers de test.
// Usage : BASE=http://localhost:3300 node scripts/e2e-medias.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE || "http://localhost:3000";
const MDP = process.env.ADMIN_PASSWORD || "demonstration";
const CAPTURES = process.env.CAPTURES || "";
const resultats = [];
const verifier = (nom, ok, detail = "") => { resultats.push({ nom, ok: Boolean(ok) }); console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };

// Fichiers de test (le dossier de travail est jeté à la fin)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sa-medias-"));
const jpg = path.resolve("public/media/demo/demonstration.jpg");
const mp4 = path.resolve("public/media/demo/demonstration.mp4");
const horizontale = path.join(tmp, "horizontale.png");
const lourde = path.join(tmp, "lourde.png");
const ffmpeg = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
ffmpeg("-f", "lavfi", "-i", "color=c=0xff5a2b:s=1600x900", "-frames:v", "1", horizontale);
ffmpeg("-f", "lavfi", "-i", "nullsrc=s=3600x2400,format=gray,geq=random(1)*255", "-frames:v", "1", lourde);
const tailleMp4 = fs.statSync(mp4).size;

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const admin = await ctx.newPage();
const accueil = async () => { const r = await fetch(`${BASE}/`); return { html: await r.text(), entetes: r.headers }; };
const cap = async (page, nom) => { if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: true }); };

// — Accès protégé
await admin.goto(`${BASE}/admin/medias`);
verifier("La page des médias exige la connexion", admin.url().includes("/admin/connexion"), admin.url());
verifier("L'envoi d'un média sans connexion est refusé (401)", (await fetch(`${BASE}/api/admin/medias/temps-1`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: "a.png", type: "image/png", taille: 10 }) })).status === 401);
await admin.fill('input[name="motdepasse"]', MDP); await admin.click('button[type="submit"]');
await admin.waitForURL(/\/admin\/medias/, { timeout: 15000 });
await admin.waitForSelector("h1");
verifier("Après connexion, retour sur la page des médias", (await admin.textContent("h1")).includes("Images et vidéos"));
const nbCartes = await admin.locator("article.media-carte").count();
verifier("Tous les emplacements sont listés (au moins 30)", nbCartes >= 30, String(nbCartes));
await cap(admin, "medias-vide");

// — État initial : images d'origine, page d'accueil en cache
const base0 = await accueil();
await accueil();
verifier("Accueil : servie depuis le cache (x-nextjs-cache HIT), sans calcul à chaque visite", (await accueil()).entetes.get("x-nextjs-cache") === "HIT", String((await accueil()).entetes.get("x-nextjs-cache")));
verifier("Accueil : images d'origine tant que rien n'est envoyé, aucune section Exemples", base0.html.includes("/media/photos/temps-01-accroche.webp") && !base0.html.includes('id="exemples"') && !base0.html.includes("/m/"));

// — Envoi d'une image sur un emplacement vertical
const envoyer = async (slot, fichier) => {
  await admin.setInputFiles(`#envoi-${slot}`, fichier);
  await admin.waitForFunction((s) => document.querySelector(`#${s} .media-etat-perso`), slot, { timeout: 30000 });
};
await envoyer("temps-1", jpg);
const apres1 = await accueil();
const v1 = /\/m\/temps-1\?v=([0-9a-f]{32}\.jpg)/.exec(apres1.html)?.[1];
verifier("Image envoyée : la page d'accueil la montre aussitôt (cache renouvelé)", Boolean(v1) && !apres1.html.includes("/media/photos/temps-01-accroche.webp"), String(v1));
const img = await fetch(`${BASE}/m/temps-1?v=${v1}`);
const corpsImg = Buffer.from(await img.arrayBuffer());
verifier("Route publique : image servie avec son type, mise en cache d'un an", img.status === 200 && img.headers.get("content-type") === "image/jpeg" && /immutable/.test(img.headers.get("cache-control") || "") && corpsImg.length === fs.statSync(jpg).size, `${img.status} ${img.headers.get("content-type")} ${img.headers.get("cache-control")}`);
verifier("Route publique : nosniff et sandbox sur les fichiers servis", img.headers.get("x-content-type-options") === "nosniff" && /sandbox/.test(img.headers.get("content-security-policy") || ""));
verifier("Route publique : requête conditionnelle → 304", (await fetch(`${BASE}/m/temps-1?v=${v1}`, { headers: { "If-None-Match": img.headers.get("etag") } })).status === 304);
const sansV = await fetch(`${BASE}/m/temps-1`, { redirect: "manual" });
verifier("Sans version : renvoi vers la version actuelle, jamais mis en cache", sansV.status === 307 && sansV.headers.get("location") === `/m/temps-1?v=${v1}` && sansV.headers.get("cache-control") === "no-store", `${sansV.status} ${sansV.headers.get("location")}`);
const sansVdefaut = await fetch(`${BASE}/m/temps-2`, { redirect: "manual" });
verifier("Sans version et sans fichier envoyé : renvoi vers l'image d'origine", sansVdefaut.status === 307 && sansVdefaut.headers.get("location") === "/media/photos/temps-02-preuve.webp", String(sansVdefaut.headers.get("location")));
const interdits = await Promise.all([
  fetch(`${BASE}/m/inconnu?v=${v1}`), fetch(`${BASE}/m/temps-1?v=${"0".repeat(32)}.jpg`), fetch(`${BASE}/m/temps-1?v=../fichiers/x`), fetch(`${BASE}/m/temps-1?v=${v1.replace(".jpg", ".svg")}`),
  fetch(`${BASE}/m/demo-video?v=${v1}`), fetch(`${BASE}/m/temps-1?v=${encodeURIComponent("%2e%2e/commandes/x.json")}`), fetch(`${BASE}/m/demo-video`),
]);
verifier("Route publique : emplacement inconnu, version absente, chemin détourné, SVG, mauvais genre → tous 404", interdits.every((r) => r.status === 404), interdits.map((r) => r.status).join(","));

// — Vidéo de démonstration
await envoyer("demo-video", mp4);
const apres2 = await accueil();
const vv = /\/m\/demo-video\?v=([0-9a-f]{32}\.mp4)/.exec(apres2.html)?.[1];
verifier("Vidéo envoyée : la page d'accueil l'affiche à la place de l'exemple externe", Boolean(vv) && apres2.html.includes("Exemple de vidéo livrée") && !apres2.html.includes("Exemple externe"), String(vv));
const lire = async (plage) => { const r = await fetch(`${BASE}/m/demo-video?v=${vv}`, { headers: plage ? { Range: plage } : {} }); const b = Buffer.from(await r.arrayBuffer()); return { r, b }; };
const plein = await lire();
verifier("Vidéo : lecture complète, taille exacte, plages acceptées", plein.r.status === 200 && plein.b.length === tailleMp4 && plein.r.headers.get("accept-ranges") === "bytes", `${plein.r.status} ${plein.b.length}/${tailleMp4}`);
const p1 = await lire("bytes=0-99"), p2 = await lire("bytes=1000-"), p3 = await lire("bytes=-50");
verifier("Vidéo : lecture par plages (indispensable sur iPhone)", p1.r.status === 206 && p1.b.length === 100 && p2.r.status === 206 && p2.b.length === tailleMp4 - 1000 && p3.r.status === 206 && p3.b.length === 50 && p1.b.equals(plein.b.subarray(0, 100)) && p3.b.equals(plein.b.subarray(tailleMp4 - 50)), `${p1.r.status} ${p2.r.status} ${p3.r.status}`);
const hors = await fetch(`${BASE}/m/demo-video?v=${vv}`, { headers: { Range: `bytes=${tailleMp4 + 10}-` }, redirect: "manual" });
verifier("Vidéo : plage hors du fichier → 416 (ou renvoi vers le stockage qui la refuse)", hors.status === 416 || hors.status === 302, String(hors.status));

// — Lecture réelle dans un navigateur, sans violation de la politique de sécurité
const visiteur = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const erreurs = [];
visiteur.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
visiteur.on("pageerror", (e) => erreurs.push(String(e)));
await visiteur.goto(`${BASE}/`);
await visiteur.waitForSelector("#demonstration video");
await visiteur.waitForFunction(() => { const v = document.querySelector("#demonstration video"); return v && v.readyState >= 1 && v.videoWidth > 0; }, null, { timeout: 20000 });
const dims = await visiteur.evaluate(() => { const v = document.querySelector("#demonstration video"); return [v.videoWidth, v.videoHeight, v.duration]; });
verifier("Navigateur : la vidéo de démonstration se charge (métadonnées lues, aucune erreur de politique de sécurité)", dims[0] > 0 && erreurs.filter((e) => /Content Security|Refused|blocked/i.test(e)).length === 0, `${dims} ${erreurs.join(" | ")}`);
await visiteur.locator("#demonstration .demo-lecture").click();
await visiteur.waitForFunction(() => { const v = document.querySelector("#demonstration video"); return v && !v.paused && v.currentTime > 0.2; }, null, { timeout: 20000 }).catch(() => {});
const lecture = await visiteur.evaluate(() => { const v = document.querySelector("#demonstration video"); return { pause: v.paused, t: v.currentTime }; });
verifier("Navigateur : la lecture démarre au clic", !lecture.pause && lecture.t > 0, JSON.stringify(lecture));
await visiteur.evaluate(() => document.querySelector("#demonstration").scrollIntoView());
await cap(visiteur, "accueil-mobile-demo");

// — Exemples : section visible seulement s'il y a une vidéo, avec titre et légende
await envoyer("exemple-1", mp4);
await admin.fill('#exemple-1 input[name="titre"]', "Gourde isotherme : accroche « problème »");
await admin.fill('#exemple-1 input[name="legende"]', "Exemple réalisé par Studio Accroche, produit fictif.");
await admin.click('#exemple-1 button:has-text("Enregistrer le texte")');
await admin.waitForURL(/ok=texte/);
const apres3 = await accueil();
verifier("Exemples : la section apparaît avec le titre, la légende et le lien de navigation", apres3.html.includes('id="exemples"') && apres3.html.includes("Gourde isotherme") && apres3.html.includes("produit fictif") && apres3.html.includes('href="#exemples"'));
await admin.fill('#exemple-1 input[name="titre"]', "<script>alert(1)</script><b>x</b>");
await admin.click('#exemple-1 button:has-text("Enregistrer le texte")');
let htmlTexte = "";
for (let i = 0; i < 40 && !htmlTexte.includes("&lt;script&gt;"); i++) { await new Promise((r) => setTimeout(r, 250)); htmlTexte = (await accueil()).html; }
verifier("Exemples : le texte saisi est affiché tel quel, jamais interprété comme du HTML", htmlTexte.includes("&lt;script&gt;alert(1)") && !htmlTexte.includes("<script>alert(1)") && !htmlTexte.includes("<b>x</b>"), htmlTexte.slice(htmlTexte.indexOf("exemples"), htmlTexte.indexOf("exemples") + 300));
await cap(admin, "medias-rempli");

// — Format et poids : avertissement de recadrage, réduction automatique
let message = "";
admin.once("dialog", (d) => { message = d.message(); d.dismiss(); });
await admin.setInputFiles("#envoi-temps-2", horizontale);
await admin.waitForTimeout(1500);
verifier("Image horizontale sur un emplacement vertical : avertissement de recadrage, refus possible", /recadrée/.test(message) && !(await accueil()).html.includes("/m/temps-2"), message);
admin.once("dialog", (d) => d.accept());
await envoyer("temps-2", horizontale);
verifier("Avertissement accepté : l'image est publiée", /\/m\/temps-2\?v=/.test((await accueil()).html));

const tailleLourde = fs.statSync(lourde).size;
await envoyer("couverture", lourde);
const apres4 = (await accueil()).html;
const vc = /\/m\/couverture\?v=([0-9a-f]{32}\.[a-z]+)/.exec(apres4)?.[1];
const cov = vc ? await fetch(`${BASE}/m/couverture?v=${vc}`) : null;
const poidsCov = cov ? Buffer.from(await cov.arrayBuffer()).length : 0;
verifier(`Image très lourde (${(tailleLourde / 1048576).toFixed(1)} Mo) : réduite automatiquement avant l'envoi (${(poidsCov / 1048576).toFixed(2)} Mo publiés)`, vc && poidsCov > 0 && poidsCov < tailleLourde * 0.8 && /\.(webp|jpg)$/.test(vc), `${vc} ${poidsCov}`);
verifier("Couverture personnalisée : servie sur ordinateur et sur téléphone", new RegExp(`<source[^>]*srcSet="/m/couverture\\?v=${vc}"`, "i").test(apres4) && apres4.includes(`src="/m/couverture?v=${vc}"`), "source ou img absents");
const visiteur2 = await (await nav.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await visiteur2.goto(`${BASE}/`);
await visiteur2.waitForLoadState("networkidle");
const casses = await visiteur2.evaluate(() => [...document.images].filter((i) => i.currentSrc && (!i.complete || i.naturalWidth === 0) && i.loading !== "lazy").map((i) => i.currentSrc));
verifier("Navigateur : toutes les images immédiatement visibles se chargent", casses.length === 0, casses.join(","));
await cap(visiteur2, "accueil-bureau");

// — Contenu invalide envoyé par l'interface
await admin.setInputFiles("#envoi-temps-3", mp4);
await admin.waitForSelector("#temps-3 .avis-erreur", { timeout: 10000 });
verifier("Une vidéo déposée sur un emplacement d'image est refusée avec un message clair", /pas une image lisible/.test(await admin.textContent("#temps-3 .avis-erreur")));
const faux = path.join(tmp, "faux.png"); fs.writeFileSync(faux, "ceci n'est pas une image");
await admin.setInputFiles("#envoi-temps-4", faux);
await admin.waitForSelector("#temps-4 .avis-erreur", { timeout: 10000 });
verifier("Un faux fichier image est refusé", /pas une image lisible/.test(await admin.textContent("#temps-4 .avis-erreur")));
// Requête forgée directement : contenu qui ne correspond pas au type annoncé
const res = await ctx.request.post(`${BASE}/api/admin/medias/temps-4`, { data: { nom: "a.png", type: "image/png", taille: 12 } });
const reserve = await res.json();
verifier("Réservation directe valide, mais le contenu envoyé sera contrôlé", res.status() === 200 && reserve.jeton);
if (res.status() === 200) {
  const put = await ctx.request.put(reserve.url.startsWith("http") ? reserve.url : `${BASE}${reserve.url}`, { headers: { "Content-Type": "image/png" }, data: Buffer.from("pas un png!!") });
  const conf = await ctx.request.post(`${BASE}/api/admin/medias/temps-4/confirmer`, { data: { jeton: reserve.jeton } });
  verifier("Contenu forgé (faux PNG) : refusé à la confirmation (415)", put.ok() && conf.status() === 415, `${put.status()} ${conf.status()}`);
}
const csrf = await fetch(`${BASE}/api/admin/medias/temps-1`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" });
verifier("Requête venue d'un autre site refusée", csrf.status === 401 || csrf.status === 403);

// — Retour à l'origine
await admin.goto(`${BASE}/admin/medias`);
for (const slot of ["temps-1", "temps-2", "couverture", "demo-video", "exemple-1"]) {
  await admin.click(`#${slot} .media-retrait button`);
  await admin.waitForSelector(`#${slot} .media-retrait`, { state: "detached", timeout: 15000 });
}
const fin = await accueil();
verifier("Tout remis à l'origine : plus aucun média envoyé sur la page d'accueil, plus d'Exemples", !fin.html.includes("/m/") && !fin.html.includes('id="exemples"') && fin.html.includes("/media/photos/temps-01-accroche.webp") && fin.html.includes("Exemple externe"));
verifier("Les images d'origine fournies répondent toujours", (await fetch(`${BASE}/media/photos/couverture-1920.webp`)).status === 200);

await nav.close();
fs.rmSync(tmp, { recursive: true, force: true });
const ko = resultats.filter((r) => !r.ok).length;
console.log(`\n${resultats.length - ko}/${resultats.length} vérifications réussies`);
process.exit(ko ? 1 : 0);
