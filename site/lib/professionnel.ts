// Offre réservée aux professionnels : contrôle des informations saisies avant le paiement.
//   • la case « Je commande en tant que professionnel, pour les besoins de mon activité. » est obligatoire ;
//   • le nom de l'entreprise est obligatoire ;
//   • le SIRET est facultatif ; s'il est saisi, il doit comporter 14 chiffres (espaces et points tolérés).
export type ClientPro = { entreprise: string; siret: string };
export type Verification =
  | { ok: true; client: ClientPro }
  | { ok: false; erreur: "pro" | "entreprise" | "siret"; client: ClientPro };

export const nettoyerEntreprise = (v: unknown): string => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
export const normaliserSiret = (v: unknown): string => String(v ?? "").replace(/[\s.]/g, "");
export const siretValide = (siret: string): boolean => /^\d{14}$/.test(siret);
// « 123 456 789 00012 » : lecture plus facile sur la facture.
export const siretLisible = (siret: string): string => (siretValide(siret) ? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}` : siret);

export function verifierProfessionnel(form: { get(nom: string): unknown }): Verification {
  const client: ClientPro = { entreprise: nettoyerEntreprise(form.get("entreprise")), siret: normaliserSiret(form.get("siret")) };
  if (form.get("pro") !== "oui") return { ok: false, erreur: "pro", client };
  if (client.entreprise.length < 2) return { ok: false, erreur: "entreprise", client };
  if (client.siret && !siretValide(client.siret)) return { ok: false, erreur: "siret", client };
  return { ok: true, client };
}
