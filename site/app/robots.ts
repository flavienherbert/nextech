import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Indexation : bloquée en préproduction (SITE_ENV=preprod) et tant que SITE_ENV n'est pas « production » (aucun référencement par oubli).
// Autorisée en production, sauf l'administration, les pages de commande et l'API.
export default function robots(): MetadataRoute.Robots {
  if (!env.enProduction()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/commande/", "/commander/", "/api/"] }],
    sitemap: `${env.baseUrl()}/sitemap.xml`,
  };
}
