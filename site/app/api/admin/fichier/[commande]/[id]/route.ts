import { store } from "@/lib/store";
import { estAdmin } from "@/lib/auth";
import { reponseFichier } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ commande: string; id: string }> }) {
  if (!(await estAdmin())) return new Response("Non autorisé", { status: 401 });
  const { commande, id } = await params;
  const c = await store.commande(commande);
  const f = c ? [...c.fichiersClient, ...c.livrables].find((x) => x.id === id) : undefined;
  return f ? reponseFichier(f) : new Response("Introuvable", { status: 404 });
}
