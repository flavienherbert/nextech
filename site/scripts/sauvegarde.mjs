// Sauvegarde manuelle des données de Studio Accroche (à lancer chez vous, régulièrement).
//   npm run sauvegarde
// L'offre gratuite de Supabase n'effectue AUCUNE sauvegarde automatique, et les sauvegardes payantes
// n'incluraient pas les fichiers : cet export est la seule copie de vos commandes et de vos factures.
//
// Il copie, dans le dossier « sauvegardes/<date> » (hors dépôt Git) :
//  - documents.json : tous les documents de la base (commandes, compteur de factures, événements, e-mails) ;
//  - factures/*.pdf : les factures PDF du stockage de fichiers (si les variables S3_* sont définies).
// Les photos et vidéos des clients ne sont pas copiées : elles sont supprimées après 90 jours.
// Variables : DATABASE_URL (obligatoire), S3_* (facultatif). Lecture seule : rien n'est modifié.
// Attention : le dossier contient des données personnelles de clients. Ne le publiez pas, ne l'envoyez pas
// par e-mail ; gardez-le sur un disque que vous maîtrisez (idéalement chiffré).
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL manquant (voir SUPABASE.md)."); process.exit(2); }
const u = new URL(process.env.DATABASE_URL); u.searchParams.delete("sslmode");
const c = new pg.Client({ connectionString: u.toString(), ssl: ["localhost", "127.0.0.1"].includes(u.hostname) ? false : { rejectUnauthorized: false } });
await c.connect();
const lignes = (await c.query("select cle, corps, version::text as version, cree_le, modifie_le from studio.documents order by cle")).rows;
await c.end();

const d = new Date();
const nom = d.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1-");
const dossier = path.resolve("sauvegardes", nom);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "documents.json"), JSON.stringify(lignes, null, 2));
const relu = JSON.parse(fs.readFileSync(path.join(dossier, "documents.json"), "utf8"));
console.log(`Documents : ${lignes.length} exportés, ${relu.length === lignes.length ? "relecture du fichier conforme" : "ÉCART À LA RELECTURE"}.`);
const parType = {}; for (const l of lignes) parType[l.cle.split("/")[0]] = (parType[l.cle.split("/")[0]] || 0) + 1;
console.log("  " + Object.entries(parType).map(([k, v]) => `${k} : ${v}`).join(" · "));

let pdf = 0;
if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT, forcePathStyle: process.env.S3_PATH_STYLE === "oui", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  fs.mkdirSync(path.join(dossier, "factures"), { recursive: true });
  let suite;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: "factures/", ContinuationToken: suite }));
    for (const o of r.Contents || []) {
      if (!o.Key.endsWith(".pdf")) continue;
      const g = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.Key }));
      const corps = Buffer.from(await g.Body.transformToByteArray());
      fs.writeFileSync(path.join(dossier, o.Key), corps);
      if (corps.length === o.Size) pdf++; else console.log(`⚠ ${o.Key} : taille copiée ${corps.length} ≠ ${o.Size}`);
    }
    suite = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (suite);
  console.log(`Factures PDF : ${pdf} copiée(s), tailles vérifiées.`);
} else {
  console.log("Factures PDF : non copiées (variables S3_* absentes).");
}
console.log(`\nSauvegarde : ${dossier}\nRappel : ce dossier contient des données personnelles. Ne le publiez pas.`);
