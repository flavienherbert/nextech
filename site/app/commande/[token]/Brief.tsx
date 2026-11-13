"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { envoyerFichier } from "../../components/envoi";

type Depot = { id: string; nom: string; taille: number };
const STYLES = ["Direct", "Complice", "Haut de gamme", "Drôle", "Je vous laisse choisir"];

export default function Brief({ token, emailConnu, fichiers }: { token: string; emailConnu: string; fichiers: Depot[] }) {
  const router = useRouter();
  const [depots, setDepots] = useState<Depot[]>(fichiers);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [soumission, setSoumission] = useState(false);
  const champFichier = useRef<HTMLInputElement | null>(null);

  async function deposer(liste: FileList | null) {
    if (!liste) return;
    setMessage("");
    for (const f of Array.from(liste)) {
      setEnvoi(f.name);
      const d = await envoyerFichier(`/api/commande/${token}/fichiers`, f);
      if (d.erreur || !d.id) {
        setMessage(`${f.name} : ${d.erreur || "envoi refusé"}`);
        break;
      }
      setDepots((x) => [...x, { id: d.id!, nom: d.nom!, taille: d.taille! }]);
    }
    setEnvoi(null);
    if (champFichier.current) champFichier.current.value = "";
  }

  async function retirer(id: string) {
    await fetch(`/api/commande/${token}/fichiers?id=${id}`, { method: "DELETE" });
    setDepots((x) => x.filter((d) => d.id !== id));
  }

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSoumission(true);
    setErreurs({});
    setMessage("");
    const donnees = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const r = await fetch(`/api/commande/${token}/brief`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(donnees) });
      const d = await r.json();
      if (!r.ok) {
        setErreurs(d.erreurs || {});
        setMessage(d.erreur || "Envoi impossible.");
        setSoumission(false);
        return;
      }
      router.refresh();
    } catch {
      setMessage("Connexion interrompue. Vos réponses sont conservées, réessayez.");
      setSoumission(false);
    }
  }

  const champ = (nom: string, libelle: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, aide?: string) => (
    <label className="champ">
      <span>{libelle}</span>
      <input name={nom} aria-invalid={Boolean(erreurs[nom])} {...props} />
      {aide && <small>{aide}</small>}
      {erreurs[nom] && <em className="champ-erreur">{erreurs[nom]}</em>}
    </label>
  );
  const zone = (nom: string, libelle: string, aide: string, lignes = 3) => (
    <label className="champ champ-large">
      <span>{libelle}</span>
      <textarea name={nom} rows={lignes} />
      <small>{aide}</small>
    </label>
  );

  return (
    <form className="formulaire" onSubmit={soumettre} noValidate>
      <fieldset>
        <legend>Vous</legend>
        <div className="grille-champs">
          {champ("nom", "Nom et prénom *", { required: true, autoComplete: "name" })}
          {champ("email", "E-mail *", { type: "email", required: true, defaultValue: emailConnu, autoComplete: "email" }, "Nous y envoyons le script et le lien de livraison.")}
          {champ("marque", "Nom de la marque *", { required: true, autoComplete: "organization" })}
          {champ("telephone", "Téléphone", { type: "tel", autoComplete: "tel" }, "Facultatif. Utilisé uniquement en cas de question urgente.")}
        </div>
      </fieldset>

      <fieldset>
        <legend>Facturation</legend>
        <div className="grille-champs">
          {champ("nomFacture", "Nom ou raison sociale à facturer *", { required: true }, "Tel qu'il doit figurer sur la facture.")}
          {champ("sirenClient", "SIREN ou SIRET", { inputMode: "numeric" }, "Pour les professionnels. Laissez vide si vous êtes un particulier.")}
        </div>
        <label className="champ champ-large">
          <span>Adresse de facturation *</span>
          <textarea name="adresseFacture" rows={2} aria-invalid={Boolean(erreurs.adresseFacture)} required autoComplete="street-address" />
          {erreurs.adresseFacture && <em className="champ-erreur">{erreurs.adresseFacture}</em>}
        </label>
      </fieldset>

      <fieldset>
        <legend>Le produit</legend>
        <div className="grille-champs">
          {champ("lien", "Lien du site ou de la fiche produit *", { type: "url", required: true, placeholder: "https://" })}
          {champ("produit", "Produit à mettre en avant *", { required: true }, "Un seul produit par commande.")}
        </div>
        <label className="champ">
          <span>Style souhaité *</span>
          <select name="style" defaultValue="" aria-invalid={Boolean(erreurs.style)} required>
            <option value="" disabled>
              Choisir
            </option>
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {erreurs.style && <em className="champ-erreur">{erreurs.style}</em>}
        </label>
        {zone("cible", "Qui achète ce produit ?", "Âge, situation, moment d'utilisation. Deux lignes suffisent.", 2)}
        {zone("arguments", "Arguments ou texte à intégrer", "Promesse principale, prix, offre en cours, phrases que vous tenez à entendre.", 4)}
        {zone("aEviter", "Ce qu'il ne faut pas dire", "Allégations interdites, concurrents, mots à éviter.", 2)}
        {zone("complement", "Informations complémentaires", "Tout ce qui peut nous aider : date de campagne, plateforme visée, exemples que vous aimez.", 3)}
      </fieldset>

      <fieldset>
        <legend>Images et vidéos de référence</legend>
        <p className="aide">
          Photos nettes du produit de préférence sur fond simple, logo, vidéos d&apos;inspiration. Jusqu&apos;à 6 fichiers
          de 40 Mo (JPG, PNG, WebP, HEIC, MP4, MOV, WebM, PDF). Les fichiers sont privés : seul le studio y accède.
        </p>
        <input ref={champFichier} id="depot" className="depot-natif" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.mp4,.mov,.webm,.pdf" onChange={(e) => deposer(e.target.files)} disabled={Boolean(envoi) || depots.length >= 6} />
        <label htmlFor="depot" className={`depot${envoi || depots.length >= 6 ? " depot-off" : ""}`}>
          {envoi ? `Envoi de ${envoi}…` : depots.length >= 6 ? "6 fichiers déposés" : "Choisir des fichiers"}
        </label>
        {depots.length > 0 && (
          <ul className="depots">
            {depots.map((d) => (
              <li key={d.id}>
                <span>{d.nom}</span>
                <small>{(d.taille / 1048576).toFixed(1)} Mo</small>
                <button type="button" onClick={() => retirer(d.id)} aria-label={`Retirer ${d.nom}`}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {message && <p className="avis avis-erreur" role="alert">{message}</p>}
      <button className="bouton bouton-large" type="submit" disabled={soumission || Boolean(envoi)}>
        {soumission ? "Envoi…" : "Envoyer le brief"}
      </button>
      <p className="petit centre">Vos informations servent uniquement à réaliser cette commande.</p>
    </form>
  );
}
