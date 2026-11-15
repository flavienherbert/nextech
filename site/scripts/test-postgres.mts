// Tests du pilote de documents PostgreSQL : écritures atomiques, routage documents/fichiers,
// confidentialité de la table, garde-fou contre un stockage de fichiers sans base.
// Prérequis : DATABASE_URL (base où sql/001-documents.sql a été exécuté).
// Usage : DATABASE_URL=… npm run test:postgres
// À lancer sur une base de TEST : le test écrit sous la clé « __test_pg__/ » et la supprime ensuite.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { depot } from "../lib/depot";
import { depotPostgres, fermerBase } from "../lib/depot-postgres";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL manquant."); process.exit(2); }
let ko = 0;
const verifier = (nom: string, ok: unknown, detail = "") => { if (!ok) ko++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const docs = depotPostgres();
const P = `__test_pg__/${Date.now()}`;
const json = (o: unknown) => JSON.stringify(o);
console.log(`Pilote de stockage : ${depot().nom}\n`);

try {
  // Créer seulement si absent
  const k1 = `${P}/a.json`;
  verifier("Créer si absent : première écriture acceptée", await docs.ecrire(k1, json({ v: 1 }), { siAbsent: true }) === true);
  verifier("Créer si absent : seconde écriture refusée, contenu intact", await docs.ecrire(k1, json({ v: 2 }), { siAbsent: true }) === false && JSON.parse((await docs.lire(k1))!.corps.toString()).v === 1);
  const concu = await Promise.all(Array.from({ length: 30 }, (_, i) => docs.ecrire(`${P}/b.json`, json({ i }), { siAbsent: true })));
  verifier("30 créations simultanées de la même clé : une seule acceptée", concu.filter(Boolean).length === 1, String(concu.filter(Boolean).length));

  // Modifier seulement si inchangé
  const l0 = (await docs.lire(k1))!;
  verifier("Version numérique, commence à 1", l0.version === "1", l0.version);
  verifier("Modifier si inchangé : bonne version acceptée", await docs.ecrire(k1, json({ v: 3 }), { siVersion: l0.version }) === true);
  verifier("Modifier si inchangé : ancienne version refusée, contenu intact", await docs.ecrire(k1, json({ v: 4 }), { siVersion: l0.version }) === false && JSON.parse((await docs.lire(k1))!.corps.toString()).v === 3);
  verifier("La version a augmenté d'un seul cran", (await docs.lire(k1))!.version === "2");
  verifier("Version invalide refusée sans erreur", await docs.ecrire(k1, json({}), { siVersion: "1; drop table studio.documents" }) === false);
  const l1 = (await docs.lire(k1))!;
  const maj = await Promise.all(Array.from({ length: 30 }, (_, i) => docs.ecrire(k1, json({ i }), { siVersion: l1.version })));
  verifier("30 modifications simultanées depuis la même version : une seule acceptée", maj.filter(Boolean).length === 1, String(maj.filter(Boolean).length));

  // Compteur concurrent (plusieurs connexions)
  const kc = `${P}/compteur.json`;
  let gagnes = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    for (let e = 0; e < 60; e++) {
      const lu = await docs.lire(kc);
      const n = (lu ? JSON.parse(lu.corps.toString()).n : 0) + 1;
      if (await docs.ecrire(kc, json({ n }), lu ? { siVersion: lu.version } : { siAbsent: true })) { gagnes++; return; }
    }
  }));
  verifier("Compteur : 12 incréments concurrents → valeur finale 12, aucun perdu", gagnes === 12 && JSON.parse((await docs.lire(kc))!.corps.toString()).n === 12, `${gagnes} acceptés`);

  // Lecture, liste, suppression
  verifier("Lecture d'une clé absente : null", (await docs.lire(`${P}/absent.json`)) === null);
  const liste = await docs.lister(P);
  verifier("Liste : uniquement les clés du préfixe, triées", liste.length === 3 && liste.every((k) => k.startsWith(`${P}/`)) && [...liste].sort().join() === liste.join(), liste.join(","));
  verifier("Taille du document renvoyée", (await docs.taille(k1)) !== null && (await docs.taille(`${P}/absent.json`)) === null);
  await docs.supprimer(k1);
  verifier("Suppression", (await docs.lire(k1)) === null);

  // Refus
  verifier("JSON invalide refusé (rien n'est stocké)", await docs.ecrire(`${P}/mauvais.json`, "ceci n'est pas du json").then(() => false, () => true) && (await docs.lire(`${P}/mauvais.json`)) === null);
  verifier("Clés dangereuses refusées", (await Promise.all(["../x.json", "/abs.json", "a b.json", "a;b.json"].map((k) => docs.lire(k).then(() => false, () => true)))).every(Boolean));
  verifier("Injection dans la clé sans effet", await docs.lire(`${P}/x'; drop table studio.documents; --.json`).then(() => false, () => true));
  verifier("Opérations de fichiers refusées par le pilote de documents", await Promise.all([async () => docs.debut("a.json", 4), async () => docs.recevoir("a.json", null as never, 1)].map((f) => f().then(() => false, () => true))).then((r) => r.every(Boolean)));

  // Routage du dépôt composite : JSON → base, le reste → stockage de fichiers
  const d = depot();
  const kj = `${P}/routage.json`, kf = `${P}/routage.pdf`;
  await d.ecrire(kj, json({ ok: 1 })); await d.ecrire(kf, Buffer.from("%PDF-1.4 test"));
  verifier("Routage : un document JSON est dans la base", (await docs.lire(kj)) !== null);
  verifier("Routage : un PDF n'est PAS dans la base", (await docs.lire(kf).catch(() => null)) === null);
  verifier("Routage : le PDF est lisible par le dépôt (stockage de fichiers)", (await d.lire(kf))?.corps.toString().startsWith("%PDF-") === true);
  verifier("Routage : la liste « commandes » vient de la base", Array.isArray(await d.lister("commandes")));
  await d.supprimer(kj); await d.supprimer(kf);

  // Aucune donnée critique dans le stockage de fichiers, aucune écriture conditionnelle sur un fichier
  verifier("Dépôt mixte : écriture conditionnelle sur un PDF refusée (siAbsent)", await d.ecrire(`${P}/cond.pdf`, Buffer.from("%PDF-1"), { siAbsent: true }).then(() => false, () => true));
  verifier("Dépôt mixte : écriture conditionnelle sur un PDF refusée (siVersion)", await d.ecrire(`${P}/cond.pdf`, Buffer.from("%PDF-1"), { siVersion: "1" }).then(() => false, () => true));
  verifier("Dépôt mixte : écriture inconditionnelle d'un PDF acceptée", await d.ecrire(`${P}/libre.pdf`, Buffer.from("%PDF-1")).then(() => true, () => false));
  await d.supprimer(`${P}/libre.pdf`);
  const dossierDonnees = path.resolve(process.env.DATA_DIR || "./data");
  verifier("Le document JSON n'a PAS été écrit sur le disque", !fs.existsSync(path.join(dossierDonnees, kj)));
  if (process.env.S3_BUCKET) {
    const { S3Client, HeadObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: process.env.S3_REGION || "auto", endpoint: process.env.S3_ENDPOINT, forcePathStyle: process.env.S3_PATH_STYLE === "oui", credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
    const absent = await s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: kj })).then(() => false, (e) => e?.$metadata?.httpStatusCode === 404);
    verifier("Le document JSON n'a PAS été écrit dans le stockage de fichiers (S3)", absent);
  }
  // Inventaire du code : seuls store.ts et factures.ts (clés .json) utilisent des écritures conditionnelles
  const sources: string[] = [];
  const parcourir = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const c = path.join(dir, e.name); if (e.isDirectory()) parcourir(c); else if (/\.(ts|tsx)$/.test(e.name)) sources.push(c); } };
  parcourir("lib"); parcourir("app");
  const conditionnels = sources.filter((f) => !/depot(-postgres)?\.ts$/.test(f) && /siAbsent|siVersion/.test(fs.readFileSync(f, "utf8")));
  verifier("Inventaire : seuls store.ts et factures.ts demandent des écritures conditionnelles", conditionnels.every((f) => /(store|factures)\.ts$/.test(f)), conditionnels.join(", "));
  const lignes = conditionnels.flatMap((f) => fs.readFileSync(f, "utf8").split("\n").filter((l) => /siAbsent|siVersion/.test(l)));
  verifier("Inventaire : chaque écriture conditionnelle vise un document JSON (aucun PDF, aucun fichier)", lignes.length > 0 && lignes.every((l) => /\.json|\bcle\b/.test(l) && !/\.pdf|cleFichier/.test(l)), lignes.filter((l) => !/\.json|\bcle\b/.test(l) || /\.pdf|cleFichier/.test(l)).join(" | "));
  verifier("Inventaire : aucun accès direct au SDK S3 hors du dépôt", sources.filter((f) => !/depot\.ts$/.test(f) && /@aws-sdk\/client-s3/.test(fs.readFileSync(f, "utf8"))).length === 0);

  // Confidentialité : les rôles publics de Supabase ne voient rien
  const u = new URL(process.env.DATABASE_URL); u.searchParams.delete("sslmode");
  const c = new pg.Client({ connectionString: u.toString(), ssl: ["localhost", "127.0.0.1"].includes(u.hostname) ? false : { rejectUnauthorized: false } });
  await c.connect();
  const rls = await c.query("select rowsecurity from pg_tables where schemaname = 'studio' and tablename = 'documents'");
  verifier("Sécurité au niveau des lignes activée sur la table", rls.rows[0]?.rowsecurity === true);
  for (const role of ["anon", "authenticated"]) {
    const existe = (await c.query("select 1 from pg_roles where rolname = $1", [role])).rowCount === 1;
    if (!existe) { verifier(`Rôle public « ${role} » sans accès à la table`, false, "rôle absent : sql/test-roles-locaux.sql à exécuter pour un test local"); continue; }
    let refuse = false;
    try { await c.query("begin"); await c.query(`set local role ${role}`); await c.query("select count(*) from studio.documents"); } catch (e) { refuse = /permission denied/i.test((e as Error).message); } finally { await c.query("rollback"); }
    verifier(`Rôle public « ${role} » : accès à la table refusé`, refuse);
  }
  await c.end();
} finally {
  const c = new pg.Client({ connectionString: (() => { const u = new URL(process.env.DATABASE_URL!); u.searchParams.delete("sslmode"); return u.toString(); })(), ssl: ["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname) ? false : { rejectUnauthorized: false } });
  await c.connect();
  await c.query("delete from studio.documents where starts_with(cle, '__test_pg__/')");
  const reste = await c.query("select count(*)::int as n from studio.documents where starts_with(cle, '__test_pg__/')");
  verifier("Nettoyage : aucune ligne de test restante", reste.rows[0].n === 0);
  await c.end();
  await fermerBase();
}

// Garde-fou : Supabase Storage sans base de données doit être refusé, sauf autorisation explicite.
const lancer = (env: Record<string, string | undefined>) => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "garde-"));
  fs.writeFileSync(path.join(dossier, "t.mts"), `import { depot } from ${JSON.stringify(path.resolve("lib/depot.ts"))}; try { console.log("OK " + depot().nom); } catch (e) { console.log("REFUS " + e.message); }`);
  try { return execFileSync("npx", ["tsx", path.join(dossier, "t.mts")], { env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env } as never, encoding: "utf8" }).trim(); } finally { fs.rmSync(dossier, { recursive: true, force: true }); }
};
const s3 = { S3_BUCKET: "b", S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s", S3_ENDPOINT: "https://abc.storage.supabase.co/storage/v1/s3", DATA_DIR: os.tmpdir() };
verifier("Garde-fou : Supabase Storage sans DATABASE_URL refusé", lancer(s3).startsWith("REFUS"));
verifier("Garde-fou : avec DATABASE_URL, accepté (documents en base, fichiers en stockage)", lancer({ ...s3, DATABASE_URL: process.env.DATABASE_URL }) === "OK postgres+s3");
verifier("Garde-fou : autorisation explicite possible (DOCUMENTS_SUR_STOCKAGE=oui)", lancer({ ...s3, DOCUMENTS_SUR_STOCKAGE: "oui" }) === "OK s3");
verifier("Autre fournisseur S3 : non concerné par le garde-fou", lancer({ ...s3, S3_ENDPOINT: "https://exemple.r2.cloudflarestorage.com" }) === "OK s3");

console.log(ko ? `\n${ko} échec(s).` : "\nTous les tests du pilote PostgreSQL réussissent.");
process.exit(ko ? 1 : 0);
