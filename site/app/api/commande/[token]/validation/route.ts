import { store, journal, maintenant } from "@/lib/store";
import { courriels } from "@/lib/mail";
import { retouchesMax } from "@/lib/commandes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le client valide la livraison ou demande une retouche.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  if (c.statut !== "attente_validation") return Response.json({ erreur: "Aucune livraison à valider." }, { status: 409 });
  const d = (await req.json().catch(() => ({}))) as { action?: string; message?: string };

  if (d.action === "valider") {
    const maj = await store.modifier(c.id, (cmd) => {
      if (cmd.statut !== "attente_validation") return false;
      cmd.statut = "livree";
      cmd.valideeLe = maintenant();
      journal(cmd, "Livraison validée par le client.");
    });
    if (maj?.statut === "livree") {
      await courriels.livree(maj);
      await courriels.adminValidation(maj);
    }
    return Response.json({ ok: true });
  }

  if (d.action === "retouche") {
    const message = String(d.message || "").trim().slice(0, 2000);
    if (message.length < 10) return Response.json({ erreur: "Décrivez la retouche souhaitée (10 caractères minimum)." }, { status: 422 });
    if (c.retouchesDemandees.length >= retouchesMax(c)) return Response.json({ erreur: "Le nombre de retouches incluses est atteint. Écrivez-nous pour un devis." }, { status: 409 });
    const maj = await store.modifier(c.id, (cmd) => {
      if (cmd.statut !== "attente_validation") return false;
      cmd.retouchesDemandees.push({ date: maintenant(), message });
      cmd.statut = "en_production";
      journal(cmd, "Retouche demandée par le client.");
    });
    if (maj) await courriels.adminRetouche(maj, message);
    return Response.json({ ok: true });
  }
  return Response.json({ erreur: "Action inconnue." }, { status: 400 });
}
