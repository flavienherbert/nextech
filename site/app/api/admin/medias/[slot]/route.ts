import { estAdmin, origineValide } from "@/lib/auth";
import { emplacement } from "@/lib/emplacements";
import { reserver } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 1 de l'envoi d'une image ou d'une vidéo du site (Administration → Médias).
export async function POST(req: Request, { params }: { params: Promise<{ slot: string }> }) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const { slot } = await params;
  if (!emplacement(slot)) return Response.json({ erreur: "Emplacement inconnu." }, { status: 404 });
  const r = await reserver(slot, "media", await req.json().catch(() => ({})));
  return "erreur" in r ? Response.json({ erreur: r.erreur }, { status: r.statut }) : Response.json(r);
}
