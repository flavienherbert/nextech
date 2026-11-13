import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connexion } from "../actions";
import { adminConfigure, estAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration — Studio Accroche", robots: { index: false, follow: false } };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  if (await estAdmin()) redirect("/admin");
  const { erreur } = await searchParams;
  return (
    <main className="page admin">
      <div className="conteneur connexion">
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">Studio <em>Accroche</em></h1>
        {!adminConfigure() ? (
          <p className="avis avis-erreur">
            Espace non configuré : définissez ADMIN_PASSWORD (10 caractères minimum) et SESSION_SECRET (32 caractères minimum).
          </p>
        ) : (
          <form action={connexion} className="formulaire">
            <label className="champ">
              <span>Mot de passe</span>
              <input type="password" name="motdepasse" autoComplete="current-password" required autoFocus />
            </label>
            {erreur === "refus" && <p className="avis avis-erreur">Mot de passe incorrect.</p>}
            {erreur === "essais" && <p className="avis avis-erreur">Trop d&apos;essais. Réessayez dans un quart d&apos;heure.</p>}
            <button className="bouton bouton-large" type="submit">Entrer</button>
          </form>
        )}
      </div>
    </main>
  );
}
