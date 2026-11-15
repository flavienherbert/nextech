import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { store } from "@/lib/store";
import { confirmerPaiement, marquerPaiementInabouti } from "@/lib/commandes";
import { courriels } from "@/lib/mail";
import { alerter } from "@/lib/alertes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Seule source de vérité pour « cette commande est payée ».
// 1. La signature Stripe est vérifiée sur le corps brut (rejet des appels forgés ou rejoués hors délai).
// 2. Chaque événement n'est traité qu'une fois.
// 3. La session est relue auprès de Stripe avant de marquer la commande comme payée.
export async function POST(req: Request) {
  const corps = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  let evenement: Stripe.Event;
  try {
    evenement = stripe().webhooks.constructEvent(corps, signature, env.stripeWebhookSecret());
  } catch (e) {
    console.warn("[webhook] signature refusée :", (e as Error).message);
    return new Response("Signature invalide", { status: 400 });
  }

  if (!(await store.marquerEvenement(evenement.id))) return Response.json({ recu: true, doublon: true });

  try {
    switch (evenement.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const r = await confirmerPaiement(evenement.data.object as Stripe.Checkout.Session);
        if (!r.ok) {
          console.warn(`[webhook] ${evenement.id} non appliqué : ${r.motif}`);
          // Un paiement réellement encaissé mais non rattaché doit alerter ; un paiement différé (virement) pas encore abouti, non.
          if (!(r.motif || "").startsWith("paiement non abouti")) {
            const s = evenement.data.object as Stripe.Checkout.Session;
            await courriels.adminAnomalie(`Session ${s.id} — ${r.motif}`).catch(() => {});
          }
        }
        return Response.json({ recu: true, applique: r.ok, motif: r.motif });
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const s = evenement.data.object as Stripe.Checkout.Session;
        await marquerPaiementInabouti(s.id, s.metadata?.commande || "", evenement.type.endsWith("expired") ? "expire" : "echoue");
        return Response.json({ recu: true });
      }
      default:
        return Response.json({ recu: true, ignore: evenement.type });
    }
  } catch (e) {
    // Erreur de notre côté : on libère l'événement pour que Stripe puisse le renvoyer.
    await store.oublierEvenement(evenement.id);
    console.error("[webhook]", (e as Error).message);
    await alerter({
      cle: `webhook-erreur-${evenement.type}`, titre: "Paiement à vérifier : erreur de traitement",
      message: "Un événement de paiement n'a pas pu être traité. Stripe va réessayer automatiquement ; vérifiez le diagnostic si l'alerte se répète.",
      details: `${evenement.type} (${evenement.id}) : ${(e as Error).message}`, lien: `${env.baseUrl()}/admin/diagnostic`, urgence: "haute", fenetreMs: 3600_000,
    });
    return new Response("Erreur de traitement", { status: 500 });
  }
}
