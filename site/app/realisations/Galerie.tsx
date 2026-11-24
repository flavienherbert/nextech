"use client";

import { useState } from "react";
import CarteRealisation from "../components/CarteRealisation";
import type { VuePublique } from "@/lib/bibliotheque";

// Galerie filtrable. Toutes les réalisations sont dans la page (lisibles sans JavaScript) ; les filtres ne font que masquer.
export default function Galerie({ items, categories, styles }: { items: VuePublique[]; categories: string[]; styles: string[] }) {
  const [categorie, setCategorie] = useState("");
  const [style, setStyle] = useState("");
  const visible = (r: VuePublique) => (!categorie || r.categorie === categorie) && (!style || r.style === style);
  const nb = items.filter(visible).length;

  const groupe = (nom: string, valeurs: string[], courant: string, choisir: (v: string) => void) =>
    valeurs.length > 1 && (
      <div className="realisations-filtre" role="group" aria-label={nom}>
        <span className="realisations-filtre-nom">{nom}</span>
        <button type="button" className="puce-filtre" aria-pressed={courant === ""} onClick={() => choisir("")}>Toutes</button>
        {valeurs.map((v) => (
          <button key={v} type="button" className="puce-filtre" aria-pressed={courant === v} onClick={() => choisir(v)}>{v}</button>
        ))}
      </div>
    );

  return (
    <>
      <div className="realisations-filtres">
        {groupe("Catégorie", categories, categorie, setCategorie)}
        {groupe("Style", styles, style, setStyle)}
      </div>
      <p className="aide" role="status">{nb} réalisation{nb > 1 ? "s" : ""}</p>
      <div className="realisations-grille">
        {items.map((r) => (
          <CarteRealisation key={r.id} r={r} masquee={!visible(r)} />
        ))}
      </div>
      {nb === 0 && <p className="avis">Aucune réalisation ne correspond à ces filtres.</p>}
    </>
  );
}
