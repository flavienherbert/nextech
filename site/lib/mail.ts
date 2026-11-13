// Envoi des e-mails. Deux pilotes :
//  - « fichier » (par défaut) : rien n'est envoyé, le message est archivé et lisible dans l'administration ;
//  - « resend » : envoi réel par l'API Resend si RESEND_API_KEY et MAIL_FROM sont définis.
import crypto from "node:crypto";
import { env } from "./env";
import { store, maintenant, nomStatut, type Commande, type Courriel } from "./store";
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

type Pilote = { nom: string; envoyer: (a: string, objet: string, html: string, texte: string) => Promise<Response> };

function pilote(): Pilote | null {
  if (!env.mailFrom()) return null;
  const e = expediteur();
  const brevo = process.env.BREVO_API_KEY;
  if (brevo)
    return {
      nom: "brevo",
      envoyer: (a, objet, html, texte) =>
        fetch(`${process.env.BREVO_API_BASE || "https://api.brevo.com"}/v3/smtp/email`, {
          method: "POST",
          headers: { "api-key": brevo, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ sender: { name: e.nom, email: e.adresse }, to: [{ email: a }], subject: objet, htmlContent: html, textContent: texte, ...(env.legal().email ? { replyTo: { email: env.legal().email } } : {}) }),
        }),
    };
  if (env.resendKey())
    return {
      nom: "resend",
      envoyer: (a, objet, html, texte) =>
        fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.resendKey()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: `${e.nom} <${e.adresse}>`, to: [a], subject: objet, html, text: texte, ...(env.legal().email ? { reply_to: env.legal().email } : {}) }),
        }),
    };
  return null;
}

export const envoiReel = () => pilote()?.nom ?? null;

// Un e-mail qui échoue ne doit jamais faire échouer la commande : l'échec est archivé et visible.
async function envoyer(a: string, objet: string, html: string, commande?: string) {
  const m: Courriel = { id: crypto.randomBytes(6).toString("hex"), date: maintenant(), a, objet, html, texte: enTexte(html), commande, pilote: "fichier", resultat: "archivé (aucun envoi réel)" };
  const p = pilote();
  if (!a) {
    m.resultat = "non envoyé : destinataire manquant";
  } else if (p) {
    m.pilote = p.nom;
    try {
      const r = await p.envoyer(a, objet, html, m.texte);
      m.resultat = r.ok ? "envoyé" : `échec ${r.status} : ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      m.resultat = `échec : ${(e as Error).message}`;
    }
  }
  await store.archiverCourriel(m).catch((e) => console.error("[courriel] archivage impossible :", (e as Error).message));
  return m;
}

const lienClient = (c: Commande) => `${env.baseUrl()}/commande/${c.token}`;
const lienAdmin = (c: Commande) => `${env.baseUrl()}/admin/commande/${c.id}`;
const destinataire = (c: Commande) => c.brief?.email || c.paiement.emailStripe || "";

function recap(c: Commande) {
  const f = formuleParId(c.formule)!;
  return `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:14px 0"><tr><td style="padding:6px 0;color:#777">Commande</td><td style="padding:6px 0;text-align:right"><strong>${esc(c.id)}</strong></td></tr><tr><td style="padding:6px 0;color:#777">Formule</td><td style="padding:6px 0;text-align:right">${esc(f.nom)} — ${f.videos} vidéo${f.videos > 1 ? "s" : ""}</td></tr><tr><td style="padding:6px 0;color:#777">Montant payé</td><td style="padding:6px 0;text-align:right">${euros(c.montantCents)}</td></tr><tr><td style="padding:6px 0;color:#777">Délai</td><td style="padding:6px 0;text-align:right">${esc(delaiTexte(f))} après réception du brief</td></tr></table>`;
}

function briefHtml(c: Commande) {
  const b = c.brief;
  if (!b) return "<p>Brief non encore reçu.</p>";
  const l = (k: string, v: string) => (v ? `<tr><td style="padding:6px 10px 6px 0;color:#777;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>` : "");
  const fichiers = c.fichiersClient.length
    ? `<p><strong>Fichiers transmis (${c.fichiersClient.length})</strong><br>${c.fichiersClient.map((f) => `${esc(f.nom)} — ${(f.taille / 1048576).toFixed(1)} Mo`).join("<br>")}<br><span style="font-size:13px;color:#777">À télécharger depuis l'espace administrateur.</span></p>`
    : "<p>Aucun fichier transmis.</p>";
  return `<table style="border-collapse:collapse;font-size:15px;margin:10px 0">${l("Nom", b.nom)}${l("E-mail", b.email)}${l("Téléphone", b.telephone)}${l("Marque", b.marque)}${l("Lien", b.lien)}${l("Produit", b.produit)}${l("Style", b.style)}${l("Client type", b.cible)}${l("Arguments", b.arguments)}${l("À éviter", b.aEviter)}${l("Complément", b.complement)}</table>${fichiers}`;
}

export const courriels = {
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

  aValider: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} — à valider`,
      gabarit("C'est prêt, à vous de valider", `<p>Votre livraison est disponible. Regardez-la, puis validez-la ou demandez une retouche depuis votre espace.</p>`, { texte: "Voir et valider", url: lienClient(c) }), c.id),

  livree: (c: Commande) =>
    envoyer(destinataire(c), `Commande ${c.id} — vos fichiers sont disponibles`,
      gabarit("Votre commande est livrée", `<p>Vos fichiers sont prêts au téléchargement depuis votre lien privé. Ils y restent disponibles 90 jours : pensez à les enregistrer.</p>${c.facture && !c.facture.specimen ? `<p>Votre facture n° ${esc(c.facture.numero)} est disponible sur la même page.</p>` : ""}<p style="font-size:14px;color:#555">Rappel : ces vidéos sont générées par intelligence artificielle. Lors de leur diffusion, activez la mention « contenu généré par IA » proposée par la plateforme.</p>`, { texte: "Télécharger mes fichiers", url: lienClient(c) }), c.id),

  // — Administrateur —
  adminPaiement: (c: Commande) =>
    envoyer(env.adminEmail(), `[Studio Accroche] Paiement reçu — ${c.id} — ${euros(c.montantCents)}`,
      gabarit("Nouveau paiement confirmé", `${recap(c)}<p>E-mail saisi au paiement : ${esc(c.paiement.emailStripe || "—")}</p><p>Le client doit encore transmettre son brief.</p>`, { texte: "Ouvrir la commande", url: lienAdmin(c) }), c.id),

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
