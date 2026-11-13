import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { site } from "./config";

const titre = `${site.marque} — Publicités vidéo avec présentateur IA`;

export const metadata: Metadata = {
  title: titre,
  description: site.sousTitre,
  openGraph: {
    title: titre,
    description: site.sousTitre,
    locale: "fr_FR",
    type: "website",
    images: ["/media/accueil-large.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0a09",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <noscript>
          <style>{`.revele{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
