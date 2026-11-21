import { depot } from "@/lib/depot";
import { cleMedia, emplacement, TYPE_PAR_EXTENSION, TYPES_MEDIA, VERSION_MEDIA } from "@/lib/emplacements";
import { introuvable as non, reponseLecture } from "@/lib/diffusion";
import { adresseMedia, chargerMedias } from "@/lib/medias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Médias publics du site. L'adresse « /m/<emplacement>?v=<version> » désigne un fichier précis qui ne change jamais :
// on peut donc le garder un an dans le navigateur et sur le CDN. Sans « v », on renvoie vers la version actuelle.
// Seuls des fichiers du dossier « medias » sont servis (jamais ceux des clients), uniquement JPG, PNG, WebP, MP4, WebM.
// (La politique de contenu stricte de ces adresses est définie, comme toutes les autres, dans next.config.mjs.)
const SOBRE = { "X-Content-Type-Options": "nosniff" };
// « Netlify-CDN-Cache-Control » : consigne propre au réseau de diffusion de Netlify (ignorée ailleurs) pour que l'image ne
// soit calculée qu'une fois, puis servie sans exécuter de fonction (ce sont les exécutions de fonctions qui consomment les crédits).
const IMMUABLE = { "Cache-Control": "public, max-age=31536000, immutable", "Netlify-CDN-Cache-Control": "public, max-age=31536000, durable" };
const introuvable = () => non();

export async function GET(req: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  const e = emplacement(slot);
  if (!e) return introuvable();
  const v = new URL(req.url).searchParams.get("v") || "";

  if (!v) {
    const m = await chargerMedias();
    const envoye = m.envoye(slot);
    const vers = envoye ? adresseMedia(slot, envoye) : e.defaut;
    return vers ? new Response(null, { status: 307, headers: { Location: vers, "Cache-Control": "no-store" } }) : introuvable();
  }

  if (!VERSION_MEDIA.test(v)) return introuvable();
  const type = TYPE_PAR_EXTENSION[v.split(".")[1]];
  if (!type || TYPES_MEDIA[type].genre !== e.genre) return introuvable();
  const cle = cleMedia(v);

  if (e.genre === "image") {
    const l = await depot().lire(cle);
    if (!l) return introuvable();
    const etag = `"${v}"`;
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag, ...IMMUABLE } });
    return new Response(new Uint8Array(l.corps), { headers: { "Content-Type": type, "Content-Length": String(l.corps.length), ETag: etag, ...IMMUABLE, ...SOBRE } });
  }

  // Vidéo : lien signé du stockage objet, ou lecture par plages par le serveur (disque).
  return reponseLecture(req, cle, type, { redirection: { "Cache-Control": "private, max-age=300" }, flux: { ...IMMUABLE, ...SOBRE } });
}
