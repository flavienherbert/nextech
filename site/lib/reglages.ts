// Réglages saisis depuis l'administration (aujourd'hui : le mot de passe d'application Gmail).
// Pourquoi : une variable Netlify ne prend effet qu'après un nouveau déploiement, et chaque déploiement consomme des crédits
// de l'offre gratuite. Saisi ici, le mot de passe est actif immédiatement.
// Rangé dans la base (jamais dans le dépôt, jamais affiché), chiffré en AES-256-GCM avec une clé dérivée de SESSION_SECRET :
// sans SESSION_SECRET, le contenu de la base ne suffit pas à le lire.
import crypto from "node:crypto";
import { depot } from "./depot";
import { env } from "./env";

const CLE = "reglages/smtp.json";
const cleChiffrement = () => crypto.createHash("sha256").update(`studio-accroche|reglages|${env.sessionSecret()}`).digest();

export function chiffrer(texte: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", cleChiffrement(), iv);
  const donnees = Buffer.concat([c.update(texte, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), donnees]).toString("base64");
}

export function dechiffrer(b64: string): string {
  const b = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", cleChiffrement(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
}

// Cache par instance (30 s) : l'envoi d'un e-mail ne doit pas interroger la base à chaque fois.
let smtp: string | undefined;
let lu = 0;
let enregistreLe: string | undefined;

export async function chargerReglages(forcer = false) {
  if (!forcer && Date.now() - lu < 30_000) return;
  try {
    const l = await depot().lire(CLE);
    if (l) {
      const o = JSON.parse(l.corps.toString("utf8")) as { mdp?: string; le?: string };
      smtp = o.mdp ? dechiffrer(o.mdp) : undefined;
      enregistreLe = o.le;
    } else {
      smtp = undefined;
      enregistreLe = undefined;
    }
    lu = Date.now();
  } catch (e) {
    // Base indisponible ou clé changée : on garde ce qu'on avait, on réessaiera dans 30 s.
    lu = Date.now();
    console.error("[réglages] lecture impossible :", (e as Error).message);
  }
}

export const motDePasseSmtpStocke = () => smtp;
export const motDePasseSmtpEnregistreLe = () => enregistreLe;

export async function enregistrerMotDePasseSmtp(mdp: string) {
  const le = new Date().toISOString();
  await depot().ecrire(CLE, JSON.stringify({ mdp: chiffrer(mdp), le }));
  smtp = mdp; enregistreLe = le; lu = Date.now();
}

export async function oublierMotDePasseSmtp() {
  await depot().supprimer(CLE);
  smtp = undefined; enregistreLe = undefined; lu = Date.now();
}
