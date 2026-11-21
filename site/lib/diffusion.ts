// Lecture d'une vidéo dans une page (et non en téléchargement) : commun aux médias publics du site (/m/…) et à la lecture
// des livrables par le client. Avec un stockage objet, le navigateur est renvoyé vers un lien signé (le serveur ne porte pas
// la vidéo). Avec un disque, le serveur la sert lui-même, par plages d'octets : indispensable à la lecture sur iPhone.
import { Readable } from "node:stream";
import { depot } from "./depot";

// Une seule plage d'octets (« bytes=a-b », « bytes=a- », « bytes=-n »), comme le demandent les lecteurs vidéo.
export function lirePlage(entete: string | null, taille: number): { debut: number; fin: number } | "invalide" | null {
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

export const introuvable = (cache = "public, max-age=60") => new Response("Introuvable", { status: 404, headers: { "Cache-Control": cache } });

// `redirection` : en-têtes de la réponse de renvoi vers le stockage ; `flux` : en-têtes de la lecture directe.
export async function reponseLecture(req: Request, cle: string, type: string, entetes: { redirection: Record<string, string>; flux: Record<string, string> }): Promise<Response> {
  const direct = await depot().urlAffichage(cle, type);
  if (direct) {
    if ((await depot().taille(cle)) === null) return introuvable(entetes.redirection["Cache-Control"]);
    return new Response(null, { status: 302, headers: { Location: direct, "Referrer-Policy": "no-referrer", ...entetes.redirection } });
  }
  const taille = await depot().taille(cle);
  if (taille === null) return introuvable(entetes.redirection["Cache-Control"]);
  const plage = lirePlage(req.headers.get("range"), taille);
  if (plage === "invalide") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
  const flux = await depot().flux(cle, plage ?? undefined);
  if (!flux) return introuvable(entetes.redirection["Cache-Control"]);
  const corps = Readable.toWeb(flux) as ReadableStream;
  const commun = { "Content-Type": type, "Accept-Ranges": "bytes", ...entetes.flux };
  return plage
    ? new Response(corps, { status: 206, headers: { ...commun, "Content-Range": `bytes ${plage.debut}-${plage.fin}/${taille}`, "Content-Length": String(plage.fin - plage.debut + 1) } })
    : new Response(corps, { headers: { ...commun, "Content-Length": String(taille) } });
}
