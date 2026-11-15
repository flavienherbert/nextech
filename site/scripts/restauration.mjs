// Restauration d'une sauvegarde faite par « npm run sauvegarde » dans une base VIDE.
//   npm run restauration -- sauvegardes/<dossier>
// Refuse de s'exécuter si la table contient déjà des documents (rien n'est écrasé) ; --forcer ne vide pas
// la table : il ajoute seulement les documents manquants. Restaure aussi les factures PDF absentes du stockage.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const dossier = process.argv.slice(2).find((a) => !a.startsWith("--"));
const forcer = process.argv.includes("--forcer");
if (!process.env.DATABASE_URL || !dossier) { console.error("Usage : DATABASE_URL=… npm run restauration -- sauvegardes/<dossier> [--forcer]"); process.exit(2); }
const lignes = JSON.parse(fs.readFileSync(path.join(dossier, "documents.json"), "utf8"));
const u = new URL(process.env.DATABASE_URL); u.searchParams.delete("sslmode");
const c = new pg.Client({ connectionString: u.toString(), ssl: ["localhost", "127.0.0.1"].includes(u.hostname) ? false : { rejectUnauthorized: false } });
await c.connect();
const existants = (await c.query("select count(*)::int as n from studio.documents")).rows[0].n;
if (existants > 0 && !forcer) { console.error(`La table contient déjà ${existants} document(s) : restauration refusée (rien n'a été modifié). --forcer n'ajoute que les documents manquants.`); await c.end(); process.exit(1); }
let ajoutes = 0;
for (const l of lignes) {
  const r = await c.query("insert into studio.documents (cle, corps, version, cree_le, modifie_le) values ($1, $2::jsonb, $3::bigint, $4, $5) on conflict (cle) do nothing", [l.cle, JSON.stringify(l.corps), l.version, l.cree_le, l.modifie_le]);
  ajoutes += r.rowCount;
}
const apres = (await c.query("select count(*)::int as n from studio.documents")).rows[0].n;
await c.end();
console.log(`Documents : ${ajoutes} restaurés sur ${lignes.length} (la base en contient maintenant ${apres}).`);

if (fs.existsSync(path.join(dossier, "factures")) && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT, forcePathStyle: process.env.S3_PATH_STYLE === "oui", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  let n = 0;
  for (const f of fs.readdirSync(path.join(dossier, "factures")).filter((x) => x.endsWith(".pdf"))) {
    try { await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `factures/${f}`, Body: fs.readFileSync(path.join(dossier, "factures", f)), ContentType: "application/pdf", IfNoneMatch: "*" })); n++; } catch { /* déjà présente : on n'écrase jamais une facture */ }
  }
  console.log(`Factures PDF : ${n} restaurée(s) (les factures déjà présentes ne sont jamais écrasées).`);
}
