import { store, journal, maintenant } from "@/lib/store";
import { courriels } from "@/lib/mail";
import { alerter } from "@/lib/alertes";
import { env } from "@/lib/env";
import { cloturerParExpiration, facturerSiPossible } from "@/lib/commandes";
import { DELAI_RETOUCHE_JOURS, dateEcheanceTexte, delaiExpire, miseADisposition } from "@/lib/delais";
import { toursMax, toursRestants, toursUtilises } from "@/lib/tours";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Le client valide la livraison ou demande une retouche.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const c = await store.commandeParToken((await params).token);
  if (!c) return Response.json({ erreur: "Commande introuvable." }, { status: 404 });
  const d = (await req.json().catch(() => ({}))) as { action?: string; message?: string };
  const refusTardif = () => Response.json({ erreur: `Le délai de ${DELAI_RETOUCHE_JOURS} jours pour demander une retouche est écoulé (échéance : ${dateEcheanceTexte(miseADisposition(c))}). La livraison est réputée acceptée et la commande est clôturée. Pour toute autre demande, écrivez-nous : elle fera l'objet d'une nouvelle commande.` }, { status: 409 });
  // Déjà clôturée (par la tâche quotidienne) : une demande de retouche tardive est refusée et la tentative est tracée dans l'historique.
  if (c.statut === "livree" && c.clotureAutoLe && d.action === "retouche") {
    const message = String(d.message || "").trim().slice(0, 2000);
    await store.modifier(c.id, (cmd) => {
      if (message) cmd.retouchesDemandees.push({ date: maintenant(), message, traiteeLe: maintenant(), tardive: true });
      journal(cmd, `Demande de retouche reçue après la clôture (délai de ${DELAI_RETOUCHE_JOURS} jours écoulé) : refusée, non décomptée.`);
    });
    return refusTardif();
  }
  if (c.statut !== "attente_validation") return Response.json({ erreur: "Aucune livraison à valider." }, { status: 409 });
  // Demande de retouche après l'échéance : refusée automatiquement ; la livraison est alors réputée acceptée (clôture, facture, e-mail au client).
  if (d.action === "retouche" && delaiExpire(miseADisposition(c))) {
    await cloturerParExpiration(c.id, { demandeTardive: String(d.message || "") });
    return refusTardif();
  }

  if (d.action === "valider") {
    const maj = await store.modifier(c.id, (cmd) => {
      if (cmd.statut !== "attente_validation") return false;
      cmd.statut = "livree";
      cmd.valideeLe = maintenant();
      cmd.livreeLe = cmd.valideeLe;
      journal(cmd, "Livraison validée par le client.");
    });
    if (maj?.statut === "livree") {
      await facturerSiPossible(maj.id);
      await courriels.livree((await store.commande(maj.id)) || maj);
      await courriels.adminValidation(maj);
    }
    return Response.json({ ok: true });
  }

  if (d.action === "retouche") {
    const message = String(d.message || "").trim().slice(0, 2000);
    if (message.length < 10) return Response.json({ erreur: "Décrivez la retouche souhaitée (10 caractères minimum)." }, { status: 422 });
    if (toursRestants(c) === 0) return Response.json({ erreur: "Les tours de retouches inclus dans votre formule ont été utilisés. Pour toute autre modification, écrivez-nous : elle fera l'objet d'une nouvelle commande." }, { status: 409 });
    const maj = await store.modifier(c.id, (cmd) => {
      if (cmd.statut !== "attente_validation") return false;
      cmd.retouchesDemandees.push({ date: maintenant(), message });
      cmd.statut = "en_production";
      journal(cmd, `Tour de retouches ${toursUtilises(cmd)} sur ${toursMax(cmd)} demandé par le client.`);
    });
    if (maj) {
      await courriels.adminRetouche(maj, message);
      await courriels.retoucheRecue(maj, message, toursRestants(maj));
      await alerter({ cle: `retouche-${maj.id}-${maj.retouchesDemandees.length}`, titre: "Correction demandée", message: `${maj.id} : tour de retouches ${toursUtilises(maj)} sur ${toursMax(maj)} demandé.`, lien: `${env.baseUrl()}/admin/commande/${maj.id}`, email: false, urgence: "haute", fenetreMs: 30 * 86_400_000 });
    }
    return Response.json({ ok: true });
  }
  return Response.json({ erreur: "Action inconnue." }, { status: 400 });
}
