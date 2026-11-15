// Limiteur d'essais partagé entre toutes les instances du site (rangé dans le dépôt de documents).
// Un compteur en mémoire ne protège rien sur un hébergement serverless : chaque instance repart de zéro.
// L'adresse du visiteur n'est jamais conservée en clair : seule une empreinte signée sert de clé.
import crypto from "node:crypto";
import { depot } from "./depot";
import { env } from "./env";

type Etat = { n: number; debut: number };

const cle = (portee: string, id: string) =>
  `limites/${portee}-${crypto.createHmac("sha256", env.sessionSecret() || "local").update(`${portee}:${id}`).digest("hex").slice(0, 32)}.json`;

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
  const { e } = await lireEtat(cle(portee, id));
  return e && Date.now() - e.debut <= fenetreMs ? e.n : 0;
}

// Enregistre un événement et renvoie le total dans la fenêtre. Écriture atomique : aucun événement perdu entre instances.
export async function enregistrer(portee: string, id: string, fenetreMs: number): Promise<number> {
  const k = cle(portee, id);
  for (let essai = 0; essai < 8; essai++) {
    const { e, version } = await lireEtat(k);
    const now = Date.now();
    const suivant: Etat = e && now - e.debut <= fenetreMs ? { n: e.n + 1, debut: e.debut } : { n: 1, debut: now };
    const ok = await depot().ecrire(k, JSON.stringify(suivant), version ? { siVersion: version } : { siAbsent: true });
    if (ok) return suivant.n;
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 40 * (essai + 1)));
  }
  return Number.POSITIVE_INFINITY; // en cas de doute, on refuse
}

export async function remettreAZero(portee: string, id: string) {
  await depot().supprimer(cle(portee, id));
}

// Adresse du visiteur : l'en-tête posé par Netlify en priorité (non falsifiable), sinon X-Forwarded-For.
export function adresseClient(h: { get(nom: string): string | null }): string {
  return h.get("x-nf-client-connection-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
