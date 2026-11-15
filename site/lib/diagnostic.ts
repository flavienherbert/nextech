// Diagnostic de la configuration réelle du site, exécuté SUR le serveur (celui de Netlify en préproduction).
// Il vérifie ce que les tests locaux ne peuvent pas voir : variables présentes, base de données, stockage,
// génération de PDF, service d'e-mail, Stripe en mode test, protection par mot de passe.
//  - Il n'affiche jamais de clé, de mot de passe ni d'adresse de connexion : seulement leur présence.
//  - Il n'écrit que sous « __diagnostic__/ » (base et stockage) et supprime tout à la fin.
//  - Il n'appelle jamais Stripe en mode réel et n'envoie aucun e-mail.
import crypto from "node:crypto";
import {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { depot, stockageS3Configure } from "./depot";
import { depotPostgres, executerSurBase, postgresConfigure } from "./depot-postgres";
import { env, modePaiement } from "./env";
import { composerPdf, vendeur } from "./factures";
import { configurationStockage } from "./supabase-config.mjs";
import { LIVRABLE_MAX_MO } from "./fichiers";
import nodemailer from "nodemailer";
import { pushConfigure } from "./alertes";
import { enEchec, envoiReel, servicesEnvoi } from "./mail";
import { stripe } from "./stripe";
import { store, type Commande } from "./store";

export type Etat = "ok" | "ko" | "avert" | "info";
export type Ligne = { nom: string; etat: Etat; detail?: string };
export type Section = { titre: string; lignes: Ligne[] };
export type Rapport = { date: string; plateforme: string; sections: Section[]; synthese: Record<Etat, number> };

const ok = (nom: string, detail?: string): Ligne => ({ nom, etat: "ok", detail });
const ko = (nom: string, detail?: string): Ligne => ({ nom, etat: "ko", detail });
const avert = (nom: string, detail?: string): Ligne => ({ nom, etat: "avert", detail });
const info = (nom: string, detail?: string): Ligne => ({ nom, etat: "info", detail });
// Les fonctions Netlify tournent sur AWS Lambda : leurs variables sont présentes à l'exécution, pas celles de la compilation.
const surNetlify = () => process.env.NETLIFY === "true" || Boolean(process.env.DEPLOY_ID || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const court = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 160);
const essayer = async (nom: string, fn: () => Promise<Ligne | Ligne[]>): Promise<Ligne[]> => {
  try {
    const r = await fn();
    return Array.isArray(r) ? r : [r];
  } catch (e) {
    return [ko(nom, court(e))];
  }
};
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────── Configuration ─────────────────────────
function configuration(): Section {
  const l: Ligne[] = [];
  const cfg = configurationStockage();
  const { mode, raison } = modePaiement();
  l.push(info("Plateforme", `${surNetlify() ? "Netlify" : "hors Netlify"}, Node ${process.version}${process.env.CONTEXT ? `, contexte ${process.env.CONTEXT}` : ""}`));
  l.push(env.baseUrl().startsWith("https://") ? ok("SITE_URL en HTTPS", env.baseUrl()) : (surNetlify() ? ko : avert)("SITE_URL en HTTPS", env.baseUrl() || "absent"));
  l.push(env.sessionSecret().length >= 32 ? ok("SESSION_SECRET (32 caractères minimum)") : ko("SESSION_SECRET (32 caractères minimum)", "absent ou trop court : l'administration est inaccessible"));
  l.push(env.adminPassword().length >= 12 ? ok("ADMIN_PASSWORD (12 caractères minimum)") : ko("ADMIN_PASSWORD (12 caractères minimum)", "absent ou trop court : l'administration est inaccessible"));
  l.push(process.env.PREPROD_PASSWORD ? ok("Protection par mot de passe de tout le site", "PREPROD_PASSWORD défini") : mode === "reel" ? info("Protection par mot de passe de tout le site", "absente : normal une fois le site ouvert au public") : avert("Protection par mot de passe de tout le site", "PREPROD_PASSWORD absent : le site est accessible à tous"));
  l.push(mode === "test" ? ok("Paiement", "mode test Stripe") : mode === "reel" ? avert("Paiement", "MODE RÉEL actif") : mode === "simulation" ? avert("Paiement", "simulateur local : ne doit pas servir en ligne") : info("Paiement", `fermé : ${raison}`));
  l.push(env.adminEmail() ? ok("ADMIN_EMAIL (notifications de commande)") : avert("ADMIN_EMAIL (notifications de commande)", "absent : l'administrateur n'est pas prévenu des commandes"));
  l.push(env.legal().email ? ok("Adresse de contact publique") : avert("Adresse de contact publique", "NEXT_PUBLIC_CONTACT_EMAIL absent"));
  const manquantsLegaux = vendeur().manquants;
  l.push(manquantsLegaux.length ? info("Mentions légales du vendeur", `incomplètes : ${manquantsLegaux.join(", ")} (nécessaires avant les ventes réelles)`) : ok("Mentions légales du vendeur"));
  l.push(postgresConfigure() ? ok("DATABASE_URL défini") : (surNetlify() ? ko : info)("DATABASE_URL défini", "absent : les commandes ne seraient pas conservées"));
  l.push(stockageS3Configure() ? ok("Stockage de fichiers configuré", `${new URL(cfg.endpoint).host}, bucket ${cfg.bucket}, région ${cfg.region}${cfg.deduit ? " (déduits de DATABASE_URL)" : ""}`) : (surNetlify() ? ko : info)("Stockage de fichiers configuré", "clés absentes : les fichiers iraient sur un disque temporaire"));
  l.push(info("Limite des vidéos livrées", `${LIVRABLE_MAX_MO} Mo`));
  l.push(process.env.TACHES_SECRET ? ok("Tâche quotidienne (purge, maintien d'activité)", "active") : info("Tâche quotidienne (purge, maintien d'activité)", "inactive : TACHES_SECRET absent"));
  l.push(info("Dépôt de données", depot().nom));
  return { titre: "Configuration", lignes: l };
}

// ───────────────────────── Base de données ─────────────────────────
async function base(): Promise<Section> {
  const l: Ligne[] = [];
  if (!postgresConfigure()) return { titre: "Base de données (PostgreSQL)", lignes: [(surNetlify() ? ko : info)("Connexion", "DATABASE_URL absent")] };
  const id = crypto.randomBytes(5).toString("hex");
  const P = `__diagnostic__/${id}`;
  const docs = depotPostgres();
  l.push(...(await essayer("Connexion", async () => {
    const t0 = Date.now();
    return executerSurBase(async (c) => {
      const v = await c.query("select version() as v, (select ssl from pg_stat_ssl where pid = pg_backend_pid()) as ssl");
      const lignes = [ok("Connexion", `${String(v.rows[0].v).split(" ").slice(0, 2).join(" ")}, ${Date.now() - t0} ms`)];
      lignes.push(v.rows[0].ssl ? ok("Connexion chiffrée (SSL)") : avert("Connexion chiffrée (SSL)", "non chiffrée"));
      const t = await c.query("select to_regclass('studio.documents') as t, (select relrowsecurity from pg_class where oid = to_regclass('studio.documents')) as rls");
      lignes.push(t.rows[0].t ? ok("Table studio.documents présente") : ko("Table studio.documents présente", "absente : exécuter sql/001-documents.sql"));
      lignes.push(t.rows[0].rls ? ok("Sécurité au niveau des lignes activée") : ko("Sécurité au niveau des lignes activée", "désactivée"));
      for (const role of ["anon", "authenticated"]) {
        let refuse: boolean | null = null;
        try {
          await c.query("begin");
          await c.query(`set local role ${role}`);
          await c.query("select 1 from studio.documents limit 1");
          refuse = false;
        } catch (e) {
          refuse = /permission denied/i.test((e as Error).message) ? true : null;
        } finally {
          await c.query("rollback");
        }
        lignes.push(refuse === true ? ok(`Rôle public « ${role} » sans accès aux documents`) : refuse === false ? ko(`Rôle public « ${role} » sans accès aux documents`, "ACCÈS POSSIBLE : refaire les REVOKE de sql/001-documents.sql") : info(`Rôle public « ${role} » sans accès aux documents`, "non vérifiable avec cette connexion"));
      }
      const n = await c.query("select count(*)::int as n from studio.documents where cle not like '\\_\\_%'");
      lignes.push(info("Documents enregistrés", String(n.rows[0].n)));
      return lignes;
    });
  })));
  l.push(...(await essayer("Écritures atomiques", async () => {
    const k = `${P}/a.json`;
    const a = await docs.ecrire(k, "{\"v\":1}", { siAbsent: true });
    const b = await docs.ecrire(k, "{\"v\":2}", { siAbsent: true });
    const v1 = (await docs.lire(k))!.version;
    const c1 = await docs.ecrire(k, "{\"v\":3}", { siVersion: v1 });
    const c2 = await docs.ecrire(k, "{\"v\":4}", { siVersion: v1 });
    const course = await Promise.all(Array.from({ length: 10 }, (_, i) => docs.ecrire(`${P}/course.json`, `{"i":${i}}`, { siAbsent: true })));
    await docs.supprimer(k); await docs.supprimer(`${P}/course.json`);
    const gagnantes = course.filter(Boolean).length;
    return a && !b && c1 && !c2 && gagnantes === 1 ? ok("Écritures atomiques (créer si absent, modifier si inchangé, 10 créations simultanées)") : ko("Écritures atomiques", `absent:${a}/${b} version:${c1}/${c2} simultanées:${gagnantes}`);
  })));
  return { titre: "Base de données (PostgreSQL)", lignes: l };
}

// ───────────────────────── Stockage de fichiers ─────────────────────────
async function stockage(): Promise<Section> {
  const titre = "Stockage de fichiers";
  if (!stockageS3Configure()) return { titre, lignes: [(surNetlify() ? ko : info)("Connexion", "clés du stockage absentes")] };
  const cfg = configurationStockage();
  const Bucket = cfg.bucket;
  const client = new S3Client({
    region: cfg.region, endpoint: cfg.endpoint, forcePathStyle: cfg.pathStyle,
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  const P = `__diagnostic__/${crypto.randomBytes(5).toString("hex")}/`;
  const K = (n: string) => `${P}${n}`;
  const octets = (n: number) => crypto.randomBytes(n);
  const lire = async (k: string, extra: Record<string, unknown> = {}) => Buffer.from(await (await client.send(new GetObjectCommand({ Bucket, Key: k, ...extra }))).Body!.transformToByteArray());
  const hote = new URL(cfg.endpoint).host;
  const groupes = await Promise.all([
    essayer("Écriture et lecture", async () => {
      const c = octets(2048);
      await client.send(new PutObjectCommand({ Bucket, Key: K("base.bin"), Body: c, ContentType: "image/png" }));
      const h = await client.send(new HeadObjectCommand({ Bucket, Key: K("base.bin") }));
      const g = await lire(K("base.bin"));
      const r = await lire(K("base.bin"), { Range: "bytes=0-15" });
      const type = ((h.ContentType || "").split(";")[0]).toLowerCase();
      return [
        h.ContentLength === 2048 && g.equals(c) ? ok("Écriture, taille, relecture identique") : ko("Écriture, taille, relecture identique", `taille ${h.ContentLength}`),
        r.length === 16 && r.equals(c.subarray(0, 16)) ? ok("Lecture partielle (contrôle du type de fichier)") : ko("Lecture partielle", `${r.length} octets`),
        type === "image/png" ? ok("Type de contenu enregistré conforme", type) : avert("Type de contenu enregistré conforme", type || "absent"),
      ];
    }),
    essayer("Lien d'envoi", async () => {
      const c = octets(4096);
      const u = await getSignedUrl(client, new PutObjectCommand({ Bucket, Key: K("envoi.png"), ContentType: "image/png" }), { expiresIn: 900 });
      const r = await fetch(u, { method: "PUT", headers: { "Content-Type": "image/png" }, body: c, signal: AbortSignal.timeout(8000) });
      const autre = await fetch(u.replace(encodeURI(K("envoi.png")), encodeURI(K("autre.png"))), { method: "PUT", headers: { "Content-Type": "image/png" }, body: octets(64), signal: AbortSignal.timeout(8000) });
      const okEnvoi = r.ok && (await lire(K("envoi.png"))).equals(c);
      return [
        okEnvoi ? ok("Lien d'envoi signé : le fichier arrive intact") : ko("Lien d'envoi signé", `HTTP ${r.status}`),
        !autre.ok && autre.status < 500 ? ok("Lien d'envoi inutilisable pour un autre nom de fichier", `HTTP ${autre.status}`) : ko("Lien d'envoi inutilisable pour un autre nom de fichier", `HTTP ${autre.status}`),
      ];
    }),
    essayer("Liens de lecture", async () => {
      const c = octets(2048);
      await client.send(new PutObjectCommand({ Bucket, Key: K("lecture.bin"), Body: c, ContentType: "application/octet-stream" }));
      await client.send(new PutObjectCommand({ Bucket, Key: K("autre-lecture.bin"), Body: octets(64), ContentType: "application/octet-stream" }));
      const u = await getSignedUrl(client, new GetObjectCommand({ Bucket, Key: K("lecture.bin"), ResponseContentDisposition: "attachment; filename*=UTF-8''video.mp4", ResponseContentType: "application/octet-stream" }), { expiresIn: 300 });
      const court1 = await getSignedUrl(client, new GetObjectCommand({ Bucket, Key: K("lecture.bin") }), { expiresIn: 1 });
      const lignes: Ligne[] = [];
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      const corps = Buffer.from(await r.arrayBuffer());
      const d = r.headers.get("content-disposition") || "";
      lignes.push(r.ok && corps.equals(c) ? ok("Lien de lecture temporaire : le fichier se télécharge") : ko("Lien de lecture temporaire", `HTTP ${r.status}`));
      lignes.push(/attachment/i.test(d) ? ok("Téléchargement forcé en pièce jointe") : avert("Téléchargement forcé en pièce jointe", `en-tête non appliqué (« ${d || "absent"} ») : le navigateur pourrait afficher le fichier`));
      const sans = cfg.pathStyle ? `${cfg.endpoint}/${Bucket}/${K("lecture.bin")}` : `${new URL(cfg.endpoint).protocol}//${Bucket}.${hote}/${K("lecture.bin")}`;
      const rs = await fetch(sans, { signal: AbortSignal.timeout(8000) });
      lignes.push(!rs.ok && rs.status < 500 ? ok("Lecture sans signature refusée", `HTTP ${rs.status}`) : ko("Lecture sans signature refusée", `HTTP ${rs.status} : le fichier est lisible sans signature`));
      if (/\/storage\/v1\/s3$/.test(cfg.endpoint)) {
        const pub = await fetch(`${cfg.endpoint.replace(/\/storage\/v1\/s3$/, "/storage/v1/object/public")}/${Bucket}/${K("lecture.bin")}`, { signal: AbortSignal.timeout(8000) });
        lignes.push(!pub.ok && pub.status < 500 ? ok("Adresse publique du fournisseur refusée (bucket privé)", `HTTP ${pub.status}`) : ko("Adresse publique du fournisseur refusée", `HTTP ${pub.status} : le bucket est PUBLIC`));
      }
      const det = await fetch(u.replace(encodeURI(K("lecture.bin")), encodeURI(K("autre-lecture.bin"))), { signal: AbortSignal.timeout(8000) });
      lignes.push(!det.ok && det.status < 500 ? ok("Lien détourné vers un autre fichier refusé", `HTTP ${det.status}`) : ko("Lien détourné vers un autre fichier refusé", `HTTP ${det.status}`));
      await pause(2500);
      const exp = await fetch(court1, { signal: AbortSignal.timeout(8000) });
      lignes.push(!exp.ok && exp.status < 500 ? ok("Lien expiré refusé", `HTTP ${exp.status}`) : ko("Lien expiré refusé", `HTTP ${exp.status} : un lien expiré fonctionne encore`));
      return lignes;
    }),
    essayer("Écritures conditionnelles", async () => {
      await client.send(new PutObjectCommand({ Bucket, Key: K("cond.txt"), Body: "premier", ContentType: "application/octet-stream", IfNoneMatch: "*" }));
      const e = await client.send(new PutObjectCommand({ Bucket, Key: K("cond.txt"), Body: "ecrase", ContentType: "application/octet-stream", IfNoneMatch: "*" })).then(() => null, (x) => x);
      const g = (await lire(K("cond.txt"))).toString();
      return !e && g === "ecrase"
        ? info("Écritures conditionnelles du stockage", "ignorées (écrasement silencieux) : attendu, c'est pourquoi les documents sont en base")
        : info("Écritures conditionnelles du stockage", "respectées");
    }),
  ]);
  const lignes: Ligne[] = [ok("Connexion", `${hote}, bucket ${Bucket}`), ...groupes.flat()];
  try {
    const liste: string[] = [];
    let suite: string | undefined;
    do {
      const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: P, ContinuationToken: suite }));
      for (const o of r.Contents || []) if (o.Key) liste.push(o.Key);
      suite = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (suite);
    for (const k of liste) await client.send(new DeleteObjectCommand({ Bucket, Key: k }));
    const reste = await client.send(new ListObjectsV2Command({ Bucket, Prefix: P }));
    lignes.push((reste.Contents || []).length === 0 ? ok("Nettoyage", `${liste.length} objet(s) de test supprimés, dossier vide`) : ko("Nettoyage", "des objets de test subsistent"));
  } catch (e) {
    lignes.push(ko("Nettoyage", court(e)));
  }
  return { titre, lignes };
}

// ───────────────────────── Factures PDF ─────────────────────────
async function pdf(): Promise<Section> {
  const lignes = await essayer("Génération d'un PDF", async () => {
    const maintenant = new Date().toISOString();
    const c = {
      id: "SA-DIAGNOSTIC", token: "x", formule: "essai", montantCents: 2500, devise: "eur", creeLe: maintenant, statut: "payee",
      paiement: { etat: "paye", sessionId: "cs_diag", payeLe: maintenant, mode: "test" },
      brief: { nom: "Diagnostic", email: "diagnostic@exemple.fr", telephone: "", marque: "Marque", lien: "https://exemple.fr", produit: "Produit", style: "Direct", cible: "", arguments: "", aEviter: "", complement: "", nomFacture: "Client test", adresseFacture: "1 rue du Test, 75000 Paris", sirenClient: "", recuLe: maintenant },
      fichiersClient: [], livrables: [], retouchesDemandees: [], notes: "", historique: [],
    } as Commande;
    const t0 = Date.now();
    const buf = await composerPdf(c, { numero: "SPECIMEN-DIAGNOSTIC", date: maintenant, cle: "x", specimen: true, montantCents: 2500 }, vendeur().v);
    return buf.subarray(0, 5).toString() === "%PDF-" && buf.length > 1500 ? ok("Génération d'un PDF de facture", `${Math.round(buf.length / 1024)} Ko en ${Date.now() - t0} ms`) : ko("Génération d'un PDF de facture", `${buf.length} octets`);
  });
  return { titre: "Factures", lignes };
}

// ───────────────────────── E-mails ─────────────────────────
async function courriel(): Promise<Section> {
  const l: Ligne[] = [];
  const pilote = envoiReel();
  const services = servicesEnvoi();
  const expediteur = env.mailFrom().match(/<([^>]+)>/)?.[1] || env.mailFrom().trim();
  if (!pilote) return { titre: "E-mails", lignes: [avert("Service d'envoi", "aucun : les e-mails sont archivés mais jamais envoyés (il manque MAIL_FROM, ou la clé Brevo, ou SMTP_USER + SMTP_PASSWORD)")] };
  l.push(ok("Service d'envoi configuré", services.length > 1 ? `${pilote} (le suivant prend le relais si le précédent échoue)` : pilote));
  if (services.length === 1) l.push(avert("Voie de secours", services[0] === "smtp" ? "aucune : si Gmail refuse un envoi (limite de 500 par jour, panne), l'e-mail n'est pas expédié (alerte sur le téléphone)." : "aucune : si Brevo refuse un envoi, l'e-mail n'est pas expédié (alerte sur le téléphone). Ajoutez SMTP_USER + SMTP_PASSWORD pour un envoi par le Gmail du studio."));
  const secours = services[0] !== "brevo"; // Brevo n'est qu'un relais de secours dès que Gmail est configuré : sa panne n'est alors qu'un avertissement
  l.push(expediteur ? ok("Expéditeur (MAIL_FROM)", expediteur) : ko("Expéditeur (MAIL_FROM)", "absent"));
  if (services.includes("smtp")) {
    l.push(...(await essayer("Messagerie SMTP", async () => {
      const port = Number(process.env.SMTP_PORT) || 465;
      const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000 });
      try {
        await t.verify(); // connexion + authentification, sans envoyer d'e-mail
        return ok("Messagerie SMTP : connexion et mot de passe valides", `${process.env.SMTP_HOST || "smtp.gmail.com"}:${port} avec ${process.env.SMTP_USER}`);
      } catch (e) {
        const m = court(e);
        const aide = /535|auth|credentials|password/i.test(m) ? " : mot de passe refusé. Pour Gmail il faut un « mot de passe d'application » à 16 caractères (compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications), pas le mot de passe habituel." : "";
        return ko("Messagerie SMTP", `${m}${aide}`);
      }
    })));
  }
  if (services.includes("brevo")) {
    const entetes = { "api-key": process.env.BREVO_API_KEY || "", Accept: "application/json" };
    const base = process.env.BREVO_API_BASE || "https://api.brevo.com";
    l.push(...(await essayer("Clé Brevo", async () => {
      const cle = process.env.BREVO_API_KEY || "";
      const genre = cle.startsWith("xkeysib-") ? "clé d'API (xkeysib-)" : cle.startsWith("xsmtpsib-") ? "clé SMTP (xsmtpsib-)" : "format inconnu";
      const r = await fetch(`${base}/v3/account`, { headers: entetes, signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        const message = ((await r.json().catch(() => ({}))) as { message?: string }).message || "";
        const aide = cle.startsWith("xsmtpsib-") ? " : c'est une clé SMTP, il faut une clé d'API (« API Keys », pas « SMTP »)" : /ip/i.test(message) ? " : Brevo refuse l'adresse du serveur (« Authorized IPs » à désactiver dans Brevo)" : "";
        return (secours ? avert : ko)("Clé Brevo valide", `HTTP ${r.status}, ${genre}, longueur ${cle.length}${message ? `, message Brevo : ${message.slice(0, 120)}` : ""}${aide}`);
      }
      const a = (await r.json()) as { plan?: { type: string; credits?: number }[] };
      return ok("Clé Brevo valide", `offre ${a.plan?.[0]?.type || "?"}, ${a.plan?.[0]?.credits ?? "?"} envois`);
    })));
    l.push(...(await essayer("Expéditeur Brevo", async () => {
      const r = await fetch(`${base}/v3/senders`, { headers: entetes, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return avert("Expéditeur validé chez Brevo", `HTTP ${r.status}`);
      const s = ((await r.json()) as { senders?: { email: string; active: boolean }[] }).senders || [];
      const m = s.find((x) => x.email.toLowerCase() === expediteur.toLowerCase());
      if (!m) return (secours ? avert : ko)("Expéditeur validé chez Brevo", `${expediteur} n'est pas un expéditeur déclaré`);
      const libre = /@(gmail|outlook|hotmail|yahoo|icloud)\./i.test(expediteur);
      return m.active ? (libre ? avert("Expéditeur validé chez Brevo", "validé, mais adresse d'un service gratuit : les e-mails risquent de finir en indésirables, un nom de domaine au nom du studio règle cela") : ok("Expéditeur validé chez Brevo")) : (secours ? avert : ko)("Expéditeur validé chez Brevo", "non activé");
    })));
  }
  if (services.includes("resend")) l.push(info("Resend", "vérification non automatisée"));
  return { titre: "E-mails", lignes: l };
}

// ───────────────────────── Notifications ─────────────────────────
async function notifications(): Promise<Section> {
  const l: Ligne[] = [];
  l.push(env.adminEmail() ? ok("Adresse qui reçoit les commandes (ADMIN_EMAIL)", env.adminEmail()) : ko("Adresse qui reçoit les commandes (ADMIN_EMAIL)", "absente : vous ne seriez pas prévenu par e-mail"));
  l.push(pushConfigure() ? ok("Notifications sur le téléphone (ntfy)", "actives") : avert("Notifications sur le téléphone (ntfy)", "non activées : NTFY_TOPIC absent. Sans elles, si l'envoi d'e-mails tombe en panne, rien ne vous prévient."));
  l.push(process.env.TACHES_SECRET && process.env.TACHES_SECRET.length >= 24 ? ok("Tâche quotidienne (récap, relance du brief, purge)", "secret configuré") : avert("Tâche quotidienne (récap, relance du brief, purge)", "TACHES_SECRET absent ou trop court (24 caractères minimum) : la tâche est désactivée"));
  const recent = Date.now() - 14 * 86_400_000;
  try {
    const echecs = (await store.courriels()).filter((m) => enEchec(m) && new Date(m.date).getTime() > recent).length;
    l.push(echecs === 0 ? ok("E-mails non envoyés (14 derniers jours)", "aucun") : ko("E-mails non envoyés (14 derniers jours)", `${echecs} : ouvrez la page E-mails pour les renvoyer`));
  } catch (e) {
    l.push(ko("Lecture de l'archive des e-mails", court(e)));
  }
  return { titre: "Notifications", lignes: l };
}

// ───────────────────────── Stripe (mode test uniquement) ─────────────────────────
async function paiement(): Promise<Section> {
  const titre = "Paiement (Stripe)";
  const { mode, raison } = modePaiement();
  if (mode === "ferme") return { titre, lignes: [info("Stripe", `non configuré : ${raison}`)] };
  if (mode !== "test") return { titre, lignes: [info("Stripe", `mode ${mode} : aucun appel de diagnostic (le diagnostic ne touche jamais au mode réel)`)] };
  const l: Ligne[] = [ok("Clé de test", env.stripeKey().startsWith("rk_") ? "clé restreinte" : "clé secrète de test")];
  l.push(...(await essayer("Appel Stripe", async () => {
    const b = await stripe().balance.retrieve();
    return b.livemode === false ? ok("Appel à l'API Stripe en mode test") : ko("Appel à l'API Stripe", "la clé donne accès au mode RÉEL : remplacer par une clé de test");
  })));
  l.push(...(await essayer("Webhook Stripe", async () => {
    const url = `${env.baseUrl()}/api/stripe/webhook`;
    const liste = await stripe().webhookEndpoints.list({ limit: 30 });
    const w = liste.data.find((x) => x.url === url);
    if (!w) return ko("Webhook enregistré dans Stripe", `aucun point d'accès vers ${url} (npm run stripe:webhook ou tableau de bord Stripe)`);
    const evts = new Set(w.enabled_events);
    const requis = ["checkout.session.completed", "checkout.session.expired"];
    const manquants = requis.filter((e) => !evts.has(e) && !evts.has("*"));
    return w.status !== "enabled" ? ko("Webhook enregistré dans Stripe", `statut ${w.status}`) : manquants.length ? ko("Webhook enregistré dans Stripe", `événements manquants : ${manquants.join(", ")}`) : ok("Webhook enregistré dans Stripe", "événements requis présents");
  })));
  l.push(env.stripeWebhookSecret().startsWith("whsec_") ? ok("Secret du webhook (STRIPE_WEBHOOK_SECRET)") : ko("Secret du webhook (STRIPE_WEBHOOK_SECRET)", "doit commencer par whsec_"));
  return { titre, lignes: l };
}

// ───────────────────────── Ensemble ─────────────────────────
export async function executerDiagnostic(): Promise<Rapport> {
  const [bd, st, pd, ml, nt, pm] = await Promise.all([base(), stockage(), pdf(), courriel(), notifications(), paiement()]);
  const sections = [configuration(), bd, st, pd, ml, nt, pm];
  const synthese: Record<Etat, number> = { ok: 0, ko: 0, avert: 0, info: 0 };
  for (const s of sections) for (const x of s.lignes) synthese[x.etat]++;
  return { date: new Date().toISOString(), plateforme: surNetlify() ? "Netlify" : "local", sections, synthese };
}
