// Une clé par usage, dérivée de SESSION_SECRET (HMAC avec un nom d'usage) : la fuite ou la compromission d'une clé dérivée
// ne donne accès à aucun autre usage (session d'administration, jetons de dépôt de fichiers, limiteur, réglages chiffrés).
// `lier` ajoute un élément supplémentaire à la dérivation (par exemple l'empreinte du mot de passe administrateur).
import crypto from "node:crypto";
import { env } from "./env";

export const cleDerivee = (usage: string, lier = ""): Buffer =>
  crypto.createHmac("sha256", env.sessionSecret() || "local").update(`studio-accroche|${usage}|${lier}`).digest();
