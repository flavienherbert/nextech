// Envoi des e-mails. Chaque message est TOUJOURS archivé (lisible dans l'administration), puis envoyé par le premier
// service qui répond, dans l'ordre : Brevo (BREVO_API_KEY), Resend (RESEND_API_KEY), SMTP (SMTP_USER + SMTP_PASSWORD,
// par défaut le compte Gmail du studio). MAIL_FROM est requis. Sans aucun service : archivage seul.
import crypto from "node:crypto";
import { env } from "./env";
import { store, maintenant, nomStatut, type Commande, type Courriel } from "./store";
import nodemailer from "nodemailer";
import { alerter } from "./alertes";
import { formuleParId, euros, delaiTexte } from "./formules";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function gabarit(titre: string, corps: string, bouton?: { texte: string; url: string }) {
  const b = bouton
    ? `<p style="margin:28px 0"><a href="${esc(bouton.url)}" style="background:#ff5a2b;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px;display:inline-block">${esc(bouton.texte)}</a></p><p style="font-size:13px;color:#777">Si le bouton ne fonctionne pas, copiez ce lien : ${esc(bouton.url)}</p>`
    : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f1ec;font-family:Arial,Helvetica,sans-serif;color:#17140f"><div style="max-width:600px;margin:0 auto;padding:32px 22px"><p style="font-size:20px;margin:0 0 26px">Studio <span style="color:#e2441a;font-style:italic">Accroche</span></p><div style="background:#fff;border-radius:14px;padding:28px 26px;line-height:1.55;font-size:16px"><h1 style="font-size:22px;margin:0 0 16px">${esc(titre)}</h1>${corps}${b}</div><p style="font-size:12px;color:#888;margin:22px 4px 0">Studio Accroche — publicités vidéo avec présentateur généré par IA.</p></div></body></html>`;
}

const enTexte = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|h1|li|tr|div)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();

// Sépare « Nom <adresse> » en ses deux parties.
function expediteur() {
  const m = env.mailFrom().match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { nom: m[1] || "Studio Accroche", adresse: m[2] } : { nom: "Studio Accroche", adresse: env.mailFrom().trim() };
}

type Resultat = { ok: boolean; erreur?: string };
type Transport = { nom: string; envoyer: (a: string, objet: string, html: string, texte: string) => Promise<Resultat> };

const delai = () => Number(process.env.MAIL_TIMEOUT_MS) || 8000;
const viaHttp = async (requete: Promise<Response>): Promise<Resultat> => {
  try {
    const r = await requete;
    if (r.ok) return { ok: true };
    const texte = (await r.text()).slice(0, 300);
    // Cause la plus fréquente : Brevo n'accepte que les adresses IP déclarées dans son compte, or celles de l'hébergeur changent.
    if (r.status === 401 && /unrecogni[sz]ed IP/i.test(texte))
      return { ok: false, erreur: `échec 401 : Brevo refuse l'adresse IP du serveur (réglage « Authorized IPs » de votre compte Brevo : Security, Authorized IPs, désactiver le blocage). Détail Brevo : ${texte.slice(0, 120)}` };
    return { ok: false, erreur: `échec ${r.status} : ${texte.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, erreur: `échec : ${(e as Error).message}` };
  }
};

// Messagerie classique (SMTP) : par défaut le compte Gmail du studio avec un « mot de passe d'application ».
// Voie principale dès qu'elle est configurée (SMTP_USER + SMTP_PASSWORD) ; Brevo et Resend prennent le relais en cas d'échec.
export const smtpConfigure = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD);
// Google affiche le mot de passe d'application par groupes de 4 lettres séparés par des espaces (« abcd efgh ijkl mnop ») :
// copié tel quel, il contient des espaces (ou des espaces insécables) qu'il faut retirer.
export const motDePasseSmtp = () => (process.env.SMTP_PASSWORD || "").replace(/[\s\u00a0\u200b"']/g, "");

// Services d'envoi dans l'ordre d'essai : le suivant prend le relais quand le précédent échoue.
// La messagerie SMTP (Gmail du studio) passe en premier : l'expéditeur étant une adresse Gmail, seul Gmail peut signer
// l'e-mail à sa place (SPF/DKIM/DMARC alignés) ; Brevo et Resend, qui envoient depuis d'autres serveurs, servent de secours.
function transports(): Transport[] {
  if (!env.mailFrom()) return [];
  const e = expediteur();
  const liste: Transport[] = [];
  if (smtpConfigure())
    liste.push({
      nom: "smtp",
      envoyer: async (a, objet, html, texte) => {
        try {
          const port = Number(process.env.SMTP_PORT) || 465;
          const t = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465,
            auth: { user: (process.env.SMTP_USER || "").trim(), pass: motDePasseSmtp() },
            connectionTimeout: delai(), greetingTimeout: delai(), socketTimeout: delai() + 4000,
          });
          await t.sendMail({ from: `"${e.nom}" <${e.adresse}>`, to: a, subject: objet, html, text: texte, ...(env.legal().email ? { replyTo: env.legal().email } : {}) });
          return { ok: true };
        } catch (err) {
          return { ok: false, erreur: `échec smtp : ${(err as Error).message.slice(0, 200)}` };
        }
      },
    });
  const brevo = process.env.BREVO_API_KEY;
  if (brevo)
    liste.push({
      nom: "brevo",
      envoyer: (a, objet, html, texte) =>
        viaHttp(fetch(`${process.env.BREVO_API_BASE || "https://api.brevo.com"}/v3/smtp/email`, {
          method: "POST",
          signal: AbortSignal.timeout(delai()),
          headers: { "api-key": brevo, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ sender: { name: e.nom, email: e.adresse }, to: [{ email: a }], subject: objet, htmlContent: html, textContent: texte, ...(env.legal().email ? { replyTo: { email: env.legal().email } } : {}) }),
        })),
    });
  if (env.resendKey())
    liste.push({
      nom: "resend",
      envoyer: (a, objet, html, texte) =>
        viaHttp(fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
          method: "POST",
          signal: AbortSignal.timeout(delai()),
          headers: { Authorization: `Bearer ${env.resendKey()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: `${e.nom} <${e.adresse}>`, to: [a], subject: objet, html, text: texte, ...(env.legal().email ? { reply_to: env.legal().email } : {}) }),
        })),
    });
  return liste;
}

// Noms des services d'envoi configurés, dans l'ordre d'essai (vide : aucun envoi réel).
export const servicesEnvoi = () => transports().map((t) => t.nom);
export const envoiReel = () => servicesEnvoi().join(" puis ") || null;

// Un e-mail qui échoue ne doit jamais faire échouer la commande : l'échec est archivé, visible, et prévient l'administrateur.
async function envoyer(a: string, objet: string, html: string, commande?: string) {
  const m: Courriel = { id: crypto.randomBytes(6).toString("hex"), date: maintenant(), a, objet, html, texte: enTexte(html), commande, pilote: "fichier", resultat: "archivé (aucun envoi réel)" };
  const ts = transports();
  if (!a) {
    m.resultat = "non envoyé : destinataire manquant";
  } else if (ts.length) {
    const essais: string[] = [];
    for (const t of ts) {
      const r = await t.envoyer(a, objet, html, m.texte);
      m.pilote = t.nom;
      if (r.ok) { m.resultat = "envoyé"; break; }
      m.resultat = r.erreur || "échec";
      essais.push(`${t.nom} : ${m.resultat}`);
    }
    if (essais.length) m.essais = essais;
    if (m.resultat !== "envoyé") {
      // Le téléphone prévient quand l'e-mail ne passe pas (l'e-mail ne peut pas signaler sa propre panne).
      await alerter({
        cle: `email-echec-${commande || objet}`,
        titre: "E-mail non envoyé",
        message: a === env.adminEmail() ? "Une notification qui vous était destinée n'a pas pu partir par e-mail." : "Un e-mail destiné à un client n'a pas pu partir. Ouvrez l'administration pour le renvoyer.",
        details: `Destinataire : ${a}\nObjet : ${objet}\n${essais.join("\n")}`,
        lien: `${env.baseUrl()}/admin/courriels`,
        urgence: "haute", email: false,
      });
    }
  }
  await store.archiverCourriel(m).catch((e) => console.error("[courriel] archivage impossible :", (e as Error).message));
  return m;
}

// Liste des fichiers livrés, avec un lien de téléchargement privé par fichier (le jeton de la commande fait office de clé :
// il est secret, ne figure que dans l'e-mail et la page du client, et les fichiers ne sont accessibles qu'une fois la livraison envoyée).
const listeLivrables = (c: Commande) => {
  if (!c.livrables.length) return "";
  const base = `${env.baseUrl()}/api/commande/${c.token}/fichier`;
  const mo = (n: number) => `${(n / 1048576).toFixed(1).replace(".", ",")} Mo`;
  return `<p style="margin:18px 0 6px"><strong>Vos fichiers (${c.livrables.length})</strong></p><ul style="padding-left:18px;margin:0">${c.livrables.map((f) => `<li style="margin:0 0 10px"><a href="${esc(`${base}/${f.id}`)}" style="color:#e2441a;font-weight:600">${esc(f.nom)}</a> <span style="color:#777">(${mo(f.taille)})</span><br><span style="font-size:12px;color:#777;word-break:break-all">${esc(`${base}/${f.id}`)}</span></li>`).join("")}</ul><p style="font-size:13px;color:#777">Ces liens sont personnels et privés : ne les partagez pas. Les fichiers restent disponibles 90 jours.</p>`;
};

const lienClient = (c: Commande) => `${env.baseUrl()}/commande/${c.token}`;
const lienAdmin = (c: Commande) => `${env.baseUrl()}/admin/commande/${c.id}`;
const destinataire = (c: Commande) => c.brief?.email || c.paiement.emailStripe || "";

function recap(c: Commande) {
  const f = formuleParId(c.formule)!;
  return `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:14px 0"><tr><td style="padding:6px 0;color:#777">Commande</td><td style="padding:6px 0;text-align:right"><strong>${esc(c.id)}</strong></td></tr><tr><td style="padding:6px 0;color:#777">Formule</td><td style="padding:6px 0;text-align:right">${esc(f.nom)} — ${f.videos} vidéo${f.videos > 1 ? "s" : ""}</td></tr><tr><td style="padding:6px 0;color:#777">Montant payé</td><td style="padding:6px 0;text-align:right">${euros(c.montantCents)}</td></tr><tr><td style="padding:6px 0;color:#777">Délai</td><td style="padding:6px 0;text-align:right">${esc(delaiTexte(f))} après réception du brief</td></tr></table>`;
}

// Tableau « libellé / valeur » des e-mails.
const tableau = (lignes: [string, string][]) =>
  `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:14px 0">${lignes.map(([k, v]) => `<tr><td style="padding:6px 10px 6px 0;color:#777;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;text-align:right"><strong>${esc(v)}</strong></td></tr>`).join("")}</table>`;
const dateFr = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function briefHtml(c: Commande) {
  const b = c.brief;
  if (!b) return "<p>Brief non encore reçu.</p>";
  const l = (k: string, v: string) => (v ? `<tr><td style="padding:6px 10px 6px 0;color:#777;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>` : "");
  const fichiers = c.fichiersClient.length
    ? `<p><strong>Fichiers transmis (${c.fichiersClient.length})</strong><br>${c.fichiersClient.map((f) => `${esc(f.nom)} — ${(f.taille / 1048576).toFixed(1)} Mo`).join("<br>")}<br><span style="font-size:13px;color:#777">À télécharger depuis l'espace administrateur.</span></p>`
    : "<p>Aucun fichier transmis.</p>";
  return `<table style="border-collapse:collapse;font-size:15px;margin:10px 0">${l("Nom", b.nom)}${l("E-mail", b.email)}${l("Téléphone", b.telephone)}${l("Marque", b.marque)}${l("Lien", b.lien)}${l("Produit", b.produit)}${l("Style", b.style)}${l("Client type", b.cible)}${l("Arguments", b.arguments)}${l("À éviter", b.aEviter)}${l("Complément", b.complement)}</table>${fichiers}`;
}

// Un courriel est « en échec » si le service d'envoi l'a refusé ou n'a pas répondu (pas s'il est seulement archivé).
export const enEchec = (m: Courriel) => /^(échec|non envoyé)/.test(m.resultat);

export const courriels = {
  // Renvoie un courriel archivé en échec, à l'identique (nouvelle archive, l'ancienne est conservée).
  renvoyer: (m: Courriel) => envoyer(m.a, m.objet, m.html, m.commande),

  // Alerte l'administrateur quand un paiement est arrivé sans pouvoir être appliqué à une commande.
  adminAnomalie: (details: string) =>
    envoyer(env.adminEmail(), "[Studio Accroche] ⚠ Paiement reçu mais non appliqué",
      gabarit("Paiement à vérifier", `<p>Stripe a signalé un paiement que le site n'a pas pu rattacher à une commande :</p><p><strong>${esc(details)}</strong></p><p>Vérifiez-le dans le tableau de bord Stripe et traitez-le à la main (remboursement ou création de la commande).</p>`)),

  // — Client —
  confirmationCommande: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} confirmée — il nous manque votre brief`,
      gabarit("Votre commande est confirmée", `<p>Merci, votre paiement a bien été reçu.</p>${recap(c)}<p>Pour lancer la production, il nous faut quelques informations sur votre produit. Cela prend cinq minutes.</p>`, { texte: "Remplir le brief", url: lienClient(c) }), c.id),

  briefRecu: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} — brief bien reçu`,
      gabarit("Nous avons tout ce qu'il faut", `<p>Bonjour ${esc(c.brief?.nom || "")},</p><p>Votre brief est bien arrivé. Vous recevrez d'abord le script pour validation, puis ${formuleParId(c.formule)!.videos > 1 ? "vos vidéos" : "votre vidéo"}.</p>${recap(c)}<p>Vous pouvez suivre l'avancement à tout moment :</p>`, { texte: "Suivre ma commande", url: lienClient(c) }), c.id),

  enProduction: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} — production lancée`,
      gabarit("Votre commande est en production", `<p>La réalisation a commencé. Vous recevrez un e-mail dès que le résultat sera prêt à être validé.</p>`, { texte: "Suivre ma commande", url: lienClient(c) }), c.id),

  aValider: (c: Commande, correction = false) =>
    envoyer(destinataire(c), `Commande ${c.id} — ${correction ? "version corrigée à valider" : "à valider"}`,
      gabarit(correction ? "Votre version corrigée est prête" : "C'est prêt, à vous de valider", `<p>${correction ? "Nous avons pris en compte votre retouche : la nouvelle version est disponible." : "Votre livraison est disponible."} Téléchargez vos fichiers ci-dessous, regardez-les, puis validez la livraison ou demandez une retouche depuis votre espace.</p>${listeLivrables(c)}`, { texte: "Voir et valider", url: lienClient(c) }), c.id),

  livree: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} — vos fichiers sont disponibles`,
      gabarit("Votre commande est livrée", `<p>Vos fichiers sont prêts au téléchargement. Ils restent disponibles 90 jours : pensez à les enregistrer.</p>${listeLivrables(c)}${c.facture && !c.facture.specimen ? `<p>Votre facture n° ${esc(c.facture.numero)} est disponible sur la même page.</p>` : ""}<p style="font-size:14px;color:#555">Rappel : ces vidéos sont générées par intelligence artificielle. Lors de leur diffusion, activez la mention « contenu généré par IA » proposée par la plateforme.</p>`, { texte: "Télécharger mes fichiers", url: lienClient(c) }), c.id),

  // — Administrateur —
  // Envoyé UNIQUEMENT quand Stripe a confirmé le paiement (jamais pour une commande seulement créée).
  adminPaiement: (c: Commande) => {
    const f = formuleParId(c.formule)!;
    return envoyer(env.adminEmail(), `[Studio Accroche] Nouvelle commande payée — ${c.id} — ${f.nom} — ${euros(c.montantCents)}`,
      gabarit("Nouvelle commande payée", `<p>Un client vient de payer : le paiement est confirmé par Stripe.</p>${tableau([
        ["Commande", c.id],
        ["Client", c.brief?.nom || c.paiement.nomStripe || "non renseigné"],
        ["E-mail", c.brief?.email || c.paiement.emailStripe || "non renseigné"],
        ["Offre", `${f.nom} — ${f.videos} vidéo${f.videos > 1 ? "s" : ""}`],
        ["Montant payé", euros(c.montantCents)],
        ["Payée le", dateFr(c.paiement.payeLe || c.creeLe)],
        ["Délai promis", `${delaiTexte(f)} après réception du brief`],
      ])}<p><strong>Et maintenant ?</strong> Le client vient de recevoir un e-mail pour remplir son brief. Vous serez prévenu dès qu'il l'aura envoyé : vous n'avez rien à faire d'ici là.</p>`, { texte: "Ouvrir la commande", url: lienAdmin(c) }), c.id);
  },

  // Alerte à l'administrateur (problème technique, paiement à vérifier, e-mail en échec…).
  adminAlerte: (titre: string, details: string, lien?: string) =>
    envoyer(env.adminEmail(), `[Studio Accroche] ⚠ ${titre}`,
      gabarit(titre, `<p>${esc(details).replace(/\n/g, "<br>")}</p>`, lien ? { texte: "Ouvrir l'administration", url: lien } : undefined)),

  // Récapitulatif du matin : seulement ce qui attend une action.
  adminResume: (lignes: { titre: string; elements: string[] }[], lien: string) =>
    envoyer(env.adminEmail(), `[Studio Accroche] Récap du jour — ${lignes.reduce((n, l) => n + l.elements.length, 0)} point${lignes.reduce((n, l) => n + l.elements.length, 0) > 1 ? "s" : ""} à traiter`,
      gabarit("Ce qui vous attend aujourd'hui", lignes.map((l) => `<h3 style="margin:18px 0 6px;font-size:16px">${esc(l.titre)} (${l.elements.length})</h3><ul style="margin:0;padding-left:18px">${l.elements.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`).join(""), { texte: "Ouvrir l'administration", url: lien })),

  // Relance automatique d'un client qui a payé sans envoyer son brief.
  relanceBrief: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} — il nous manque encore votre brief`,
      gabarit("Nous attendons votre brief", `<p>Votre paiement est bien enregistré, mais nous n'avons pas encore reçu les informations sur votre produit. Sans elles, nous ne pouvons pas commencer, et le délai de livraison ne démarre qu'à leur réception.</p><p>Cela prend cinq minutes : votre produit, trois photos, quelques arguments (un site internet n'est pas nécessaire).</p>`, { texte: "Remplir mon brief", url: lienClient(c) }), c.id),

  adminBrief: (c: Commande) =>
    envoyer(env.adminEmail(), `[Studio Accroche] Brief reçu — ${c.id} — ${c.brief?.marque || ""}`,
      gabarit(`Brief reçu de ${c.brief?.nom || "client"}`, `${recap(c)}${briefHtml(c)}`, { texte: "Ouvrir la commande", url: lienAdmin(c) }), c.id),

  adminRetouche: (c: Commande, message: string) =>
    envoyer(env.adminEmail(), `[Studio Accroche] Retouche demandée — ${c.id}`,
      gabarit("Le client demande une retouche", `${recap(c)}<p style="background:#f4f1ec;padding:14px;border-radius:8px">${esc(message).replace(/\n/g, "<br>")}</p>`, { texte: "Ouvrir la commande", url: lienAdmin(c) }), c.id),

  adminValidation: (c: Commande) =>
    envoyer(env.adminEmail(), `[Studio Accroche] Commande validée — ${c.id}`,
      gabarit("Le client a validé la livraison", `${recap(c)}<p>Statut : ${esc(nomStatut(c.statut))}.</p>`, { texte: "Ouvrir la commande", url: lienAdmin(c) }), c.id),
};
