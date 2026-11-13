import { store } from "@/lib/store";
import { reponseFichier } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  // Un spécimen n'est jamais remis au client.
  if (!c?.facture || c.facture.specimen) return new Response("Introuvable", { status: 404 });
  return reponseFichier(c.facture.cle, `Facture-${c.facture.numero}.pdf`);
}
