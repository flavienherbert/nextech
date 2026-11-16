import { estAdmin, origineValide } from "@/lib/auth";
import { env } from "@/lib/env";
import { stripeConfiguration } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

const EVENEMENTS = ["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"] as(
  | "checkout.session.completed" | "checkout.session.expired" | "checkout.session.async_payment_succeeded" | "checkout.session.async_payment_failed")[];

// Crée dans Stripe, EN MODE TEST uniquement, le point d'accès du webhook de ce site et renvoie son secret de signature
// (affiché une seule fois par Stripe). Réservé à l'administrateur. Sert à la mise en place (npm run configurer:stripe) :
// la clé Stripe ne quitte jamais Netlify. Si un point d'accès existe déjà pour cette adresse, rien n'est touché sauf
// avec ?remplacer=oui, car le remplacer invalide l'ancien secret (le STRIPE_WEBHOOK_SECRET en place cesserait de fonctionner).
export async function POST(req: Request) {
  if (!(await estAdmin())) return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  if (!origineValide(req)) return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const remplacer = new URL(req.url).searchParams.get("remplacer") === "oui";
  try {
    const s = stripeConfiguration();
    const url = `${env.baseUrl()}/api/stripe/webhook`;
    const existants = (await s.webhookEndpoints.list({ limit: 100 })).data.filter((w) => w.url === url);
    if (existants.length && !remplacer)
      return Response.json({ erreur: "Un point d'accès existe déjà pour cette adresse. Le remplacer invalide l'ancien secret : relancez avec ?remplacer=oui.", existe: existants.map((w) => w.id) }, { status: 409 });
    for (const w of existants) await s.webhookEndpoints.del(w.id);
    const w = await s.webhookEndpoints.create({ url, enabled_events: EVENEMENTS, description: "Studio Accroche — préproduction" });
    if (w.livemode) {
      await s.webhookEndpoints.del(w.id).catch(() => {});
      return Response.json({ erreur: "Anomalie : le point d'accès a été créé en mode réel et a été supprimé aussitôt." }, { status: 500 });
    }
    return Response.json({ id: w.id, url, livemode: w.livemode, evenements: w.enabled_events, remplaces: existants.length, secret: w.secret });
  } catch (e) {
    return Response.json({ erreur: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}
