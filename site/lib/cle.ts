// Contrôle des clés de stockage, commun à tous les pilotes (disque, objet, base de données).
export const cleSure = (cle: string) => {
  if (!/^[A-Za-z0-9_\-./]+$/.test(cle) || cle.includes("..") || cle.startsWith("/")) throw new Error("Clé de stockage invalide.");
  return cle;
};
