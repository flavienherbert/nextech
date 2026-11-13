import { store, journal } from "@/lib/store";
import { estAdmin } from "@/lib/auth";
import { confirmer } from "@/lib/fichiers";
import { origineValide } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const { id } = await params;
  const { jeton } = (await req.json().catch(() => ({}))) as { jeton?: string };
  const r = await confirmer(jeton || "", id, "livrable");
  if ("erreur" in r) return Response.json({ erreur: r.erreur }, { status: r.statut });
  const c = await store.modifier(id, (cmd) => {
    if (cmd.livrables.some((f) => f.id === r.fichier.id)) return false;
    cmd.livrables.push(r.fichier);
    journal(cmd, `Livrable ajouté : ${r.fichier.nom}.`);
  });
  if (!c) {
    await store.supprimerFichier(r.fichier.id);
    return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
