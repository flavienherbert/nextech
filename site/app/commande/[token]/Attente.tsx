"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tant que Stripe n'a pas confirmé le paiement, la page attend. Elle ne débloque rien par elle-même.
export default function Attente({ token }: { token: string }) {
  const router = useRouter();
  const [essais, setEssais] = useState(0);

  useEffect(() => {
    if (essais >= 45) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/commande/${token}/etat`, { cache: "no-store" });
        const d = await r.json();
        if (d.paiement && d.paiement !== "en_attente") {
          router.refresh();
          return;
        }
      } catch {}
      setEssais((n) => n + 1);
    }, 2000);
    return () => clearTimeout(t);
  }, [essais, token, router]);

  return (
    <div className="attente">
      {essais < 45 ? (
        <>
          <span className="pulsation" aria-hidden="true" />
          <p>Nous attendons la confirmation de votre paiement par Stripe. Cela prend en général quelques secondes.</p>
        </>
      ) : (
        <p>
          La confirmation tarde. Si vous avez payé, vous recevrez un e-mail dès qu&apos;elle arrive : gardez
          cette page, elle se mettra à jour. Si vous n&apos;avez pas terminé le paiement, rien n&apos;a été débité.
        </p>
      )}
    </div>
  );
}
