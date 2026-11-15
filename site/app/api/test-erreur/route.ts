// Route de test : déclenche volontairement une erreur serveur pour vérifier l'alerte « problème technique ».
// N'existe QUE pendant les tests automatisés (variable E2E=1) ; partout ailleurs elle répond 404.
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.E2E !== "1") return new Response("Introuvable", { status: 404 });
  throw new Error("erreur volontaire de test (ne pas corriger)");
}
