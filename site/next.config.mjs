/** @type {import('next').NextConfig} */
const securite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Les pages de commande portent un secret dans leur adresse : il ne doit jamais partir vers un autre site.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "media-src 'self'",
      "font-src 'self'",
      // Envoi direct des fichiers vers le stockage objet, si configuré.
      `connect-src 'self' ${process.env.S3_PUBLIC_ORIGIN || ""}`.trim(),
      "form-action 'self' https://checkout.stripe.com http://localhost:4242",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];
const prive = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig = {
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
export default nextConfig;
