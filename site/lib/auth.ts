// Session de l'espace administrateur : mot de passe unique, cookie signé.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { compte, enregistrer, remettreAZero } from "./limiteur";

const NOM = "sa_admin";
// 7 jours : sur téléphone, saisir un long mot de passe chaque jour serait pénible. Changer SESSION_SECRET déconnecte tout le monde.
const DUREE = 7 * 24 * 3600; // secondes

const signer = (v: string) => crypto.createHmac("sha256", env.sessionSecret()).update(v).digest("hex");
const egal = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const adminConfigure = () => env.adminPassword().length >= 12 && env.sessionSecret().length >= 32;

// Limite les essais de mot de passe : 5 échecs par quart d'heure et par adresse, comptés dans le dépôt
// partagé (efficace même avec plusieurs instances du site).
const FENETRE_ESSAIS = 15 * 60_000;
export async function essaiAutorise(ip: string): Promise<boolean> {
  return (await compte("connexion", ip, FENETRE_ESSAIS)) < 5;
}

// Seuls les échecs sont comptés ; une connexion réussie remet le compteur à zéro.
export async function noterEssai(ip: string, reussi: boolean) {
  if (reussi) await remettreAZero("connexion", ip);
  else await enregistrer("connexion", ip, FENETRE_ESSAIS);
}

// Chaque échec coûte une seconde : une recherche exhaustive devient impraticable.
export const ralentir = () => new Promise((ok) => setTimeout(ok, 1000));

export function motDePasseValide(saisi: string): boolean {
  if (!adminConfigure()) return false;
  const h = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  return egal(h(saisi), h(env.adminPassword()));
}

export async function ouvrirSession() {
  const exp = String(Math.floor(Date.now() / 1000) + DUREE);
  (await cookies()).set(NOM, `${exp}.${signer(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.baseUrl().startsWith("https://"),
    path: "/",
    maxAge: DUREE,
  });
}

export async function fermerSession() {
  (await cookies()).delete(NOM);
}

export async function estAdmin(): Promise<boolean> {
  if (!adminConfigure()) return false;
  const v = (await cookies()).get(NOM)?.value || "";
  const [exp, sig] = v.split(".");
  if (!exp || !sig || !egal(sig, signer(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

// Après connexion, retour sur la page demandée (lien d'une notification), à condition qu'elle soit dans /admin.
export const suiteValide = (s: unknown): string => (typeof s === "string" && /^\/admin(\/[A-Za-z0-9_\-\/]*)?$/.test(s) && !s.includes("//") && !s.startsWith("/admin/connexion") ? s : "/admin");

export async function exigerAdmin(suite?: string) {
  if (!(await estAdmin())) redirect(`/admin/connexion${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`);
}

// Refuse les requêtes déclenchées depuis un autre site.
export const origineValide = (req: Request) => {
  const o = req.headers.get("origin");
  return !o || o === new URL(env.baseUrl()).origin;
};
