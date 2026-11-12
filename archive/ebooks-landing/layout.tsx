import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ProgressBar from "@/components/ProgressBar";

const heading = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "nextech — Guides Claude",
  description:
    "3 guides PDF pour créer, lancer et vendre avec l'IA — sans savoir coder.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${heading.variable} ${mono.variable}`}>
      <body className="bg-navy-950 font-sans antialiased">
        <SmoothScrollProvider>
          <ProgressBar />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
