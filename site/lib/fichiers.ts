// Fichiers privés : dépôt en deux temps (réservation signée, envoi, confirmation) et téléchargement.
// Le même parcours sert au disque local et au stockage objet ; seul le lien d'envoi change.
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { depot } from "./depot";
import { cleDerivee } from "./cles";
import { env } from "./env";
import { cleMedia, emplacement, TYPES_MEDIA, typeAccepteSurEmplacement } from "./emplacements";
import { cleFichier, maintenant, nomPropre, nouvelIdFichier, type Fichier } from "./store";

export const NB_MAX_CLIENT = 6;
// Limite des vidéos livrées : 50 Mo, plafond de l'offre gratuite de Supabase Storage (page officielle des tarifs).
// Pour la relever (offre payante), définir LIVRABLE_MAX_MO.
export const LIVRABLE_MAX_MO = Math.max(1, Number(process.env.LIVRABLE_MAX_MO) || 50);
// « media » : images et vidéos du site (Administration → Médias) ; la limite exacte dépend de l'emplacement (lib/emplacements.ts).
export const TAILLE_MAX = { client: 40 * 1024 * 1024, livrable: LIVRABLE_MAX_MO * 1024 * 1024, media: 40 * 1024 * 1024 } as const;
export type Role = keyof typeof TAILLE_MAX;

const AUTORISES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "image/heic": ["heic"],
  "video/mp4": ["mp4"], "video/quicktime": ["mov"], "video/webm": ["webm"], "application/pdf": ["pdf"],
};

export function typeAutorise(nom: string, type: string): boolean {
  const ext = nom.toLowerCase().split(".").pop() || "";
  return Boolean(AUTORISES[type]?.includes(ext));
}

// Marques (« major brand ») admises dans l'en-tête ftyp des vidéos et images HEIC.
const MARQUES_MP4 = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso7", "mp41", "mp42", "mp71", "avc1", "M4V ", "M4VH", "M4VP", "dash", "cmfc", "3gp4", "3gp5", "3gp6", "3g2a", "f4v ", "MSNV", "NDSC", "NDSH", "NDSM", "NDSP", "NDSS", "NDXC", "NDXH", "NDXM", "NDXP", "NDXS"]);
const MARQUES_MOV = new Set(["qt  ", ...MARQUES_MP4]);
const MARQUES_HEIC = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

// En-tête ftyp d'un conteneur ISO : taille plausible, mot « ftyp » à l'octet 4, marque connue à l'octet 8.
function ftypConforme(d: Buffer, marques: Set<string>): boolean {
  if (d.length < 12 || d.subarray(4, 8).toString("latin1") !== "ftyp") return false;
  const taille = d.readUInt32BE(0);
  return (taille === 1 || (taille >= 16 && taille <= 4096) || taille === 12) && marques.has(d.subarray(8, 12).toString("latin1"));
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
    case "image/heic": return ftypConforme(d, MARQUES_HEIC);
    case "video/mp4": return ftypConforme(d, MARQUES_MP4);
    case "video/quicktime": return ftypConforme(d, MARQUES_MOV);
    default: return false;
  }
}

// `c` : numéro de commande, ou (rôle « media ») identifiant de l'emplacement du site.
type Reservation = { c: string; f: string; n: string; t: string; s: number; r: Role; e: number };
// Clé de stockage d'une réservation : un média du site porte l'extension de son type (la route publique en déduit le type).
const cleDe = (r: Pick<Reservation, "f" | "r" | "t">) => (r.r === "media" ? cleMedia(`${r.f}.${TYPES_MEDIA[r.t]?.ext}`) : cleFichier(r.f));
const secret = () => env.sessionSecret();
const hmac = (v: string) => crypto.createHmac("sha256", cleDerivee("depot-fichiers")).update(v).digest("base64url");

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
  if (role === "media") {
    // Un média du site : seuls les emplacements du catalogue existent, avec leur type et leur poids.
    const e = emplacement(commande);
    if (!e) return { erreur: "Emplacement inconnu.", statut: 404 };
    if (!TYPES_MEDIA[type] || !typeAutorise(nom, type) || !typeAccepteSurEmplacement(e, type)) {
      return { erreur: e.genre === "video" ? "Format non accepté : cet emplacement attend une vidéo MP4 ou WebM." : "Format non accepté : cet emplacement attend une image JPG, PNG ou WebP.", statut: 415 };
    }
    if (taille > e.maxMo * 1048576) return { erreur: `Fichier trop volumineux (${e.maxMo} Mo maximum pour cet emplacement).`, statut: 413 };
  }
  if (taille > TAILLE_MAX[role]) return { erreur: `Fichier trop volumineux (${TAILLE_MAX[role] / 1048576} Mo maximum).`, statut: 413 };
  if (!typeAutorise(nom, type)) return { erreur: "Format non accepté (images JPG/PNG/WebP/HEIC, vidéos MP4/MOV/WebM, PDF).", statut: 415 };
  const f = nouvelIdFichier();
  const jeton = signer({ c: commande, f, n: nom, t: type, s: taille, r: role, e: Math.floor(Date.now() / 1000) + 3600 });
  const direct = await depot().urlEnvoi(cleDe({ f, r: role, t: type }), type);
  return { jeton, url: direct ?? `/api/depot/${f}?j=${encodeURIComponent(jeton)}`, direct: Boolean(direct) };
}

// Étape 2 (disque uniquement) : réception du fichier par le serveur.
export async function recevoir(id: string, jeton: string, corps: ReadableStream<Uint8Array> | null): Promise<{ erreur: string; statut: number } | { ok: true }> {
  const r = lireReservation(jeton);
  if (!r || r.f !== id) return { erreur: "Autorisation d'envoi invalide ou expirée.", statut: 403 };
  if (!corps) return { erreur: "Aucun contenu.", statut: 400 };
  const cle = cleDe(r);
  if ((await depot().taille(cle)) !== null) return { erreur: "Fichier déjà reçu.", statut: 409 };
  try {
    await depot().recevoir(cle, Readable.fromWeb(corps as never), r.s);
  } catch (e) {
    return (e as Error).message === "TROP_GROS" ? { erreur: "Fichier plus gros qu'annoncé.", statut: 413 } : { erreur: "Réception interrompue.", statut: 500 };
  }
  return { ok: true };
}

// Étape 3 : le serveur contrôle ce qui a réellement été déposé avant de l'attacher à la commande.
export async function confirmer(jeton: string, commande: string, role: Role): Promise<{ erreur: string; statut: number } | { fichier: Fichier }> {
  const r = lireReservation(jeton);
  if (!r || r.c !== commande || r.r !== role) return { erreur: "Autorisation invalide ou expirée.", statut: 403 };
  const cle = cleDe(r);
  const taille = await depot().taille(cle);
  if (taille === null) return { erreur: "Fichier non reçu.", statut: 409 };
  const debut = await depot().debut(cle, 32);
  if (taille !== r.s || taille > TAILLE_MAX[role] || !debut || !signatureConforme(r.t, debut)) {
    await depot().supprimer(cle);
    return { erreur: taille !== r.s ? "Le fichier reçu ne correspond pas à la taille annoncée." : "Le contenu du fichier ne correspond pas à son format.", statut: 415 };
  }
  // Le stockage a enregistré le type envoyé par le navigateur : s'il diffère de celui annoncé (hors type générique), on refuse.
  const stocke = ((await depot().typeStocke(cle)) || "").split(";")[0].trim().toLowerCase();
  if (stocke && stocke !== r.t && stocke !== "application/octet-stream" && stocke !== "binary/octet-stream") {
    await depot().supprimer(cle);
    return { erreur: "Le type du fichier envoyé ne correspond pas à celui annoncé.", statut: 415 };
  }
  // Pour un média du site, l'identifiant est la « version » (identifiant + extension) qui compose l'adresse publique.
  return { fichier: { id: role === "media" ? `${r.f}.${TYPES_MEDIA[r.t].ext}` : r.f, nom: r.n, taille, type: r.t, ajouteLe: maintenant() } };
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
