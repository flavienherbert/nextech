import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Plan du site : uniquement les pages publiques, et seulement en production (SITE_ENV=production).
export default function sitemap(): MetadataRoute.Sitemap {
  if (!env.enProduction()) return [];
  const base = env.baseUrl();
  return ["/", "/mentions-legales", "/cgv", "/confidentialite"].map((chemin) => ({ url: `${base}${chemin}` }));
}
