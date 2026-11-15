// Création automatique (et idempotente) de la table des documents à la première connexion à la base :
// plus aucun script SQL à exécuter à la main. Même contenu que sql/001-documents.sql, avec une protection en plus :
// les droits des rôles publics de Supabase (« anon », « authenticated ») ne sont retirés que si ces rôles existent.
import type { Pool } from "pg";

export const SCHEMA_SQL = `
create schema if not exists studio;

create table if not exists studio.documents (
  cle        text primary key
             check (cle ~ '^[A-Za-z0-9_./-]+$' and cle not like '%..%' and cle not like '/%'),
  corps      jsonb not null,
  version    bigint not null default 1,
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

alter table studio.documents enable row level security;

do $do$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema studio from %I', r);
      execute format('revoke all on all tables in schema studio from %I', r);
      execute format('alter default privileges in schema studio revoke all on tables from %I', r);
    end if;
  end loop;
end
$do$;
`;

const existe = async (p: Pool) => Boolean((await p.query("select to_regclass('studio.documents') as t")).rows[0].t);

// « existante » : rien à faire ; « creee » : la table vient d'être créée (premier lancement).
export async function creerSchemaSiAbsent(p: Pool): Promise<"existante" | "creee"> {
  if (await existe(p)) return "existante";
  try {
    await p.query(SCHEMA_SQL);
  } catch (e) {
    // Deux instances du site peuvent démarrer en même temps : si l'autre a gagné, tout va bien.
    if (!(await existe(p))) throw e;
  }
  return "creee";
}
