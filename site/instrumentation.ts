// Toute erreur serveur imprévue prévient l'administrateur (téléphone + e-mail), sans jamais gêner le visiteur.
// Le code réel est dans lib/erreurs.ts : il n'est chargé que sur le serveur Node (pas dans l'environnement « edge »).
export async function onRequestError(err: unknown, _request: { path: string; method: string }, context: { routePath: string; routeType: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { signalerErreurServeur } = await import("./lib/erreurs");
    await signalerErreurServeur(err, context);
  }
}
