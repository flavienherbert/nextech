// Vérifie la clé Stripe de TEST sans jamais l'afficher.
// Usage : node --env-file=.env.local scripts/verifier-stripe.mjs
import Stripe from "stripe";

const cle = process.env.STRIPE_SECRET_KEY || "";
const fin = (msg, code = 1) => { console.log(msg); process.exit(code); };
if (!cle) fin("✗ STRIPE_SECRET_KEY est vide dans .env.local.");
if (/^(sk|rk)_live_/.test(cle)) fin("✗ C'est une clé RÉELLE. Ce script refuse de l'utiliser. Remplacez-la par une clé de test (sk_test_… ou rk_test_…).");
if (!/^(sk|rk)_test_/.test(cle)) fin("✗ Format inattendu : une clé de test commence par sk_test_ ou rk_test_.");
console.log(`✓ Clé de test détectée (${cle.slice(0, 8)}…, ${cle.length} caractères).`);
if (!/^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET || "")) console.log("! STRIPE_WEBHOOK_SECRET absent ou mal formé (doit commencer par whsec_) : les paiements ne seront pas confirmés.");
else console.log("✓ Secret de webhook présent.");

const stripe = new Stripe(cle);
try {
  const s = await stripe.checkout.sessions.create({
    mode: "payment", locale: "fr",
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 2500, product_data: { name: "Studio Accroche — vérification" } } }],
    success_url: "https://example.com/ok", cancel_url: "https://example.com/annule",
    metadata: { commande: "VERIFICATION" },
  });
  console.log(`✓ Session de paiement créée (${s.id.slice(0, 14)}…), mode réel : ${s.livemode ? "OUI — ANORMAL" : "non"}.`);
  const relue = await stripe.checkout.sessions.retrieve(s.id);
  console.log(`✓ Session relue : ${relue.amount_total / 100} ${relue.currency}, état « ${relue.payment_status} ».`);
  await stripe.checkout.sessions.expire(s.id).then(() => console.log("✓ Session de vérification refermée."), () => console.log("! Session non refermée (sans conséquence, elle expire seule)."));
  console.log("\nLa clé permet au site de créer et de relire des paiements. Rien n'a été débité.");
} catch (e) {
  fin(`✗ Stripe a refusé : ${e.message}\n  Avec une clé restreinte, autorisez « Checkout Sessions » en écriture.`);
}
