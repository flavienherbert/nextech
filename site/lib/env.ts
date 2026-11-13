// Lecture centralisée de la configuration serveur. Aucun secret dans le code.
export const env = {
  baseUrl: () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  dataDir: () => process.env.DATA_DIR || "./data",
  stripeKey: () => process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET || "",
  stripeApiHost: () => process.env.STRIPE_API_HOST || "", // simulateur local uniquement
  adminPassword: () => process.env.ADMIN_PASSWORD || "",
  sessionSecret: () => process.env.SESSION_SECRET || "",
  adminEmail: () => process.env.ADMIN_EMAIL || "",
  mailFrom: () => process.env.MAIL_FROM || "",
  resendKey: () => process.env.RESEND_API_KEY || "",
  ventesReelles: () => process.env.VENTES_REELLES === "oui",
  legal: () => ({
    nom: process.env.NEXT_PUBLIC_LEGAL_NAME || "",
    siret: process.env.NEXT_PUBLIC_LEGAL_SIRET || "",
    adresse: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
    mediateur: process.env.NEXT_PUBLIC_LEGAL_MEDIATEUR || "",
  }),
};

export type ModePaiement = "ferme" | "simulation" | "test" | "reel";

// État des paiements :
//  - ferme      : aucune clé, ou clé réelle sans autorisation explicite ni mentions légales
//  - simulation : simulateur Stripe local (développement)
//  - test       : vraie API Stripe, clé de test
//  - reel       : clé réelle + VENTES_REELLES=oui + mentions légales complètes
export function modePaiement(): { mode: ModePaiement; raison?: string } {
  const cle = env.stripeKey();
  if (!cle || !env.stripeWebhookSecret()) return { mode: "ferme", raison: "Paiement non configuré." };
  if (env.stripeApiHost()) return { mode: "simulation" };
  if (cle.startsWith("sk_test_") || cle.startsWith("rk_test_")) return { mode: "test" };
  const l = env.legal();
  if (!env.ventesReelles()) return { mode: "ferme", raison: "Ventes réelles non autorisées (VENTES_REELLES)." };
  if (!l.nom || !l.siret || !l.adresse || !l.email)
    return { mode: "ferme", raison: "Mentions légales incomplètes." };
  return { mode: "reel" };
}
