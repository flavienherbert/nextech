import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "introuvable" }, { status: 404 });
  return Response.json({ paiement: c.paiement.etat, statut: c.statut }, { headers: { "Cache-Control": "no-store" } });
}
