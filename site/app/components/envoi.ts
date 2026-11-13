// Envoi d'un fichier en trois temps, identique pour le client et l'administrateur :
// 1. demande d'autorisation, 2. envoi (au serveur ou directement au stockage), 3. confirmation.
export async function envoyerFichier(base: string, f: File): Promise<{ id?: string; nom?: string; taille?: number; erreur?: string }> {
  try {
    const r1 = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: f.name, type: f.type, taille: f.size }) });
    const d1 = await r1.json();
    if (!r1.ok) return { erreur: d1.erreur || "Envoi refusé." };
    const r2 = await fetch(d1.url, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
    if (!r2.ok) return { erreur: (await r2.json().catch(() => ({}))).erreur || "Envoi interrompu." };
    const r3 = await fetch(`${base}/confirmer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton: d1.jeton }) });
    const d3 = await r3.json();
    return r3.ok ? d3 : { erreur: d3.erreur || "Fichier refusé." };
  } catch {
    return { erreur: "Connexion interrompue." };
  }
}
