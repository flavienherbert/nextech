import { recevoir } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Réception d'un fichier par le serveur (stockage sur disque). L'autorisation signée,
// délivrée à l'étape précédente, tient lieu d'authentification.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await recevoir((await params).id, new URL(req.url).searchParams.get("j") || "", req.body);
  return "erreur" in r ? Response.json({ erreur: r.erreur }, { status: r.statut }) : Response.json({ ok: true });
}
