import type { MetadataRoute } from "next";

// Tant que INDEXATION n'est pas « oui » (jour de l'ouverture commerciale), tout le site est interdit aux moteurs de recherche.
export default function robots(): MetadataRoute.Robots {
  if (process.env.INDEXATION !== "oui") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/commande/", "/commander/", "/api/"] }] };
}
