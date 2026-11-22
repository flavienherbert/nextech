// Délai de 14 jours pour valider une livraison ou demander un tour de retouches (conditions de vente, article 7).
//
// Règle retenue : le délai court à compter de la mise à disposition de chaque livraison (première version ou version corrigée ;
// le simple renvoi de l'e-mail de livraison ne le relance pas). Il se compte en jours civils, heure de Paris : le jour de la mise
// à disposition ne compte pas, et le délai expire à la fin du quatorzième jour suivant, à 23 h 59 min 59 s (heure de Paris).
// Exemple : livraison le 3 novembre à 10 h → le client peut encore demander une retouche jusqu'au 17 novembre inclus, 23 h 59.
// Ce calcul ne dépend ni du fuseau du serveur (Netlify tourne en UTC) ni du passage à l'heure d'été ou d'hiver : on calcule
// sur des jours civils de Paris, jamais sur « 14 × 24 heures ».
import type { Commande } from "./store";

export const DELAI_RETOUCHE_JOURS = 14;
const FUSEAU = "Europe/Paris";

const PARTIES = new Intl.DateTimeFormat("en-US", { timeZone: FUSEAU, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

type Local = { an: number; mois: number; jour: number; heure: number; minute: number; seconde: number };
function local(ts: number): Local {
  const p = PARTIES.formatToParts(new Date(ts));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { an: g("year"), mois: g("month"), jour: g("day"), heure: g("hour"), minute: g("minute"), seconde: g("second") };
}

// Décalage de Paris par rapport à l'heure universelle, en minutes, à un instant donné (60 en hiver, 120 en été).
function decalageMinutes(ts: number): number {
  const l = local(ts);
  return Math.round((Date.UTC(l.an, l.mois - 1, l.jour, l.heure, l.minute, l.seconde) - Math.floor(ts / 1000) * 1000) / 60_000);
}

// Instant (ms) où commence un jour civil de Paris (00 h 00 min 00 s, heure de Paris).
export function debutDeJourParis(an: number, mois: number, jour: number): number {
  const naif = Date.UTC(an, mois - 1, jour);
  let t = naif - decalageMinutes(naif) * 60_000;
  // Garde-fou : le décalage estimé peut différer de celui de l'instant trouvé les jours de changement d'heure.
  for (const essai of [t, t - 3_600_000, t + 3_600_000]) {
    const l = local(essai);
    if (l.an === an && l.mois === mois && l.jour === jour && l.heure === 0 && l.minute === 0 && l.seconde === 0) { t = essai; break; }
  }
  return t;
}

// Fin du 14e jour civil (heure de Paris) suivant la mise à disposition : dernier instant (ms) où une demande est recevable.
export function echeanceRetouche(miseADispositionIso: string): number {
  const l = local(new Date(miseADispositionIso).getTime());
  const lendemain = new Date(Date.UTC(l.an, l.mois - 1, l.jour + DELAI_RETOUCHE_JOURS + 1)); // calcul sur des dates civiles : insensible à l'heure d'été
  return debutDeJourParis(lendemain.getUTCFullYear(), lendemain.getUTCMonth() + 1, lendemain.getUTCDate()) - 1;
}

export const delaiExpire = (miseADispositionIso: string, maintenantMs = Date.now()): boolean => maintenantMs > echeanceRetouche(miseADispositionIso);

// « 17 novembre 2026 » (jour de l'échéance, heure de Paris).
export const dateEcheanceTexte = (miseADispositionIso: string): string =>
  new Date(echeanceRetouche(miseADispositionIso)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: FUSEAU });

// Date de mise à disposition de la dernière livraison. Les commandes livrées avant l'ajout du champ `derniereLivraisonLe`
// se retrouvent dans l'historique ; à défaut, la date de paiement (jamais plus favorable au client que la réalité).
export function miseADisposition(c: Commande): string {
  if (c.derniereLivraisonLe) return c.derniereLivraisonLe;
  const h = c.historique.filter((x) => /livraison envoyée|version corrigée envoyée|passé à « attente_validation/i.test(x.evenement)).at(-1);
  return h?.date || c.paiement.payeLe || c.creeLe;
}
