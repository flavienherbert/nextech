// Vérifie la préproduction EN LIGNE : rien n'est public, puis diagnostic complet exécuté sur le serveur.
//   PREPROD_PASSWORD=… ADMIN_PASSWORD=… node scripts/verifier-en-ligne.mjs [adresse-du-site]
// Les mots de passe se saisissent dans votre terminal (ou viennent de Netlify) : jamais dans un fichier du dépôt.
// Lecture seule : le diagnostic ne crée que des lignes et fichiers de test, supprimés à la fin.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const B = (process.argv[2] || "https://studio-accroche-preprod.netlify.app").replace(/\/$/, "");
const PRE = process.env.PREPROD_PASSWORD || "", ADM = process.env.ADMIN_PASSWORD || "";
if (!ADM) { console.error("ADMIN_PASSWORD manquant (mot de passe de l'administration). PREPROD_PASSWORD aussi si le site est protégé."); process.exit(2); }
let echecs = 0;
const verifier = (nom, ok, detail = "") => { if (!ok) echecs++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const code = async (chemin, o = {}) => (await fetch(B + chemin, { redirect: "manual", signal: AbortSignal.timeout(30000), ...o })).status;
const basic = PRE ? { Authorization: "Basic " + Buffer.from("x:" + PRE).toString("base64") } : null;

if (PRE) {
  console.log("— Rien n'est accessible sans le mot de passe —");
  const html = await (await fetch(B + "/", { headers: basic })).text();
  const statiques = [...new Set([...html.matchAll(/\/_next\/static\/[^"')\s]+\.(?:js|css)/g)].map((m) => m[0]))].slice(0, 2);
  const chemins = ["/", "/commander/essai", "/commander/test", "/commander/campagne", "/cgv", "/mentions-legales", "/confidentialite", "/admin", "/admin/connexion", "/admin/courriels", "/admin/diagnostic", "/api/admin/diagnostic", "/api/checkout", "/api/depot/x", "/api/commande/x/etat", "/api/taches/quotidienne", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/media/photos/couverture-1920.webp", "/media/demo/demonstration.mp4", "/ADMIN", "//admin", "/_next/data/x/index.json", "/.netlify/functions/tache-quotidienne", "/.env", "/package.json", ...statiques];
  const ouverts = [];
  for (const c of chemins) { const s = await code(c); if (s !== 401 && s !== 400 && s !== 404) ouverts.push(`${c} → ${s}`); else if (s === 404 && c !== "/media/demo/demonstration.mp4") ouverts.push(`${c} → 404 sans mot de passe (devrait être 401)`); }
  verifier(`${chemins.length} adresses testées sans mot de passe : toutes refusées`, ouverts.length === 0, ouverts.join(" | "));
  verifier("Mauvais mot de passe refusé", (await code("/", { headers: { Authorization: "Basic " + Buffer.from("x:faux").toString("base64") } })) === 401);
  verifier("Méthodes POST, PUT, OPTIONS refusées sans mot de passe", (await Promise.all([code("/api/checkout", { method: "POST" }), code("/admin", { method: "PUT" }), code("/", { method: "OPTIONS" })])).every((s) => s === 401));
  verifier("Webhook Stripe : exige une signature (exempté du mot de passe, mais fermé aux appels non signés)", [400, 405].includes(await code("/api/stripe/webhook", { method: "POST", body: "{}" })) && (await code("/api/stripe/webhook")) === 405);
} else console.log("• PREPROD_PASSWORD absent : le contrôle d'accès n'est pas testé (site supposé public).");

console.log("\n— Diagnostic exécuté sur le serveur —");
const nav = await chromium.launch();
try {
  const ctx = await nav.newContext(PRE ? { httpCredentials: { username: "x", password: PRE } } : {});
  const p = await ctx.newPage();
  await p.goto(B + "/admin/connexion", { waitUntil: "networkidle" });
  await p.fill('input[name="motdepasse"]', ADM); await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.endsWith("/connexion"), { timeout: 30000 });
  const r = await ctx.request.get(B + "/api/admin/diagnostic", { timeout: 60000 });
  verifier("Diagnostic exécuté", r.status() === 200, `HTTP ${r.status()}`);
  if (r.status() === 200) {
    const d = await r.json(); const S = { ok: "✓", ko: "✗", avert: "⚠", info: "•" };
    for (const s of d.sections) { console.log(`\n## ${s.titre}`); for (const l of s.lignes) console.log(`${S[l.etat]} ${l.nom}${l.detail ? "  → " + l.detail : ""}`); }
    console.log(`\nSynthèse : ${d.synthese.ok} réussies, ${d.synthese.ko} échec(s), ${d.synthese.avert} avertissement(s), ${d.synthese.info} information(s).`);
    if (d.synthese.ko) echecs++;
  }
} catch (e) { verifier("Connexion à l'administration", false, e.message); }
await nav.close();
console.log(echecs ? `\n${echecs} point(s) à traiter.` : "\nTout est conforme.");
process.exit(echecs ? 1 : 0);
