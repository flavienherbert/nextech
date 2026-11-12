import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "./config";

export const metadata: Metadata = {
  title: `${site.marque} — Publicités vidéo avec présentateur IA`,
  description: site.sousTitre,
  openGraph: {
    title: `${site.marque} — Publicités vidéo avec présentateur IA`,
    description: site.sousTitre,
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
