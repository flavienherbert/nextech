import { store } from "@/lib/store";
import { enregistrerBrief, validerBrief } from "@/lib/commandes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  if (c.paiement.etat !== "paye") return Response.json({ erreur: "Paiement non confirmé." }, { status: 403 });
  if (c.brief) return Response.json({ erreur: "Le brief a déjà été transmis." }, { status: 409 });
  let donnees: Record<string, unknown>;
  try {
    donnees = await req.json();
  } catch {
    return Response.json({ erreur: "Données illisibles." }, { status: 400 });
  }
  const { brief, erreurs } = validerBrief(donnees);
  if (!brief) return Response.json({ erreur: "Certains champs sont à corriger.", erreurs }, { status: 422 });
  await enregistrerBrief(c, brief);
  return Response.json({ ok: true });
}
