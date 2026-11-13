import { store } from "@/lib/store";
import { estAdmin, origineValide } from "@/lib/auth";
import { reserver } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 1 du dépôt d'un livrable par l'administrateur.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const c = await store.commande((await params).id);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  const r = await reserver(c.id, "livrable", await req.json().catch(() => ({})));
  return "erreur" in r ? Response.json({ erreur: r.erreur }, { status: r.statut }) : Response.json(r);
}
