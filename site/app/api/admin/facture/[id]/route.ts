import { store } from "@/lib/store";
import { estAdmin } from "@/lib/auth";
import { reponseFichier } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return new Response("Non autorisé", { status: 401 });
  const c = await store.commande((await params).id);
  if (!c?.facture) return new Response("Introuvable", { status: 404 });
  return reponseFichier(c.facture.cle, `Facture-${c.facture.numero}.pdf`);
}
