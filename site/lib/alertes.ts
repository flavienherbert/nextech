// Alertes à l'administrateur : un message sur le téléphone (ntfy, gratuit, sans compte) ET un e-mail.
// Les deux canaux sont indépendants : si le service d'e-mail tombe, le téléphone prévient quand même
// (et c'est lui qui signale l'échec de l'e-mail). Rien ne lève d'erreur : une alerte ne doit jamais casser une commande.
//  - Le message envoyé sur le téléphone ne contient JAMAIS de donnée personnelle (ni nom, ni adresse) : le détail
//    complet est réservé à l'e-mail et à l'administration.
//  - Une même alerte (même clé) n'est pas répétée dans la fenêtre indiquée, pour éviter les avalanches.
import { env } from "./env";
import { enregistrer } from "./limiteur";

export type Alerte = {
  cle: string;
  titre: string;
  message: string;
  details?: string;
  lien?: string;
  urgence?: "normale" | "haute";
  email?: boolean;
  push?: boolean;
  fenetreMs?: number;
  max?: number;
};
export type Etat = "envoye" | "echec" | "inactif";
export type ResultatAlerte = { ignoree: boolean; push: Etat; email: Etat };

export const pushConfigure = () => Boolean(process.env.NTFY_TOPIC);

async function pousser(a: Alerte): Promise<Etat> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return "inactif";
  try {
    const r = await fetch((process.env.NTFY_URL || "https://ntfy.sh").replace(/\/$/, ""), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.NTFY_TOKEN ? { Authorization: `Bearer ${process.env.NTFY_TOKEN}` } : {}) },
      body: JSON.stringify({ topic, title: a.titre, message: a.message, priority: a.urgence === "haute" ? 4 : 3, tags: a.urgence === "haute" ? ["rotating_light"] : ["moneybag"], ...(a.lien ? { click: a.lien } : {}) }),
      signal: AbortSignal.timeout(6000),
    });
    return r.ok ? "envoye" : "echec";
  } catch {
    return "echec";
  }
}

export async function alerter(a: Alerte): Promise<ResultatAlerte> {
  try {
    try {
      if ((await enregistrer("alerte", a.cle, a.fenetreMs ?? 6 * 3600_000)) > (a.max ?? 1)) return { ignoree: true, push: "inactif", email: "inactif" };
    } catch {
      /* limiteur indisponible : mieux vaut alerter deux fois que jamais */
    }
    const push = a.push === false ? "inactif" : await pousser(a);
    let email: Etat = "inactif";
    if (a.email !== false && env.adminEmail()) {
      const { courriels, enEchec } = await import("./mail");
      const m = await courriels.adminAlerte(a.titre, a.details || a.message, a.lien);
      email = enEchec(m) ? "echec" : "envoye";
    }
    return { ignoree: false, push, email };
  } catch (e) {
    console.error("[alerte]", (e as Error).message);
    return { ignoree: false, push: "echec", email: "echec" };
  }
}
