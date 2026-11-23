// Liste de lancement : ce qui reste à faire avant d'ouvrir le site à la vente, contrôlé automatiquement quand c'est possible.
// Aucun appel à un service extérieur : la page est instantanée et ne coûte rien. Les contrôles qui demandent un vrai test
// (paiement de bout en bout, réception des e-mails) sont dans Administration → Diagnostic et dans TEST-CLIENT.md.
import { env, modePaiement } from "./env";
import { EMPLACEMENTS } from "./emplacements";
import { depot } from "./depot";
import { envoiReel } from "./mail";
import { chargerMedias } from "./medias";
import { pushConfigure } from "./alertes";
import { echecsUtiles } from "./rattrapage";
import { store } from "./store";
import { SHOW_EXAMPLE_VIDEO } from "@/app/config";

export type EtatControle = "ok" | "bloquant" | "conseil" | "info";
export type Controle = { id: string; nom: string; etat: EtatControle; detail: string; ou?: string; lien?: string };
export type Groupe = { titre: string; controles: Controle[] };

const CLE_MANUEL = "reglages/lancement.json";

// Ce qu'aucun contrôle automatique ne peut constater : le vendeur coche lui-même.
export const A_FAIRE_SOI_MEME = [
  { id: "secrets", nom: "Les trois secrets exposés ont été remplacés (mot de passe administrateur, SESSION_SECRET, TACHES_SECRET)", detail: "Procédure pas à pas : ROTATION-SECRETS.md. Une dizaine de minutes dans Netlify." },
  { id: "gmail", nom: "Le mot de passe d'application Gmail est valide : une notification de test arrive dans la boîte du studio", detail: "Administration → Réglages e-mail, puis Diagnostic → Envoyer une notification de test." },
  { id: "essai", nom: "Un test complet de commande a été fait de bout en bout (paiement, brief, livraison, validation, facture)", detail: "Procédure : TEST-CLIENT.md. Avec une carte de test Stripe tant que le site est en mode test." },
  { id: "stripe-compte", nom: "Le compte Stripe est activé pour encaisser (identité, IBAN, activité) et le webhook du mode réel est créé", detail: "Tableau de bord Stripe. La clé réelle et le secret du webhook s'ajoutent ensuite dans Netlify." },
  { id: "statut", nom: "L'activité est déclarée (SIRET) et les mentions légales et conditions de vente ont été relues", detail: "Relecture conseillée par un professionnel (juriste, expert-comptable, CCI) avant d'encaisser le premier euro." },
  { id: "higgsfield", nom: "Un abonnement Higgsfield est actif et une première vidéo de test a été produite avec la procédure du studio", detail: "Procédure : production/HIGGSFIELD.md. Un abonnement se prend sur higgsfield.ai : rien n'est souscrit à votre place." },
  { id: "exemples", nom: "Les vidéos d'exemple sont de vous (pas d'un autre créateur) et publiées dans Administration → Médias", detail: "Une vraie démonstration est l'élément qui convainc le plus. Les exemples doivent montrer ce que vous livrez." },
  { id: "domaine", nom: "Le site a une adresse définitive (nom de domaine) si vous en voulez une", detail: "Facultatif. Sans domaine, l'adresse .netlify.app fonctionne. Un domaine se règle dans Netlify, puis SITE_URL est mise à jour." },
] as const;

export async function lireManuel(): Promise<Set<string>> {
  try {
    const l = await depot().lire(CLE_MANUEL);
    const j = l ? (JSON.parse(l.corps.toString("utf8")) as { faits?: unknown }) : {};
    return new Set(Array.isArray(j.faits) ? j.faits.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export async function basculerManuel(id: string): Promise<boolean> {
  if (!A_FAIRE_SOI_MEME.some((x) => x.id === id)) return false;
  for (let essai = 0; essai < 6; essai++) {
    const l = await depot().lire(CLE_MANUEL);
    const faits = await lireManuel();
    if (faits.has(id)) faits.delete(id);
    else faits.add(id);
    if (await depot().ecrire(CLE_MANUEL, JSON.stringify({ faits: [...faits] }), l ? { siVersion: l.version } : { siAbsent: true })) return true;
    await new Promise((ok) => setTimeout(ok, 40 * (essai + 1)));
  }
  return false;
}

const c = (id: string, nom: string, etat: EtatControle, detail: string, ou?: string, lien?: string): Controle => ({ id, nom, etat, detail, ou, lien });
const NETLIFY = "Netlify → Site configuration → Environment variables";

export async function controlerLancement(): Promise<{ groupes: Groupe[]; bloquants: number; conseils: number }> {
  const m = await chargerMedias();
  const groupes: Groupe[] = [];

  // — Contenu
  const perso = EMPLACEMENTS.filter((e) => m.envoye(e.id)).length;
  const nbExemples = EMPLACEMENTS.filter((e) => e.id.startsWith("exemple-") && e.genre === "video" && m.envoye(e.id)).length;
  const demoPerso = Boolean(m.envoye("demo-video"));
  groupes.push({
    titre: "Contenu du site",
    controles: [
      SHOW_EXAMPLE_VIDEO
        ? c("demo", "Vidéo d'exemple du studio", "ok", demoPerso ? "Votre vidéo (envoyée dans l'administration) est affichée sur la page d'accueil." : "SHOW_EXAMPLE_VIDEO vaut true : la section affiche le fichier public/videos/exemple.mp4. Vérifiez qu'il est bien déposé.")
        : c("demo", "Vidéo d'exemple du studio", "conseil", "La section « vidéo d'exemple » est masquée (SHOW_EXAMPLE_VIDEO n'est pas à true). Déposez votre vidéo dans public/videos/exemple.mp4 (ou envoyez-la dans l'administration), puis passez SHOW_EXAMPLE_VIDEO à true : c'est l'élément qui convainc le plus.", `${NETLIFY} → SHOW_EXAMPLE_VIDEO`),
      nbExemples > 0
        ? c("exemples", "Vidéos d'exemple", "ok", `${nbExemples} vidéo${nbExemples > 1 ? "s" : ""} d'exemple publiée${nbExemples > 1 ? "s" : ""}.`)
        : c("exemples", "Vidéos d'exemple", "conseil", "Aucune. La section « Exemples » n'apparaît pas. Trois exemples (un par angle d'accroche) rassurent un acheteur.", "Administration → Images et vidéos → Exemples", "/admin/medias#exemple-1"),
      c("images", "Images du site", perso > 1 ? "ok" : "info", `${perso} emplacement${perso > 1 ? "s" : ""} sur ${EMPLACEMENTS.length} personnalisé${perso > 1 ? "s" : ""}. Les images d'origine sont des photographies d'illustration, indiquées comme telles sur le site : elles sont acceptables au lancement, mais vos propres visuels sont plus crédibles.`, "Administration → Images et vidéos", "/admin/medias"),
      m.envoye("partage")
        ? c("partage", "Vignette de partage (réseaux sociaux)", "ok", "Personnalisée.")
        : c("partage", "Vignette de partage (réseaux sociaux)", "info", "L'image d'origine sera utilisée quand le lien est partagé.", "Administration → Images et vidéos → Vignette de partage", "/admin/medias#partage"),
    ],
  });

  // — Informations légales
  const l = env.legal();
  const manquants = [!l.nom && "nom du titulaire", !l.siret && "SIRET", !l.adresse && "adresse", !l.email && "e-mail de contact"].filter(Boolean) as string[];
  groupes.push({
    titre: "Informations légales",
    controles: [
      manquants.length
        ? c("legal", "Mentions légales complètes", "bloquant", `Manque : ${manquants.join(", ")}. Le paiement réel reste fermé tant que ce n'est pas renseigné.`, `${NETLIFY} → NEXT_PUBLIC_LEGAL_NAME, NEXT_PUBLIC_LEGAL_SIRET, NEXT_PUBLIC_LEGAL_ADDRESS`)
        : c("legal", "Mentions légales complètes", "ok", `${l.nom}, SIRET ${l.siret}.`),
      l.mediateur
        ? c("mediateur", "Médiateur de la consommation", "ok", l.mediateur)
        : c("mediateur", "Médiateur de la consommation", "conseil", "Non renseigné. Obligatoire pour vendre à des consommateurs ; à vérifier selon votre clientèle (boutiques en ligne = clients professionnels : voir avec un conseil).", `${NETLIFY} → NEXT_PUBLIC_LEGAL_MEDIATEUR`),
    ],
  });

  // — Paiement
  const p = modePaiement();
  groupes.push({
    titre: "Paiement",
    controles: [
      p.mode === "reel"
        ? c("paiement", "Paiements réels", "ok", "Le site encaisse de vrais paiements.")
        : c("paiement", "Paiements réels", "bloquant", p.mode === "test" ? "Stripe est en mode test : aucun vrai paiement n'est possible. Pour ouvrir : clé réelle (sk_live_…), webhook du mode réel, VENTES_REELLES=oui." : `Paiement fermé : ${p.raison || "non configuré"}`, `${NETLIFY} → STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VENTES_REELLES`),
    ],
  });

  // — Notifications
  const envoi = envoiReel();
  let enEchec = 0;
  try {
    enEchec = echecsUtiles(await store.courriels(), await store.commandes(), Date.now()).length;
  } catch {
    /* le stockage est contrôlé plus bas */
  }
  groupes.push({
    titre: "E-mails et notifications",
    controles: [
      envoi
        ? c("mail", "Envoi des e-mails aux clients", enEchec ? "conseil" : "ok", enEchec ? `Service configuré (${envoi}), mais ${enEchec} e-mail${enEchec > 1 ? "s" : ""} non envoyé${enEchec > 1 ? "s" : ""} à renvoyer.` : `Service configuré (${envoi}).`, "Administration → E-mails", "/admin/courriels")
        : c("mail", "Envoi des e-mails aux clients", "bloquant", "Aucun service d'envoi configuré : les clients ne recevraient ni confirmation, ni livraison.", "Administration → Réglages e-mail", "/admin/reglages"),
      env.adminEmail()
        ? c("admin-mail", "Adresse qui reçoit les nouvelles commandes", "ok", "Renseignée.")
        : c("admin-mail", "Adresse qui reçoit les nouvelles commandes", "bloquant", "ADMIN_EMAIL manque : vous ne seriez pas prévenu par e-mail.", `${NETLIFY} → ADMIN_EMAIL`),
      pushConfigure()
        ? c("push", "Notification sur le téléphone", "ok", "Activée (application ntfy).")
        : c("push", "Notification sur le téléphone", "conseil", "Non activée : vous ne seriez prévenu que par e-mail.", `${NETLIFY} → NTFY_TOPIC`),
    ],
  });

  // — Sécurité
  const mdp = env.adminPassword();
  const faible = mdp.length < 14 || /^(demonstration|password|motdepasse|admin|azerty)/i.test(mdp);
  groupes.push({
    titre: "Sécurité",
    controles: [
      env.sessionSecret().length >= 32 ? c("session", "Clé de session", "ok", "Longueur suffisante.") : c("session", "Clé de session", "bloquant", "SESSION_SECRET manque ou fait moins de 32 caractères.", `${NETLIFY} → SESSION_SECRET`),
      faible ? c("mdp", "Mot de passe administrateur", "bloquant", "Trop court (14 caractères minimum) ou trop courant. Le site étant public, l'administration est sa porte d'entrée.", `${NETLIFY} → ADMIN_PASSWORD`) : c("mdp", "Mot de passe administrateur", "ok", "Longueur suffisante (le mot de passe n'est jamais affiché)."),
      (process.env.TACHES_SECRET || "").length >= 16 ? c("taches", "Clé des tâches quotidiennes", "ok", "Renseignée.") : c("taches", "Clé des tâches quotidiennes", "bloquant", "TACHES_SECRET manque : le récapitulatif et le nettoyage quotidiens ne seraient pas protégés.", `${NETLIFY} → TACHES_SECRET`),
      env.enProduction()
        ? c("indexation", "Référencement par les moteurs de recherche", "ok", "Ouvert (SITE_ENV=production).")
        : c("indexation", "Référencement par les moteurs de recherche", "info", "Fermé : le site est invisible de Google. C'est voulu avant le lancement. Le jour de l'ouverture : SITE_ENV=production.", `${NETLIFY} → SITE_ENV`),
    ],
  });

  // — Hébergement
  const url = env.baseUrl();
  const local = /localhost|127\.0\.0\.1/.test(url);
  const provisoire = /\.netlify\.app$/i.test(new URL(url).hostname);
  groupes.push({
    titre: "Hébergement et données",
    controles: [
      local || !url.startsWith("https://")
        ? c("url", "Adresse du site (SITE_URL)", "bloquant", `${url} : l'adresse doit être en https, sans localhost : elle sert dans les liens des e-mails.`, `${NETLIFY} → SITE_URL`)
        : c("url", "Adresse du site (SITE_URL)", provisoire ? "info" : "ok", provisoire ? `${url} : adresse provisoire de l'hébergeur. Elle fonctionne ; un nom de domaine propre est plus professionnel.` : url),
      c("stockage", "Stockage des commandes et des fichiers", /postgres/.test(depot().nom) ? "ok" : "conseil", `Mode : ${depot().nom}.${/postgres/.test(depot().nom) ? "" : " Sans base de données, les commandes ne sont pas protégées contre les écritures simultanées."}`, "Administration → Diagnostic", "/admin/diagnostic"),
    ],
  });

  const tous = groupes.flatMap((g) => g.controles);
  return { groupes, bloquants: tous.filter((x) => x.etat === "bloquant").length, conseils: tous.filter((x) => x.etat === "conseil").length };
}
