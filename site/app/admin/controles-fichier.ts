// Contrôles faits dans le navigateur avant l'envoi d'une image ou d'une vidéo (administration) : dimensions, durée, réduction.
// Partagés par l'envoi des médias du site (MediaEnvoi.tsx) et par la bibliothèque de publicités (BibliothequeEnvoi.tsx).
// Aucun traitement côté serveur : le navigateur lit le fichier et prévient avant l'envoi.

export const SEUIL_LOURD = 1_200_000; // au-delà, une image est réduite avant l'envoi (la page d'accueil doit rester rapide)

// Dimensions d'une image, lues dans le navigateur sans adresse temporaire (la politique de sécurité n'autorise pas « blob: » pour les images).
export async function lireImage(f: File): Promise<{ w: number; h: number } | null> {
  try {
    const b = await createImageBitmap(f);
    const d = { w: b.width, h: b.height };
    b.close();
    return d;
  } catch {
    return null;
  }
}

export function lireVideo(f: File): Promise<{ w: number; h: number; duree: number } | null> {
  return new Promise((ok) => {
    const u = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(u); ok({ w: v.videoWidth, h: v.videoHeight, duree: v.duration }); };
    v.onerror = () => { URL.revokeObjectURL(u); ok(null); };
    v.src = u;
  });
}

// Réduit et recompresse une image trop grande ou trop lourde (WebP si le navigateur sait l'écrire, sinon JPEG).
// L'original est conservé si le résultat n'est pas plus léger ou si le navigateur ne sait pas faire.
export async function optimiser(f: File, largeurMax: number): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const echelle = Math.min(1, largeurMax / bmp.width);
    if (echelle === 1 && f.size <= SEUIL_LOURD) { bmp.close(); return f; }
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * echelle);
    c.height = Math.round(bmp.height * echelle);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    for (const type of ["image/webp", "image/jpeg"]) {
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, type, 0.86));
      if (blob && blob.type === type) {
        if (blob.size >= f.size) return f;
        return new File([blob], f.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg"), { type });
      }
    }
  } catch {
    /* navigateur trop ancien : on envoie le fichier tel quel */
  }
  return f;
}

export const libelleRatio = (r: number) => (Math.abs(r - 9 / 16) < 0.02 ? "vertical 9:16" : Math.abs(r - 3 / 2) < 0.02 ? "horizontal 3:2" : r > 1 ? "horizontal" : "vertical");

// Rapport largeur / hauteur d'un format « 9:16 » (null si le format n'est pas de cette forme).
export function ratioDuFormat(format: string): number | null {
  const m = /^(\d+):(\d+)$/.exec(format);
  return m && Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : null;
}

// Prend une image de la vidéo (au tiers de sa durée, ou à 1 s) et la renvoie sous forme de fichier JPEG ; null si le navigateur ne peut pas.
// `source` : le fichier choisi sur l'ordinateur, ou l'adresse d'une vidéo déjà envoyée (lisible seulement si elle vient du même site :
// avec un stockage objet, le navigateur interdit alors de lire les pixels, et la fonction renvoie null).
export function capturerImage(source: File | string, nom = "miniature", largeurMax = 720): Promise<File | null> {
  return new Promise((ok) => {
    const local = typeof source !== "string";
    const url = local ? URL.createObjectURL(source) : source;
    const v = document.createElement("video");
    const fin = (r: File | null) => { if (local) URL.revokeObjectURL(url); v.removeAttribute("src"); v.load(); ok(r); };
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    if (!local) v.crossOrigin = "anonymous";
    v.onerror = () => fin(null);
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, Math.max(0, (v.duration || 1) / 3)); };
    v.onseeked = () => {
      try {
        const echelle = Math.min(1, largeurMax / (v.videoWidth || largeurMax));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round((v.videoWidth || 1) * echelle));
        c.height = Math.max(1, Math.round((v.videoHeight || 1) * echelle));
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => fin(b ? new File([b], `${nom}.jpg`, { type: "image/jpeg" }) : null), "image/jpeg", 0.86);
      } catch {
        fin(null); // image « contaminée » (vidéo d'une autre origine) ou navigateur sans canvas
      }
    };
    v.src = url;
  });
}
