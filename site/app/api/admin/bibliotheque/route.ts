import { estAdmin, origineValide } from "@/lib/auth";
import { reserver } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Étape 1 de l'envoi d'une vidéo, d'une miniature ou d'une photo d'avatar (Administration → Publicités, Avatars).
// Le fichier ira dans le dossier « bibliotheque/ » : jamais dans « medias/ », que le nettoyage quotidien viderait.
export async function POST(req: Request) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const r = await reserver("bibliotheque", "bibliotheque", await req.json().catch(() => ({})));
  return "erreur" in r ? Response.json({ erreur: r.erreur }, { status: r.statut }) : Response.json(r);
}
