import { estAdmin, origineValide } from "@/lib/auth";
import { confirmer } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 3 : le fichier reçu est contrôlé (taille, signature, type). Il n'est rattaché à une fiche que lorsque la fiche est enregistrée ;
// d'ici là, s'il n'est jamais enregistré, le nettoyage quotidien le supprime après 24 heures.
export async function POST(req: Request) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const { jeton } = (await req.json().catch(() => ({}))) as { jeton?: string };
  const r = await confirmer(jeton || "", "bibliotheque", "bibliotheque");
  if ("erreur" in r) return Response.json({ erreur: r.erreur }, { status: r.statut });
  return Response.json({ ok: true, ...r.fichier });
}
