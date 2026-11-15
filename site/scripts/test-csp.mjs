// Test autonome de la politique de contenu (CSP) et du lanceur.
// Il lance lui-même le site en mode développement puis en version compilée, sur des ports
// à part, et vérifie les en-têtes réellement servis, le rendu réel des sections, le refus
// de démarrer par-dessus un autre serveur et l'arrêt complet des processus.
// Usage : npm run test:csp      (environ 2 minutes ; ne touche pas aux ports 3000 et 4242)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { directive, portOccupe } from "./outils-serveur.mjs";
import { politiqueContenu } from "../next.config.mjs";

const PORT = process.env.TEST_PORT || "3210", SIM = process.env.TEST_PORT_SIM || "4310";
const BASE = `http://localhost:${PORT}`;
const donnees = fs.mkdtempSync(path.join(os.tmpdir(), "studio-csp-"));
const env = { ...process.env, PORT, MOCK_STRIPE_PORT: SIM, DATA_DIR: donnees };
let ko = 0, total = 0;
const verifier = (nom, ok, detail = "") => { total++; if (!ok) ko++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
const libres = async () => !(await portOccupe(PORT)) && !(await portOccupe(SIM));
const attendreLibres = async () => { for (let i = 0; i < 40 && !(await libres()); i++) await pause(250); return libres(); };

function lancer(mode) {
  const p = spawn("node", ["scripts/demo.mjs", ...(mode === "prod" ? ["prod"] : [])], { env, stdio: ["ignore", "pipe", "pipe"] });
  let sortie = "";
  p.stdout.on("data", (d) => (sortie += d)); p.stderr.on("data", (d) => (sortie += d));
  const pret = new Promise((ok) => { const t = setInterval(() => { if (sortie.includes("PRÊT") || p.exitCode !== null) { clearInterval(t); ok(sortie.includes("PRÊT")); } }, 200); setTimeout(() => { clearInterval(t); ok(false); }, 300000); });
  return { p, pret, sortie: () => sortie };
}
const affichage = (mode) => {
  const r = spawnSync("node", ["scripts/test-affichage.mjs"], { env: { ...process.env, BASE, MODE: mode }, encoding: "utf8" });
  const resume = (r.stdout.trim().split("\n").pop() || "").trim();
  return { ok: r.status === 0, resume, echecs: r.stdout.split("\n").filter((l) => l.startsWith("✗")).join(" | ") };
};

console.log("— 1. Sources de la politique —");
const sources = [];
const explorer = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const c = path.join(d, f.name); if (f.isDirectory()) explorer(c); else if (/\.(tsx?|mjs|js)$/.test(f.name) && /Content-Security-Policy/i.test(fs.readFileSync(c, "utf8"))) sources.push(c); } };
for (const d of ["app", "lib"]) explorer(d);
for (const f of ["next.config.mjs", "middleware.ts", "middleware.js"]) if (fs.existsSync(f) && /Content-Security-Policy/i.test(fs.readFileSync(f, "utf8"))) sources.push(f);
verifier("Une seule source définit la politique : next.config.mjs", sources.length === 1 && sources[0] === "next.config.mjs", sources.join(", "));
verifier("Le middleware (accès préproduction) ne définit aucun en-tête de sécurité", !fs.existsSync("middleware.ts") || !/Content-Security-Policy|X-Frame-Options|Strict-Transport/i.test(fs.readFileSync("middleware.ts", "utf8").replace(/\/\/.*$/gm, "")));
const dev = politiqueContenu(true), prod = politiqueContenu(false);
verifier("Fonction : développement autorise 'unsafe-eval'", directive(dev, "script-src").includes("'unsafe-eval'"), dev);
verifier("Fonction : production sans 'unsafe-eval' ni ws:", !prod.includes("unsafe-eval") && !/\bwss?:/.test(prod), prod);
verifier("Fonction : sans simulateur, aucun hôte local dans form-action", !directive(prod, "form-action").includes("localhost"), prod);
verifier("Fonction : les deux gardent default-src, frame-ancestors, object-src", [dev, prod].every((c) => c.includes("default-src 'self'") && c.includes("frame-ancestors 'none'") && c.includes("object-src 'none'")));

if (!(await libres())) { console.error(`\nLes ports de test ${PORT}/${SIM} sont occupés : PORT=${PORT} MOCK_STRIPE_PORT=${SIM} npm run stop`); process.exit(1); }

console.log("\n— 2. Mode développement (npm run demo) —");
let s = lancer("dev");
verifier("Le lanceur annonce PRÊT", await s.pret, s.sortie().slice(-400));
let r = await fetch(BASE); let csp = r.headers.get("content-security-policy") || "";
console.log(`    en-tête reçu : ${directive(csp, "script-src")} ; ${directive(csp, "connect-src")}`);
verifier("En-tête servi : 'unsafe-eval' présent dans script-src", directive(csp, "script-src").includes("'unsafe-eval'"), csp);
verifier("En-tête servi : rechargement à chaud autorisé (ws:)", /\bws:/.test(directive(csp, "connect-src")), csp);
verifier("En-tête servi : version du code indiquée", Boolean(r.headers.get("x-studio-version")));
verifier("En-tête servi : pas de HSTS en développement", !r.headers.get("strict-transport-security"));
verifier("Le lanceur affiche la politique contrôlée", s.sortie().includes("'unsafe-eval' autorisé"));
let a = affichage("dev");
verifier(`Rendu réel des sections dans Chromium (${a.resume})`, a.ok, a.echecs);
const second = spawnSync("node", ["scripts/demo.mjs"], { env, encoding: "utf8" });
verifier("Un second lancement sur le même port est refusé", second.status === 1 && /déjà utilisé/.test(second.stderr) && !/PRÊT/.test(second.stdout), second.stderr.slice(0, 200));
verifier("Le premier serveur répond toujours après ce refus", (await fetch(BASE)).ok);
s.p.kill("SIGINT");
verifier("Ctrl+C : tous les processus sont arrêtés, ports libérés", await attendreLibres());

console.log("\n— 3. Version compilée (npm run demo:prod) —");
s = lancer("prod");
verifier("Le lanceur annonce PRÊT", await s.pret, s.sortie().slice(-400));
r = await fetch(BASE); csp = r.headers.get("content-security-policy") || "";
console.log(`    en-tête reçu : ${directive(csp, "script-src")} ; ${directive(csp, "connect-src")}`);
verifier("En-tête servi : script-src strict, sans 'unsafe-eval'", directive(csp, "script-src") === "script-src 'self' 'unsafe-inline'", csp);
verifier("En-tête servi : aucun 'unsafe-eval' nulle part", !csp.includes("unsafe-eval"), csp);
verifier("En-tête servi : connect-src sans ws:", !/\bwss?:/.test(csp), csp);
verifier("En-tête servi : HSTS présent", Boolean(r.headers.get("strict-transport-security")));
verifier("En-tête servi : form-action limité au site, à Stripe et au simulateur lancé", directive(csp, "form-action") === `form-action 'self' https://checkout.stripe.com http://localhost:${SIM}`, csp);
verifier("En-tête servi : version du code non divulguée", !r.headers.get("x-studio-version"));
for (const chemin of ["/admin", "/cgv", "/commander/essai"]) { const c = (await fetch(BASE + chemin, { redirect: "manual" })).headers.get("content-security-policy") || ""; verifier(`Même politique stricte sur ${chemin}`, c === csp, c); }
a = affichage("prod");
verifier(`Rendu réel des sections dans Chromium (${a.resume})`, a.ok, a.echecs);

console.log("\n— 4. Serveur resté ouvert (lanceur tué brutalement) —");
s.p.kill("SIGKILL"); await pause(800);
verifier("Le serveur orphelin répond encore (situation de panne reproduite)", await portOccupe(PORT));
const stop = spawnSync("node", ["scripts/stop.mjs"], { env, encoding: "utf8" });
verifier("npm run stop libère les ports", stop.status === 0 && (await attendreLibres()), stop.stdout);

fs.rmSync(donnees, { recursive: true, force: true });
console.log(`\n${total - ko}/${total} vérifications réussies${ko ? ` — ${ko} ÉCHEC(S)` : ""}`);
process.exit(ko ? 1 : 0);
