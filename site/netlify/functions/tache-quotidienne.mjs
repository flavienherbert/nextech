// Tâche planifiée Netlify : appelle chaque jour, vers 7 h–8 h (heure de Paris), /api/taches/quotidienne :
// récapitulatif de ce qui attend le vendeur, relance automatique des briefs manquants depuis 48 h, purge des données
// arrivées à échéance, lecture de la base (ce qui évite aussi la mise en pause d'un projet Supabase gratuit).
// INACTIVE tant que la variable TACHES_SECRET n'est pas définie dans Netlify.
// Ne s'exécute que sur le déploiement publié.
export default async () => {
  const secret = process.env.TACHES_SECRET;
  if (!secret) {
    console.log("[tache quotidienne] inactive : TACHES_SECRET absent.");
    return;
  }
  const base = (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");
  if (!base) return console.error("[tache quotidienne] adresse du site inconnue (SITE_URL).");
  const entetes = { "x-taches-secret": secret };
  // En préproduction, tout le site est derrière un mot de passe : la tâche s'identifie avec.
  if (process.env.PREPROD_PASSWORD) entetes.Authorization = "Basic " + Buffer.from("tache:" + process.env.PREPROD_PASSWORD).toString("base64");
  const r = await fetch(`${base}/api/taches/quotidienne`, { method: "POST", headers: entetes, signal: AbortSignal.timeout(25_000) });
  console.log("[tache quotidienne]", r.status, (await r.text()).slice(0, 300));
};

export const config = { schedule: "0 6 * * *" };
