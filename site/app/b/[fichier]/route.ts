import { fichierPublic } from "@/lib/bibliotheque";
import { depot } from "@/lib/depot";
import { introuvable as non, reponseLecture } from "@/lib/diffusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fichiers publics de la bibliothèque : la vidéo ou la miniature d'une publicité PUBLIÉE, et rien d'autre.
// L'adresse est « /b/<fichier>?p=<publicité> » : le fichier doit appartenir à cette publicité et celle-ci doit être publiée.
// Sinon, 404 identique dans tous les cas (on ne dit pas si le fichier existe, est privé ou n'existe pas). Les fichiers des avatars ne passent jamais ici.
//
// Cache volontairement COURT (1 heure) : contrairement aux médias du site (/m/…), une publicité peut être dépubliée, et un
// fichier gardé un an dans le navigateur ou sur le réseau de diffusion resterait visible après la dépublication.
// Avec un stockage objet, le lien signé délivré à un visiteur reste valable jusqu'à 1 heure (limite du service).
const SOBRE = { "X-Content-Type-Options": "nosniff" };
const PUBLIC = { "Cache-Control": "public, max-age=3600", ...SOBRE };
const introuvable = () => non("no-store");

export async function GET(req: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  const pub = new URL(req.url).searchParams.get("p") || "";
  let f: Awaited<ReturnType<typeof fichierPublic>> = null;
  try {
    f = await fichierPublic(fichier, pub);
  } catch (e) {
    console.error("[bibliotheque] lecture publique impossible :", (e as Error).message);
  }
  if (!f) return introuvable();

  if (f.genre === "image") {
    const etag = `"${fichier}"`;
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag, ...PUBLIC } });
    const l = await depot().lire(f.cle);
    if (!l) return introuvable();
    return new Response(new Uint8Array(l.corps), { headers: { "Content-Type": f.type, "Content-Length": String(l.corps.length), ETag: etag, ...PUBLIC } });
  }

  // Vidéo : lien signé du stockage objet, ou lecture par plages par le serveur (disque) : indispensable sur iPhone.
  return reponseLecture(req, f.cle, f.type, { redirection: { "Cache-Control": "private, max-age=300" }, flux: PUBLIC });
}
