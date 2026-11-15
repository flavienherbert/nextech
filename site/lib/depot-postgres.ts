// Pilote « documents » : commandes, jetons, compteur de factures, événements Stripe, e-mails.
// Ces données exigent des écritures atomiques, que PostgreSQL garantit :
//   - « créer seulement si absent »    → INSERT … ON CONFLICT DO NOTHING ;
//   - « modifier seulement si inchangé » → UPDATE … WHERE version = $lue.
// Les fichiers (photos, vidéos, PDF) n'y passent jamais : ils restent dans le stockage de fichiers.
// Table créée par sql/001-documents.sql.
import { Pool, type PoolConfig } from "pg";
import type { Condition, Depot, Lecture } from "./depot";
import { cleSure } from "./cle";

export const postgresConfigure = () => Boolean(process.env.DATABASE_URL);

// Connexion locale (tests) sans chiffrement ; sinon chiffrée.
// Avec DATABASE_CA (contenu du certificat racine fourni par le fournisseur), le serveur est vérifié ;
// sans lui, la connexion est chiffrée mais le serveur n'est pas authentifié.
function configuration(): PoolConfig {
  const brut = process.env.DATABASE_URL || "";
  const u = new URL(brut);
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
  // Le mode SSL est décidé ici : on l'ôte de l'adresse pour qu'il ne prenne pas le dessus.
  u.searchParams.delete("sslmode");
  const ca = process.env.DATABASE_CA?.trim();
  return {
    connectionString: u.toString(),
    ssl: local ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX) || 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  };
}

let pool: Pool | null = null;
function bassin(): Pool {
  if (!pool) {
    pool = new Pool(configuration());
    // Une connexion inactive coupée par le serveur ne doit pas faire tomber le processus.
    pool.on("error", (e) => console.error("[base de données] connexion perdue :", e.message));
  }
  return pool;
}

export async function fermerBase() {
  const p = pool;
  pool = null;
  if (p) await p.end();
}

const nonPrevu = (op: string) => () => {
  throw new Error(`Le pilote de documents ne gère pas « ${op} » : seuls des documents JSON y sont rangés.`);
};

export function depotPostgres(): Depot {
  const q = <T extends Record<string, unknown>>(texte: string, valeurs: unknown[]) => bassin().query<T>(texte, valeurs);
  return {
    nom: "postgres",
    async lire(cle): Promise<Lecture | null> {
      const r = await q<{ corps: string; version: string }>("select corps::text as corps, version::text as version from studio.documents where cle = $1", [cleSure(cle)]);
      return r.rows[0] ? { corps: Buffer.from(r.rows[0].corps, "utf8"), version: r.rows[0].version } : null;
    },
    async ecrire(cle, corps: Buffer | string, condition?: Condition) {
      const k = cleSure(cle);
      const texte = Buffer.isBuffer(corps) ? corps.toString("utf8") : corps;
      if (condition?.siAbsent) {
        const r = await q("insert into studio.documents (cle, corps) values ($1, $2::jsonb) on conflict (cle) do nothing", [k, texte]);
        return r.rowCount === 1;
      }
      if (condition?.siVersion) {
        if (!/^\d+$/.test(condition.siVersion)) return false;
        const r = await q("update studio.documents set corps = $2::jsonb, version = version + 1, modifie_le = now() where cle = $1 and version = $3::bigint", [k, texte, condition.siVersion]);
        return r.rowCount === 1;
      }
      await q(
        "insert into studio.documents (cle, corps) values ($1, $2::jsonb) on conflict (cle) do update set corps = excluded.corps, version = studio.documents.version + 1, modifie_le = now()",
        [k, texte],
      );
      return true;
    },
    async supprimer(cle) {
      await q("delete from studio.documents where cle = $1", [cleSure(cle)]);
    },
    async lister(prefixe) {
      const p = cleSure(prefixe).replace(/\/?$/, "/");
      const r = await q<{ cle: string }>("select cle from studio.documents where starts_with(cle, $1) order by cle", [p]);
      return r.rows.map((x) => x.cle);
    },
    async taille(cle) {
      const r = await q<{ n: string }>("select octet_length(corps::text)::text as n from studio.documents where cle = $1", [cleSure(cle)]);
      return r.rows[0] ? Number(r.rows[0].n) : null;
    },
    debut: nonPrevu("debut") as never,
    flux: nonPrevu("flux") as never,
    urlLecture: nonPrevu("urlLecture") as never,
    urlEnvoi: nonPrevu("urlEnvoi") as never,
    recevoir: nonPrevu("recevoir") as never,
  };
}
