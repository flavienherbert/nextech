import { notificationDeTest } from "@/lib/alertes";
import { estAdmin, origineValide } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

// Envoie une notification de test (téléphone + e-mail) et dit ce qui est parti. Réservé à l'administrateur.
// Sert à la vérification en ligne (npm run verifier:en-ligne) ; le bouton du Diagnostic fait la même chose.
export async function POST(req: Request) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  return Response.json(await notificationDeTest());
}
