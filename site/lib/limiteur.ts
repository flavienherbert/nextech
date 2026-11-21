// Limiteur d'essais partagé entre toutes les instances du site (rangé dans le dépôt de documents).
// Un compteur en mémoire ne protège rien sur un hébergement serverless : chaque instance repart de zéro.
// L'adresse du visiteur n'est jamais conservée en clair : seule une empreinte signée sert de clé.
import crypto from "node:crypto";
import { depot } from "./depot";
import { cleDerivee } from "./cles";

type Etat = { n: number; debut: number };

// Si le dépôt partagé est indisponible (base de données injoignable, mauvais mot de passe…), le limiteur ne doit pas
// bloquer l'accès à l'administration — c'est là qu'on diagnostique la panne. Il se rabat alors sur un compteur propre à
// l'instance (moins protecteur, mais un mot de passe long et un compteur par instance restent un frein sérieux).
const memoire = new Map<string, Etat>();
let dernierAvertissement = 0;
function repli(e: unknown) {
  if (Date.now() - dernierAvertissement > 60_000) { dernierAvertissement = Date.now(); console.error("[limiteur] dépôt indisponible, compteur en mémoire :", (e as Error)?.message); }
}
const memCompte = (k: string, fenetreMs: number) => { const e = memoire.get(k); return e && Date.now() - e.debut <= fenetreMs ? e.n : 0; };
function memEnregistre(k: string, fenetreMs: number) {
  const e = memoire.get(k), now = Date.now();
  const suivant: Etat = e && now - e.debut <= fenetreMs ? { n: e.n + 1, debut: e.debut } : { n: 1, debut: now };
  memoire.set(k, suivant);
  if (memoire.size > 5000) memoire.clear();
  return suivant.n;
}

const cle = (portee: string, id: string) =>
  `limites/${portee}-${crypto.createHmac("sha256", cleDerivee("limiteur")).update(`${portee}:${id}`).digest("hex").slice(0, 32)}.json`;

async function lireEtat(k: string): Promise<{ e: Etat | null; version?: string }> {
  const l = await depot().lire(k);
  if (!l) return { e: null };
  try {
    return { e: JSON.parse(l.corps.toString("utf8")) as Etat, version: l.version };
  } catch {
    return { e: null, version: l.version };
  }
}

// Nombre d'événements enregistrés dans la fenêtre en cours, sans en ajouter.
export async function compte(portee: string, id: string, fenetreMs: number): Promise<number> {
  const k = cle(portee, id);
  try {
    const { e } = await lireEtat(k);
    return e && Date.now() - e.debut <= fenetreMs ? e.n : 0;
  } catch (e) {
    repli(e);
    return memCompte(k, fenetreMs);
  }
}

// Enregistre un événement et renvoie le total dans la fenêtre. Écriture atomique : aucun événement perdu entre instances.
export async function enregistrer(portee: string, id: string, fenetreMs: number): Promise<number> {
  const k = cle(portee, id);
  try {
    for (let essai = 0; essai < 8; essai++) {
      const { e, version } = await lireEtat(k);
      const now = Date.now();
      const suivant: Etat = e && now - e.debut <= fenetreMs ? { n: e.n + 1, debut: e.debut } : { n: 1, debut: now };
      const ok = await depot().ecrire(k, JSON.stringify(suivant), version ? { siVersion: version } : { siAbsent: true });
      if (ok) return suivant.n;
      await new Promise((r) => setTimeout(r, 15 + Math.random() * 40 * (essai + 1)));
    }
    return Number.POSITIVE_INFINITY; // en cas de doute, on refuse
  } catch (e) {
    repli(e);
    return memEnregistre(k, fenetreMs);
  }
}

export async function remettreAZero(portee: string, id: string) {
  const k = cle(portee, id);
  memoire.delete(k);
  try {
    await depot().supprimer(k);
  } catch (e) {
    repli(e);
  }
}

// Adresse du visiteur : l'en-tête posé par Netlify en priorité (non falsifiable), sinon X-Forwarded-For.
export function adresseClient(h: { get(nom: string): string | null }): string {
  return h.get("x-nf-client-connection-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
