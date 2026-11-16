import Stripe from "stripe";
import { env, modePaiement } from "./env";

let client: Stripe | null = null;

// Client Stripe. Refuse de fonctionner si les paiements sont fermés
// (clé absente, ou clé réelle sans autorisation explicite et mentions légales).
export function stripe(): Stripe {
  const { mode, raison } = modePaiement();
  if (mode === "ferme") throw new Error(raison || "Paiement fermé.");
  if (!client) {
    const hote = env.stripeApiHost();
    if (hote) {
      const u = new URL(hote);
      client = new Stripe(env.stripeKey(), { host: u.hostname, port: Number(u.port) || 80, protocol: u.protocol.replace(":", "") as "http" | "https", maxNetworkRetries: 0, timeout: 8000 });
    } else {
      // Délai court : un appel qui traîne ne doit pas dépasser la durée maximale d'une fonction serverless.
      client = new Stripe(env.stripeKey(), { timeout: 8000, maxNetworkRetries: 1 });
    }
  }
  return client;
}

// Client dédié à la configuration du webhook : utilisable AVANT que STRIPE_WEBHOOK_SECRET existe (le client ordinaire
// refuse tant que les paiements sont fermés), mais uniquement avec une clé de TEST (ou le simulateur local).
export function stripeConfiguration(): Stripe {
  const cle = env.stripeKey();
  if (!cle) throw new Error("STRIPE_SECRET_KEY est absente.");
  const hote = env.stripeApiHost();
  if (!hote && !/^(sk|rk)_test_/.test(cle)) throw new Error("Ce n'est pas une clé de TEST (sk_test_… ou rk_test_…) : refus.");
  if (hote) {
    const u = new URL(hote);
    return new Stripe(cle, { host: u.hostname, port: Number(u.port) || 80, protocol: u.protocol.replace(":", "") as "http" | "https", maxNetworkRetries: 0, timeout: 8000 });
  }
  return new Stripe(cle, { timeout: 15000, maxNetworkRetries: 1 });
}
