// Bibliothèque de publicités : fiches publicité (PUB-001…), avatars (présentateurs) et portfolio public.
// Toute la logique passe par ce module : lister, lire, créer, modifier, supprimer, publier, filtrer.
//
// Stockage (aucune table à créer : de simples préfixes de clés, comme le reste du site) :
//  - publicites/PUB-001.json   une fiche par publicité (document JSON, rangé en base quand DATABASE_URL est défini) ;
//  - avatars/femme-01.json     un document par avatar ;
//  - compteurs/publicites.json compteur des numéros (store.suivant : écriture conditionnelle, aucun doublon, aucun numéro réattribué) ;
//  - bibliotheque/<id>.<ext>   les fichiers (vidéos, miniatures, photos d'avatar). Dossier distinct de « medias/ » : le nettoyage
//                              quotidien de medias/ supprimerait ces fichiers (voir lib/purge.ts, purgerBibliotheque).
//
// Lecture : lireTous("publicites") relit toutes les fiches ; c'est suffisant pour quelques centaines de fiches.
// Au-delà d'environ 300 fiches, il faudra ajouter un document d'index (liste résumée des fiches) pour éviter de tout relire à chaque page.
//
// Règles de publication :
//  - seule une publicité « validée » qui a une vidéo peut être publiée ; si son statut change ou si sa vidéo est retirée, elle est dépubliée ;
//  - « à la une » n'est possible que pour une publicité publiée, et six au plus ;
//  - rien n'est public par défaut (publiee = false) ; aucun prompt, script, référence d'avatar ni statut n'est exposé au public (vuePublique).
import { revalidatePath } from "next/cache";
import { depot } from "./depot";
import { TYPE_PAR_EXTENSION, TYPES_MEDIA } from "./emplacements";
import { signatureConforme } from "./fichiers";
import { propre } from "./medias";
import { maintenant, store, type Fichier } from "./store";
import { cleBibliotheque, VERSION_BIBLIOTHEQUE } from "./bibliotheque-fichiers";

// ───────────────────────── Listes extensibles (une ligne pour en ajouter une) ─────────────────────────
export const CATEGORIES = ["Beauté", "Animaux", "Maison", "Sport", "Mode"] as const;
export const STYLES = ["UGC présentateur", "Unboxing", "Démonstration / application", "Course / sport en action", "Cinématique produit", "Autre"] as const;
export const FORMATS = ["9:16", "1:1", "4:5", "16:9"] as const;
export const STATUTS_PUB = [
  { id: "en_cours", nom: "En cours" },
  { id: "terminee", nom: "Terminée" },
  { id: "validee", nom: "Validée" },
  { id: "refusee", nom: "Refusée" },
] as const;
export type StatutPub = (typeof STATUTS_PUB)[number]["id"];
export const nomStatutPub = (s: string) => STATUTS_PUB.find((x) => x.id === s)?.nom ?? s;
export const GENRES_AVATAR = [
  { id: "femme", nom: "Femme" },
  { id: "homme", nom: "Homme" },
  { id: "autre", nom: "Autre" },
] as const;
export type GenreAvatar = (typeof GENRES_AVATAR)[number]["id"];

// Les quatre avatars créés au premier usage.
export const AVATARS_DE_BASE: { id: string; nom: string; genre: GenreAvatar }[] = [
  { id: "femme-01", nom: "Femme 01", genre: "femme" },
  { id: "femme-02", nom: "Femme 02", genre: "femme" },
  { id: "homme-01", nom: "Homme 01", genre: "homme" },
  { id: "homme-02", nom: "Homme 02", genre: "homme" },
];

export const MAX_A_LA_UNE = 6;
export const DUREE_MAX_PUB = 60;

export const LIMITES = { nom: 80, produit: 80, script: 2000, prompt: 8000, description: 1000, reference: 200, notes: 1000 } as const;

// ───────────────────────── Types ─────────────────────────
export type Publicite = {
  id: string;
  nom: string;
  produit: string;
  categorie: string;
  avatarId: string;
  style: string;
  dureeSecondes: number;
  format: string;
  script: string;
  prompt: string;
  video?: Fichier;
  miniature?: Fichier;
  creeLe: string;
  modifieLe: string;
  statut: StatutPub;
  publiee: boolean;
  aLaUne: boolean;
  ordre: number;
};

export type Avatar = {
  id: string;
  nom: string;
  genre: GenreAvatar;
  photo?: Fichier;
  description: string;
  reference: string;
  notes: string;
  creeLe: string;
  modifieLe: string;
};

export type Erreur = { erreur: string };
export const estErreur = (r: unknown): r is Erreur => Boolean(r && typeof r === "object" && "erreur" in r);

// ───────────────────────── Nettoyage des textes ─────────────────────────
// Texte sur une ligne : caractères de contrôle retirés, espaces réduits, longueur limitée (même règle que les médias du site).
export const texteCourt = propre;
// Texte long (script, prompt, notes) : les retours à la ligne sont conservés, les autres caractères de contrôle retirés, longueur limitée.
export function texteLong(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

// ───────────────────────── Identifiants et clés ─────────────────────────
export const ID_PUB = /^PUB-\d{3,6}$/;
export const ID_AVATAR = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const clePub = (id: string) => `publicites/${id}.json`;
const cleAvatar = (id: string) => `avatars/${id}.json`;
const numeroPub = (n: number) => `PUB-${String(n).padStart(3, "0")}`;

// « Mon bel avatar 3 » → « mon-bel-avatar-3 » (accents retirés).
export function identifiantDepuisNom(nom: string): string {
  return nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}

// ───────────────────────── Lecture tolérante des documents ─────────────────────────
// Un document ancien ou abîmé ne fait jamais planter une page : les champs manquants reçoivent une valeur par défaut.
function fichierDepuis(v: unknown): Fichier | undefined {
  if (!v || typeof v !== "object") return undefined;
  const f = v as Partial<Fichier>;
  if (typeof f.id !== "string" || !VERSION_BIBLIOTHEQUE.test(f.id)) return undefined;
  // Le type se déduit de l'extension : il ne peut pas être falsifié dans le document.
  return { id: f.id, nom: texteCourt(f.nom, 120), taille: Number(f.taille) || 0, type: TYPE_PAR_EXTENSION[f.id.split(".")[1]], ajouteLe: String(f.ajouteLe || "") };
}

const entier = (v: unknown, defaut: number, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};

export function publiciteDepuis(brut: unknown): Publicite | null {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return null;
  const j = brut as Record<string, unknown>;
  if (typeof j.id !== "string" || !ID_PUB.test(j.id)) return null;
  const statut = STATUTS_PUB.find((s) => s.id === j.statut)?.id ?? "en_cours";
  return {
    id: j.id,
    nom: texteCourt(j.nom, LIMITES.nom),
    produit: texteCourt(j.produit, LIMITES.produit),
    // Une catégorie ou un style retirés de la liste restent affichés tels quels : la fiche reste lisible.
    categorie: texteCourt(j.categorie, 60),
    avatarId: typeof j.avatarId === "string" && ID_AVATAR.test(j.avatarId) ? j.avatarId : "",
    style: texteCourt(j.style, 60),
    dureeSecondes: entier(j.dureeSecondes, 15, 1, DUREE_MAX_PUB),
    format: (FORMATS as readonly string[]).includes(String(j.format)) ? String(j.format) : "9:16",
    script: texteLong(j.script, LIMITES.script),
    prompt: texteLong(j.prompt, LIMITES.prompt),
    video: fichierDepuis(j.video),
    miniature: fichierDepuis(j.miniature),
    creeLe: String(j.creeLe || ""),
    modifieLe: String(j.modifieLe || j.creeLe || ""),
    statut,
    publiee: j.publiee === true,
    aLaUne: j.aLaUne === true,
    ordre: entier(j.ordre, 0, -100000, 100000),
  };
}

export function avatarDepuis(brut: unknown): Avatar | null {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return null;
  const j = brut as Record<string, unknown>;
  if (typeof j.id !== "string" || !ID_AVATAR.test(j.id)) return null;
  return {
    id: j.id,
    nom: texteCourt(j.nom, 60) || j.id,
    genre: GENRES_AVATAR.find((g) => g.id === j.genre)?.id ?? "autre",
    photo: fichierDepuis(j.photo),
    description: texteLong(j.description, LIMITES.description),
    reference: texteCourt(j.reference, LIMITES.reference),
    notes: texteLong(j.notes, LIMITES.notes),
    creeLe: String(j.creeLe || ""),
    modifieLe: String(j.modifieLe || j.creeLe || ""),
  };
}

// Règles qui découlent de l'état d'une fiche : appliquées à chaque écriture.
function appliquerRegles(p: Publicite) {
  if (!(p.statut === "validee" && p.video)) p.publiee = false; // dépubliée d'office si elle n'est plus validée ou n'a plus de vidéo
  if (!p.publiee) p.aLaUne = false;
}
export const estPubliee = (p: Publicite) => p.publiee && p.statut === "validee" && Boolean(p.video);

// ───────────────────────── Écriture avec nouvel essai en cas de conflit ─────────────────────────
// Même méthode que modifierRegistre (lib/medias.ts) : lecture, modification, écriture conditionnelle à la version lue.
async function modifierDocument<T>(cle: string, lire: (corps: unknown) => T | null, fn: (d: T) => Erreur | void, ecrireDoc: (d: T) => string): Promise<{ document: T } | Erreur> {
  for (let essai = 0; essai < 12; essai++) {
    const l = await depot().lire(cle);
    if (!l) return { erreur: "Fiche introuvable." };
    let d: T | null = null;
    try {
      d = lire(JSON.parse(l.corps.toString("utf8")));
    } catch {
      d = null;
    }
    if (!d) return { erreur: "Fiche illisible." };
    const refus = fn(d);
    if (refus) return refus;
    if (await depot().ecrire(cle, ecrireDoc(d), { siVersion: l.version })) return { document: d };
    await new Promise((ok) => setTimeout(ok, 30 * (essai + 1) + Math.random() * 40));
  }
  throw new Error(`Écriture concurrente non résolue (${cle}).`);
}

// Les pages publiques sont servies depuis un cache : on le renouvelle pour que le changement soit visible tout de suite.
function invalider() {
  try {
    revalidatePath("/");
    revalidatePath("/realisations");
  } catch {
    /* hors du serveur Next (tests unitaires) : rien à renouveler */
  }
}

const json = (d: unknown) => JSON.stringify(d, null, 2);

// ───────────────────────── Contrôle d'un fichier annoncé par un formulaire ─────────────────────────
// Un fichier n'est rattaché à une fiche que s'il existe réellement dans bibliotheque/, avec le bon genre et une signature conforme.
export async function verifierFichier(brut: unknown, genre: "image" | "video"): Promise<Fichier | Erreur> {
  const f = fichierDepuis(brut);
  if (!f || !f.type || TYPES_MEDIA[f.type]?.genre !== genre) return { erreur: genre === "video" ? "Fichier vidéo invalide." : "Fichier image invalide." };
  const cle = cleBibliotheque(f.id);
  const taille = await depot().taille(cle);
  if (taille === null) return { erreur: "Le fichier n'a pas été reçu : renvoyez-le." };
  const debut = await depot().debut(cle, 32);
  if (!debut || !signatureConforme(f.type, debut)) return { erreur: "Le contenu du fichier ne correspond pas à son format." };
  return { ...f, taille };
}

// ───────────────────────── Publicités ─────────────────────────
// Champs d'une fiche qui viennent d'un formulaire (une fois contrôlés).
type DonneesPub = Omit<Publicite, "id" | "video" | "miniature" | "creeLe" | "modifieLe" | "publiee" | "aLaUne">;

export type ChampsPub = {
  nom?: unknown; produit?: unknown; categorie?: unknown; avatarId?: unknown; style?: unknown; dureeSecondes?: unknown;
  format?: unknown; script?: unknown; prompt?: unknown; statut?: unknown; ordre?: unknown;
};

// Valide et nettoie les champs saisis. `actuelle` : la fiche existante (sa catégorie ou son style retirés de la liste restent acceptés).
async function controlerChamps(c: ChampsPub, actuelle?: Publicite): Promise<DonneesPub | Erreur> {
  const nom = texteCourt(c.nom, LIMITES.nom);
  if (!nom) return { erreur: "Le nom de la publicité est obligatoire." };
  const categorie = texteCourt(c.categorie, 60);
  if (categorie && !(CATEGORIES as readonly string[]).includes(categorie) && categorie !== actuelle?.categorie) return { erreur: "Catégorie inconnue." };
  const style = texteCourt(c.style, 60);
  if (style && !(STYLES as readonly string[]).includes(style) && style !== actuelle?.style) return { erreur: "Style inconnu." };
  const format = String(c.format ?? "");
  if (!(FORMATS as readonly string[]).includes(format)) return { erreur: "Format inconnu." };
  const statut = STATUTS_PUB.find((s) => s.id === c.statut)?.id;
  if (!statut) return { erreur: "Statut inconnu." };
  const duree = Number(c.dureeSecondes);
  if (!Number.isInteger(duree) || duree < 1 || duree > DUREE_MAX_PUB) return { erreur: `La durée doit être un nombre entier de secondes, de 1 à ${DUREE_MAX_PUB}.` };
  const avatarId = String(c.avatarId ?? "").trim();
  if (avatarId) {
    await assurerAvatarsDeBase(); // un avatar de base n'existe qu'après son premier usage
    if (!(await lireAvatar(avatarId))) return { erreur: "Avatar inconnu." };
  }
  const ordre = c.ordre === undefined || c.ordre === "" ? (actuelle?.ordre ?? 0) : Number(c.ordre);
  if (!Number.isInteger(ordre) || Math.abs(ordre) > 100000) return { erreur: "L'ordre doit être un nombre entier." };
  return {
    nom, produit: texteCourt(c.produit, LIMITES.produit), categorie, avatarId, style, dureeSecondes: duree, format,
    script: texteLong(c.script, LIMITES.script), prompt: texteLong(c.prompt, LIMITES.prompt), statut, ordre,
  };
}

export async function listerPublicites(): Promise<Publicite[]> {
  const liste: Publicite[] = [];
  for (const e of await depot().lireTous("publicites")) {
    if (!e.cle.endsWith(".json")) continue;
    let p: Publicite | null = null;
    try {
      p = publiciteDepuis(JSON.parse(e.corps.toString("utf8")));
    } catch {
      p = null;
    }
    if (p) liste.push(p);
    else console.error("[bibliotheque] fiche illisible, ignorée :", e.cle);
  }
  // Plus récentes d'abord (numéro décroissant en cas d'égalité).
  return liste.sort((a, b) => b.creeLe.localeCompare(a.creeLe) || Number(b.id.slice(4)) - Number(a.id.slice(4)));
}

export async function lirePublicite(id: string): Promise<Publicite | null> {
  if (!ID_PUB.test(id)) return null;
  const l = await depot().lire(clePub(id));
  if (!l) return null;
  try {
    return publiciteDepuis(JSON.parse(l.corps.toString("utf8")));
  } catch {
    return null;
  }
}

export async function creerPublicite(champs: ChampsPub, fichiers: { video?: unknown; miniature?: unknown } = {}): Promise<{ publicite: Publicite } | Erreur> {
  const c = await controlerChamps(champs);
  if (estErreur(c)) return c;
  const video = fichiers.video ? await verifierFichier(fichiers.video, "video") : undefined;
  if (video && estErreur(video)) return video;
  const miniature = fichiers.miniature ? await verifierFichier(fichiers.miniature, "image") : undefined;
  if (miniature && estErreur(miniature)) return miniature;
  return ajouterFiche(c, video, miniature);
}

// Attribue le numéro suivant (jamais réattribué) et crée la fiche. La création est conditionnelle : une fiche existante n'est jamais écrasée.
async function ajouterFiche(c: DonneesPub, video?: Fichier, miniature?: Fichier): Promise<{ publicite: Publicite } | Erreur> {
  for (let essai = 0; essai < 10; essai++) {
    const n = await store.suivant("publicites");
    const t = maintenant();
    const p: Publicite = { ...c, id: numeroPub(n), video, miniature, creeLe: t, modifieLe: t, publiee: false, aLaUne: false };
    appliquerRegles(p);
    if (await depot().ecrire(clePub(p.id), json(p), { siAbsent: true })) return { publicite: p };
    // Numéro déjà pris (compteur remis à zéro par une restauration) : on passe au suivant.
  }
  throw new Error("Numérotation des publicités : impossible d'obtenir un numéro libre.");
}

// Enregistre les champs d'une fiche. `fichiers` : undefined = inchangé, null = retiré, sinon le nouveau fichier.
export async function enregistrerPublicite(id: string, champs: ChampsPub, fichiers: { video?: unknown | null; miniature?: unknown | null } = {}): Promise<{ publicite: Publicite } | Erreur> {
  if (!ID_PUB.test(id)) return { erreur: "Publicité introuvable." };
  const actuelle = await lirePublicite(id);
  if (!actuelle) return { erreur: "Publicité introuvable." };
  const c = await controlerChamps(champs, actuelle);
  if (estErreur(c)) return c;
  let video: Fichier | null | undefined;
  if (fichiers.video === null) video = null;
  else if (fichiers.video !== undefined) {
    const v = await verifierFichier(fichiers.video, "video");
    if (estErreur(v)) return v;
    video = v;
  }
  let miniature: Fichier | null | undefined;
  if (fichiers.miniature === null) miniature = null;
  else if (fichiers.miniature !== undefined) {
    const m = await verifierFichier(fichiers.miniature, "image");
    if (estErreur(m)) return m;
    miniature = m;
  }
  const r = await modifierDocument(clePub(id), publiciteDepuis, (p) => {
    Object.assign(p, c);
    if (video === null) delete p.video; else if (video) p.video = video;
    if (miniature === null) delete p.miniature; else if (miniature) p.miniature = miniature;
    p.modifieLe = maintenant();
    appliquerRegles(p);
  }, json);
  if (estErreur(r)) return r;
  invalider();
  return { publicite: r.document };
}

export async function definirPublication(id: string, publiee: boolean): Promise<{ publicite: Publicite } | Erreur> {
  if (!ID_PUB.test(id)) return { erreur: "Publicité introuvable." };
  const r = await modifierDocument(clePub(id), publiciteDepuis, (p) => {
    if (publiee && !(p.statut === "validee" && p.video)) return { erreur: "Seule une publicité « Validée » qui a une vidéo peut être publiée." };
    p.publiee = publiee;
    p.modifieLe = maintenant();
    appliquerRegles(p);
  }, json);
  if (estErreur(r)) return r;
  invalider();
  return { publicite: r.document };
}

export async function definirALaUne(id: string, aLaUne: boolean): Promise<{ publicite: Publicite } | Erreur> {
  if (!ID_PUB.test(id)) return { erreur: "Publicité introuvable." };
  if (aLaUne) {
    const autres = (await listerPublicites()).filter((p) => p.aLaUne && p.id !== id).length;
    if (autres >= MAX_A_LA_UNE) return { erreur: `${MAX_A_LA_UNE} publicités à la une au maximum : retirez-en une avant d'en ajouter une autre.` };
  }
  const r = await modifierDocument(clePub(id), publiciteDepuis, (p) => {
    if (aLaUne && !p.publiee) return { erreur: "Seule une publicité publiée peut être mise à la une : publiez-la d'abord." };
    p.aLaUne = aLaUne;
    p.modifieLe = maintenant();
    appliquerRegles(p);
  }, json);
  if (estErreur(r)) return r;
  invalider();
  return { publicite: r.document };
}

// Nouvelle fiche avec un nouvel identifiant : mêmes champs, sans les fichiers, privée, en cours.
export async function dupliquerPublicite(id: string): Promise<{ publicite: Publicite } | Erreur> {
  const p = await lirePublicite(id);
  if (!p) return { erreur: "Publicité introuvable." };
  const copie: DonneesPub = {
    nom: texteCourt(`${p.nom} (copie)`, LIMITES.nom), produit: p.produit, categorie: p.categorie, avatarId: p.avatarId, style: p.style,
    dureeSecondes: p.dureeSecondes, format: p.format, script: p.script, prompt: p.prompt, statut: "en_cours", ordre: p.ordre,
  };
  return ajouterFiche(copie);
}

// Supprime la fiche. Son numéro n'est jamais réattribué ; ses fichiers sont effacés par le nettoyage quotidien après 24 heures.
export async function supprimerPublicite(id: string): Promise<boolean> {
  if (!ID_PUB.test(id)) return false;
  const p = await lirePublicite(id);
  await depot().supprimer(clePub(id));
  if (p?.publiee) invalider();
  return true;
}

// ───────────────────────── Filtres et compteurs ─────────────────────────
export type Filtres = { q?: string; categorie?: string; avatar?: string; style?: string; statut?: string; publiee?: string };

// Sans accents ni majuscules : « beaute » trouve « Beauté ».
const fond = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrerPublicites(liste: Publicite[], f: Filtres): Publicite[] {
  const q = fond((f.q || "").trim());
  return liste.filter((p) => {
    if (q && !fond(`${p.id} ${p.nom} ${p.produit} ${p.script}`).includes(q)) return false;
    if (f.categorie && p.categorie !== f.categorie) return false;
    if (f.avatar && p.avatarId !== (f.avatar === "aucun" ? "" : f.avatar)) return false;
    if (f.style && p.style !== f.style) return false;
    if (f.statut && p.statut !== f.statut) return false;
    if (f.publiee === "oui" && !p.publiee) return false;
    if (f.publiee === "non" && p.publiee) return false;
    return true;
  });
}

export function compterPublicites(liste: Publicite[]) {
  const parStatut = Object.fromEntries(STATUTS_PUB.map((s) => [s.id, liste.filter((p) => p.statut === s.id).length])) as Record<StatutPub, number>;
  return { total: liste.length, parStatut, publiees: liste.filter((p) => p.publiee).length, aLaUne: liste.filter((p) => p.aLaUne).length };
}

// ───────────────────────── Avatars ─────────────────────────
// Les quatre avatars de base sont créés au premier usage, sans jamais écraser un avatar existant. Un repère est ensuite enregistré :
// un avatar de base supprimé par le vendeur n'est pas recréé.
const CLE_AMORCE = "systeme/avatars-initialises.json";
async function assurerAvatarsDeBase(): Promise<void> {
  if (await depot().lire(CLE_AMORCE)) return;
  const t = maintenant();
  for (const a of AVATARS_DE_BASE) {
    await depot().ecrire(cleAvatar(a.id), json({ ...a, description: "", reference: "", notes: "", creeLe: t, modifieLe: t }), { siAbsent: true });
  }
  await depot().ecrire(CLE_AMORCE, json({ le: t }), { siAbsent: true });
}

export async function listerAvatars(): Promise<Avatar[]> {
  await assurerAvatarsDeBase();
  const liste: Avatar[] = [];
  for (const e of await depot().lireTous("avatars")) {
    if (!e.cle.endsWith(".json")) continue;
    let a: Avatar | null = null;
    try {
      a = avatarDepuis(JSON.parse(e.corps.toString("utf8")));
    } catch {
      a = null;
    }
    if (a) liste.push(a);
    else console.error("[bibliotheque] avatar illisible, ignoré :", e.cle);
  }
  // Les avatars de base d'abord (dans leur ordre), puis les autres par date de création.
  const rang = (a: Avatar) => AVATARS_DE_BASE.findIndex((b) => b.id === a.id);
  return liste.sort((a, b) => (rang(a) < 0 ? 99 : rang(a)) - (rang(b) < 0 ? 99 : rang(b)) || a.creeLe.localeCompare(b.creeLe));
}

export async function lireAvatar(id: string): Promise<Avatar | null> {
  if (!ID_AVATAR.test(id)) return null;
  const l = await depot().lire(cleAvatar(id));
  if (!l) return null;
  try {
    return avatarDepuis(JSON.parse(l.corps.toString("utf8")));
  } catch {
    return null;
  }
}

export type ChampsAvatar = { id?: unknown; nom?: unknown; genre?: unknown; description?: unknown; reference?: unknown; notes?: unknown };

function controlerAvatar(c: ChampsAvatar): Pick<Avatar, "nom" | "genre" | "description" | "reference" | "notes"> | Erreur {
  const nom = texteCourt(c.nom, 60);
  if (!nom) return { erreur: "Le nom de l'avatar est obligatoire." };
  const genre = GENRES_AVATAR.find((g) => g.id === c.genre)?.id;
  if (!genre) return { erreur: "Genre inconnu." };
  return { nom, genre, description: texteLong(c.description, LIMITES.description), reference: texteCourt(c.reference, LIMITES.reference), notes: texteLong(c.notes, LIMITES.notes) };
}

export async function creerAvatar(champs: ChampsAvatar, photo?: unknown): Promise<{ avatar: Avatar } | Erreur> {
  await assurerAvatarsDeBase();
  const c = controlerAvatar(champs);
  if (estErreur(c)) return c;
  const id = String(champs.id ?? "").trim() || identifiantDepuisNom(c.nom);
  if (!id || id.length > 40 || !ID_AVATAR.test(id)) return { erreur: "Identifiant invalide : minuscules, chiffres et tirets seulement (40 caractères au plus)." };
  const p = photo ? await verifierFichier(photo, "image") : undefined;
  if (p && estErreur(p)) return p;
  const t = maintenant();
  const a: Avatar = { id, ...c, photo: p, creeLe: t, modifieLe: t };
  if (!(await depot().ecrire(cleAvatar(id), json(a), { siAbsent: true }))) return { erreur: "Un avatar porte déjà cet identifiant." };
  return { avatar: a };
}

export async function modifierAvatar(id: string, champs: ChampsAvatar, photo?: unknown | null): Promise<{ avatar: Avatar } | Erreur> {
  if (!ID_AVATAR.test(id)) return { erreur: "Avatar introuvable." };
  const c = controlerAvatar(champs);
  if (estErreur(c)) return c;
  let nouvelle: Fichier | null | undefined;
  if (photo === null) nouvelle = null;
  else if (photo !== undefined) {
    const f = await verifierFichier(photo, "image");
    if (estErreur(f)) return f;
    nouvelle = f;
  }
  const r = await modifierDocument(cleAvatar(id), avatarDepuis, (a) => {
    Object.assign(a, c);
    if (nouvelle === null) delete a.photo; else if (nouvelle) a.photo = nouvelle;
    a.modifieLe = maintenant();
  }, json);
  return estErreur(r) ? r : { avatar: r.document };
}

export async function publicitesLiees(avatarId: string): Promise<Publicite[]> {
  return (await listerPublicites()).filter((p) => p.avatarId === avatarId);
}

// Un avatar lié à au moins une publicité ne peut pas être supprimé : la liste des publicités concernées est renvoyée.
export async function supprimerAvatar(id: string): Promise<{ ok: true } | (Erreur & { liees?: Publicite[] })> {
  if (!ID_AVATAR.test(id) || !(await lireAvatar(id))) return { erreur: "Avatar introuvable." };
  const liees = await publicitesLiees(id);
  if (liees.length) return { erreur: `Cet avatar est utilisé par ${liees.length} publicité${liees.length > 1 ? "s" : ""} : changez leur avatar avant de le supprimer.`, liees };
  await depot().supprimer(cleAvatar(id));
  return { ok: true };
}

// ───────────────────────── Fichiers référencés (nettoyage) ─────────────────────────
// Identifiants des fichiers de bibliotheque/ encore utilisés par une fiche (publicité ou avatar).
// Si une seule fiche est illisible, on s'arrête avec une erreur : ses fichiers sembleraient inutilisés et seraient supprimés à tort.
export async function fichiersReferences(): Promise<Set<string>> {
  const ids = new Set<string>();
  const lire = (cle: string, corps: Buffer): Record<string, unknown> => {
    let j: unknown;
    try {
      j = JSON.parse(corps.toString("utf8"));
    } catch {
      throw new Error(`fiche illisible : ${cle}`);
    }
    if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error(`fiche illisible : ${cle}`);
    return j as Record<string, unknown>;
  };
  const ajouter = (v: unknown) => {
    const id = (v as { id?: unknown } | undefined)?.id;
    if (typeof id === "string") ids.add(id);
  };
  for (const e of await depot().lireTous("publicites")) {
    if (!e.cle.endsWith(".json")) continue;
    const j = lire(e.cle, e.corps);
    ajouter(j.video);
    ajouter(j.miniature);
  }
  for (const e of await depot().lireTous("avatars")) {
    if (!e.cle.endsWith(".json")) continue;
    ajouter(lire(e.cle, e.corps).photo);
  }
  return ids;
}

// ───────────────────────── Portfolio public ─────────────────────────
// Seules ces données quittent le serveur vers les pages publiques : ni prompt, ni script, ni avatar, ni statut.
export type VuePublique = {
  id: string;
  nom: string;
  categorie: string;
  style: string;
  dureeSecondes: number;
  format: string;
  video: string;
  affiche?: string;
};

// Adresse publique d'un fichier : « /b/<fichier>?p=<publicité> ». Le numéro de la publicité permet de ne relire qu'une fiche par requête.
export const adressePublique = (pubId: string, f: Fichier) => `/b/${f.id}?p=${pubId}`;

export function vuePublique(p: Publicite): VuePublique {
  return {
    id: p.id,
    nom: p.nom,
    categorie: p.categorie,
    style: p.style,
    dureeSecondes: p.dureeSecondes,
    format: p.format,
    video: adressePublique(p.id, p.video!),
    affiche: p.miniature ? adressePublique(p.id, p.miniature) : undefined,
  };
}

// Portfolio : publicités publiées, triées par ordre puis par date (plus récentes d'abord).
export function trierPortfolio(liste: Publicite[]): Publicite[] {
  return liste.filter(estPubliee).sort((a, b) => a.ordre - b.ordre || b.creeLe.localeCompare(a.creeLe) || Number(b.id.slice(4)) - Number(a.id.slice(4)));
}

export type Portfolio = { publiees: VuePublique[]; categories: string[]; styles: string[] };

export async function chargerPortfolio(): Promise<Portfolio> {
  const triees = trierPortfolio(await listerPublicites());
  const distincts = (champ: "categorie" | "style") => [...new Set(triees.map((p) => p[champ]).filter(Boolean))];
  return { publiees: triees.map(vuePublique), categories: distincts("categorie"), styles: distincts("style") };
}

// Page d'accueil : publicités « à la une » (six au plus, par ordre) et nombre de publicités publiées (pour le menu).
// Si la bibliothèque est illisible, la page d'accueil s'affiche quand même avec ses emplacements habituels ; l'erreur est journalisée.
export async function chargerVitrine(): Promise<{ aLaUne: VuePublique[]; nbPubliees: number }> {
  try {
    const triees = trierPortfolio(await listerPublicites());
    return { aLaUne: triees.filter((p) => p.aLaUne).slice(0, MAX_A_LA_UNE).map(vuePublique), nbPubliees: triees.length };
  } catch (e) {
    console.error("[bibliotheque] illisible, accueil affiché sans elle :", (e as Error).message);
    return { aLaUne: [], nbPubliees: 0 };
  }
}

// Fichier à servir publiquement : seulement la vidéo ou la miniature d'une publicité publiée. Sinon null (la route répond 404 sans dire pourquoi).
export async function fichierPublic(version: string, pubId: string): Promise<{ cle: string; type: string; genre: "image" | "video" } | null> {
  if (!VERSION_BIBLIOTHEQUE.test(version) || !ID_PUB.test(pubId)) return null;
  const p = await lirePublicite(pubId);
  if (!p || !estPubliee(p)) return null;
  const f = [p.video, p.miniature].find((x) => x?.id === version);
  if (!f?.type) return null;
  return { cle: cleBibliotheque(version), type: f.type, genre: TYPES_MEDIA[f.type].genre };
}
