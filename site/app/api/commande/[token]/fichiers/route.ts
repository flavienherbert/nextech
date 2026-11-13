import { store } from "@/lib/store";
import { NB_MAX_CLIENT, reserver } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 1 du dépôt d'un fichier de référence : demande d'autorisation d'envoi.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  if (c.paiement.etat !== "paye") return Response.json({ erreur: "Paiement non confirmé." }, { status: 403 });
  if (c.brief) return Response.json({ erreur: "Le brief a déjà été transmis." }, { status: 409 });
  if (c.fichiersClient.length >= NB_MAX_CLIENT) return Response.json({ erreur: `${NB_MAX_CLIENT} fichiers maximum.` }, { status: 409 });
  const r = await reserver(c.id, "client", await req.json().catch(() => ({})));
  return "erreur" in r ? Response.json({ erreur: r.erreur }, { status: r.statut }) : Response.json(r);
}

// Retrait d'un fichier avant l'envoi du brief.
export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!c || c.brief) return Response.json({ erreur: "Impossible." }, { status: 409 });
  let retire = false;
  await store.modifier(c.id, (cmd) => {
    const avant = cmd.fichiersClient.length;
    cmd.fichiersClient = cmd.fichiersClient.filter((f) => f.id !== id);
    retire = cmd.fichiersClient.length < avant;
    return retire ? undefined : false;
  });
  if (retire) await store.supprimerFichier(id);
  return Response.json({ ok: retire });
}
