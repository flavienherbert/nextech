// Alerte « problème technique » : appelée par instrumentation.ts pour toute erreur serveur imprévue (page, route d'API, action).
// Même erreur : une alerte par demi-heure au plus ; au total 8 alertes d'erreur par heure au plus.
// Le message envoyé sur le téléphone ne contient que l'emplacement (jamais l'adresse réelle, qui peut porter un secret) ni le texte de l'erreur.
import crypto from "node:crypto";
import { alerter } from "./alertes";
import { enregistrer } from "./limiteur";

export async function signalerErreurServeur(err: unknown, context: { routePath: string; routeType: string }) {
  try {
    const message = String((err as Error)?.message ?? err).replace(/\s+/g, " ").slice(0, 300);
    const lieu = `${context.routeType} ${context.routePath}`;
    if ((await enregistrer("alerte", "erreur-globale", 3600_000).catch(() => 1)) > 8) return;
    await alerter({
      cle: `erreur-${crypto.createHash("sha256").update(lieu + message).digest("hex").slice(0, 16)}`,
      titre: "Problème technique sur le site",
      message: `Une erreur est survenue (${lieu}). Un client a pu être gêné : vérifiez le diagnostic.`,
      details: `Emplacement : ${lieu}\nErreur : ${message}${(err as { digest?: string })?.digest ? `\nRéférence : ${(err as { digest?: string }).digest}` : ""}`,
      lien: `${process.env.SITE_URL || ""}/admin/diagnostic`,
      urgence: "haute",
      fenetreMs: 1800_000,
    });
  } catch {
    /* une alerte ne doit jamais aggraver l'erreur */
  }
}
