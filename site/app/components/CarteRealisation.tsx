import DemoVideo from "./DemoVideo";
import { MENTION_IA } from "../config";
import type { VuePublique } from "@/lib/bibliotheque";

// Une réalisation de la bibliothèque (accueil et page « Réalisations ») : lecteur, nom, catégorie, style, durée, et la mention « IA » bien visible.
// Ne reçoit que la vue publique : ni script, ni prompt, ni avatar, ni statut.
export default function CarteRealisation({ r, masquee = false }: { r: VuePublique; masquee?: boolean }) {
  return (
    <figure className="exemple realisation" hidden={masquee}>
      <div className="demo-cadre" style={{ aspectRatio: r.format.replace(":", " / ") }}>
        <DemoVideo video={r.video} poster={r.affiche} libelle={`Lire la vidéo : ${r.nom} (sans le son)`} />
      </div>
      <figcaption>
        <strong>{r.nom}</strong>
        <span className="realisation-meta">{[r.categorie, r.style, `${r.dureeSecondes} s`].filter(Boolean).join(" · ")}</span>
        <span className="mention-ia">{MENTION_IA}</span>
      </figcaption>
    </figure>
  );
}
