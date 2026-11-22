// Fiche de production : le brief d'une commande remis en forme, prêt à copier dans Higgsfield (ou dans une conversation avec Claude).
// Texte brut, sans donnée de facturation ni coordonnées du client : seul ce qui sert à fabriquer la vidéo.
import { delaiTexte, DUREE_MAX_SECONDES, euros, formuleParId, toursTexte } from "./formules";
import type { Commande } from "./store";
import { echeance } from "./suivi";

const ANGLES: Record<string, string> = {
  essai: "1 accroche (angle « problème » conseillé)",
  test: "3 accroches, une par angle : A problème · B résultat · C curiosité",
  campagne: "3 accroches (A problème · B résultat · C curiosité) × 2 présentateurs différents = 6 vidéos ; exports 9:16 et 1:1",
};

export function ficheProduction(c: Commande): string {
  const f = formuleParId(c.formule)!;
  const b = c.brief;
  const e = echeance(c);
  const l = (k: string, v?: string) => `${k} : ${v && v.trim() ? v.trim() : "—"}`;
  return [
    `COMMANDE ${c.id} — ${f.nom} (${euros(f.prixCents)})`,
    `À livrer : ${f.videos} vidéo${f.videos > 1 ? "s" : ""} MP4 1080×1920 (9:16), ${DUREE_MAX_SECONDES} s maximum chacune (durée supérieure non proposée) · ${delaiTexte(f)}${e ? ` · échéance ${new Date(e).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}`,
    `Accroches : ${ANGLES[f.id]}`,
    `Retouches incluses : ${toursTexte(f)} pour toute la commande (un tour = une seule demande consolidée sur l'ensemble des vidéos ; changement de produit, de brief, de script validé ou d'angle = nouvelle commande)`,
    "",
    "— BRIEF —",
    l("Marque", b?.marque),
    l("Produit", b?.produit),
    l("Site / lien", b?.lien),
    l("Client type", b?.cible),
    l("Promesse et arguments", b?.arguments),
    l("Ton souhaité", b?.style),
    l("À ne pas dire", b?.aEviter),
    l("Compléments", b?.complement),
    `Photos fournies : ${c.fichiersClient.length} fichier${c.fichiersClient.length > 1 ? "s" : ""} (à télécharger depuis la commande)`,
    "",
    "— RÈGLES NON NÉGOCIABLES —",
    "Mention « Généré par IA » sur la vidéo · aucun faux témoignage (le présentateur montre le produit, il ne l'a pas « testé 3 semaines ») · aucune allégation santé, minceur ou gain d'argent · aucune promesse absente du brief.",
    "Le script est envoyé au client et validé AVANT toute génération (procédure : production/HIGGSFIELD.md).",
  ].join("\n");
}
