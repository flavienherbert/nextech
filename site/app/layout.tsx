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

const SCRIPT_APPARITION = `(function(){
  try {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var io = new IntersectionObserver(function(entrees){
      entrees.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add("vu"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    var vus = new WeakSet();
    function suivre(){ document.querySelectorAll(".revele").forEach(function(el){ if (!vus.has(el)) { vus.add(el); io.observe(el); } }); }
    suivre();
    document.documentElement.classList.add("anim");
    new MutationObserver(suivre).observe(document.body, { childList: true, subtree: true });
  } catch (e) { document.documentElement.classList.remove("anim"); }
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        {children}
        {/* Apparition des blocs au défilement. Script autonome, sans dépendance :
            il ne masque les blocs (classe « anim ») qu'après avoir vérifié qu'il sait les révéler. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_APPARITION }} />
      </body>
    </html>
  );
}
