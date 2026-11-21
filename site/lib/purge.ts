// Nettoyage périodique, conforme aux durées annoncées dans la politique de confidentialité :
//  - fichiers (références du client et vidéos livrées) : supprimés 90 jours après la livraison ;
//  - commandes jamais payées : supprimées après 30 jours.
//  - fichiers orphelins (envoyés mais jamais rattachés à une commande) : supprimés après 24 heures ;
//  - médias du site remplacés ou retirés (plus référencés par le registre) : supprimés après 24 heures ;
//  - compteurs d'essais : 24 heures ; événements Stripe déjà traités : 14 jours ; e-mails archivés : 12 mois.
// Les données de commande et les factures sont conservées (obligation comptable).
import { depot } from "./depot";
import { VERSION_MEDIA } from "./emplacements";
import { versionsReferencees } from "./medias";
import { store, journal, maintenant } from "./store";

const JOUR = 86_400_000;
export const CONSERVATION_FICHIERS_JOURS = 90;

export type BilanPurge = { fichiers: number; commandes: number; orphelins: number; limites: number; evenements: number; courriels: number; medias: number };

export async function purger(force = false, maintenantMs = Date.now()): Promise<BilanPurge | null> {
  const marque = await depot().lire("systeme/purge.json");
  if (!force && marque && Date.now() - new Date(JSON.parse(marque.corps.toString()).date).getTime() < JOUR) return null;
  await depot().ecrire("systeme/purge.json", JSON.stringify({ date: maintenant() }));
  let fichiers = 0, commandes = 0;
  const toutes = await store.commandes();
  for (const c of toutes) {
    const age = (iso?: string) => (iso ? (maintenantMs - new Date(iso).getTime()) / JOUR : 0);
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
  const orphelins = await purgerOrphelins(maintenantMs);
  const medias = await purgerMedias(maintenantMs);
  const limites = await purgerAnciens("limites", 1, maintenantMs);
  const evenements = await purgerAnciens("evenements", 14, maintenantMs);
  const courriels = await purgerAnciens("courriels", 365, maintenantMs);
  return { fichiers, commandes, orphelins, limites, evenements, courriels, medias };
}

// Supprime les documents d'un préfixe plus vieux que `jours` jours.
async function purgerAnciens(prefixe: string, jours: number, maintenantMs: number): Promise<number> {
  let n = 0;
  for (const x of await depot().inventaire(prefixe)) {
    if (x.cle.endsWith(".json") && x.modifieLe > 0 && maintenantMs - x.modifieLe > jours * JOUR) { await depot().supprimer(x.cle); n++; }
  }
  return n;
}

// Fichiers jamais rattachés à une commande (envoi abandonné avant la confirmation), plus vieux que 24 heures.
// Garde-fou : si une seule commande est illisible, rien n'est supprimé (ses fichiers sembleraient orphelins).
async function purgerOrphelins(maintenantMs: number): Promise<number> {
  const entrees = (await depot().lireTous("commandes")).filter((e) => e.cle.endsWith(".json"));
  const references = new Set<string>();
  for (const e of entrees) {
    try {
      const c = JSON.parse(e.corps.toString("utf8")) as { fichiersClient?: { id: string }[]; livrables?: { id: string }[] };
      for (const f of [...(c.fichiersClient || []), ...(c.livrables || [])]) references.add(f.id);
    } catch {
      console.error("[purge] commande illisible, nettoyage des fichiers orphelins annulé :", e.cle);
      return 0;
    }
  }
  let n = 0;
  for (const x of await depot().inventaire("fichiers")) {
    const id = x.cle.slice("fichiers/".length);
    if (/^[0-9a-f]{32}$/.test(id) && !references.has(id) && x.modifieLe > 0 && maintenantMs - x.modifieLe > JOUR) { await depot().supprimer(x.cle); n++; }
  }
  return n;
}

// Médias du site qui ne sont plus utilisés (remplacés, retirés, ou envoyés sans jamais être enregistrés), plus vieux que 24 heures.
// Le délai laisse aux pages en cache le temps de se renouveler. Si le registre est illisible, rien n'est supprimé.
async function purgerMedias(maintenantMs: number): Promise<number> {
  let utilises: Set<string>;
  try {
    utilises = await versionsReferencees();
  } catch (e) {
    console.error("[purge] registre des médias illisible, nettoyage annulé :", (e as Error).message);
    return 0;
  }
  let n = 0;
  for (const x of await depot().inventaire("medias")) {
    const v = x.cle.slice("medias/".length);
    if (VERSION_MEDIA.test(v) && !utilises.has(v) && x.modifieLe > 0 && maintenantMs - x.modifieLe > JOUR) { await depot().supprimer(x.cle); n++; }
  }
  return n;
}
