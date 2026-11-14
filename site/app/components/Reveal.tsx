import type { CSSProperties, ReactNode } from "react";

// Bloc qui apparaît en douceur quand il entre dans l'écran.
// Ce composant ne contient aucun script : il pose seulement la classe « revele ».
// L'apparition est pilotée par un petit script autonome (voir app/layout.tsx), indépendant
// du chargement de l'application : si celle-ci ne démarre pas, le contenu reste visible.
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "article" | "section";
}) {
  const style = { "--delai": `${delay}ms` } as CSSProperties;
  return (
    // Le script d'apparition ajoute la classe « vu » avant le démarrage de l'application :
    // cet écart d'attribut est attendu.
    <Tag className={`revele ${className}`} style={style} suppressHydrationWarning>
      {children}
    </Tag>
  );
}
