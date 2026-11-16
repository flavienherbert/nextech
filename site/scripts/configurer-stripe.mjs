// Crée le webhook Stripe (MODE TEST) pour le site EN LIGNE, depuis l'administration du site : la clé Stripe reste dans Netlify.
//   ADMIN_PASSWORD=… [OUT=chemin-du-fichier] node scripts/configurer-stripe.mjs [adresse-du-site] [--remplacer]
// Le secret « whsec_… » n'est JAMAIS affiché : il est écrit dans le fichier OUT (droits 600) pour être copié dans la
// variable STRIPE_WEBHOOK_SECRET de Netlify, puis le fichier doit être supprimé.
import fs from "node:fs";

const B = (process.argv.find((a) => a.startsWith("http")) || "https://studio-accroche-preprod.netlify.app").replace(/\/$/, "");
const remplacer = process.argv.includes("--remplacer");
const ADM = process.env.ADMIN_PASSWORD || "", OUT = process.env.OUT || "";
if (!ADM) { console.error("ADMIN_PASSWORD manquant."); process.exit(2); }
const cookies = new Map();
const suivre = (r) => { for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(";"); const [k, ...v] = kv.split("="); cookies.set(k, v.join("=")); } };
const entete = () => ({ Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "), Origin: B });

// Connexion par la page (action serveur) : on passe par un vrai navigateur.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const nav = await chromium.launch();
const ctx = await nav.newContext();
const p = await ctx.newPage();
await p.goto(`${B}/admin/connexion`, { waitUntil: "networkidle" });
await p.fill('input[name="motdepasse"]', ADM); await p.click('button[type="submit"]');
await p.waitForURL((u) => u.pathname === "/admin", { timeout: 30000 });
const r = await ctx.request.post(`${B}/api/admin/stripe-webhook${remplacer ? "?remplacer=oui" : ""}`, { headers: { Origin: B }, timeout: 40000 });
const j = await r.json().catch(() => ({}));
await nav.close();
if (r.status() === 409) { console.log("• Un point d'accès existe déjà pour cette adresse :", (j.existe || []).join(", "), "\n  Le remplacer invalide l'ancien secret. Relancez avec --remplacer si STRIPE_WEBHOOK_SECRET doit être régénéré."); process.exit(3); }
if (r.status() !== 200) { console.error(`✗ Échec (HTTP ${r.status()}) : ${j.erreur || "réponse inattendue"}`); process.exit(1); }
console.log(`✓ Webhook créé en mode test : ${j.id} → ${j.url} (${j.evenements.length} événements${j.remplaces ? `, ${j.remplaces} ancien(s) remplacé(s)` : ""})`);
if (OUT) { fs.writeFileSync(OUT, j.secret, { mode: 0o600 }); console.log(`Secret écrit dans ${OUT} (à copier dans STRIPE_WEBHOOK_SECRET, puis à supprimer).`); }
else console.log("Définissez OUT=… pour récupérer le secret (il n'est pas affiché).");
