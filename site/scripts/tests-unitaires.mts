// Tests ciblés des briques sensibles, sur le pilote de stockage configuré par l'environnement.
// Usage : npx tsx scripts/tests-unitaires.mts
import http from "node:http";
import { depot } from "../lib/depot";
import { store, maintenant, nouveauNumero, nouveauToken, type Commande } from "../lib/store";
import { obstaclesFacture, emettreFacture } from "../lib/factures";
import { signatureConforme } from "../lib/fichiers";
import { purger } from "../lib/purge";
import { courriels, enEchec } from "../lib/mail";
import { enregistrer, compte, remettreAZero } from "../lib/limiteur";
import { deduireSupabase, configurationStockage } from "../lib/supabase-config.mjs";
import { executerDiagnostic } from "../lib/diagnostic";

let ko = 0;
const verifier = (nom: string, ok: unknown, detail = "") => { if (!ok) ko++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const commandeTest = (surcharge: Partial<Commande> = {}): Commande => ({
  id: nouveauNumero(), token: nouveauToken(), formule: "essai", montantCents: 2500, devise: "eur", creeLe: maintenant(), statut: "payee",
  paiement: { etat: "paye", sessionId: "cs_x", payeLe: maintenant(), mode: "simulation" },
  brief: { nom: "A B", email: "a@exemple.fr", telephone: "", marque: "M", lien: "https://exemple.fr", produit: "P", style: "Direct", cible: "", arguments: "", aEviter: "", complement: "", nomFacture: "A B", adresseFacture: "1 rue X, 75000 Paris", sirenClient: "", recuLe: maintenant() },
  fichiersClient: [], livrables: [], retouchesDemandees: [], notes: "", historique: [], ...surcharge,
});

if (!process.env.ENFANT) console.log(`Pilote de stockage : ${depot().nom}\n`);

// 1. Compteur : 25 demandes simultanées → 25 numéros distincts et consécutifs
const nom = "essai" + Date.now();
const tires = await Promise.all(Array.from({ length: 25 }, () => store.suivant(nom)));
verifier("Compteur de factures : 25 tirages simultanés, aucun doublon, aucun trou", new Set(tires).size === 25 && Math.max(...tires) === 25, tires.sort((a, b) => a - b).join(","));

// 1 bis. Même épreuve entre deux processus distincts (cas d'un hébergement à plusieurs instances)
if (process.env.ENFANT) { console.log(JSON.stringify(await Promise.all(Array.from({ length: 10 }, () => store.suivant(process.env.ENFANT!))))); process.exit(0); }
const { execFile } = await import("node:child_process");
const enfant = () => new Promise<number[]>((ok) => execFile("npx", ["tsx", "scripts/tests-unitaires.mts"], { env: { ...process.env, ENFANT: "multi" + nom } }, (_e, out) => ok(JSON.parse(out.trim().split("\n").pop() || "[]"))));
const [p1, p2, p3] = await Promise.all([enfant(), enfant(), enfant()]);
const tous = [...p1, ...p2, ...p3];
verifier("Trois processus tirent 30 numéros en même temps : aucun doublon, aucun trou", tous.length === 30 && new Set(tous).size === 30 && Math.max(...tous) === 30, tous.sort((a, b) => a - b).join(","));

// 2. Modifications simultanées d'une même commande : aucune n'est perdue
const c1 = commandeTest(); await store.creerCommande(c1);
await Promise.all(Array.from({ length: 20 }, (_, i) => store.modifier(c1.id, (c) => { c.historique.push({ date: maintenant(), evenement: `m${i}` }); })));
verifier("20 modifications simultanées d'une commande : aucune perdue", (await store.commande(c1.id))!.historique.length === 20, String((await store.commande(c1.id))!.historique.length));

// 3. Création exclusive et idempotence
verifier("Un événement n'est marqué qu'une fois", (await store.marquerEvenement("evt_u_" + nom)) === true && (await store.marquerEvenement("evt_u_" + nom)) === false);
const simultanes = await Promise.all(Array.from({ length: 10 }, () => store.marquerEvenement("evt_s_" + nom)));
verifier("10 livraisons simultanées du même événement : une seule acceptée", simultanes.filter(Boolean).length === 1, JSON.stringify(simultanes));

// 4. Factures : une seule par commande, même demandée 8 fois en même temps
const c2 = commandeTest(); await store.creerCommande(c2);
const emises = await Promise.all(Array.from({ length: 8 }, () => emettreFacture(c2.id)));
const numeros = new Set(emises.map((e) => e.facture?.numero));
verifier("8 émissions simultanées : la commande n'a qu'une facture", numeros.size === 1 && Boolean((await store.commande(c2.id))!.facture), [...numeros].join(","));
{
  const f = (await store.commande(c2.id))!.facture!;
  verifier("Facture : numéro réservé dans un document de la base, indépendant du stockage de fichiers", (await depot().lire(`factures/${f.numero}.json`)) !== null);
  verifier("Facture : écrire un fichier PDF avec une condition est refusé par le dépôt mixte (pas de dépendance aux écritures conditionnelles)", depot().nom.startsWith("postgres") ? await depot().ecrire("factures/test-refus.pdf", Buffer.from("%PDF-"), { siAbsent: true }).then(() => false, () => true) : true);
}
verifier("Facture archivée sous forme de PDF", (await depot().debut((await store.commande(c2.id))!.facture!.cle, 5))?.toString() === "%PDF-");

// 5. Obstacles à la facturation
verifier("Pas de facture pour une commande non payée", obstaclesFacture(commandeTest({ paiement: { etat: "en_attente", sessionId: "x", mode: "s" } })).some((o) => o.includes("non payée")));
verifier("Pas de facture sans brief", obstaclesFacture(commandeTest({ brief: undefined })).some((o) => o.includes("brief")));
const sauvegarde = process.env.NEXT_PUBLIC_LEGAL_SIRET; process.env.NEXT_PUBLIC_LEGAL_SIRET = "";
const c3 = commandeTest(); await store.creerCommande(c3);
const refus = await emettreFacture(c3.id);
verifier("Pas de facture tant que le SIRET du vendeur manque, et aucun numéro consommé", Boolean(refus.obstacles?.some((o) => o.includes("SIRET"))) && !(await store.commande(c3.id))!.facture, JSON.stringify(refus));
process.env.NEXT_PUBLIC_LEGAL_SIRET = sauvegarde;

// 6. Contrôle du contenu des fichiers
verifier("Signatures de fichiers reconnues", signatureConforme("image/png", Buffer.from("89504e470d0a1a0a0000", "hex")) && signatureConforme("image/jpeg", Buffer.from("ffd8ffe000104a46", "hex")) && signatureConforme("application/pdf", Buffer.from("%PDF-1.7")) && signatureConforme("video/mp4", Buffer.from("00000018667479706d703432", "hex")));
const ftyp = (marque: string, taille = 0x18) => { const b = Buffer.alloc(32); b.writeUInt32BE(taille, 0); b.write("ftyp", 4, "latin1"); b.write(marque, 8, "latin1"); return b; };
verifier("Vidéos et HEIC : seules les marques connues sont acceptées", signatureConforme("video/mp4", ftyp("isom")) && signatureConforme("video/mp4", ftyp("mp42")) && signatureConforme("video/quicktime", ftyp("qt  ")) && signatureConforme("image/heic", ftyp("heic")) && signatureConforme("image/heic", ftyp("mif1")));
verifier("Fausse vidéo : « ftyp » avec une marque inconnue refusé", !signatureConforme("video/mp4", ftyp("ZZZZ")) && !signatureConforme("video/mp4", ftyp("heic")) && !signatureConforme("image/heic", ftyp("isom")) && !signatureConforme("video/mp4", ftyp("qt  ")));
verifier("Fausse vidéo : taille d'en-tête absurde ou contenu tronqué refusé", !signatureConforme("video/mp4", ftyp("isom", 5)) && !signatureConforme("video/mp4", ftyp("isom", 0x7fffffff)) && !signatureConforme("video/mp4", Buffer.from("0000001866747970", "hex")));
verifier("Contenu ne correspondant pas au type annoncé rejeté", !signatureConforme("image/png", Buffer.from("<html><script>")) && !signatureConforme("video/mp4", Buffer.from("MZ\x90\x00aaaaaaaaaaaa")) && !signatureConforme("text/html", Buffer.from("<html>")));
const interdit = (cle: string) => depot().lire(cle).then((x) => x === null, () => true);
verifier("Clés de stockage dangereuses refusées (aucune lecture hors du dépôt)", (await interdit("../../../../etc/passwd")) && (await interdit("/etc/passwd")) && (await interdit("commandes/../../etc/passwd")));

// 7. Purge
const vieux = new Date(Date.now() - 100 * 86_400_000).toISOString();
await depot().ecrire("fichiers/aaaa1111", "contenu"); await depot().ecrire("fichiers/bbbb2222", "contenu");
const c4 = commandeTest({ statut: "livree", livreeLe: vieux, fichiersClient: [{ id: "aaaa1111", nom: "a.png", taille: 7, type: "image/png", ajouteLe: vieux }], livrables: [{ id: "bbbb2222", nom: "v.mp4", taille: 7, type: "video/mp4", ajouteLe: vieux }] });
const c5 = commandeTest({ paiement: { etat: "en_attente", sessionId: "y", mode: "s" }, statut: "attente_paiement", creeLe: vieux });
const c6 = commandeTest({ statut: "livree", livreeLe: maintenant() });
for (const c of [c4, c5, c6]) await store.creerCommande(c);
await purger(true);
const apres = await store.commande(c4.id);
verifier("Purge : fichiers d'une commande livrée depuis plus de 90 jours supprimés, commande conservée", apres?.fichiersPurgesLe && apres.livrables.length === 0 && (await depot().taille("fichiers/aaaa1111")) === null && (await depot().taille("fichiers/bbbb2222")) === null);
verifier("Purge : commande jamais payée de plus de 30 jours supprimée", (await store.commande(c5.id)) === null && (await store.commandeParToken(c5.token)) === null);
verifier("Purge : commande récente intacte", (await store.commande(c6.id))?.statut === "livree");

// 7 bis. Purge complète : fichiers orphelins, avec une horloge avancée de deux jours
{
  const id32 = (c: string) => c.repeat(32), orphelin = id32("c"), reference = id32("e"), etranger = "pas-un-identifiant";
  await depot().ecrire(`fichiers/${orphelin}`, "x"); await depot().ecrire(`fichiers/${reference}`, "x"); await depot().ecrire(`fichiers/${etranger}`, "x");
  const cmd = commandeTest({ fichiersClient: [{ id: reference, nom: "r.png", taille: 1, type: "image/png", ajouteLe: maintenant() }] });
  await store.creerCommande(cmd);
  await purger(true);
  verifier("Purge : un fichier non rattaché mais récent (moins de 24 h) est conservé", (await depot().taille(`fichiers/${orphelin}`)) !== null);
  const bilan = await purger(true, Date.now() + 2 * 86_400_000);
  verifier("Purge : un fichier orphelin de plus de 24 h est supprimé", (await depot().taille(`fichiers/${orphelin}`)) === null && (bilan?.orphelins ?? 0) >= 1, JSON.stringify(bilan));
  verifier("Purge : un fichier rattaché à une commande n'est jamais supprimé", (await depot().taille(`fichiers/${reference}`)) !== null);
  verifier("Purge : un fichier dont le nom n'est pas un identifiant n'est pas touché", (await depot().taille(`fichiers/${etranger}`)) !== null);
  await depot().ecrire("commandes/illisible.json", depot().nom.startsWith("postgres") ? "{}" : "ceci n'est pas du json");
  if (!depot().nom.startsWith("postgres")) {
    await depot().ecrire(`fichiers/${id32("b")}`, "x");
    await purger(true, Date.now() + 2 * 86_400_000);
    verifier("Purge : une commande illisible annule le nettoyage des orphelins (jamais de suppression dans le doute)", (await depot().taille(`fichiers/${id32("b")}`)) !== null);
  }
  await depot().supprimer("commandes/illisible.json"); await depot().supprimer(`fichiers/${reference}`); await depot().supprimer(`fichiers/${etranger}`); await depot().supprimer(`fichiers/${id32("b")}`);
}

// 7 ter. Limiteur partagé, lectures groupées, configuration Supabase
{
  const id = "visiteur-" + Date.now();
  const totaux = (await Promise.all(Array.from({ length: 6 }, () => enregistrer("essai", id, 60_000)))).sort((a, b) => a - b);
  verifier("Limiteur : 6 événements simultanés comptés exactement, sans perte", totaux.join() === "1,2,3,4,5,6", totaux.join());
  verifier("Limiteur : le compteur relu donne 6", (await compte("essai", id, 60_000)) === 6);
  verifier("Limiteur : l'adresse n'est jamais conservée en clair", !(await depot().lister("limites")).some((k) => k.includes(id)));
  await remettreAZero("essai", id);
  verifier("Limiteur : remise à zéro", (await compte("essai", id, 60_000)) === 0);
  await enregistrer("essai-court", id, 1); await new Promise((r) => setTimeout(r, 15));
  verifier("Limiteur : la fenêtre expirée repart de zéro", (await compte("essai-court", id, 1)) === 0 && (await enregistrer("essai-court", id, 1)) === 1);
  await remettreAZero("essai-court", id);

  for (const k of ["a", "b", "c"]) await depot().ecrire(`testlire/${k}.json`, JSON.stringify({ k }));
  const tous = await depot().lireTous("testlire");
  verifier("Lecture groupée : tous les documents, clés par ordre décroissant, contenu intact", tous.map((e) => e.cle).join() === "testlire/c.json,testlire/b.json,testlire/a.json" && JSON.parse(tous[0].corps.toString()).k === "c", tous.map((e) => e.cle).join());
  verifier("Lecture groupée : limite respectée", (await depot().lireTous("testlire", 2)).length === 2);
  const inv = await depot().inventaire("testlire");
  verifier("Inventaire : clés, dates récentes et tailles", inv.length === 3 && inv.every((x) => Math.abs(Date.now() - x.modifieLe) < 600_000 && x.taille > 0), JSON.stringify(inv));
  for (const k of ["a", "b", "c"]) await depot().supprimer(`testlire/${k}.json`);

  const pooler = "postgresql://postgres.abcdefghij:p%40ss@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
  const cfg = configurationStockage({ DATABASE_URL: pooler, S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s" });
  verifier("Supabase : référence et région déduites de l'adresse du pooler", JSON.stringify(deduireSupabase(pooler)) === JSON.stringify({ ref: "abcdefghij", region: "eu-central-1" }));
  verifier("Supabase : adresse directe → référence seule", deduireSupabase("postgresql://postgres:x@db.abcdefghij.supabase.co:5432/postgres")?.ref === "abcdefghij" && deduireSupabase("postgresql://u:x@exemple.fr/db") === null && deduireSupabase("") === null);
  verifier("Supabase : stockage déduit (adresse, région, bucket, style des adresses, origine)", cfg.endpoint === "https://abcdefghij.storage.supabase.co/storage/v1/s3" && cfg.region === "eu-central-1" && cfg.bucket === "studio-accroche" && cfg.pathStyle && cfg.origine === "https://abcdefghij.storage.supabase.co", JSON.stringify(cfg));
  const explicite = configurationStockage({ DATABASE_URL: pooler, S3_ENDPOINT: "https://autre.exemple/s3", S3_REGION: "us-east-1", S3_BUCKET: "mon-bucket", S3_PATH_STYLE: "non" });
  verifier("Supabase : les variables explicites l'emportent sur la déduction", explicite.endpoint === "https://autre.exemple/s3" && explicite.region === "us-east-1" && explicite.bucket === "mon-bucket" && !explicite.pathStyle && explicite.origine === "https://autre.exemple");
  verifier("Supabase : sans Supabase ni variable, rien n'est déduit", configurationStockage({}).bucket === "" && configurationStockage({ S3_REGION: "auto" }).region === "auto");

  const rapport = await executerDiagnostic();
  const brut = JSON.stringify(rapport);
  verifier("Diagnostic : six sections, synthèse cohérente", rapport.sections.length === 6 && rapport.synthese.ok + rapport.synthese.ko + rapport.synthese.avert + rapport.synthese.info === rapport.sections.flatMap((s) => s.lignes).length);
  verifier("Diagnostic : aucun secret dans le rapport", ![process.env.SESSION_SECRET, process.env.ADMIN_PASSWORD, process.env.STRIPE_SECRET_KEY, process.env.DATABASE_URL].some((v) => v && v.length > 6 && brut.includes(v)));
  verifier("Diagnostic : PDF généré", rapport.sections.find((s) => s.titre === "Factures")!.lignes.every((l) => l.etat === "ok"), JSON.stringify(rapport.sections.find((s) => s.titre === "Factures")));
  if (depot().nom.startsWith("postgres")) verifier("Diagnostic : base de données sans échec", rapport.sections.find((s) => s.titre.startsWith("Base"))!.lignes.every((l) => l.etat !== "ko"), JSON.stringify(rapport.sections.find((s) => s.titre.startsWith("Base"))!.lignes.filter((l) => l.etat === "ko")));
  verifier("Diagnostic : tout ce qui a été écrit pour le test est supprimé", (await depot().lister("__diagnostic__")).length === 0);
}

// 8. E-mails : forme des requêtes envoyées aux deux services, et résistance aux pannes
const recus: { url: string; entetes: http.IncomingHttpHeaders; corps: Record<string, unknown> }[] = [];
let panne = false;
const faux = http.createServer((req, res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { recus.push({ url: req.url!, entetes: req.headers, corps: JSON.parse(b || "{}") }); res.writeHead(panne ? 500 : 201, { "Content-Type": "application/json" }); res.end(panne ? '{"message":"panne"}' : '{"id":"1"}'); }); }).listen(5066);
process.env.MAIL_FROM = "Studio Accroche <commandes@exemple-domaine.fr>";
process.env.BREVO_API_KEY = "cle-brevo-test"; process.env.BREVO_API_BASE = "http://localhost:5066";
let m = await courriels.confirmationCommande(commandeTest());
let r = recus.pop()!;
verifier("Brevo : requête conforme (clé, expéditeur, destinataire, HTML et texte)", m.resultat === "envoyé" && r.url === "/v3/smtp/email" && r.entetes["api-key"] === "cle-brevo-test" && (r.corps.sender as { email: string }).email === "commandes@exemple-domaine.fr" && (r.corps.to as { email: string }[])[0].email === "a@exemple.fr" && String(r.corps.htmlContent).includes("Remplir le brief") && String(r.corps.textContent).length > 50, JSON.stringify(r?.corps).slice(0, 200));
delete process.env.BREVO_API_KEY; process.env.RESEND_API_KEY = "cle-resend-test"; process.env.RESEND_API_BASE = "http://localhost:5066";
m = await courriels.confirmationCommande(commandeTest()); r = recus.pop()!;
verifier("Resend : requête conforme", m.resultat === "envoyé" && r.url === "/emails" && r.entetes.authorization === "Bearer cle-resend-test" && r.corps.from === "Studio Accroche <commandes@exemple-domaine.fr>" && (r.corps.to as string[])[0] === "a@exemple.fr");
panne = true; m = await courriels.confirmationCommande(commandeTest());
verifier("Service d'e-mail en panne : l'échec est archivé, rien ne plante", m.resultat.startsWith("échec 500"));
panne = false; const renvoi = await courriels.renvoyer(m);
verifier("Renvoi d'un e-mail en échec : renvoyé à l'identique, l'échec d'origine est reconnu", enEchec(m) && renvoi.resultat === "envoyé" && renvoi.objet === m.objet && renvoi.a === m.a && renvoi.html === m.html, renvoi.resultat);
verifier("Un e-mail seulement archivé n'est pas un échec", !enEchec({ ...m, resultat: "archivé (aucun envoi réel)" }));
{
  const muet = http.createServer(() => {}).listen(0); const portMuet = (muet.address() as { port: number }).port;
  const ancienne = process.env.RESEND_API_BASE; process.env.RESEND_API_BASE = `http://127.0.0.1:${portMuet}`; process.env.MAIL_TIMEOUT_MS = "300";
  const t0 = Date.now(); const lent = await courriels.confirmationCommande(commandeTest()); const duree = Date.now() - t0;
  verifier("Service d'e-mail qui ne répond pas : abandon au délai maximal, échec archivé", enEchec(lent) && duree < 3000, `${duree} ms, ${lent.resultat}`);
  delete process.env.MAIL_TIMEOUT_MS; process.env.RESEND_API_BASE = ancienne; muet.closeAllConnections(); muet.close();
}
process.env.RESEND_API_BASE = "http://localhost:1"; m = await courriels.confirmationCommande(commandeTest());
verifier("Service d'e-mail injoignable : l'échec est archivé, rien ne plante", m.resultat.startsWith("échec"));
delete process.env.RESEND_API_KEY; recus.length = 0; m = await courriels.confirmationCommande(commandeTest());
verifier("Sans service configuré : e-mail archivé, aucun envoi", m.pilote === "fichier" && recus.length === 0);
faux.close();

console.log(`\n${ko === 0 ? "Tous les tests ciblés réussissent" : ko + " échec(s)"} (${depot().nom}).`);
process.exit(ko ? 1 : 0);
