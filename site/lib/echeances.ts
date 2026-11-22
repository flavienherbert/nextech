// Clôture automatique des livraisons restées sans réponse après le délai de 14 jours (conditions de vente, article 7).
// Déclenchée par la tâche quotidienne (vers 7 h–8 h, heure de Paris : l'échéance est à 23 h 59, heure de Paris, la veille au plus tard)
// et, en filet de sécurité, à l'ouverture de l'administration (au plus une fois par heure). La route de retouche du client refuse de
// toute façon une demande tardive à la minute près, sans attendre la tâche.
import { depot } from "./depot";
import { cloturerParExpiration } from "./commandes";
import { echeanceRetouche, miseADisposition } from "./delais";
import { store } from "./store";
import { payee } from "./suivi";

export type BilanEcheances = { cloturees: string[]; emailsEnEchec: number };

export async function cloturerExpirees(maintenantMs = Date.now()): Promise<BilanEcheances> {
  const cloturees: string[] = [];
  let emailsEnEchec = 0;
  for (const c of (await store.commandes()).filter((x) => payee(x) && x.statut === "attente_validation")) {
    if (maintenantMs <= echeanceRetouche(miseADisposition(c))) continue;
    try {
      const r = await cloturerParExpiration(c.id, { maintenantMs });
      if (!r.erreur && r.commande?.statut === "livree") {
        cloturees.push(c.id);
        if (r.courrielOk === false) emailsEnEchec++;
      }
    } catch (e) {
      // Une commande en erreur ne doit pas bloquer les suivantes : elle sera reprise à la prochaine exécution.
      console.error("[échéances]", c.id, (e as Error).message);
    }
  }
  return { cloturees, emailsEnEchec };
}

const CLE = "systeme/echeances.json";
// Version à déclenchement libre (ouverture de l'administration) : au plus une exécution par heure.
export async function cloturerExpireesSiNecessaire(maintenantMs = Date.now()): Promise<BilanEcheances | null> {
  const marque = await depot().lire(CLE);
  try {
    if (marque && maintenantMs - new Date(JSON.parse(marque.corps.toString()).date).getTime() < 3_600_000) return null;
  } catch { /* marque illisible : on exécute */ }
  await depot().ecrire(CLE, JSON.stringify({ date: new Date(maintenantMs).toISOString() }));
  return cloturerExpirees(maintenantMs);
}

