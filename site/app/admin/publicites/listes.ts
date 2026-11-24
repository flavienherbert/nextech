// Listes et limites transmises aux formulaires (composants client) : elles viennent toutes de lib/bibliotheque.ts, définies à un seul endroit.
import { CATEGORIES, DUREE_MAX_PUB, FORMATS, LIMITES, STATUTS_PUB, STYLES, type Avatar } from "@/lib/bibliotheque";
import { DUREE_MAX_SECONDES } from "@/lib/formules";
import type { Listes } from "./FormulairePub";

export const listesPourFormulaire = (avatars: Avatar[]): Listes => ({
  categories: [...CATEGORIES],
  styles: [...STYLES],
  formats: [...FORMATS],
  statuts: STATUTS_PUB.map((s) => ({ id: s.id, nom: s.nom })),
  avatars: avatars.map((a) => ({ id: a.id, nom: a.nom })),
  limites: { nom: LIMITES.nom, produit: LIMITES.produit, script: LIMITES.script, prompt: LIMITES.prompt },
  dureeMax: DUREE_MAX_PUB,
  dureeVendue: DUREE_MAX_SECONDES,
});
