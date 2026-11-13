import { NextResponse } from "next/server";
import { store, journal } from "@/lib/store";
import { estAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { lireFichierEnvoye } from "@/lib/fichiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dépôt d'un livrable (vidéo finale) par l'administrateur.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return new Response("Non autorisé", { status: 401 });
  // Protection contre les envois déclenchés depuis un autre site.
  const origine = req.headers.get("origin");
  if (origine && origine !== new URL(env.baseUrl()).origin) return new Response("Origine refusée", { status: 403 });
  const { id } = await params;
  const page = `${env.baseUrl()}/admin/commande/${id}`;
  const lu = await lireFichierEnvoye(req);
  if ("erreur" in lu) return NextResponse.redirect(`${page}?erreur=${encodeURIComponent(lu.erreur)}`, 303);
  const fichier = await store.enregistrerFichier(lu.contenu, lu.nom, lu.type);
  const c = await store.modifier(id, (cmd) => {
    cmd.livrables.push(fichier);
    journal(cmd, `Livrable ajouté : ${fichier.nom}.`);
  });
  if (!c) {
    await store.supprimerFichier(fichier.id);
    return new Response("Commande introuvable", { status: 404 });
  }
  return NextResponse.redirect(`${page}?ok=livrable`, 303);
}
