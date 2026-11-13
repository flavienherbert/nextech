// Session de l'espace administrateur : mot de passe unique, cookie signé.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";

const NOM = "sa_admin";
const DUREE = 12 * 3600; // secondes

const signer = (v: string) => crypto.createHmac("sha256", env.sessionSecret()).update(v).digest("hex");
const egal = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const adminConfigure = () => env.adminPassword().length >= 10 && env.sessionSecret().length >= 32;

// Limite les essais de mot de passe : 5 par quart d'heure et par adresse.
const essais = new Map<string, { n: number; debut: number }>();
export function essaiAutorise(ip: string): boolean {
  const t = Date.now();
  const e = essais.get(ip);
  if (!e || t - e.debut > 15 * 60_000) {
    essais.set(ip, { n: 1, debut: t });
    return true;
  }
  e.n += 1;
  return e.n <= 5;
}

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

export async function exigerAdmin() {
  if (!(await estAdmin())) redirect("/admin/connexion");
}
