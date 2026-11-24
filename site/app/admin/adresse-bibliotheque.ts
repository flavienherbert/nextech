// Adresse privée d'un fichier de la bibliothèque (aperçus de l'administration). Module sans code navigateur : utilisable des deux côtés.
export const adresseAdmin = (f: { id: string }) => `/api/admin/bibliotheque/fichier/${f.id}`;
