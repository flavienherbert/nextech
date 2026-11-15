// Configuration du stockage de fichiers : valeurs explicites en priorité, sinon déduites de DATABASE_URL
// quand la base est chez Supabase (la référence du projet et la région y figurent).
// Fichier JavaScript simple : il est lu à la compilation par next.config.mjs et à l'exécution par le site.

/** Référence et région du projet Supabase, d'après l'adresse de la base. */
export function deduireSupabase(databaseUrl = process.env.DATABASE_URL || "") {
  try {
    const u = new URL(databaseUrl);
    const utilisateur = decodeURIComponent(u.username);
    let m = u.hostname.match(/^aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com$/);
    const ref = utilisateur.match(/^postgres\.([a-z0-9]+)$/);
    if (m && ref) return { ref: ref[1], region: m[1] };
    m = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (m) return { ref: m[1], region: undefined };
  } catch {
    /* adresse absente ou illisible */
  }
  return null;
}

/** Configuration S3 effective : variables explicites, sinon déduction depuis Supabase. */
export function configurationStockage(e = process.env) {
  const d = deduireSupabase(e.DATABASE_URL || "");
  const endpoint = (e.S3_ENDPOINT || (d ? `https://${d.ref}.storage.supabase.co/storage/v1/s3` : "")).replace(/\/+$/, "");
  const region = e.S3_REGION && e.S3_REGION !== "auto" ? e.S3_REGION : d?.region || e.S3_REGION || "auto";
  let origine = e.S3_PUBLIC_ORIGIN || "";
  if (!origine && endpoint) {
    try {
      origine = new URL(endpoint).origin;
    } catch {
      origine = "";
    }
  }
  return {
    endpoint,
    region,
    bucket: e.S3_BUCKET || (d ? "studio-accroche" : ""),
    pathStyle: e.S3_PATH_STYLE ? e.S3_PATH_STYLE === "oui" : Boolean(d),
    origine,
    accessKeyId: e.S3_ACCESS_KEY_ID || "",
    secretAccessKey: e.S3_SECRET_ACCESS_KEY || "",
    deduit: Boolean(d && (!e.S3_ENDPOINT || !e.S3_BUCKET)),
  };
}
