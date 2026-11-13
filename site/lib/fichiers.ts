// Fichiers privés : dépôt en deux temps (réservation signée, envoi, confirmation) et téléchargement.
// Le même parcours sert au disque local et au stockage objet ; seul le lien d'envoi change.
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { depot } from "./depot";
import { env } from "./env";
import { cleFichier, maintenant, nomPropre, nouvelIdFichier, type Fichier } from "./store";

export const NB_MAX_CLIENT = 6;
export const TAILLE_MAX = { client: 40 * 1024 * 1024, livrable: 300 * 1024 * 1024 } as const;
export type Role = keyof typeof TAILLE_MAX;

const AUTORISES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "image/heic": ["heic"],
  "video/mp4": ["mp4"], "video/quicktime": ["mov"], "video/webm": ["webm"], "application/pdf": ["pdf"],
};

export function typeAutorise(nom: string, type: string): boolean {
  const ext = nom.toLowerCase().split(".").pop() || "";
  return Boolean(AUTORISES[type]?.includes(ext));
}

// Vérifie que le contenu correspond au type annoncé (les premiers octets ne mentent pas).
export function signatureConforme(type: string, d: Buffer): boolean {
  const hex = d.subarray(0, 12).toString("hex");
  const ascii = d.subarray(0, 12).toString("latin1");
  switch (type) {
    case "image/jpeg": return hex.startsWith("ffd8ff");
    case "image/png": return hex.startsWith("89504e470d0a1a0a");
    case "image/webp": return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
    case "application/pdf": return ascii.startsWith("%PDF");
    case "video/webm": return hex.startsWith("1a45dfa3");
    case "image/heic":
    case "video/mp4":
    case "video/quicktime": return ascii.slice(4, 8) === "ftyp";
    default: return false;
  }
}

type Reservation = { c: string; f: string; n: string; t: string; s: number; r: Role; e: number };
const secret = () => env.sessionSecret();
const hmac = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("base64url");

function signer(r: Reservation): string {
  const corps = Buffer.from(JSON.stringify(r)).toString("base64url");
  return `${corps}.${hmac(corps)}`;
}

export function lireReservation(jeton: string): Reservation | null {
  const [corps, sig] = String(jeton || "").split(".");
  if (!corps || !sig || secret().length < 32) return null;
  const attendu = hmac(corps);
  if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) return null;
  try {
    const r = JSON.parse(Buffer.from(corps, "base64url").toString("utf8")) as Reservation;
    return r.e > Date.now() / 1000 ? r : null;
  } catch {
    return null;
  }
}

export type Demande = { nom?: unknown; type?: unknown; taille?: unknown };

// Étape 1 : le serveur contrôle la demande et délivre une autorisation d'envoi signée.
export async function reserver(commande: string, role: Role, d: Demande): Promise<{ erreur: string; statut: number } | { jeton: string; url: string; direct: boolean }> {
  const nom = nomPropre(String(d.nom || ""));
  const type = String(d.type || "");
  const taille = Number(d.taille);
  if (secret().length < 32) return { erreur: "Dépôt de fichiers non configuré.", statut: 503 };
  if (!nom || !Number.isInteger(taille) || taille <= 0) return { erreur: "Fichier invalide.", statut: 400 };
  if (taille > TAILLE_MAX[role]) return { erreur: `Fichier trop volumineux (${TAILLE_MAX[role] / 1048576} Mo maximum).`, statut: 413 };
  if (!typeAutorise(nom, type)) return { erreur: "Format non accepté (images JPG/PNG/WebP/HEIC, vidéos MP4/MOV/WebM, PDF).", statut: 415 };
  const f = nouvelIdFichier();
  const jeton = signer({ c: commande, f, n: nom, t: type, s: taille, r: role, e: Math.floor(Date.now() / 1000) + 3600 });
  const direct = await depot().urlEnvoi(cleFichier(f), type);
  return { jeton, url: direct ?? `/api/depot/${f}?j=${encodeURIComponent(jeton)}`, direct: Boolean(direct) };
}

// Étape 2 (disque uniquement) : réception du fichier par le serveur.
export async function recevoir(id: string, jeton: string, corps: ReadableStream<Uint8Array> | null): Promise<{ erreur: string; statut: number } | { ok: true }> {
  const r = lireReservation(jeton);
  if (!r || r.f !== id) return { erreur: "Autorisation d'envoi invalide ou expirée.", statut: 403 };
  if (!corps) return { erreur: "Aucun contenu.", statut: 400 };
  if ((await depot().taille(cleFichier(id))) !== null) return { erreur: "Fichier déjà reçu.", statut: 409 };
  try {
    await depot().recevoir(cleFichier(id), Readable.fromWeb(corps as never), r.s);
  } catch (e) {
    return (e as Error).message === "TROP_GROS" ? { erreur: "Fichier plus gros qu'annoncé.", statut: 413 } : { erreur: "Réception interrompue.", statut: 500 };
  }
  return { ok: true };
}

// Étape 3 : le serveur contrôle ce qui a réellement été déposé avant de l'attacher à la commande.
export async function confirmer(jeton: string, commande: string, role: Role): Promise<{ erreur: string; statut: number } | { fichier: Fichier }> {
  const r = lireReservation(jeton);
  if (!r || r.c !== commande || r.r !== role) return { erreur: "Autorisation invalide ou expirée.", statut: 403 };
  const cle = cleFichier(r.f);
  const taille = await depot().taille(cle);
  if (taille === null) return { erreur: "Fichier non reçu.", statut: 409 };
  const debut = await depot().debut(cle, 16);
  if (taille !== r.s || taille > TAILLE_MAX[role] || !debut || !signatureConforme(r.t, debut)) {
    await depot().supprimer(cle);
    return { erreur: taille !== r.s ? "Le fichier reçu ne correspond pas à la taille annoncée." : "Le contenu du fichier ne correspond pas à son format.", statut: 415 };
  }
  return { fichier: { id: r.f, nom: r.n, taille, type: r.t, ajouteLe: maintenant() } };
}

// Téléchargement : toujours en pièce jointe, jamais affiché par le site.
export async function reponseFichier(cle: string, nom: string, taille?: number): Promise<Response> {
  const direct = await depot().urlLecture(cle, nom);
  if (direct) return new Response(null, { status: 302, headers: { Location: direct, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  const flux = await depot().flux(cle);
  if (!flux) return new Response("Introuvable", { status: 404 });
  return new Response(Readable.toWeb(flux) as ReadableStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      ...(taille ? { "Content-Length": String(taille) } : {}),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nom)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
