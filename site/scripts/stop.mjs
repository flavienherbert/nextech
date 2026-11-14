// Arrête tout serveur de démonstration resté ouvert (site et simulateur de paiement).
// Usage : npm run stop
import { decrire, libererPort, pidsSurPort, portOccupe } from "./outils-serveur.mjs";

const ports = [process.env.PORT || "3000", process.env.MOCK_STRIPE_PORT || "4242"];
let trouve = false;
for (const p of ports) {
  if (!(await portOccupe(p))) { console.log(`Port ${p} : libre.`); continue; }
  trouve = true;
  for (const pid of pidsSurPort(p)) console.log(`Port ${p} : arrêt du processus ${pid} — ${decrire(pid)}`);
  await libererPort(p);
  console.log(`Port ${p} : ${(await portOccupe(p)) ? "TOUJOURS OCCUPÉ — fermez le programme concerné à la main" : "libéré."}`);
}
console.log(trouve ? "\nVous pouvez relancer : npm run demo" : "\nAucun serveur de démonstration n'était ouvert.");
