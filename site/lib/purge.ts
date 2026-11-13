// Nettoyage périodique, conforme aux durées annoncées dans la politique de confidentialité :
//  - fichiers (références du client et vidéos livrées) : supprimés 90 jours après la livraison ;
//  - commandes jamais payées : supprimées après 30 jours.
// Les données de commande et les factures sont conservées (obligation comptable).
import { depot } from "./depot";
import { store, journal, maintenant } from "./store";

const JOUR = 86_400_000;
export const CONSERVATION_FICHIERS_JOURS = 90;

export async function purger(force = false): Promise<{ fichiers: number; commandes: number } | null> {
  const marque = await depot().lire("systeme/purge.json");
  if (!force && marque && Date.now() - new Date(JSON.parse(marque.corps.toString()).date).getTime() < JOUR) return null;
  await depot().ecrire("systeme/purge.json", JSON.stringify({ date: maintenant() }));
  let fichiers = 0, commandes = 0;
  for (const c of await store.commandes()) {
    const age = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / JOUR : 0);
    if (c.paiement.etat !== "paye" && age(c.creeLe) > 30) {
      await depot().supprimer(`commandes/${c.id}.json`);
      await depot().supprimer(`tokens/${c.token}.json`);
      commandes++;
      continue;
    }
    if (c.statut === "livree" && !c.fichiersPurgesLe && age(c.livreeLe || c.valideeLe) > CONSERVATION_FICHIERS_JOURS) {
      const aSupprimer = [...c.fichiersClient, ...c.livrables];
      for (const f of aSupprimer) await store.supprimerFichier(f.id);
      fichiers += aSupprimer.length;
      await store.modifier(c.id, (cmd) => {
        cmd.fichiersClient = [];
        cmd.livrables = [];
        cmd.fichiersPurgesLe = maintenant();
        journal(cmd, `${aSupprimer.length} fichier(s) supprimé(s) après ${CONSERVATION_FICHIERS_JOURS} jours de conservation.`);
      });
    }
  }
  return { fichiers, commandes };
}
