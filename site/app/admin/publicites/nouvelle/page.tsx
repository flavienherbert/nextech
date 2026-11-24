import type { Metadata } from "next";
import Link from "next/link";
import FormulairePub from "../FormulairePub";
import { listesPourFormulaire } from "../listes";
import { exigerAdmin } from "@/lib/auth";
import { listerAvatars } from "@/lib/bibliotheque";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nouvelle publicité — Administration", robots: { index: false, follow: false } };

export default async function NouvellePublicite() {
  await exigerAdmin("/admin/publicites/nouvelle");
  const avatars = await listerAvatars();
  return (
    <main className="page admin">
      <div className="conteneur conteneur-etroit">
        <p className="retour"><Link href="/admin/publicites">← Publicités</Link></p>
        <p className="surtitre">Administration</p>
        <h1 className="titre-page">Nouvelle publicité</h1>
        <p className="aide">Le numéro (PUB-001, PUB-002…) est attribué à l&apos;enregistrement. Une publicité est <strong>privée</strong> tant que vous ne l&apos;avez pas publiée ; la vidéo peut être ajoutée plus tard.</p>
        <FormulairePub listes={listesPourFormulaire(avatars)} />
      </div>
    </main>
  );
}
