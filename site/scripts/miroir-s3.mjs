// Outil de test : recopie les commandes et e-mails du stockage (objet ou base de données) vers DATA_DIR,
// pour que les tests lisent l'état réel quel que soit le pilote de stockage.
//  - DATABASE_URL défini : les documents sont lus dans la table studio.documents ;
//  - sinon, avec S3_BUCKET : ils sont lus dans le stockage objet.
import fs from "node:fs";
import path from "node:path";
const racine = path.resolve(process.env.DATA_DIR);
const PREFIXES = ["commandes/", "courriels/"];
const vider = (p) => { fs.rmSync(path.join(racine, p), { recursive: true, force: true }); fs.mkdirSync(path.join(racine, p), { recursive: true }); };

if (process.env.DATABASE_URL) {
  const { default: pg } = await import("pg");
  const u = new URL(process.env.DATABASE_URL); u.searchParams.delete("sslmode");
  const c = new pg.Client({ connectionString: u.toString(), ssl: ["localhost", "127.0.0.1"].includes(u.hostname) ? false : { rejectUnauthorized: false } });
  await c.connect();
  for (const p of PREFIXES) {
    vider(p);
    const r = await c.query("select cle, corps::text as corps from studio.documents where starts_with(cle, $1)", [p]);
    for (const l of r.rows) fs.writeFileSync(path.join(racine, l.cle), l.corps);
  }
  await c.end();
} else {
  const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT, forcePathStyle: process.env.S3_PATH_STYLE === "oui", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
  for (const p of PREFIXES) {
    vider(p);
    const r = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: p }));
    for (const o of r.Contents || []) {
      const g = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.Key }));
      fs.writeFileSync(path.join(racine, o.Key), Buffer.from(await g.Body.transformToByteArray()));
    }
  }
}
