// Commandes, fichiers et e-mails. Toutes les lectures et écritures passent par le dépôt
// (lib/depot.ts), qui range les données sur disque ou dans un stockage objet.
import crypto from "node:crypto";
import { depot } from "./depot";
import type { FormuleId } from "./formules";

export type Statut =
  | "attente_paiement"
  | "attente_infos"
  | "payee"
  | "en_production"
  | "attente_validation"
  | "livree"
  | "annulee";

export const STATUTS: { id: Statut; nom: string }[] = [
  { id: "attente_paiement", nom: "Paiement non confirmé" },
  { id: "attente_infos", nom: "Payée — en attente des informations" },
  { id: "payee", nom: "Payée — brief reçu" },
  { id: "en_production", nom: "En production" },
  { id: "attente_validation", nom: "En attente de validation" },
  { id: "livree", nom: "Livrée" },
  { id: "annulee", nom: "Annulée" },
];
export const nomStatut = (s: Statut) => STATUTS.find((x) => x.id === s)?.nom ?? s;

export type Fichier = { id: string; nom: string; taille: number; type: string; ajouteLe: string };

export type Brief = {
  nom: string;
  email: string;
  telephone: string;
  marque: string;
  lien: string;
  produit: string;
  style: string;
  cible: string;
  arguments: string;
  aEviter: string;
  complement: string;
  // Facturation
  nomFacture: string;
  adresseFacture: string;
  sirenClient: string;
  recuLe: string;
};

export type Facture = { numero: string; date: string; cle: string; specimen: boolean; montantCents: number };

export type Commande = {
  id: string; // numéro de commande lisible, unique
  token: string; // secret d'accès du client
  formule: FormuleId;
  montantCents: number;
  devise: "eur";
  creeLe: string;
  statut: Statut;
  paiement: {
    etat: "en_attente" | "paye" | "echoue" | "expire";
    sessionId: string;
    intentId?: string;
    payeLe?: string;
    emailStripe?: string;
    mode: string;
  };
  brief?: Brief;
  fichiersClient: Fichier[];
  livrables: Fichier[];
  facture?: Facture;
  livreeLe?: string;
  retouchesDemandees: { date: string; message: string }[];
  valideeLe?: string;
  notes: string;
  historique: { date: string; evenement: string }[];
};

export type Courriel = {
  id: string;
  date: string;
  a: string;
  objet: string;
  html: string;
  texte: string;
  commande?: string;
  pilote: string;
  resultat: string;
};

const sur = (s: string) => /^[A-Za-z0-9_-]+$/.test(s);
const json = (d: unknown) => JSON.stringify(d, null, 2);

async function lireJson<T>(cle: string): Promise<{ donnees: T; version: string } | null> {
  const l = await depot().lire(cle);
  if (!l) return null;
  try {
    return { donnees: JSON.parse(l.corps.toString("utf8")) as T, version: l.version };
  } catch {
    return null;
  }
}

// Verrou en mémoire : évite les allers-retours inutiles au sein d'un même processus.
// La protection réelle entre processus est l'écriture conditionnelle (voir `modifier`).
const verrous = new Map<string, Promise<unknown>>();
async function avecVerrou<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  const precedent = verrous.get(cle) ?? Promise.resolve();
  const suivant = precedent.catch(() => {}).then(fn);
  verrous.set(cle, suivant);
  try {
    return await suivant;
  } finally {
    if (verrous.get(cle) === suivant) verrous.delete(cle);
  }
}

export const maintenant = () => new Date().toISOString();
export const nouveauToken = () => crypto.randomBytes(24).toString("hex");
export const nouvelIdFichier = () => crypto.randomBytes(16).toString("hex");
export const cleFichier = (id: string) => `fichiers/${id}`;
export const nomPropre = (nom: string) => nom.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120);

export function nouveauNumero(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const alea = Array.from(crypto.randomBytes(5), (b) => alpha[b % alpha.length]).join("");
  return `SA-${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${alea}`;
}

export const store = {
  async creerCommande(c: Commande) {
    await depot().ecrire(`commandes/${c.id}.json`, json(c), { siAbsent: true });
    await depot().ecrire(`tokens/${c.token}.json`, json({ id: c.id }), { siAbsent: true });
  },

  async commande(id: string): Promise<Commande | null> {
    if (!sur(id)) return null;
    return (await lireJson<Commande>(`commandes/${id}.json`))?.donnees ?? null;
  },

  async commandeParToken(token: string): Promise<Commande | null> {
    if (!sur(token) || token.length < 32) return null;
    const lien = await lireJson<{ id: string }>(`tokens/${token}.json`);
    if (!lien) return null;
    const c = await this.commande(lien.donnees.id);
    // Comparaison à temps constant du secret
    if (!c || c.token.length !== token.length) return null;
    return crypto.timingSafeEqual(Buffer.from(c.token), Buffer.from(token)) ? c : null;
  },

  async commandes(): Promise<Commande[]> {
    const cles = (await depot().lister("commandes")).filter((k) => k.endsWith(".json"));
    const tout = await Promise.all(cles.map((k) => lireJson<Commande>(k)));
    return tout.filter(Boolean).map((x) => x!.donnees).sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  },

  // Modifie une commande sans jamais écraser une modification concurrente :
  // l'écriture n'est acceptée que si la commande n'a pas changé depuis la lecture, sinon on recommence.
  async modifier(id: string, fn: (c: Commande) => void | false): Promise<Commande | null> {
    if (!sur(id)) return null;
    return avecVerrou(id, async () => {
      for (let essai = 0; essai < 6; essai++) {
        const lu = await lireJson<Commande>(`commandes/${id}.json`);
        if (!lu) return null;
        if (fn(lu.donnees) === false) return lu.donnees;
        if (await depot().ecrire(`commandes/${id}.json`, json(lu.donnees), { siVersion: lu.version })) return lu.donnees;
        await new Promise((ok) => setTimeout(ok, 40 * (essai + 1)));
      }
      throw new Error(`Commande ${id} : écriture concurrente non résolue.`);
    });
  },

  // Idempotence des webhooks : vrai si l'événement n'avait jamais été vu.
  async marquerEvenement(eventId: string): Promise<boolean> {
    if (!sur(eventId)) return false;
    return depot().ecrire(`evenements/${eventId}.json`, json({ vuLe: maintenant() }), { siAbsent: true });
  },

  async oublierEvenement(eventId: string) {
    if (sur(eventId)) await depot().supprimer(`evenements/${eventId}.json`);
  },

  async supprimerFichier(id: string) {
    if (sur(id)) await depot().supprimer(cleFichier(id));
  },

  // Compteur sans trou ni doublon (numéros de facture) : incrément par écriture conditionnelle.
  async suivant(nom: string): Promise<number> {
    if (!sur(nom)) throw new Error("Nom de compteur invalide.");
    const cle = `compteurs/${nom}.json`;
    for (let essai = 0; essai < 12; essai++) {
      const lu = await lireJson<{ n: number }>(cle);
      const n = (lu?.donnees.n ?? 0) + 1;
      const ok = await depot().ecrire(cle, json({ n, majLe: maintenant() }), lu ? { siVersion: lu.version } : { siAbsent: true });
      if (ok) return n;
      await new Promise((r) => setTimeout(r, 30 * (essai + 1)));
    }
    throw new Error("Compteur indisponible.");
  },

  async archiverCourriel(m: Courriel) {
    await depot().ecrire(`courriels/${m.date.replace(/[:.]/g, "-")}-${m.id}.json`, json(m));
  },

  async courriels(commande?: string): Promise<Courriel[]> {
    const cles = (await depot().lister("courriels")).filter((k) => k.endsWith(".json")).sort().reverse().slice(0, 300);
    const tout = await Promise.all(cles.map((k) => lireJson<Courriel>(k)));
    return tout.filter(Boolean).map((x) => x!.donnees).filter((m) => !commande || m.commande === commande);
  },
};

export function journal(c: Commande, evenement: string) {
  c.historique.push({ date: maintenant(), evenement });
}
