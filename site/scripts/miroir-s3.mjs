// Outil de test : recopie les commandes et e-mails du stockage objet vers DATA_DIR,
// pour que les tests lisent l'état réel quel que soit le pilote de stockage.
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
const s3 = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT, forcePathStyle: process.env.S3_PATH_STYLE === "oui", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
const racine = path.resolve(process.env.DATA_DIR);
for (const prefixe of ["commandes/", "courriels/"]) {
  fs.rmSync(path.join(racine, prefixe), { recursive: true, force: true });
  fs.mkdirSync(path.join(racine, prefixe), { recursive: true });
  const r = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: prefixe }));
  for (const o of r.Contents || []) {
    const g = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: o.Key }));
    fs.writeFileSync(path.join(racine, o.Key), Buffer.from(await g.Body.transformToByteArray()));
  }
}
