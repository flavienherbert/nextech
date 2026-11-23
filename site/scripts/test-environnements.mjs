// Test des trois états du site selon les variables d'environnement :
//   A. aucune variable            → indexation bloquée par sécurité, pas de bandeau, vidéo d'exemple masquée, mentions légales avec champs visibles ;
//   B. SITE_ENV=preprod           → bandeau de préproduction, indexation bloquée ;
//   C. SITE_ENV=production + SHOW_EXAMPLE_VIDEO=true → indexation ouverte (robots.txt, plan du site), aucun bandeau,
//      section « vidéo d'exemple » visible : lecture au clic, muette au départ, bouton de son, aperçu, légende.
// Il lance lui-même le site en mode développement (3 fois) sur des ports à part.
// Usage : npm run test:environnements      (environ 1 minute ; ne touche pas aux ports 3000 et 4242)
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { portOccupe } from "./outils-serveur.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");
const PORT = process.env.TEST_PORT_ENV || "3230", SIM = process.env.TEST_PORT_ENV_SIM || "4330";
const BASE = `http://localhost:${PORT}`;
const CAPTURES = process.env.CAPTURES || "";
const donnees = fs.mkdtempSync(path.join(os.tmpdir(), "studio-env-"));
let ko = 0, total = 0;
const verifier = (nom, ok, detail = "") => { total++; if (!ok) ko++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
const libres = async () => !(await portOccupe(PORT)) && !(await portOccupe(SIM));
const attendreLibres = async () => { for (let i = 0; i < 40 && !(await libres()); i++) await pause(250); return libres(); };

// Environnement propre : aucune variable d'un autre test ne doit influencer le résultat.
const propre = (extra) => {
  const e = { ...process.env, PORT, MOCK_STRIPE_PORT: SIM, DATA_DIR: donnees, ...extra };
  for (const k of ["DATABASE_URL", "S3_BUCKET", "S3_ENDPOINT", "NEXT_PUBLIC_LEGAL_NAME", "NEXT_PUBLIC_LEGAL_SIRET", "NEXT_PUBLIC_LEGAL_ADDRESS", "NEXT_PUBLIC_LEGAL_MEDIATEUR", "NEXT_PUBLIC_LEGAL_HEBERGEUR", "SITE_ENV", "SHOW_EXAMPLE_VIDEO"]) if (!(k in (extra || {}))) delete e[k];
  return e;
};
function lancer(extra) {
  const p = spawn("node", ["scripts/demo.mjs"], { env: propre(extra), stdio: ["ignore", "pipe", "pipe"] });
  let sortie = "";
  p.stdout.on("data", (d) => (sortie += d)); p.stderr.on("data", (d) => (sortie += d));
  const pret = new Promise((ok) => { const t = setInterval(() => { if (sortie.includes("PRÊT") || p.exitCode !== null) { clearInterval(t); ok(sortie.includes("PRÊT")); } }, 200); setTimeout(() => { clearInterval(t); ok(false); }, 120000); });
  return { p, pret, sortie: () => sortie };
}
const arreter = async (s) => {
  const fini = new Promise((ok) => { if (s.p.exitCode !== null) ok(); else { s.p.once("exit", ok); setTimeout(ok, 10000); } });
  s.p.kill("SIGINT");
  await fini;
  if (!(await attendreLibres())) { spawnSync("node", ["scripts/stop.mjs"], { env: propre({}), encoding: "utf8" }); await attendreLibres(); }
  await pause(1500); // le lanceur libère encore les ports une fraction de seconde après sa sortie : on ne démarre pas le suivant dans cet intervalle
};
const texte = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/[  ]/g, " ").replace(/\s+/g, " ");

if (!(await libres())) { console.error(`\nLes ports de test ${PORT}/${SIM} sont occupés : TEST_PORT_ENV=${PORT} TEST_PORT_ENV_SIM=${SIM} npm run stop`); process.exit(1); }

// ———————————————————————————————————————————————————————————————————————————————————————
console.log("— A. Aucune variable d'environnement (SITE_ENV, SHOW_EXAMPLE_VIDEO, identité légale) —");
let s = lancer({ SITE_ENV: "" });
verifier("Le site démarre", await s.pret, s.sortie().slice(-300));
{
  const r = await fetch(BASE + "/"); const html = await r.text();
  verifier("Indexation bloquée par sécurité : X-Robots-Tag noindex et balise robots noindex", /noindex/.test(r.headers.get("x-robots-tag") || "") && /<meta name="robots" content="noindex, nofollow"/.test(html));
  verifier("robots.txt : tout est interdit ; plan du site vide", /Disallow:\s*\/\s*$/m.test(await (await fetch(BASE + "/robots.txt")).text()) && !/<loc>/.test(await (await fetch(BASE + "/sitemap.xml")).text()));
  verifier("Aucun bandeau de préproduction sans variable", !/bandeau-mode|Préproduction —/.test(html));
  verifier("Vidéo d'exemple : section absente, sans texte de remplacement, ni YouTube ni « Exemple externe »", !/id="demonstration"/.test(html) && !/iframe|youtube|Exemple externe|Emplacement réservé|en cours de production/i.test(html) && !/href="#demonstration"/.test(html));
  const ml = texte(await (await fetch(BASE + "/mentions-legales")).text());
  verifier("Mentions légales sans identité renseignée : champs visibles [SIRET], [Nom et prénom de l'éditeur], [Adresse postale de l'éditeur] ; rien d'inventé", ["[SIRET]", "[Nom et prénom de l'éditeur]", "[Adresse postale de l'éditeur]"].every((t) => ml.includes(t)));
  verifier("Mentions légales : micro-entreprise, e-mail de contact, hébergeur Netlify avec son adresse, TVA non applicable (article 293 B)", ["micro-entreprise", "contactstudioaccroche@gmail.com", "Netlify, Inc.", "101 2nd Street, San Francisco, CA 94105", "TVA non applicable, article 293 B du CGI"].every((t) => ml.includes(t)));
  const cg = texte(await (await fetch(BASE + "/cgv")).text()), conf = texte(await (await fetch(BASE + "/confidentialite")).text());
  verifier("Conditions de vente et confidentialité : même adresse de contact (configuration unique), aucune mention de YouTube", cg.includes("contactstudioaccroche@gmail.com") && conf.includes("contactstudioaccroche@gmail.com") && !/YouTube/i.test(conf));
  verifier("Page de commande : adresse « accroches » et ancienne adresse « test » mènent au Pack Accroches", texte(await (await fetch(BASE + "/commander/accroches")).text()).includes("Pack Accroches — 89 €") && texte(await (await fetch(BASE + "/commander/test")).text()).includes("Pack Accroches — 89 €") && (await fetch(BASE + "/commander/inconnue")).status === 404);
}
await arreter(s);

// ———————————————————————————————————————————————————————————————————————————————————————
console.log("\n— B. SITE_ENV=preprod —");
s = lancer({ SITE_ENV: "preprod" });
verifier("Le site démarre", await s.pret, s.sortie().slice(-300));
{
  const r = await fetch(BASE + "/"); const html = await r.text();
  verifier("Bandeau « Préproduction — … » affiché sur l'accueil, la commande et les pages légales", /bandeau-mode/.test(html) && /bandeau-mode/.test(await (await fetch(BASE + "/commander/essai")).text()) && /bandeau-mode/.test(await (await fetch(BASE + "/cgv")).text()));
  verifier("Indexation bloquée (en-tête, balise, robots.txt)", /noindex/.test(r.headers.get("x-robots-tag") || "") && /<meta name="robots" content="noindex, nofollow"/.test(html) && /Disallow:\s*\/\s*$/m.test(await (await fetch(BASE + "/robots.txt")).text()));
}
await arreter(s);

// ———————————————————————————————————————————————————————————————————————————————————————
console.log("\n— C. SITE_ENV=production et SHOW_EXAMPLE_VIDEO=true —");
const dossierVideos = path.resolve("public", "videos");
const existait = fs.existsSync(dossierVideos);
fs.mkdirSync(dossierVideos, { recursive: true });
const posees = [];
for (const [src, dest] of [["scripts/fixtures/demonstration.mp4", "exemple.mp4"], ["scripts/fixtures/demonstration.jpg", "exemple-apercu.jpg"]]) { const d = path.join(dossierVideos, dest); if (!fs.existsSync(d)) { fs.copyFileSync(src, d); posees.push(d); } }
try {
  s = lancer({ SITE_ENV: "production", SHOW_EXAMPLE_VIDEO: "true", NEXT_PUBLIC_LEGAL_NAME: "Titulaire De Test", NEXT_PUBLIC_LEGAL_SIRET: "00000000000000", NEXT_PUBLIC_LEGAL_ADDRESS: "1 rue du Test, 00000 Testville" });
  verifier("Le site démarre", await s.pret, s.sortie().slice(-300));
  const r = await fetch(BASE + "/"); const html = await r.text();
  verifier("Production : aucun bandeau de préproduction", !/bandeau-mode|Préproduction —/.test(html));
  verifier("Production : l'accueil est indexable (pas de noindex, balise robots « index, follow »)", !/noindex/.test(r.headers.get("x-robots-tag") || "") && /<meta name="robots" content="index, follow"/.test(html));
  const robots = await (await fetch(BASE + "/robots.txt")).text(), plan = await (await fetch(BASE + "/sitemap.xml")).text();
  verifier("robots.txt : pages publiques autorisées, administration / commandes / API exclues, plan du site annoncé sur l'adresse du site", /Allow:\s*\//.test(robots) && /Disallow:\s*\/admin/.test(robots) && /Disallow:\s*\/commande\//.test(robots) && /Disallow:\s*\/api\//.test(robots) && robots.includes(`Sitemap: ${BASE}/sitemap.xml`), robots);
  verifier("Plan du site : accueil, mentions légales, conditions de vente, confidentialité", [`${BASE}/`, `${BASE}/mentions-legales`, `${BASE}/cgv`, `${BASE}/confidentialite`].every((u) => plan.includes(`<loc>${u}</loc>`)) && !/\/admin|\/commande/.test(plan), plan.slice(0, 300));
  verifier("L'administration et les pages de commande restent exclues des moteurs de recherche", /noindex/.test((await fetch(BASE + "/admin/connexion")).headers.get("x-robots-tag") || "") && /noindex/.test((await fetch(BASE + "/commande/" + "a".repeat(48))).headers.get("x-robots-tag") || "") && /<meta name="robots" content="noindex/.test(await (await fetch(BASE + "/commander/essai")).text()));
  verifier("Mentions légales : identité renseignée, plus aucun champ entre crochets", !/\[SIRET\]|\[Nom et prénom|\[Adresse postale/.test(texte(await (await fetch(BASE + "/mentions-legales")).text())) && texte(await (await fetch(BASE + "/mentions-legales")).text()).includes("SIRET : 00000000000000"));
  verifier("Partage : image Open Graph et Twitter sur l'adresse du site (SITE_URL)", html.includes(`content="${BASE}/media/og-studio-accroche.jpg"`) && /twitter:card" content="summary_large_image"/.test(html));

  // Navigateur : la section « vidéo d'exemple »
  const nav = await chromium.launch();
  for (const [nom, viewport] of [["mobile", { width: 390, height: 844 }], ["bureau", { width: 1440, height: 900 }]]) {
    const ctx = await nav.newContext({ viewport });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.querySelectorAll(".revele").forEach((e) => e.classList.add("vu")));
    await page.waitForTimeout(1500);
    const e = await page.evaluate(() => {
      const sec = document.querySelector("#demonstration"), v = sec?.querySelector("video");
      return { sec: Boolean(sec), nav: [...document.querySelectorAll(".navigation a")].map((a) => a.getAttribute("href")), poster: v?.getAttribute("poster"), src: v?.getAttribute("src"), muet: v?.muted, auto: v?.autoplay, pause: v?.paused, controles: v?.controls, legende: sec?.querySelector("figcaption")?.textContent, bouton: Boolean(sec?.querySelector(".demo-lecture")), tel: v ? Math.round(v.getBoundingClientRect().height) : 0, iframes: document.querySelectorAll("iframe").length, debord: document.documentElement.scrollWidth - innerWidth };
    });
    verifier(`${nom} : section « vidéo d'exemple » visible, lien « Exemple » dans le menu (ordinateur), aperçu, légende, aucun YouTube`, e.sec && (nom === "mobile" || e.nav.includes("#demonstration")) && e.poster === "/videos/exemple-apercu.jpg" && e.src === "/videos/exemple.mp4" && e.legende === "Exemple réalisé par Studio Accroche. Présentateur généré par intelligence artificielle." && e.iframes === 0, JSON.stringify(e));
    verifier(`${nom} : la vidéo n'est ni lancée seule, ni avec le son ; bouton de lecture présent (lecture au clic, muet par défaut)`, e.muet === true && e.auto === false && e.pause === true && e.controles === false && e.bouton, JSON.stringify(e));
    verifier(`${nom} : aucun débordement horizontal`, e.debord <= 0, String(e.debord));
    await page.locator("#demonstration .demo-lecture").scrollIntoViewIfNeeded();
    if (CAPTURES) await page.locator("#demonstration").screenshot({ path: path.join(CAPTURES, `demo-${nom}-avant-lecture.png`) });
    await page.locator("#demonstration .demo-lecture").click();
    await page.waitForFunction(() => { const v = document.querySelector("#demonstration video"); return v && !v.paused && v.currentTime > 0.2; }, null, { timeout: 20000 }).catch(() => {});
    const lecture = await page.evaluate(() => { const v = document.querySelector("#demonstration video"); return { pause: v.paused, t: v.currentTime, muet: v.muted }; });
    verifier(`${nom} : la lecture démarre au clic, toujours sans le son`, !lecture.pause && lecture.t > 0 && lecture.muet, JSON.stringify(lecture));
    const bouton = page.locator("#demonstration .demo-son");
    const hauteurSon = Math.round((await bouton.boundingBox())?.height || 0);
    await bouton.click();
    const apres = await page.evaluate(() => !document.querySelector("#demonstration video").muted);
    verifier(`${nom} : le bouton « Activer le son » rend le son, puis devient « Couper le son » (bouton d'au moins 44 px)`, apres && (await bouton.innerText()) === "Couper le son" && hauteurSon >= 44, `${apres} ${hauteurSon}`);
    if (CAPTURES) await page.locator("#demonstration").screenshot({ path: path.join(CAPTURES, `demo-${nom}-lecture.png`) });
    verifier(`${nom} : aucune erreur dans la console`, erreurs.length === 0, [...new Set(erreurs)].join(" | "));
    await ctx.close();
  }
  await nav.close();
  await arreter(s);
} finally {
  for (const d of posees) fs.rmSync(d, { force: true });
  if (!existait) fs.rmSync(dossierVideos, { recursive: true, force: true });
}

fs.rmSync(donnees, { recursive: true, force: true });
verifier("Ports libérés à la fin", await attendreLibres());
console.log(`\n${total - ko}/${total} vérifications réussies${ko ? ` — ${ko} ÉCHEC(S)` : ""}`);
process.exit(ko ? 1 : 0);
