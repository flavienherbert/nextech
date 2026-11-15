// Protection d'accès de la préproduction.
// Active seulement si PREPROD_PASSWORD est défini : le site entier demande alors un identifiant
// et un mot de passe (fenêtre du navigateur). Sans cette variable, ce fichier ne fait rien.
// Exception : le webhook Stripe, qui ne peut pas s'identifier et reste protégé par sa signature.
// Ce fichier ne définit aucun en-tête de sécurité : ils restent dans next.config.mjs.
import { NextResponse, type NextRequest } from "next/server";

export const config = { matcher: ["/((?!api/stripe/webhook).*)"] };

const egal = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export function middleware(req: NextRequest) {
  const attendu = process.env.PREPROD_PASSWORD;
  if (!attendu) return NextResponse.next();
  const entete = req.headers.get("authorization") || "";
  if (entete.startsWith("Basic ")) {
    try {
      const [, motDePasse = ""] = atob(entete.slice(6)).split(":");
      if (egal(motDePasse, attendu)) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Accès réservé.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Studio Accroche - preproduction", charset="UTF-8"', "X-Robots-Tag": "noindex" },
  });
}
