import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { chargerVitrine } from "@/lib/bibliotheque";

// Plan du site : uniquement les pages publiques, et seulement en production (SITE_ENV=production).
// « Réalisations » n'y figure que s'il existe au moins une publicité publiée.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!env.enProduction()) return [];
  const base = env.baseUrl();
  const chemins = ["/", "/mentions-legales", "/cgv", "/confidentialite"];
  if ((await chargerVitrine()).nbPubliees > 0) chemins.splice(1, 0, "/realisations");
  return chemins.map((chemin) => ({ url: `${base}${chemin}` }));
}
