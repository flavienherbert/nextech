// Dépôt de données : une interface, deux pilotes.
//  - « disque » : un dossier local (développement, ou serveur avec disque persistant) ;
//  - « s3 »     : tout stockage objet compatible S3 (Cloudflare R2, Scaleway, Backblaze, AWS…).
// Les commandes, les fichiers, les factures et les e-mails passent tous par ici.
import { promises as fs, createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";

export type Lecture = { corps: Buffer; version: string };
export type Condition = { siAbsent?: boolean; siVersion?: string };

export interface Depot {
  nom: "disque" | "s3";
  lire(cle: string): Promise<Lecture | null>;
  // Renvoie false si la condition n'est pas remplie (objet déjà présent, ou modifié entre-temps).
  ecrire(cle: string, corps: Buffer | string, condition?: Condition): Promise<boolean>;
  supprimer(cle: string): Promise<void>;
  lister(prefixe: string): Promise<string[]>;
  taille(cle: string): Promise<number | null>;
  debut(cle: string, octets: number): Promise<Buffer | null>;
  flux(cle: string): Promise<Readable | null>;
  // Lien signé de téléchargement direct ; null si le pilote ne sait pas (lecture par le serveur).
  urlLecture(cle: string, nomFichier: string, secondes?: number): Promise<string | null>;
  // Lien signé d'envoi direct depuis le navigateur ; null si l'envoi passe par le serveur.
  urlEnvoi(cle: string, type: string, secondes?: number): Promise<string | null>;
  recevoir(cle: string, source: Readable, tailleMax: number): Promise<number>;
}

const cleSure = (cle: string) => {
  if (!/^[A-Za-z0-9_\-./]+$/.test(cle) || cle.includes("..") || cle.startsWith("/")) throw new Error("Clé de stockage invalide.");
  return cle;
};

// ───────────────────────── Pilote disque ─────────────────────────
function depotDisque(): Depot {
  const racine = path.resolve(env.dataDir());
  const chemin = (cle: string) => path.join(racine, cleSure(cle));
  const version = (b: Buffer) => crypto.createHash("sha1").update(b).digest("hex");
  // Un seul processus écrit sur ce dossier : un verrou en mémoire suffit.
  const files = new Map<string, Promise<unknown>>();
  const enSerie = <T>(cle: string, fn: () => Promise<T>): Promise<T> => {
    const suite = (files.get(cle) ?? Promise.resolve()).catch(() => {}).then(fn);
    files.set(cle, suite);
    return suite.finally(() => files.get(cle) === suite && files.delete(cle));
  };

  return {
    nom: "disque",
    async lire(cle) {
      try {
        const corps = await fs.readFile(chemin(cle));
        return { corps, version: version(corps) };
      } catch {
        return null;
      }
    },
    ecrire(cle, corps, condition) {
      return enSerie(cle, async () => {
        const f = chemin(cle);
        const b = Buffer.isBuffer(corps) ? corps : Buffer.from(corps, "utf8");
        await fs.mkdir(path.dirname(f), { recursive: true });
        if (condition?.siAbsent) {
          try {
            await fs.writeFile(f, b, { flag: "wx" });
            return true;
          } catch {
            return false;
          }
        }
        if (condition?.siVersion) {
          const courant = await fs.readFile(f).catch(() => null);
          if (!courant || version(courant) !== condition.siVersion) return false;
        }
        const tmp = `${f}.${crypto.randomBytes(4).toString("hex")}.tmp`;
        await fs.writeFile(tmp, b);
        await fs.rename(tmp, f);
        return true;
      });
    },
    async supprimer(cle) {
      await fs.rm(chemin(cle), { force: true });
    },
    async lister(prefixe) {
      try {
        const dossier = chemin(prefixe);
        return (await fs.readdir(dossier)).filter((n) => !n.endsWith(".tmp")).map((n) => `${prefixe.replace(/\/$/, "")}/${n}`);
      } catch {
        return [];
      }
    },
    async taille(cle) {
      try {
        return (await fs.stat(chemin(cle))).size;
      } catch {
        return null;
      }
    },
    async debut(cle, octets) {
      try {
        const h = await fs.open(chemin(cle), "r");
        const { buffer, bytesRead } = await h.read(Buffer.alloc(octets), 0, octets, 0);
        await h.close();
        return buffer.subarray(0, bytesRead);
      } catch {
        return null;
      }
    },
    async flux(cle) {
      return (await this.taille(cle)) === null ? null : createReadStream(chemin(cle));
    },
    async urlLecture() {
      return null;
    },
    async urlEnvoi() {
      return null;
    },
    async recevoir(cle, source, tailleMax) {
      const f = chemin(cle);
      await fs.mkdir(path.dirname(f), { recursive: true });
      let recu = 0;
      const garde = async function* (flux: AsyncIterable<Buffer>) {
        for await (const morceau of flux) {
          recu += morceau.length;
          if (recu > tailleMax) throw new Error("TROP_GROS");
          yield morceau;
        }
      };
      try {
        await pipeline(source, garde, createWriteStream(f));
      } catch (e) {
        await fs.rm(f, { force: true });
        throw e;
      }
      return recu;
    },
  };
}

// ───────────────────────── Pilote S3 ─────────────────────────
function depotS3(): Depot {
  const Bucket = process.env.S3_BUCKET || "";
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_PATH_STYLE === "oui",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "" },
  });
  const absent = (e: unknown) => {
    const s = (e as { $metadata?: { httpStatusCode?: number }; name?: string }) || {};
    return s.$metadata?.httpStatusCode === 404 || s.name === "NoSuchKey" || s.name === "NotFound";
  };
  const refuse = (e: unknown) => {
    const s = (e as { $metadata?: { httpStatusCode?: number }; name?: string }) || {};
    return s.$metadata?.httpStatusCode === 412 || s.$metadata?.httpStatusCode === 409 || s.name === "PreconditionFailed";
  };

  return {
    nom: "s3",
    async lire(cle) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket, Key: cleSure(cle) }));
        return { corps: Buffer.from(await r.Body!.transformToByteArray()), version: r.ETag || "" };
      } catch (e) {
        if (absent(e)) return null;
        throw e;
      }
    },
    async ecrire(cle, corps, condition) {
      try {
        await client.send(new PutObjectCommand({
          Bucket, Key: cleSure(cle), Body: corps,
          ...(condition?.siAbsent ? { IfNoneMatch: "*" } : {}),
          ...(condition?.siVersion ? { IfMatch: condition.siVersion } : {}),
        }));
        return true;
      } catch (e) {
        if (refuse(e)) return false;
        throw e;
      }
    },
    async supprimer(cle) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: cleSure(cle) }));
    },
    async lister(prefixe) {
      const cles: string[] = [];
      let suite: string | undefined;
      do {
        const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefixe.replace(/\/?$/, "/"), ContinuationToken: suite }));
        for (const o of r.Contents || []) if (o.Key) cles.push(o.Key);
        suite = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (suite);
      return cles;
    },
    async taille(cle) {
      try {
        return (await client.send(new HeadObjectCommand({ Bucket, Key: cleSure(cle) }))).ContentLength ?? null;
      } catch (e) {
        if (absent(e)) return null;
        throw e;
      }
    },
    async debut(cle, octets) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket, Key: cleSure(cle), Range: `bytes=0-${octets - 1}` }));
        return Buffer.from(await r.Body!.transformToByteArray());
      } catch (e) {
        if (absent(e)) return null;
        throw e;
      }
    },
    async flux(cle) {
      try {
        return (await client.send(new GetObjectCommand({ Bucket, Key: cleSure(cle) }))).Body as Readable;
      } catch (e) {
        if (absent(e)) return null;
        throw e;
      }
    },
    urlLecture(cle, nomFichier, secondes = 300) {
      return getSignedUrl(client, new GetObjectCommand({
        Bucket, Key: cleSure(cle),
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(nomFichier)}`,
        ResponseContentType: "application/octet-stream",
      }), { expiresIn: secondes });
    },
    urlEnvoi(cle, type, secondes = 900) {
      return getSignedUrl(client, new PutObjectCommand({ Bucket, Key: cleSure(cle), ContentType: type }), { expiresIn: secondes });
    },
    async recevoir() {
      throw new Error("Avec le stockage objet, l'envoi se fait directement depuis le navigateur.");
    },
  };
}

export const stockageS3Configure = () =>
  Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

let instance: Depot | null = null;
export function depot(): Depot {
  if (!instance) instance = stockageS3Configure() ? depotS3() : depotDisque();
  return instance;
}
