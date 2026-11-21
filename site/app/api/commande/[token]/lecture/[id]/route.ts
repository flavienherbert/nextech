import { cleFichier, store } from "@/lib/store";
import { introuvable, reponseLecture } from "@/lib/diffusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lecture d'une vidéo livrée DANS la page du client (téléphone compris), sans téléchargement : mêmes conditions d'accès que le
// téléchargement (lien secret de la commande, commande en validation ou livrée), uniquement pour les fichiers vidéo.
export async function GET(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const c = await store.commandeParToken(token);
  if (!c || !["attente_validation", "livree"].includes(c.statut)) return introuvable("private, no-store");
  const f = c.livrables.find((x) => x.id === id);
  if (!f || !/^video\/(mp4|webm|quicktime)$/.test(f.type)) return introuvable("private, no-store");
  const prive = { "Cache-Control": "private, no-store" };
  return reponseLecture(req, cleFichier(f.id), f.type, { redirection: prive, flux: { ...prive, "X-Content-Type-Options": "nosniff" } });
}
