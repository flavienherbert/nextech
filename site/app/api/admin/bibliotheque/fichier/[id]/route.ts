import { estAdmin } from "@/lib/auth";
import { cleBibliotheque, VERSION_BIBLIOTHEQUE } from "@/lib/bibliotheque-fichiers";
import { depot } from "@/lib/depot";
import { TYPE_PAR_EXTENSION } from "@/lib/emplacements";
import { reponseLecture } from "@/lib/diffusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lecture PRIVÉE d'un fichier de la bibliothèque (vidéo, miniature, photo d'avatar), réservée à l'administrateur : aperçus de la galerie et des fiches.
// Les visiteurs n'ont que « /b/… », limité aux fichiers des publicités publiées. Jamais mis en cache.
const PRIVE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const introuvable = () => new Response("Introuvable", { status: 404, headers: PRIVE });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return new Response("Non autorisé.", { status: 401, headers: PRIVE });
  const { id } = await params;
  if (!VERSION_BIBLIOTHEQUE.test(id)) return introuvable();
  const type = TYPE_PAR_EXTENSION[id.split(".")[1]];
  if (!type) return introuvable();
  const cle = cleBibliotheque(id);
  if (type.startsWith("video/")) return reponseLecture(req, cle, type, { redirection: PRIVE, flux: PRIVE });
  // Image : servie par le serveur (la politique de contenu n'autorise que ce site pour les images).
  const l = await depot().lire(cle);
  if (!l) return introuvable();
  return new Response(new Uint8Array(l.corps), { headers: { "Content-Type": type, "Content-Length": String(l.corps.length), ...PRIVE } });
}
