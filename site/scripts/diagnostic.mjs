// Établit les faits quand la page ne s'affiche pas comme prévu : version du code présente
// dans ce dossier, processus qui répondent sur les ports, en-têtes réellement servis.
// Usage : npm run diagnostic      (le site peut être lancé ou non)
import fs from "node:fs";
import { decrire, directive, pidsSurPort, portOccupe, version } from "./outils-serveur.mjs";

const port = process.env.PORT || "3000";
const base = `http://localhost:${port}`;
const v = version();
const ligne = (ok, texte) => console.log(`${ok === null ? "•" : ok ? "✓" : "✗"} ${texte}`);

console.log("DIAGNOSTIC STUDIO ACCROCHE\n");
console.log(`Dossier            : ${process.cwd()}`);
console.log(`Version du code    : ${v.commit} sur la branche ${v.branche}${v.modifs ? ` (${v.modifs} fichier(s) modifié(s) localement)` : ""}`);
const config = fs.existsSync("next.config.mjs") ? fs.readFileSync("next.config.mjs", "utf8") : "";
const corrige = config.includes("PHASE_DEVELOPMENT_SERVER") && config.includes("'unsafe-eval'");
ligne(corrige, corrige ? "next.config.mjs contient le réglage du mode développement" : "next.config.mjs est une ANCIENNE version (sans réglage du mode développement) : le code de ce dossier n'est pas à jour");
const autres = ["middleware.ts", "middleware.js", "app/middleware.ts", "src/middleware.ts"].filter((f) => fs.existsSync(f));
ligne(autres.length === 0, autres.length ? `Autre source possible de politique de contenu : ${autres.join(", ")}` : "Aucune autre source de politique de contenu (pas de middleware)");

console.log("");
for (const p of [port, process.env.MOCK_STRIPE_PORT || "4242"]) {
  if (await portOccupe(p)) { const pids = pidsSurPort(p); ligne(null, `Port ${p} : occupé${pids.length ? "" : " (processus non identifié)"}`); for (const pid of pids) console.log(`     processus ${pid} : ${decrire(pid)}`); }
  else ligne(null, `Port ${p} : libre`);
}

console.log("");
let verdict = "";
try {
  const r = await fetch(base, { redirect: "manual" });
  const csp = r.headers.get("content-security-policy");
  const servi = r.headers.get("x-studio-version");
  console.log(`Réponse de ${base} : ${r.status}`);
  console.log(`  Content-Security-Policy : ${csp ? "" : "(aucune)"}`);
  if (csp) for (const d of csp.split(";")) console.log(`      ${d.trim()}`);
  console.log(`  Version servie          : ${servi || "(non indiquée : ancienne version du site, ou version compilée)"}`);
  const scripts = directive(csp, "script-src");
  const dev = Boolean(servi) || /ws:/.test(directive(csp, "connect-src"));
  if (!csp) verdict = "Le serveur qui répond n'envoie aucune politique de contenu : ce n'est pas ce site, ou une version très ancienne.";
  else if (scripts.includes("'unsafe-eval'")) verdict = "Le serveur sert la politique du mode développement, avec 'unsafe-eval'. Si Chrome affiche encore l'erreur, rechargez sans cache (Ctrl+Maj+R).";
  else if (servi && servi !== v.commit) verdict = `Le serveur qui répond sert la version ${servi}, alors que ce dossier contient ${v.commit}. Il a été lancé depuis une autre copie du projet. Arrêtez-le : npm run stop.`;
  else if (!corrige) verdict = "Le code de ce dossier n'est pas à jour : la correction n'y est pas. Mettez-le à jour (voir site/README.md, « Mettre à jour »), puis npm run stop et npm run demo.";
  else if (dev) verdict = "Incohérence : mode développement sans 'unsafe-eval'. Lancez npm run stop puis npm run demo, et renvoyez ce diagnostic.";
  else verdict = "Le serveur qui répond sert la politique stricte, sans 'unsafe-eval'. C'est normal pour la version compilée (npm run demo:prod). Pour « npm run demo », cela signifie qu'un AUTRE serveur, plus ancien, occupe le port : npm run stop, puis npm run demo.";
} catch {
  verdict = `Rien ne répond sur ${base} : le site n'est pas lancé. Lancez npm run demo.`;
}
console.log(`\nCONCLUSION\n${verdict}\n`);
