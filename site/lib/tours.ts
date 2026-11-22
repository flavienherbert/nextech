// Tours de retouches : un tour = une seule demande consolidée sur l'ensemble des vidéos livrées (et non une demande par vidéo).
// Le nombre de tours est celui de la formule (lib/formules.ts). Une demande refusée (hors périmètre, ou reçue après le délai de 14 jours) n'est pas décomptée.
import { formuleParId } from "./formules";
import type { Commande } from "./store";

export const toursMax = (c: Commande) => formuleParId(c.formule)!.tours;
export const toursUtilises = (c: Commande) => c.retouchesDemandees.filter((r) => !r.horsPerimetre && !r.tardive).length;
export const toursRestants = (c: Commande) => Math.max(0, toursMax(c) - toursUtilises(c));
