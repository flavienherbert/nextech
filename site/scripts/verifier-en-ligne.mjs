// Vérifie la préproduction EN LIGNE : rien n'est public, puis diagnostic complet exécuté sur le serveur.
//   PREPROD_PASSWORD=… ADMIN_PASSWORD=… node scripts/verifier-en-ligne.mjs [adresse-du-site]
// Les mots de passe se saisissent dans votre terminal (ou viennent de Netlify) : jamais dans un fichier du dépôt.
// Lecture seule : le diagnostic ne crée que des lignes et fichiers de test, supprimés à la fin.
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

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
  const chemins = ["/", "/commander/essai", "/commander/test", "/commander/campagne", "/cgv", "/mentions-legales", "/confidentialite", "/admin", "/admin/connexion", "/admin/courriels", "/admin/diagnostic", "/api/admin/diagnostic", "/api/checkout", "/api/depot/x", "/api/commande/x/etat", "/api/taches/quotidienne", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/ADMIN", "//admin", "/_next/data/x/index.json", "/.netlify/functions/tache-quotidienne", "/.env", "/package.json", ...statiques];
  const ouverts = [];
  for (const c of chemins) { const s = await code(c); if (s !== 401 && s !== 400 && s !== 404) ouverts.push(`${c} → ${s}`); else if (s === 404) ouverts.push(`${c} → 404 sans mot de passe (devrait être 401)`); }
  verifier(`${chemins.length} adresses testées sans mot de passe : toutes refusées`, ouverts.length === 0, ouverts.join(" | "));
  verifier("Mauvais mot de passe refusé", (await code("/", { headers: { Authorization: "Basic " + Buffer.from("x:faux").toString("base64") } })) === 401);
  verifier("Méthodes POST, PUT, OPTIONS refusées sans mot de passe", (await Promise.all([code("/api/checkout", { method: "POST" }), code("/admin", { method: "PUT" }), code("/", { method: "OPTIONS" })])).every((s) => s === 401));
  verifier("Webhook Stripe : exige une signature (exempté du mot de passe, mais fermé aux appels non signés)", [400, 405].includes(await code("/api/stripe/webhook", { method: "POST", body: "{}" })) && (await code("/api/stripe/webhook")) === 405);
} else {
  // Site ouvert à la consultation : seules les pages vitrine sont publiques. Tout ce qui est sensible doit rester fermé.
  console.log("— Site ouvert à la consultation : les fonctions sensibles restent fermées —");
  const redir = async (chemin) => { const r = await fetch(B + chemin, { redirect: "manual", signal: AbortSignal.timeout(30000) }); return [r.status, r.headers.get("location") || ""]; };
  const pagesPubliques = ["/", "/commander/essai", "/commander/test", "/commander/campagne", "/cgv", "/mentions-legales", "/confidentialite", "/robots.txt"];
  const mauvaises = []; for (const c of pagesPubliques) { const st = await code(c); if (st !== 200) mauvaises.push(`${c} → ${st}`); }
  verifier(`${pagesPubliques.length} pages publiques accessibles sans identifiant (200)`, mauvaises.length === 0, mauvaises.join(" | "));
  const hd = (await fetch(B + "/")).headers;
  verifier("Site non référencé par les moteurs de recherche (X-Robots-Tag noindex, robots.txt)", /noindex/.test(hd.get("x-robots-tag") || "") && /Disallow:\s*\/\s*$/m.test(await (await fetch(B + "/robots.txt")).text()));
  const fermes = [];
  for (const c of ["/admin", "/admin/commande/SA-000000-AAAAA", "/admin/diagnostic", "/admin/courriels", "/admin/aide"]) { const [st, loc] = await redir(c); if (![301, 302, 303, 307, 308].includes(st) || !/\/admin\/connexion/.test(loc)) fermes.push(`${c} → ${st} ${loc}`); }
  verifier("Pages d'administration : renvoi vers la connexion sans session (jamais de contenu)", fermes.length === 0, fermes.join(" | "));
  const api = [["GET", "/api/admin/diagnostic"], ["POST", "/api/admin/notification-test"], ["GET", "/api/admin/fichier/SA-000000-AAAAA/x"], ["GET", "/api/admin/facture/SA-000000-AAAAA"], ["POST", "/api/admin/commande/SA-000000-AAAAA/livrable"]];
  const ouverts = []; for (const [m, c] of api) { const st = await code(c, { method: m }); if (st !== 401) ouverts.push(`${m} ${c} → ${st}`); }
  verifier("Routes d'API de l'administration : 401 sans session", ouverts.length === 0, ouverts.join(" | "));
  const caches = []; for (const [m, c] of [["POST", "/api/taches/quotidienne"], ["GET", "/api/test-erreur"], ["GET", "/.env"], ["GET", "/package.json"], ["GET", "/.git/config"]]) { const st = await code(c, { method: m }); if (st !== 404) caches.push(`${m} ${c} → ${st}`); }
  verifier("Tâche quotidienne, route de test, fichiers de configuration : introuvables (404)", caches.length === 0, caches.join(" | "));
  verifier("Webhook Stripe : refuse tout appel sans signature valide", (await code("/api/stripe/webhook", { method: "POST", body: "{}" })) === 400 && (await code("/api/stripe/webhook", { method: "POST", body: "{}", headers: { "Stripe-Signature": "t=1,v1=00" } })) === 400);
  verifier("Dépôt de fichiers : refuse tout envoi sans autorisation signée", [400, 403, 404, 405].includes(await code("/api/depot/" + "0".repeat(32), { method: "PUT", body: "x" })));
}

console.log("\n— Diagnostic exécuté sur le serveur —");
const nav = await chromium.launch();
try {
  const ctx = await nav.newContext(PRE ? { httpCredentials: { username: "x", password: PRE } } : {});
  const p = await ctx.newPage();
  await p.goto(B + "/admin/connexion", { waitUntil: "networkidle" });
  await p.fill('input[name="motdepasse"]', ADM); await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.endsWith("/connexion"), { timeout: 30000 });
  verifier("Route de test d'erreur fermée en ligne (404)", (await ctx.request.get(B + "/api/test-erreur")).status() === 404);
  const r = await ctx.request.get(B + "/api/admin/diagnostic", { timeout: 60000 });
  verifier("Diagnostic exécuté", r.status() === 200, `HTTP ${r.status()}`);
  if (r.status() === 200) {
    const d = await r.json(); const S = { ok: "✓", ko: "✗", avert: "⚠", info: "•" };
    for (const s of d.sections) { console.log(`\n## ${s.titre}`); for (const l of s.lignes) console.log(`${S[l.etat]} ${l.nom}${l.detail ? "  → " + l.detail : ""}`); }
    console.log(`\nSynthèse : ${d.synthese.ok} réussies, ${d.synthese.ko} échec(s), ${d.synthese.avert} avertissement(s), ${d.synthese.info} information(s).`);
    if (d.synthese.ko) echecs++;
  }
  // Notification de test réelle : téléphone et e-mail partent vraiment (le résultat de chacun est affiché).
  const rn = await ctx.request.post(B + "/api/admin/notification-test", { timeout: 40000, headers: { Origin: B } });
  const n = rn.status() === 200 ? await rn.json() : null;
  console.log(`\n— Notification de test — téléphone : ${n?.push ?? "?"} · e-mail : ${n?.email ?? "?"}`);
  verifier("Notification de test : téléphone", n?.push === "envoye", `état : ${n?.push ?? "HTTP " + rn.status()}`);
  verifier("Notification de test : e-mail", n?.email === "envoye", `état : ${n?.email ?? "HTTP " + rn.status()} (si « echec » : voir la section E-mails du diagnostic)`);
} catch (e) { verifier("Connexion à l'administration", false, e.message); }

console.log("\n— Navigation réelle : ordinateur et téléphone —");
for (const [appareil, opts] of [["Ordinateur", { viewport: { width: 1280, height: 900 } }], ["Téléphone (iPhone)", { ...devices["iPhone 13"] }]]) {
  const c = await nav.newContext({ ...opts, ...(PRE ? { httpCredentials: { username: "x", password: PRE } } : {}) });
  const pg = await c.newPage(); const erreurs = []; pg.on("pageerror", (e) => erreurs.push(e.message));
  try {
    await pg.goto(B + "/", { waitUntil: "networkidle", timeout: 45000 });
    verifier(`${appareil} : accueil affiché avec les trois formules, sans erreur JavaScript`, (await pg.locator(".formule").count()) === 3 && erreurs.length === 0, erreurs.join(" | "));
    verifier(`${appareil} : aucune barre de défilement horizontale`, await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await pg.goto(B + "/admin", { waitUntil: "networkidle" });
    verifier(`${appareil} : /admin sans session renvoie vers la page de connexion`, pg.url().endsWith("/admin/connexion"), pg.url());
    await pg.fill('input[name="motdepasse"]', ADM); await pg.click('button[type="submit"]');
    await pg.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 });
    verifier(`${appareil} : connexion à /admin réussie, tableau de bord affiché`, (await pg.locator("h1").first().textContent()).includes("Commandes"));
    verifier(`${appareil} : tableau de bord sans barre de défilement horizontale de page`, await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  } catch (e) { verifier(`${appareil} : navigation`, false, e.message); }
  await c.close();
}
await nav.close();
console.log(echecs ? `\n${echecs} point(s) à traiter.` : "\nTout est conforme.");
process.exit(echecs ? 1 : 0);
