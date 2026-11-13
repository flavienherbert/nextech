// Stockage des commandes, fichiers et e-mails. Pilote « disque local ».
// L'interface est volontairement petite pour pouvoir brancher un stockage objet plus tard.
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "./env";
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
  recuLe: string;
};

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

const racine = () => path.resolve(env.dataDir());
const dossier = (n: string) => path.join(racine(), n);
const sur = (s: string) => /^[A-Za-z0-9_-]+$/.test(s);

async function ecrireJson(fichier: string, data: unknown) {
  await fs.mkdir(path.dirname(fichier), { recursive: true });
  const tmp = `${fichier}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, fichier);
}

async function lireJson<T>(fichier: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(fichier, "utf8")) as T;
  } catch {
    return null;
  }
}

// Verrou par commande : évite qu'un webhook et une action simultanée s'écrasent.
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

export function nouveauNumero(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const alea = Array.from(crypto.randomBytes(5), (b) => alpha[b % alpha.length]).join("");
  return `SA-${String(d.getUTCFullYear()).slice(2)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${alea}`;
}

export const store = {
  async creerCommande(c: Commande) {
    await ecrireJson(path.join(dossier("commandes"), `${c.id}.json`), c);
    await ecrireJson(path.join(dossier("tokens"), `${c.token}.json`), { id: c.id });
  },

  async commande(id: string): Promise<Commande | null> {
    if (!sur(id)) return null;
    return lireJson<Commande>(path.join(dossier("commandes"), `${id}.json`));
  },

  async commandeParToken(token: string): Promise<Commande | null> {
    if (!sur(token) || token.length < 32) return null;
    const lien = await lireJson<{ id: string }>(path.join(dossier("tokens"), `${token}.json`));
    if (!lien) return null;
    const c = await this.commande(lien.id);
    // Comparaison à temps constant du secret
    if (!c || c.token.length !== token.length) return null;
    return crypto.timingSafeEqual(Buffer.from(c.token), Buffer.from(token)) ? c : null;
  },

  async commandes(): Promise<Commande[]> {
    try {
      const noms = (await fs.readdir(dossier("commandes"))).filter((n) => n.endsWith(".json"));
      const tout = await Promise.all(noms.map((n) => lireJson<Commande>(path.join(dossier("commandes"), n))));
      return (tout.filter(Boolean) as Commande[]).sort((a, b) => b.creeLe.localeCompare(a.creeLe));
    } catch {
      return [];
    }
  },

  // Modifie une commande de façon atomique. `fn` reçoit la version courante.
  async modifier(id: string, fn: (c: Commande) => void | false): Promise<Commande | null> {
    return avecVerrou(id, async () => {
      const c = await this.commande(id);
      if (!c) return null;
      if (fn(c) === false) return c;
      await ecrireJson(path.join(dossier("commandes"), `${c.id}.json`), c);
      return c;
    });
  },

  // Idempotence des webhooks : vrai si l'événement n'avait jamais été vu.
  async marquerEvenement(eventId: string): Promise<boolean> {
    if (!sur(eventId)) return false;
    const f = path.join(dossier("evenements"), `${eventId}.json`);
    await fs.mkdir(path.dirname(f), { recursive: true });
    try {
      await fs.writeFile(f, JSON.stringify({ vuLe: maintenant() }), { flag: "wx" });
      return true;
    } catch {
      return false;
    }
  },

  async oublierEvenement(eventId: string) {
    if (sur(eventId)) await fs.rm(path.join(dossier("evenements"), `${eventId}.json`), { force: true });
  },

  async enregistrerFichier(contenu: Buffer, nom: string, type: string): Promise<Fichier> {
    const id = crypto.randomBytes(16).toString("hex");
    await fs.mkdir(dossier("fichiers"), { recursive: true });
    await fs.writeFile(path.join(dossier("fichiers"), id), contenu);
    return { id, nom: nom.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120), taille: contenu.length, type, ajouteLe: maintenant() };
  },

  fluxFichier(id: string) {
    if (!sur(id)) return null;
    return createReadStream(path.join(dossier("fichiers"), id));
  },

  async supprimerFichier(id: string) {
    if (sur(id)) await fs.rm(path.join(dossier("fichiers"), id), { force: true });
  },

  async archiverCourriel(m: Courriel) {
    await ecrireJson(path.join(dossier("courriels"), `${m.date.replace(/[:.]/g, "-")}-${m.id}.json`), m);
  },

  async courriels(commande?: string): Promise<Courriel[]> {
    try {
      const noms = (await fs.readdir(dossier("courriels"))).filter((n) => n.endsWith(".json")).sort().reverse();
      const tout = await Promise.all(noms.slice(0, 300).map((n) => lireJson<Courriel>(path.join(dossier("courriels"), n))));
      return (tout.filter(Boolean) as Courriel[]).filter((m) => !commande || m.commande === commande);
    } catch {
      return [];
    }
  },
};

export function journal(c: Commande, evenement: string) {
  c.historique.push({ date: maintenant(), evenement });
}
