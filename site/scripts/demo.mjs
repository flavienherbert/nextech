// Lance le site en préproduction locale avec le simulateur de paiement.
//   npm run demo        → mode développement (next dev)
//   npm run demo:prod   → version compilée (next build, puis next start)
// La compilation est faite ici, avec les réglages de la démonstration : Next fige les en-têtes
// de sécurité au moment de la compilation.
//
// Le lanceur refuse de démarrer si un autre serveur occupe déjà les ports (cas d'un ancien
// serveur resté ouvert, qui servirait une ancienne version du site), vérifie la politique de
// sécurité réellement servie avant d'annoncer que le site est prêt, et arrête tous les
// processus qu'il a lancés quand on le ferme.
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { decrire, directive, pidsSurPort, portOccupe, tuerArbre, version } from "./outils-serveur.mjs";
import { politiqueContenu } from "../next.config.mjs";

const WIN = process.platform === "win32";
const prod = process.argv[2] === "prod";
const port = process.env.PORT || "3000";
const portSim = process.env.MOCK_STRIPE_PORT || "4242";
const base = `http://localhost:${port}`;
const v = version();

console.log(`\nStudio Accroche — démonstration locale (${prod ? "version compilée" : "mode développement"})`);
console.log(`  Version du code : ${v.commit} sur ${v.branche}${v.modifs ? `, ${v.modifs} fichier(s) modifié(s) localement` : ""}`);
if (!politiqueContenu(true).includes("'unsafe-eval'")) {
  console.error("\n✗ Ce dossier contient une ancienne configuration (next.config.mjs sans réglage pour le développement).\n  Mettez le code à jour (git pull) puis relancez.\n");
  process.exit(1);
}

for (const [p, quoi] of [[port, "le site"], [portSim, "le simulateur de paiement"]]) {
  if (await portOccupe(p)) {
    const pids = pidsSurPort(p);
    console.error(`\n✗ Le port ${p} (${quoi}) est déjà utilisé.`);
    for (const pid of pids) console.error(`    processus ${pid} : ${decrire(pid)}`);
    console.error(`  Un serveur lancé précédemment tourne sans doute encore. Tant qu'il tourne, c'est lui qui\n  répond sur http://localhost:${p}, avec l'ancienne version du site.\n\n  Pour l'arrêter :  npm run stop\n  Puis relancez :   npm run ${prod ? "demo:prod" : "demo"}\n`);
    process.exit(1);
  }
}

const env = {
  ...process.env,
  PORT: port,
  SITE_URL: base,
  DATA_DIR: process.env.DATA_DIR || "./data",
  STRIPE_SECRET_KEY: "sk_test_simulation",
  STRIPE_WEBHOOK_SECRET: "whsec_simulation",
  STRIPE_API_HOST: `http://localhost:${portSim}`,
  MOCK_STRIPE_PORT: portSim,
  MOCK_WEBHOOK_URL: `${base}/api/stripe/webhook`,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "demonstration",
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
};
if (prod) {
  console.log("\n  Compilation en cours (environ une minute)…");
  const c = spawnSync("npx", ["next", "build"], { env, stdio: ["ignore", "ignore", "inherit"], shell: WIN });
  if (c.status !== 0) { console.error("\n✗ La compilation a échoué.\n"); process.exit(1); }
}
const lancer = (cmd, args) => spawn(cmd, args, { env, stdio: "inherit", shell: WIN });
const enfants = [lancer("node", ["scripts/mock-stripe.mjs"]), lancer("npx", ["next", prod ? "start" : "dev", "-p", port])];

let arret = false;
function arreter(code = 0) {
  if (arret) return;
  arret = true;
  for (const e of enfants) tuerArbre(e.pid);
  // Les serveurs lancés par l'intermédiaire de npx peuvent survivre à leur parent : on libère aussi les ports.
  setTimeout(() => { for (const p of [port, portSim]) for (const pid of pidsSurPort(p)) tuerArbre(pid); process.exit(code); }, 600);
}
for (const s of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) process.on(s, () => arreter(0));
process.on("uncaughtException", (e) => { console.error(e); arreter(1); });
for (const e of enfants) e.on("exit", (code) => { if (!arret) { console.error(`\n✗ Un des serveurs s'est arrêté (code ${code}). Arrêt de la démonstration.\n`); arreter(1); } });

// Attendre que le site réponde, puis contrôler ce qu'il sert réellement.
let reponse = null;
for (let i = 0; i < 120 && !arret; i++) {
  await new Promise((ok) => setTimeout(ok, 500));
  try { reponse = await fetch(base, { redirect: "manual" }); if (reponse.status < 500) break; } catch {}
}
if (!reponse) { console.error("\n✗ Le site n'a pas démarré dans le délai prévu.\n"); arreter(1); }
else if (!arret) {
  const csp = reponse.headers.get("content-security-policy") || "";
  const scripts = directive(csp, "script-src");
  const evalAutorise = scripts.includes("'unsafe-eval'");
  const conforme = prod ? !evalAutorise : evalAutorise;
  console.log(`\n  Politique de contenu servie : ${scripts}`);
  console.log(`  ${conforme ? "✓" : "✗"} ${prod ? "version compilée : 'unsafe-eval' " + (evalAutorise ? "PRÉSENT (anormal)" : "absent") : "développement : 'unsafe-eval' " + (evalAutorise ? "autorisé, comme il se doit" : "ABSENT — la page ne s'affichera pas correctement")}`);
  if (!conforme) console.error("    Ce n'est pas la configuration attendue : arrêtez tout (npm run stop), mettez le code à jour, relancez.");
  console.log(`\n  PRÊT\n  Site            : ${base}\n  Administration  : ${base}/admin   (mot de passe : ${env.ADMIN_PASSWORD})\n  Paiement        : simulé, rien n'est débité\n  Arrêt           : Ctrl+C dans cette fenêtre, ou « npm run stop » dans une autre\n`);
}
