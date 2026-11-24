// Médias du site (images et vidéos remplaçables depuis Administration → Médias).
// Le registre « emplacement → fichier envoyé » est un petit document JSON (reglages/medias.json, rangé en base
// comme les autres documents) ; les fichiers eux-mêmes sont dans le stockage, sous medias/<identifiant>.<extension>.
// Tant qu'un emplacement n'a pas de fichier envoyé, le site utilise l'image d'origine (dossier public/media).
import { revalidatePath } from "next/cache";
import { depot } from "./depot";
import { emplacement } from "./emplacements";
import type { Fichier } from "./store";

const CLE = "reglages/medias.json";

export type Media = { id: string; nom: string; type: string; taille: number; ajouteLe: string };
export type Texte = { titre: string; legende: string };
type Registre = { medias: Record<string, Media>; textes: Record<string, Texte> };

const vide = (): Registre => ({ medias: {}, textes: {} });

function lire(corps: Buffer): Registre {
  try {
    const j = JSON.parse(corps.toString("utf8")) as Partial<Registre>;
    // Seuls les emplacements connus sont conservés : un registre abîmé ou ancien ne peut rien afficher d'inattendu.
    const r = vide();
    for (const [slot, m] of Object.entries(j.medias || {})) {
      if (emplacement(slot) && m && typeof m.id === "string" && typeof m.type === "string") r.medias[slot] = m;
    }
    for (const [slot, t] of Object.entries(j.textes || {})) {
      if (emplacement(slot) && t) r.textes[slot] = { titre: String(t.titre || ""), legende: String(t.legende || "") };
    }
    return r;
  } catch {
    return vide();
  }
}

export type Medias = {
  // Adresse à utiliser dans la page : le fichier envoyé, sinon l'image d'origine, sinon null.
  url(slot: string): string | null;
  // Le fichier envoyé pour cet emplacement, s'il y en a un.
  envoye(slot: string): Media | undefined;
  texte(slot: string): Texte;
};

export const adresseMedia = (slot: string, m: Pick<Media, "id">) => `/m/${slot}?v=${m.id}`;

function vers(r: Registre): Medias {
  return {
    url: (slot) => (r.medias[slot] ? adresseMedia(slot, r.medias[slot]) : emplacement(slot)?.defaut ?? null),
    envoye: (slot) => r.medias[slot],
    texte: (slot) => r.textes[slot] ?? { titre: "", legende: "" },
  };
}

// Lecture pour la page d'accueil, l'administration et la route publique.
// Si le stockage est momentanément injoignable, le site reste affiché avec les images d'origine (l'erreur est journalisée).
export async function chargerMedias(): Promise<Medias> {
  try {
    const l = await depot().lire(CLE);
    return vers(l ? lire(l.corps) : vide());
  } catch (e) {
    console.error("[medias] registre illisible, images d'origine utilisées :", (e as Error).message);
    return vers(vide());
  }
}

async function modifierRegistre(fn: (r: Registre) => void): Promise<void> {
  for (let essai = 0; essai < 8; essai++) {
    const l = await depot().lire(CLE);
    const r = l ? lire(l.corps) : vide();
    fn(r);
    if (await depot().ecrire(CLE, JSON.stringify(r, null, 2), l ? { siVersion: l.version } : { siAbsent: true })) return;
    await new Promise((ok) => setTimeout(ok, 40 * (essai + 1)));
  }
  throw new Error("Registre des médias : écriture concurrente non résolue.");
}

// Les pages publiques sont servies depuis un cache : on le renouvelle pour que le changement soit visible tout de suite.
function invalider() {
  try {
    revalidatePath("/", "layout");
  } catch {
    /* hors du serveur Next (tests unitaires) : rien à renouveler */
  }
}

// Associe un fichier déjà reçu et contrôlé à un emplacement. L'ancien fichier reste quelques heures en stockage
// (les pages en cache peuvent encore y renvoyer) ; le nettoyage périodique le supprime ensuite.
export async function definirMedia(slot: string, f: Fichier): Promise<boolean> {
  if (!emplacement(slot)) return false;
  await modifierRegistre((r) => {
    r.medias[slot] = { id: f.id, nom: f.nom, type: f.type, taille: f.taille, ajouteLe: f.ajouteLe };
  });
  invalider();
  return true;
}

// Retour à l'image d'origine.
export async function retirerMedia(slot: string): Promise<boolean> {
  if (!emplacement(slot)) return false;
  await modifierRegistre((r) => {
    delete r.medias[slot];
  });
  invalider();
  return true;
}

// Titre et légende d'un exemple vidéo (texte brut, longueur limitée).
export const propre = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export async function definirTexte(slot: string, titre: unknown, legende: unknown): Promise<boolean> {
  if (!emplacement(slot)?.id.startsWith("exemple-") || emplacement(slot)?.genre !== "video") return false;
  const t = { titre: propre(titre, 60), legende: propre(legende, 160) };
  await modifierRegistre((r) => {
    if (t.titre || t.legende) r.textes[slot] = t;
    else delete r.textes[slot];
  });
  invalider();
  return true;
}

// Versions encore référencées par le registre (pour le nettoyage des fichiers abandonnés).
export async function versionsReferencees(): Promise<Set<string>> {
  const l = await depot().lire(CLE);
  return new Set(Object.values(l ? lire(l.corps).medias : {}).map((m) => m.id));
}
