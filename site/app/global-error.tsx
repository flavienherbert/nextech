"use client";

// Dernier filet de sécurité : erreur dans la mise en page elle-même. Style en ligne, indépendant du reste du site.
export default function ErreurGlobale({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: "#0b0a09", color: "#f3efe8", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 520 }}>
          <h1 style={{ fontWeight: 500, fontSize: 32, margin: "0 0 12px" }}>Studio Accroche</h1>
          <p style={{ color: "#a8a094", lineHeight: 1.6 }}>Le site rencontre un incident temporaire. Vos données ne sont pas affectées. Réessayez dans un instant.</p>
          <button onClick={() => reset()} style={{ marginTop: 18, background: "#ff5a2b", color: "#fff", border: 0, borderRadius: 999, padding: "12px 22px", fontWeight: 600, cursor: "pointer" }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
