import { NextResponse } from "next/server";
import { creerCommandeEtSession } from "@/lib/commandes";
import { formuleParId } from "@/lib/formules";
import { env, modePaiement } from "@/lib/env";
import { adresseClient, enregistrer } from "@/lib/limiteur";
import { alerter } from "@/lib/alertes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Frein contre la création de commandes en rafale : 8 par adresse et par quart d'heure,
// compté dans le dépôt partagé (valable pour toutes les instances du site).
const tropRapide = async (ip: string) => (await enregistrer("commande", ip, 15 * 60_000)) > 8;

// Reçoit le formulaire de la page « Commander », crée la commande et renvoie vers Stripe.
export async function POST(req: Request) {
  const form = await req.formData();
  const f = formuleParId(String(form.get("formule") || ""));
  const retour = (q: string) => NextResponse.redirect(`${env.baseUrl()}/commander/${f?.adresse || "essai"}?${q}`, 303);
  if (!f) return NextResponse.redirect(`${env.baseUrl()}/#formules`, 303);
  if (form.get("cgv") !== "oui" || form.get("ia") !== "oui") return retour("erreur=conditions");
  if (modePaiement().mode === "ferme") return retour("erreur=ferme");
  if (process.env.E2E !== "1" && (await tropRapide(adresseClient(req.headers)))) return retour("erreur=rythme");
  try {
    const { url } = await creerCommandeEtSession(f.id);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error("[checkout]", (e as Error).message);
    await alerter({ cle: "checkout-erreur", titre: "Problème technique : un client n'a pas pu payer", message: "La création d'un paiement a échoué : des ventes peuvent être perdues. Vérifiez le diagnostic.", details: (e as Error).message, lien: `${env.baseUrl()}/admin/diagnostic`, urgence: "haute", fenetreMs: 1800_000 });
    return retour("erreur=paiement");
  }
}
