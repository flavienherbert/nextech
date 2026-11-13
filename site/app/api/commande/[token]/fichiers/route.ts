import { store, journal } from "@/lib/store";
import { lireFichierEnvoye, NB_MAX_CLIENT } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dépôt d'un fichier de référence par le client (un fichier par requête).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  if (c.paiement.etat !== "paye") return Response.json({ erreur: "Paiement non confirmé." }, { status: 403 });
  if (c.brief) return Response.json({ erreur: "Le brief a déjà été transmis." }, { status: 409 });
  if (c.fichiersClient.length >= NB_MAX_CLIENT) return Response.json({ erreur: `${NB_MAX_CLIENT} fichiers maximum.` }, { status: 409 });
  const lu = await lireFichierEnvoye(req);
  if ("erreur" in lu) return Response.json({ erreur: lu.erreur }, { status: lu.statut });
  const fichier = await store.enregistrerFichier(lu.contenu, lu.nom, lu.type);
  let accepte = false;
  await store.modifier(c.id, (cmd) => {
    if (cmd.brief || cmd.fichiersClient.length >= NB_MAX_CLIENT) return false;
    accepte = true;
    cmd.fichiersClient.push(fichier);
    journal(cmd, `Fichier reçu du client : ${fichier.nom}.`);
  });
  if (!accepte) {
    await store.supprimerFichier(fichier.id);
    return Response.json({ erreur: "Fichier refusé." }, { status: 409 });
  }
  return Response.json({ id: fichier.id, nom: fichier.nom, taille: fichier.taille });
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
