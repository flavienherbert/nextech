-- Studio Accroche — table des documents (commandes, jetons d'accès, compteur de factures,
-- événements Stripe déjà traités, e-mails archivés).
--
-- À exécuter UNE FOIS dans Supabase : « SQL Editor » > « New query » > coller > « Run ».
-- Le script peut être relancé sans danger : il ne supprime et n'écrase rien.
--
-- Pourquoi une base de données : ces données exigent des écritures atomiques
-- (« créer seulement si absent », « modifier seulement si inchangé »). PostgreSQL les garantit ;
-- le stockage de fichiers (Supabase Storage) ne les garantit pas de façon démontrée.
-- Les fichiers (photos, vidéos, factures PDF) restent dans Supabase Storage.

create schema if not exists studio;

create table if not exists studio.documents (
  -- Chemin logique du document, par exemple « commandes/SA-261114-ABCDE.json ».
  cle        text primary key
             check (cle ~ '^[A-Za-z0-9_./-]+$' and cle not like '%..%' and cle not like '/%'),
  corps      jsonb not null,
  -- Numéro de version : +1 à chaque modification. Sert aux écritures « seulement si inchangé ».
  version    bigint not null default 1,
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

-- Sécurité.
-- 1. Le schéma « studio » n'est pas dans la liste des schémas exposés par l'API publique de Supabase
--    (par défaut seul « public » l'est) : l'API REST ne peut pas atteindre cette table.
-- 2. La sécurité au niveau des lignes est activée, sans aucune règle d'accès : les rôles
--    « anon » et « authenticated » (clés publiques) ne voient rien, même si le schéma était exposé un jour.
-- 3. Les droits sont explicitement retirés à ces deux rôles.
-- Seule la connexion serveur du site (chaîne DATABASE_URL, secrète) peut lire et écrire.
alter table studio.documents enable row level security;

revoke all on schema studio from anon, authenticated;
revoke all on all tables in schema studio from anon, authenticated;
alter default privileges in schema studio revoke all on tables from anon, authenticated;

-- Contrôle : doit afficher « true » pour rowsecurity.
select schemaname, tablename, rowsecurity from pg_tables where schemaname = 'studio';
