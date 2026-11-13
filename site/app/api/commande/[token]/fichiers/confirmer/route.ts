import { store, journal } from "@/lib/store";
import { confirmer, NB_MAX_CLIENT } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 3 : le fichier déposé est contrôlé (taille, contenu) puis rattaché à la commande.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  if (c.paiement.etat !== "paye" || c.brief) return Response.json({ erreur: "Dépôt fermé pour cette commande." }, { status: 403 });
  const { jeton } = (await req.json().catch(() => ({}))) as { jeton?: string };
  const r = await confirmer(jeton || "", c.id, "client");
  if ("erreur" in r) return Response.json({ erreur: r.erreur }, { status: r.statut });
  let accepte = false;
  await store.modifier(c.id, (cmd) => {
    accepte = false;
    if (cmd.brief || cmd.fichiersClient.length >= NB_MAX_CLIENT || cmd.fichiersClient.some((f) => f.id === r.fichier.id)) return false;
    accepte = true;
    cmd.fichiersClient.push(r.fichier);
    journal(cmd, `Fichier reçu du client : ${r.fichier.nom}.`);
  });
  if (!accepte) {
    await store.supprimerFichier(r.fichier.id);
    return Response.json({ erreur: "Fichier refusé." }, { status: 409 });
  }
  return Response.json({ id: r.fichier.id, nom: r.fichier.nom, taille: r.fichier.taille });
}
