import { NextResponse } from "next/server";
import { creerCommandeEtSession } from "@/lib/commandes";
import { formuleParId } from "@/lib/formules";
import { env, modePaiement } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reçoit le formulaire de la page « Commander », crée la commande et renvoie vers Stripe.
export async function POST(req: Request) {
  const form = await req.formData();
  const f = formuleParId(String(form.get("formule") || ""));
  const retour = (q: string) => NextResponse.redirect(`${env.baseUrl()}/commander/${f?.id || "essai"}?${q}`, 303);
  if (!f) return NextResponse.redirect(`${env.baseUrl()}/#formules`, 303);
  if (form.get("cgv") !== "oui" || form.get("ia") !== "oui") return retour("erreur=conditions");
  if (modePaiement().mode === "ferme") return retour("erreur=ferme");
  try {
    const { url } = await creerCommandeEtSession(f.id);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error("[checkout]", (e as Error).message);
    return retour("erreur=paiement");
  }
}
