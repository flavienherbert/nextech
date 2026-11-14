import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Politique de sécurité de contenu.
// En développement (« next dev », donc « npm run demo »), l'outil de compilation exécute le code
// par évaluation de chaînes et se met à jour par WebSocket : sans 'unsafe-eval', l'application
// ne démarre pas dans le navigateur. Cette autorisation n'est accordée que dans cette phase.
// La version compilée (« next build » puis « next start », ou un hébergeur) ne la reçoit jamais.
export function politiqueContenu(developpement) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${developpement ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "font-src 'self'",
    // Envoi direct des fichiers vers le stockage objet, si configuré.
    `connect-src 'self' ${process.env.S3_PUBLIC_ORIGIN || ""}${developpement ? " ws: wss:" : ""}`.replace(/\s+/g, " ").trim(),
    "form-action 'self' https://checkout.stripe.com http://localhost:4242",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}

const prive = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "private, no-store" },
];

/** @param {string} phase */
export default function config(phase) {
  const developpement = phase === PHASE_DEVELOPMENT_SERVER;
  const securite = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    // Les pages de commande portent un secret dans leur adresse : il ne doit jamais partir vers un autre site.
    { key: "Referrer-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Content-Security-Policy", value: politiqueContenu(developpement) },
    // Inutile et gênant sur un poste de développement en HTTP.
    ...(developpement ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
  ];
  /** @type {import('next').NextConfig} */
  return {
    poweredByHeader: false,
    serverExternalPackages: ["pdfkit"],
    async headers() {
      return [
        { source: "/:path*", headers: securite },
        { source: "/admin/:path*", headers: prive },
        { source: "/commande/:path*", headers: prive },
        { source: "/api/:path*", headers: prive },
      ];
    },
  };
}
