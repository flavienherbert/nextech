import { cleFichier, store } from "@/lib/store";
import { reponseFichier } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Téléchargement privé d'un livrable : il faut le lien secret de la commande,
// et la commande doit être en validation ou livrée.
export async function GET(_: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const c = await store.commandeParToken(token);
  if (!c || !["attente_validation", "livree"].includes(c.statut)) return new Response("Introuvable", { status: 404 });
  const f = c.livrables.find((x) => x.id === id);
  return f ? reponseFichier(cleFichier(f.id), f.nom, f.taille) : new Response("Introuvable", { status: 404 });
}
