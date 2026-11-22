import crypto from "node:crypto";
import { cloturerExpirees } from "@/lib/echeances";
import { purger } from "@/lib/purge";
import { veille } from "@/lib/veille";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tâche quotidienne : clôture des livraisons sans réponse après 14 jours (conditions de vente, article 7), purge des données arrivées
// à échéance (durées annoncées dans la politique de confidentialité) et lecture de la base, qui compte comme activité pour un projet Supabase gratuit.
// Désactivée tant que TACHES_SECRET n'est pas défini : la route répond alors comme si elle n'existait pas.
const empreinte = (s: string) => crypto.createHash("sha256").update(s).digest();

export async function POST(req: Request) {
  const attendu = process.env.TACHES_SECRET || "";
  const recu = req.headers.get("x-taches-secret") || "";
  if (attendu.length < 24 || !crypto.timingSafeEqual(empreinte(recu), empreinte(attendu))) return new Response("Introuvable", { status: 404 });
  try {
    const echeances = await cloturerExpirees();
    const bilan = await purger(true);
    const suivi = await veille();
    return Response.json({ ok: true, echeances, bilan, veille: suivi });
  } catch (e) {
    console.error("[tache quotidienne]", (e as Error).message);
    return Response.json({ ok: false }, { status: 500 });
  }
}
