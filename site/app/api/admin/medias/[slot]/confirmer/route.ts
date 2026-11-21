import { estAdmin, origineValide } from "@/lib/auth";
import { cleMedia, emplacement } from "@/lib/emplacements";
import { confirmer } from "@/lib/fichiers";
import { definirMedia } from "@/lib/medias";
import { depot } from "@/lib/depot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 3 : le fichier reçu est contrôlé (taille, signature, type) puis devient le média de l'emplacement.
export async function POST(req: Request, { params }: { params: Promise<{ slot: string }> }) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const { slot } = await params;
  if (!emplacement(slot)) return Response.json({ erreur: "Emplacement inconnu." }, { status: 404 });
  const { jeton } = (await req.json().catch(() => ({}))) as { jeton?: string };
  const r = await confirmer(jeton || "", slot, "media");
  if ("erreur" in r) return Response.json({ erreur: r.erreur }, { status: r.statut });
  try {
    await definirMedia(slot, r.fichier);
  } catch (e) {
    // Registre non mis à jour : le fichier n'est rattaché à rien, on ne le garde pas.
    await depot().supprimer(cleMedia(r.fichier.id)).catch(() => {});
    console.error("[medias] enregistrement impossible :", (e as Error).message);
    return Response.json({ erreur: "Le fichier est arrivé mais n'a pas pu être enregistré. Recommencez." }, { status: 500 });
  }
  return Response.json({ ok: true, nom: r.fichier.nom, taille: r.fichier.taille });
}
