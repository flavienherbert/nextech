// Test de conformité du stockage de fichiers, à lancer sur le VRAI bucket avant de s'en servir.
//
//   Variables nécessaires (les mêmes que celles du site) : S3_ENDPOINT, S3_REGION, S3_BUCKET,
//   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, et S3_PATH_STYLE=oui pour Supabase.
//   Option : --origine=https://adresse-du-site   origine testée pour l'envoi direct (CORS)
//   Option : --limite                            envoie 51 Mo pour vérifier que la limite de 50 Mo est appliquée
//
//   npm run verifier:stockage
//
// Ce que fait le test :
//  - il travaille UNIQUEMENT dans un dossier temporaire « __test__/<identifiant>/ » du bucket ;
//  - il ne lit, ne modifie et ne supprime aucun autre objet ;
//  - à la fin (même en cas d'erreur) il supprime ce dossier et vérifie qu'il est bien vide ;
//  - il n'affiche jamais de clé ni de lien signé complet.
//
// Résultat : deux verdicts séparés.
//  1. FICHIERS : envoi, lecture, liens temporaires, accès privé (doit être entièrement réussi) ;
//  2. ÉCRITURES CONDITIONNELLES : « créer seulement si absent », « modifier seulement si inchangé ».
//     Elles ne sont déclarées démontrées que si TOUTES les vérifications ci-dessous réussissent.
import crypto from "node:crypto";
import {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const arg = (nom) => process.argv.find((a) => a === `--${nom}` || a.startsWith(`--${nom}=`));
const valeurArg = (nom) => arg(nom)?.split("=")[1];
const E = process.env;
const manquantes = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((v) => !E[v]);
if (manquantes.length) {
  console.error(`Variables manquantes : ${manquantes.join(", ")}.
Saisissez-les dans votre terminal, sans les écrire dans un fichier ni dans une conversation.
  PowerShell :  $env:S3_ENDPOINT="..." ; $env:S3_BUCKET="..." ; (idem pour les autres) ; npm run verifier:stockage
  bash       :  S3_ENDPOINT=... S3_BUCKET=... (etc.) npm run verifier:stockage`);
  process.exit(2);
}

const Bucket = E.S3_BUCKET;
const endpoint = E.S3_ENDPOINT.replace(/\/+$/, "");
const origine = valeurArg("origine") || E.SITE_URL || "https://studio-accroche-preprod.netlify.app";
const client = new S3Client({
  region: E.S3_REGION || "auto",
  endpoint,
  forcePathStyle: E.S3_PATH_STYLE === "oui",
  credentials: { accessKeyId: E.S3_ACCESS_KEY_ID, secretAccessKey: E.S3_SECRET_ACCESS_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const id = `${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}-${crypto.randomBytes(4).toString("hex")}`;
const PREFIXE = `__test__/${id}/`;
const cle = (nom) => `${PREFIXE}${nom}`;
const crees = new Set();

const resultats = { fichiers: [], conditionnel: [] };
const SYMBOLE = { ok: "✓", ko: "✗", avert: "⚠" };
async function verifier(groupe, nom, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = { etat: "ko", detail: `${e.name || "Erreur"} : ${String(e.message || e).slice(0, 160)}` }; }
  if (r === true) r = { etat: "ok" };
  if (r === false) r = { etat: "ko" };
  resultats[groupe].push({ nom, ...r });
  console.log(`${SYMBOLE[r.etat]} ${nom}${r.detail ? `  → ${r.detail}` : ""}`);
}
const ok = (detail) => ({ etat: "ok", detail });
const ko = (detail) => ({ etat: "ko", detail });
const avert = (detail) => ({ etat: "avert", detail });

const statut = (e) => e?.$metadata?.httpStatusCode ?? 0;
const aEchoue = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
const octets = (n) => crypto.randomBytes(n);
const depuis = async (r) => Buffer.from(await r.Body.transformToByteArray());
const envoyer = async (nom, corps, extra = {}) => { const r = await client.send(new PutObjectCommand({ Bucket, Key: cle(nom), Body: corps, ...extra })); crees.add(cle(nom)); return r; };
const egal = (a, b) => Buffer.compare(a, b) === 0;
const sansQuery = (u) => { const x = new URL(u); return `${x.host}${x.pathname}`; };
const lien = (commande, secondes) => getSignedUrl(client, commande, { expiresIn: secondes });
// Même adresse, autre objet : on remplace le nom de l'objet dans le chemin.
const versAutreCle = (u, de, vers) => u.replace(encodeURI(de), encodeURI(vers)).replace(de, vers);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Un refus est une réponse 4xx (signature, droits…). Une erreur serveur 5xx ne prouve rien : résultat non concluant.
const classer = (r, okSi, ko_) => (r.ok ? ko(ko_) : r.status >= 500 ? avert(`HTTP ${r.status} : erreur du serveur, résultat non concluant`) : ok(`HTTP ${r.status}`));

async function listerPrefixe(prefixe) {
  const cles = []; let suite;
  do {
    const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefixe, ContinuationToken: suite }));
    for (const o of r.Contents || []) cles.push(o.Key);
    suite = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (suite);
  return cles;
}

async function nettoyer() {
  const restants = await listerPrefixe(PREFIXE);
  for (const k of restants) await client.send(new DeleteObjectCommand({ Bucket, Key: k }));
  return listerPrefixe(PREFIXE);
}

console.log(`Test de conformité du stockage
  Serveur            : ${new URL(endpoint).host}
  Bucket             : ${Bucket}
  Dossier temporaire : ${PREFIXE}   (seul dossier touché)
  Origine testée     : ${origine}
`);

let erreurFatale = null;
try {
  // ─────────────── Anciens restes ───────────────
  const anciens = (await listerPrefixe("__test__/")).filter((k) => !k.startsWith(PREFIXE));
  if (anciens.length) console.log(`⚠ ${anciens.length} objet(s) d'un ancien test restent dans « __test__/ » (non touchés par ce test).\n`);

  console.log("— Fichiers : accès, liens temporaires, confidentialité —");
  const contenu = octets(2048);

  await verifier("fichiers", "Accès au bucket", async () => { await client.send(new ListObjectsV2Command({ Bucket, Prefix: PREFIXE, MaxKeys: 1 })); return true; });

  await verifier("fichiers", "Écriture, taille et relecture identique", async () => {
    await envoyer("base.bin", contenu, { ContentType: "application/octet-stream" });
    const h = await client.send(new HeadObjectCommand({ Bucket, Key: cle("base.bin") }));
    const g = await depuis(await client.send(new GetObjectCommand({ Bucket, Key: cle("base.bin") })));
    return h.ContentLength === 2048 && egal(g, contenu) ? ok() : ko(`taille ${h.ContentLength}, contenu ${egal(g, contenu) ? "identique" : "différent"}`);
  });

  await verifier("fichiers", "Lecture partielle des 16 premiers octets (contrôle du type de fichier)", async () => {
    const g = await depuis(await client.send(new GetObjectCommand({ Bucket, Key: cle("base.bin"), Range: "bytes=0-15" })));
    return g.length === 16 && egal(g, contenu.subarray(0, 16)) ? ok() : ko(`${g.length} octets reçus`);
  });

  let urlEnvoi;
  await verifier("fichiers", "Lien d'envoi direct depuis le navigateur (15 min) : le fichier arrive", async () => {
    const corps = octets(4096);
    urlEnvoi = await lien(new PutObjectCommand({ Bucket, Key: cle("envoi.png"), ContentType: "image/png" }), 900);
    const r = await fetch(urlEnvoi, { method: "PUT", headers: { "Content-Type": "image/png" }, body: corps });
    crees.add(cle("envoi.png"));
    if (!r.ok) return ko(`HTTP ${r.status}`);
    const g = await depuis(await client.send(new GetObjectCommand({ Bucket, Key: cle("envoi.png") })));
    return egal(g, corps) ? ok(sansQuery(urlEnvoi)) : ko("contenu reçu différent");
  });

  await verifier("fichiers", "Lien d'envoi : un autre type de fichier est refusé", async () => {
    const u = await lien(new PutObjectCommand({ Bucket, Key: cle("type.png"), ContentType: "image/png" }), 900);
    const r = await fetch(u, { method: "PUT", headers: { "Content-Type": "text/html" }, body: octets(64) });
    crees.add(cle("type.png"));
    return r.ok ? avert("accepté : le serveur contrôle de toute façon les premiers octets à la confirmation") : ok(`HTTP ${r.status}`);
  });

  await verifier("fichiers", "Lien d'envoi : inutilisable pour un autre nom de fichier", async () => {
    const u = versAutreCle(urlEnvoi, cle("envoi.png"), cle("autre.png"));
    if (u === urlEnvoi) return ko("test invalide : l'adresse n'a pas pu être modifiée");
    const r = await fetch(u, { method: "PUT", headers: { "Content-Type": "image/png" }, body: octets(64) });
    crees.add(cle("autre.png"));
    return classer(r, null, `HTTP ${r.status} : un lien d'envoi permet d'écrire ailleurs`);
  });

  let urlLecture;
  await verifier("fichiers", "Lien de lecture temporaire (5 min) : le client récupère son fichier", async () => {
    urlLecture = await lien(new GetObjectCommand({
      Bucket, Key: cle("base.bin"),
      ResponseContentDisposition: `attachment; filename*=UTF-8''video.mp4`, ResponseContentType: "application/octet-stream",
    }), 300);
    const r = await fetch(urlLecture);
    const c = Buffer.from(await r.arrayBuffer());
    if (!r.ok) return ko(`HTTP ${r.status}`);
    if (!egal(c, contenu)) return ko("contenu différent");
    const d = r.headers.get("content-disposition") || "";
    return /attachment/i.test(d) ? ok("téléchargement forcé en pièce jointe") : avert(`en-tête « attachment » non appliqué (« ${d || "absent"} ») : le navigateur pourrait afficher la vidéo au lieu de la télécharger`);
  });

  await verifier("fichiers", "Lecture sans signature refusée", async () => {
    const u = E.S3_PATH_STYLE === "oui" ? `${endpoint}/${Bucket}/${cle("base.bin")}` : `${new URL(endpoint).protocol}//${Bucket}.${new URL(endpoint).host}/${cle("base.bin")}`;
    const r = await fetch(u);
    return classer(r, null, `HTTP ${r.status} : le fichier est lisible sans signature`);
  });

  await verifier("fichiers", "Adresse publique du fournisseur refusée (bucket privé)", async () => {
    if (!/\/storage\/v1\/s3$/.test(endpoint)) return avert("sans objet : ce fournisseur n'a pas d'adresse publique de ce type");
    const base = endpoint.replace(/\/storage\/v1\/s3$/, "/storage/v1/object/public");
    const r = await fetch(`${base}/${Bucket}/${cle("base.bin")}`);
    return classer(r, null, `HTTP ${r.status} : le bucket est PUBLIC, à repasser en privé`);
  });

  await verifier("fichiers", "Lien de lecture détourné vers un autre fichier : refusé", async () => {
    const u = versAutreCle(urlLecture, cle("base.bin"), cle("envoi.png"));
    if (u === urlLecture) return ko("test invalide : l'adresse n'a pas pu être modifiée");
    const r = await fetch(u);
    return classer(r, null, `HTTP ${r.status} : un lien donne accès à un autre fichier`);
  });

  await verifier("fichiers", "Lien expiré refusé (validité de 1 s, test après 4 s)", async () => {
    const u = await lien(new GetObjectCommand({ Bucket, Key: cle("base.bin") }), 1);
    await pause(4000);
    const r = await fetch(u);
    return classer(r, null, `HTTP ${r.status} : un lien expiré fonctionne encore`);
  });

  await verifier("fichiers", `Envoi direct autorisé depuis le site (CORS, origine ${origine})`, async () => {
    const u = await lien(new PutObjectCommand({ Bucket, Key: cle("cors.png"), ContentType: "image/png" }), 900);
    const r = await fetch(u, { method: "OPTIONS", headers: { Origin: origine, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
    const ao = r.headers.get("access-control-allow-origin") || "";
    const am = r.headers.get("access-control-allow-methods") || "";
    const bon = r.status < 300 && (ao === "*" || ao === origine) && (!am || /PUT|\*/i.test(am));
    return bon ? ok(`autorisé pour ${ao}`) : ko(`HTTP ${r.status}, origine autorisée « ${ao || "aucune"} », méthodes « ${am || "aucune"} » : à vérifier depuis un vrai navigateur`);
  });

  await verifier("fichiers", "Liste du dossier : exactement les fichiers créés", async () => {
    const l = await listerPrefixe(PREFIXE);
    const attendus = ["base.bin", "envoi.png"].map(cle);
    return attendus.every((k) => l.includes(k)) && l.every((k) => k.startsWith(PREFIXE)) ? ok(`${l.length} objet(s) listés`) : ko(`${l.length} objet(s) listés, fichiers attendus absents`);
  });

  if (arg("limite")) {
    await verifier("fichiers", "Limite de taille : un fichier de 51 Mo est refusé", async () => {
      const u = await lien(new PutObjectCommand({ Bucket, Key: cle("trop-gros.bin"), ContentType: "application/octet-stream" }), 900);
      const r = await fetch(u, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: Buffer.alloc(51 * 1048576, 7) });
      crees.add(cle("trop-gros.bin"));
      return classer(r, null, `HTTP ${r.status} : 51 Mo acceptés, la limite du bucket n'est pas appliquée`);
    });
  } else {
    console.log("• Limite de 50 Mo : non testée (ajoutez --limite pour envoyer 51 Mo, supprimés ensuite).");
  }

  // ─────────────── Écritures conditionnelles ───────────────
  console.log("\n— Écritures conditionnelles (nécessaires seulement si des données y étaient rangées) —");
  const refus = (e) => e && [409, 412].includes(statut(e));
  const unique = () => octets(16).toString("hex");

  await verifier("conditionnel", "Créer seulement si absent : objet absent → accepté", async () => {
    await envoyer("c1.txt", "premier", { IfNoneMatch: "*" });
    return true;
  });
  await verifier("conditionnel", "Créer seulement si absent : objet présent → refusé (409/412) et contenu intact", async () => {
    const e = await aEchoue(() => client.send(new PutObjectCommand({ Bucket, Key: cle("c1.txt"), Body: "ECRASE", IfNoneMatch: "*" })));
    const g = (await depuis(await client.send(new GetObjectCommand({ Bucket, Key: cle("c1.txt") })))).toString();
    if (!e) return ko(g === "ECRASE" ? "l'objet existant a été ÉCRASÉ en silence" : "aucun refus renvoyé");
    return refus(e) && g === "premier" ? ok(`HTTP ${statut(e)}`) : ko(`HTTP ${statut(e)} ${e.name}, contenu « ${g} »`);
  });

  let etag;
  await verifier("conditionnel", "Modifier seulement si inchangé : bonne version → acceptée", async () => {
    etag = (await client.send(new HeadObjectCommand({ Bucket, Key: cle("c1.txt") }))).ETag;
    await client.send(new PutObjectCommand({ Bucket, Key: cle("c1.txt"), Body: "deuxieme", IfMatch: etag }));
    return true;
  });
  await verifier("conditionnel", "Modifier seulement si inchangé : ancienne version → refusée (409/412) et contenu intact", async () => {
    const e = await aEchoue(() => client.send(new PutObjectCommand({ Bucket, Key: cle("c1.txt"), Body: "PERIME", IfMatch: etag })));
    const g = (await depuis(await client.send(new GetObjectCommand({ Bucket, Key: cle("c1.txt") })))).toString();
    if (!e) return ko(g === "PERIME" ? "une version périmée a ÉCRASÉ la donnée en silence" : "aucun refus renvoyé");
    return refus(e) && g === "deuxieme" ? ok(`HTTP ${statut(e)}`) : ko(`HTTP ${statut(e)} ${e.name}, contenu « ${g} »`);
  });

  await verifier("conditionnel", "10 créations simultanées de la même clé : une seule gagnante", async () => {
    const k = cle(`c2-${unique()}.txt`); crees.add(k);
    const res = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => client.send(new PutObjectCommand({ Bucket, Key: k, Body: `essai-${i}`, IfNoneMatch: "*" }))));
    const gagnantes = res.filter((r) => r.status === "fulfilled").length;
    return gagnantes === 1 ? ok("1 gagnante, 9 refusées") : ko(`${gagnantes} gagnante(s) sur 10`);
  });

  await verifier("conditionnel", "10 modifications simultanées depuis la même version : une seule gagnante", async () => {
    const k = cle(`c3-${unique()}.txt`); crees.add(k);
    await client.send(new PutObjectCommand({ Bucket, Key: k, Body: "base" }));
    const e0 = (await client.send(new HeadObjectCommand({ Bucket, Key: k }))).ETag;
    const res = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => client.send(new PutObjectCommand({ Bucket, Key: k, Body: `maj-${i}`, IfMatch: e0 }))));
    const gagnantes = res.filter((r) => r.status === "fulfilled").length;
    return gagnantes === 1 ? ok("1 gagnante, 9 refusées") : ko(`${gagnantes} gagnante(s) sur 10`);
  });
} catch (e) {
  erreurFatale = e;
  console.error(`\n✗ Le test s'est interrompu : ${e.name || "Erreur"} : ${String(e.message || e).slice(0, 200)}`);
}

// ─────────────── Nettoyage, toujours exécuté ───────────────
console.log("\n— Nettoyage —");
let restants = [];
try {
  restants = await nettoyer();
  console.log(restants.length === 0 ? `✓ Dossier temporaire supprimé et vérifié : 0 objet restant dans « ${PREFIXE} »` : `✗ ${restants.length} objet(s) restent dans « ${PREFIXE} » : à supprimer à la main dans le tableau de bord.`);
} catch (e) {
  console.log(`✗ Nettoyage impossible : ${e.message}. Supprimez le dossier « ${PREFIXE} » à la main.`);
  restants = ["?"];
}

// ─────────────── Verdicts ───────────────
const nb = (g, etat) => resultats[g].filter((r) => r.etat === etat).length;
const f = resultats.fichiers, c = resultats.conditionnel;
const fichiersOk = !erreurFatale && nb("fichiers", "ko") === 0 && f.length >= 11;
const condOk = !erreurFatale && c.length === 6 && nb("conditionnel", "ok") === 6;
console.log(`
═══ RÉSULTAT ═══
FICHIERS (photos clients, vidéos livrées, PDF) : ${fichiersOk ? "CONFORME" : "NON CONFORME"}  — ${nb("fichiers", "ok")} réussies, ${nb("fichiers", "avert")} avertissement(s), ${nb("fichiers", "ko")} échec(s) sur ${f.length}
ÉCRITURES CONDITIONNELLES                      : ${condOk ? "DÉMONTRÉES" : "NON DÉMONTRÉES"}  — ${nb("conditionnel", "ok")}/6 vérifications réussies
${condOk ? "→ Le stockage pourrait aussi ranger les commandes, mais la base de données reste le choix recommandé." : "→ Ne rangez PAS les commandes, le compteur de factures ni les événements Stripe dans ce stockage : utilisez la base de données (DATABASE_URL)."}
Nettoyage : ${restants.length === 0 ? "dossier temporaire supprimé, vérifié" : "INCOMPLET"}`);
process.exit(fichiersOk && restants.length === 0 ? 0 : 1);
