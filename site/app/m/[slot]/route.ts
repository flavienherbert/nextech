import { Readable } from "node:stream";
import { depot } from "@/lib/depot";
import { cleMedia, emplacement, TYPE_PAR_EXTENSION, TYPES_MEDIA, VERSION_MEDIA } from "@/lib/emplacements";
import { adresseMedia, chargerMedias } from "@/lib/medias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Médias publics du site. L'adresse « /m/<emplacement>?v=<version> » désigne un fichier précis qui ne change jamais :
// on peut donc le garder un an dans le navigateur et sur le CDN. Sans « v », on renvoie vers la version actuelle.
// Seuls des fichiers du dossier « medias » sont servis (jamais ceux des clients), uniquement JPG, PNG, WebP, MP4, WebM.
const SOBRE = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
const IMMUABLE = { "Cache-Control": "public, max-age=31536000, immutable" };
const introuvable = () => new Response("Introuvable", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });

// Une seule plage d'octets (« bytes=a-b », « bytes=a- », « bytes=-n »), comme le demandent les lecteurs vidéo.
function lirePlage(entete: string | null, taille: number): { debut: number; fin: number } | "invalide" | null {
  if (!entete) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(entete.trim());
  if (!m || (!m[1] && !m[2])) return "invalide";
  let debut: number, fin: number;
  if (!m[1]) {
    debut = Math.max(0, taille - Number(m[2]));
    fin = taille - 1;
  } else {
    debut = Number(m[1]);
    fin = m[2] ? Math.min(Number(m[2]), taille - 1) : taille - 1;
  }
  return debut > fin || debut >= taille ? "invalide" : { debut, fin };
}

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

  // Vidéo : avec un stockage objet, le navigateur est renvoyé vers un lien signé (le serveur ne porte pas la vidéo) ;
  // avec un disque, le serveur la sert lui-même, par plages (obligatoire pour la lecture sur iPhone).
  const direct = await depot().urlAffichage(cle, type);
  if (direct) {
    if ((await depot().taille(cle)) === null) return introuvable();
    return new Response(null, { status: 302, headers: { Location: direct, "Cache-Control": "private, max-age=300", "Referrer-Policy": "no-referrer" } });
  }
  const taille = await depot().taille(cle);
  if (taille === null) return introuvable();
  const plage = lirePlage(req.headers.get("range"), taille);
  if (plage === "invalide") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
  const flux = await depot().flux(cle, plage ?? undefined);
  if (!flux) return introuvable();
  const corps = Readable.toWeb(flux) as ReadableStream;
  const commun = { "Content-Type": type, "Accept-Ranges": "bytes", ...IMMUABLE, ...SOBRE };
  return plage
    ? new Response(corps, { status: 206, headers: { ...commun, "Content-Range": `bytes ${plage.debut}-${plage.fin}/${taille}`, "Content-Length": String(plage.fin - plage.debut + 1) } })
    : new Response(corps, { headers: { ...commun, "Content-Length": String(taille) } });
}
