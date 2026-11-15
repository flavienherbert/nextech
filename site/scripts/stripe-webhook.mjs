// Crée dans Stripe (MODE TEST uniquement) le point d'accès du webhook du site et affiche son secret.
//   STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-webhook.mjs [adresse-du-webhook]
// Par défaut : https://studio-accroche-preprod.netlify.app/api/stripe/webhook
// Le secret « whsec_… » n'est affiché QU'ICI, dans votre terminal, une seule fois : copiez-le directement dans
// la variable STRIPE_WEBHOOK_SECRET de Netlify. Ne l'envoyez à personne, ni dans une conversation.
// Le script refuse toute clé qui n'est pas une clé de test et ne touche jamais aux paiements ni aux clients.
import Stripe from "stripe";

const cle = process.env.STRIPE_SECRET_KEY || "";
const url = process.argv[2] || "https://studio-accroche-preprod.netlify.app/api/stripe/webhook";
const fin = (m, code = 1) => { console.log(m); process.exit(code); };
if (!cle) fin("✗ STRIPE_SECRET_KEY est absente de votre terminal (voir MISE-EN-LIGNE.md).");
if (!/^(sk|rk)_test_/.test(cle)) fin("✗ Ce n'est pas une clé de TEST (sk_test_… ou rk_test_…). Le script refuse de continuer.");
if (!/^https:\/\/[^/]+\/api\/stripe\/webhook$/.test(url)) fin("✗ L'adresse doit être de la forme https://…/api/stripe/webhook");

const stripe = new Stripe(cle, { timeout: 15000, maxNetworkRetries: 1 });
const EVENEMENTS = ["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"];
try {
  const existants = (await stripe.webhookEndpoints.list({ limit: 100 })).data.filter((w) => w.url === url);
  if (existants.length) {
    const w = existants[0];
    const manquants = EVENEMENTS.filter((e) => !w.enabled_events.includes(e) && !w.enabled_events.includes("*"));
    console.log(`• Un point d'accès existe déjà pour cette adresse (${w.id}, statut ${w.status}).`);
    if (manquants.length) console.log(`⚠ Événements manquants : ${manquants.join(", ")}. Corrigez-les dans Stripe (Développeurs > Webhooks).`);
    console.log("Stripe ne permet pas de relire un secret déjà créé. Si vous ne l'avez plus : supprimez ce point d'accès dans le tableau de bord Stripe, puis relancez ce script.");
    process.exit(0);
  }
  const w = await stripe.webhookEndpoints.create({ url, enabled_events: EVENEMENTS, description: "Studio Accroche — préproduction" });
  if (w.livemode) fin("✗ Anomalie : le point d'accès a été créé en mode réel. Supprimez-le dans Stripe.");
  console.log(`✓ Point d'accès créé en mode test (${w.id}) pour ${url}`);
  console.log(`\nSecret du webhook (à coller dans Netlify, variable STRIPE_WEBHOOK_SECRET) :\n\n${w.secret}\n`);
} catch (e) {
  fin(`✗ Stripe a refusé la demande : ${e.message}`);
}
