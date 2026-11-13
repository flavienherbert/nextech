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
      client = new Stripe(env.stripeKey(), { host: u.hostname, port: Number(u.port) || 80, protocol: u.protocol.replace(":", "") as "http" | "https", maxNetworkRetries: 0 });
    } else {
      client = new Stripe(env.stripeKey());
    }
  }
  return client;
}
