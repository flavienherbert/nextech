import { Readable } from "node:stream";
import { store, type Fichier } from "./store";

export const TAILLE_MAX = 40 * 1024 * 1024; // 40 Mo par fichier
export const NB_MAX_CLIENT = 6;

const AUTORISES: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "image/heic": ["heic"],
  "video/mp4": ["mp4"], "video/quicktime": ["mov"], "video/webm": ["webm"], "application/pdf": ["pdf"],
};

export function typeAutorise(nom: string, type: string): boolean {
  const ext = nom.toLowerCase().split(".").pop() || "";
  return Boolean(AUTORISES[type]?.includes(ext));
}

// Les fichiers sont toujours servis en téléchargement, jamais affichés par le site.
export function reponseFichier(f: Fichier): Response {
  const flux = store.fluxFichier(f.id);
  if (!flux) return new Response("Introuvable", { status: 404 });
  return new Response(Readable.toWeb(flux) as ReadableStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(f.taille),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function lireFichierEnvoye(req: Request): Promise<{ contenu: Buffer; nom: string; type: string } | { erreur: string; statut: number }> {
  const longueur = Number(req.headers.get("content-length") || 0);
  if (longueur > TAILLE_MAX + 1024 * 1024) return { erreur: "Fichier trop volumineux (40 Mo maximum).", statut: 413 };
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { erreur: "Envoi illisible.", statut: 400 };
  }
  const f = form.get("fichier");
  if (!(f instanceof File)) return { erreur: "Aucun fichier reçu.", statut: 400 };
  if (f.size === 0) return { erreur: "Fichier vide.", statut: 400 };
  if (f.size > TAILLE_MAX) return { erreur: "Fichier trop volumineux (40 Mo maximum).", statut: 413 };
  if (!typeAutorise(f.name, f.type)) return { erreur: "Format non accepté (images JPG/PNG/WebP/HEIC, vidéos MP4/MOV/WebM, PDF).", statut: 415 };
  return { contenu: Buffer.from(await f.arrayBuffer()), nom: f.name, type: f.type };
}
