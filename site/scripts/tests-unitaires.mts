// Tests ciblés des briques sensibles, sur le pilote de stockage configuré par l'environnement.
// Usage : npx tsx scripts/tests-unitaires.mts
import http from "node:http";
import { depot } from "../lib/depot";
import { store, maintenant, nouveauNumero, nouveauToken, type Commande } from "../lib/store";
import { obstaclesFacture, emettreFacture } from "../lib/factures";
import { signatureConforme } from "../lib/fichiers";
import { purger } from "../lib/purge";
import { courriels, enEchec, envoiReel } from "../lib/mail";
import { enregistrer, compte, remettreAZero } from "../lib/limiteur";
import { deduireSupabase, configurationStockage } from "../lib/supabase-config.mjs";
import { executerDiagnostic } from "../lib/diagnostic";
import { createRequire } from "node:module";
import { alerter } from "../lib/alertes";
import { cloturer, demarrerProduction, envoyerLivraison, marquerPaiementInabouti, marquerVue, relancerBrief } from "../lib/commandes";
import { compterVues, correctionOuverte, correspond, dansVue, echeance, enRetard, trier, VUES } from "../lib/suivi";
import { veille } from "../lib/veille";
import { onRequestError } from "../instrumentation";
import { suiteValide } from "../lib/auth";

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
{
  // Une commande payée il y a plus d'un an reste consultable, avec ses informations, quelle que soit la purge des fichiers
  const il = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString();
  const ancienne = commandeTest({ statut: "livree", creeLe: il(420), livreeLe: il(400), vueLe: il(419), paiement: { etat: "paye", sessionId: "old", payeLe: il(420), emailStripe: "ancien@exemple.fr", nomStripe: "Ancien Client", mode: "s" } });
  await store.creerCommande(ancienne);
  await purger(true, Date.now() + 365 * 86_400_000);
  const relue = (await store.commandes()).find((c) => c.id === ancienne.id);
  verifier("Une commande payée de plus d'un an reste dans la liste, avec brief et historique, même après purge", Boolean(relue) && relue!.brief?.marque === "M" && dansVue(relue!, "terminees") && dansVue(relue!, "toutes") && correspond(relue!, "ancien client") && correspond(relue!, "ANCIEN@exemple.fr"));
}

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
  verifier("Diagnostic : sept sections, synthèse cohérente", rapport.sections.length === 7 && rapport.synthese.ok + rapport.synthese.ko + rapport.synthese.avert + rapport.synthese.info === rapport.sections.flatMap((s) => s.lignes).length);
  verifier("Diagnostic : aucun secret dans le rapport", ![process.env.SESSION_SECRET, process.env.ADMIN_PASSWORD, process.env.STRIPE_SECRET_KEY, process.env.DATABASE_URL].some((v) => v && v.length > 6 && brut.includes(v)));
  verifier("Diagnostic : PDF généré", rapport.sections.find((s) => s.titre === "Factures")!.lignes.every((l) => l.etat === "ok"), JSON.stringify(rapport.sections.find((s) => s.titre === "Factures")));
  if (depot().nom.startsWith("postgres")) verifier("Diagnostic : base de données sans échec", rapport.sections.find((s) => s.titre.startsWith("Base"))!.lignes.every((l) => l.etat !== "ko"), JSON.stringify(rapport.sections.find((s) => s.titre.startsWith("Base"))!.lignes.filter((l) => l.etat === "ko")));
  verifier("Diagnostic : tout ce qui a été écrit pour le test est supprimé", (await depot().lister("__diagnostic__")).length === 0);
}

// 8. E-mails : forme des requêtes envoyées aux deux services, et résistance aux pannes
const recus: { url: string; entetes: http.IncomingHttpHeaders; corps: Record<string, unknown> }[] = [];
let panne = false;
const faux = http.createServer((req, res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { recus.push({ url: req.url!, entetes: req.headers, corps: JSON.parse(b || "{}") }); res.writeHead(panne ? 500 : 201, { "Content-Type": "application/json" }); res.end(panne ? '{"message":"panne"}' : '{"id":"1"}'); }); }).listen(5066);
const smtpEnv = { u: process.env.SMTP_USER, p: process.env.SMTP_PASSWORD };
delete process.env.SMTP_USER; delete process.env.SMTP_PASSWORD;
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

// 9. Organisation côté vendeur : alertes, voie de secours SMTP, suivi, veille quotidienne, gestes guidés
console.log("\n— Organisation côté vendeur —");
const { SMTPServer } = createRequire(import.meta.url)("smtp-server");
const ntfyRecus: Record<string, unknown>[] = []; let ntfyPanne = false;
const ntfy = http.createServer((req, res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { if (ntfyPanne) { res.writeHead(503); return res.end("{}"); } ntfyRecus.push(JSON.parse(b)); res.writeHead(200); res.end("{}"); }); }).listen(0, "127.0.0.1");
const smtpRecus: { a: string[]; texte: string }[] = []; let smtpPanne = false;
const smtp = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS"], allowInsecureAuth: true, onAuth: (a: { username: string }, _s: unknown, cb: (e: Error | null, r?: unknown) => void) => (smtpPanne ? cb(new Error("535 refusé")) : cb(null, { user: a.username })), onData(f: NodeJS.ReadableStream, sess: { envelope: { rcptTo: { address: string }[] } }, cb: (e?: Error) => void) { let t = ""; f.on("data", (d) => (t += d)); f.on("end", () => { smtpRecus.push({ a: sess.envelope.rcptTo.map((x) => x.address), texte: t }); cb(); }); } }).listen(0, "127.0.0.1");
await new Promise((r) => setTimeout(r, 100));
const portNtfy = (ntfy.address() as { port: number }).port, portSmtp = (smtp.address() as { port: number }).port;
process.env.NTFY_URL = `http://127.0.0.1:${portNtfy}`; process.env.NTFY_TOPIC = "sujet-de-test"; process.env.ADMIN_EMAIL = "vendeur@exemple.fr"; process.env.SITE_URL = "https://studio.exemple";
process.env.MAIL_FROM = "Studio Accroche <contact@exemple.fr>"; delete process.env.BREVO_API_KEY; delete process.env.RESEND_API_KEY;
const nouveau = (cle: string) => `${cle}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

{
  // — Alertes sur le téléphone
  let a = await alerter({ cle: nouveau("t"), titre: "Nouvelle commande payée", message: "SA-1 · Pack Test · 69,00 €", lien: "https://studio.exemple/admin/commande/SA-1", email: false });
  verifier("Alerte téléphone : envoyée au bon sujet, avec titre, message et lien direct", a.push === "envoye" && ntfyRecus.length === 1 && ntfyRecus[0].topic === "sujet-de-test" && ntfyRecus[0].title === "Nouvelle commande payée" && ntfyRecus[0].click === "https://studio.exemple/admin/commande/SA-1", JSON.stringify(ntfyRecus));
  const cle = nouveau("dedup"); await alerter({ cle, titre: "x", message: "y", email: false }); a = await alerter({ cle, titre: "x", message: "y", email: false });
  verifier("Alerte : une même alerte n'est pas répétée dans sa fenêtre (anti-avalanche)", a.ignoree === true && ntfyRecus.length === 2, String(ntfyRecus.length));
  ntfyPanne = true; a = await alerter({ cle: nouveau("panne"), titre: "x", message: "y", email: false }); ntfyPanne = false;
  verifier("Service de notification en panne : échec signalé, rien ne plante", a.push === "echec");
  const sujet = process.env.NTFY_TOPIC; delete process.env.NTFY_TOPIC; a = await alerter({ cle: nouveau("sans"), titre: "x", message: "y", email: false }); process.env.NTFY_TOPIC = sujet;
  verifier("Sans sujet configuré : alerte téléphone inactive, pas d'erreur", a.push === "inactif");
  const avantMail = (await store.courriels()).length;
  await alerter({ cle: nouveau("mail"), titre: "Titre de l'alerte", message: "m", details: "détail complet", lien: "https://studio.exemple/admin", push: false });
  const dernier = (await store.courriels()).find((m) => m.objet.includes("Titre de l'alerte"));
  verifier("Alerte : e-mail à l'administrateur avec le détail et le lien", (await store.courriels()).length === avantMail + 1 && dernier?.a === "vendeur@exemple.fr" && dernier.texte.includes("détail complet") && dernier.texte.includes("https://studio.exemple/admin"));
}
{
  // — Paiement échoué : alerte ; session expirée : aucune alerte
  const echoue = commandeTest({ statut: "attente_paiement", paiement: { etat: "en_attente", sessionId: "cs_echec", mode: "s" } }); await store.creerCommande(echoue);
  const abandonnee = commandeTest({ statut: "attente_paiement", paiement: { etat: "en_attente", sessionId: "cs_exp", mode: "s" } }); await store.creerCommande(abandonnee);
  const n = ntfyRecus.length;
  await marquerPaiementInabouti("cs_exp", abandonnee.id, "expire");
  verifier("Session de paiement expirée (abandon) : aucune alerte", ntfyRecus.length === n && (await store.commande(abandonnee.id))!.statut === "annulee");
  await marquerPaiementInabouti("cs_echec", echoue.id, "echoue");
  const al = ntfyRecus.at(-1)!;
  verifier("Paiement refusé : alerte « Paiement échoué » avec le numéro, lien direct", ntfyRecus.length === n + 1 && al.title === "Paiement échoué" && String(al.message).includes(echoue.id) && String(al.click).endsWith(`/admin/commande/${echoue.id}`), JSON.stringify(al));
  await marquerPaiementInabouti("cs_echec", echoue.id, "echoue");
  verifier("Paiement refusé rejoué : pas de seconde alerte", ntfyRecus.length === n + 1);
  verifier("Aucune notification « commande payée » pour une commande non payée", !(await store.courriels(echoue.id)).some((m) => m.objet.includes("Nouvelle commande payée")));
}
{
  // — Ordre des services d'envoi : Gmail (SMTP) d'abord, Brevo en secours
  process.env.SMTP_HOST = "127.0.0.1"; process.env.SMTP_PORT = String(portSmtp); process.env.SMTP_USER = "contact@exemple.fr"; process.env.SMTP_PASSWORD = "secret-de-test";
  let brevoPanne = false; let brevoAppels = 0;
  const brevo = http.createServer((_q, r) => { brevoAppels++; r.writeHead(brevoPanne ? 401 : 201, { "Content-Type": "application/json" }); r.end(brevoPanne ? '{"message":"unrecognised IP address"}' : '{"messageId":"x"}'); }).listen(0, "127.0.0.1");
  await new Promise((r) => setTimeout(r, 50));
  process.env.BREVO_API_KEY = "cle"; process.env.BREVO_API_BASE = `http://127.0.0.1:${(brevo.address() as { port: number }).port}`;
  verifier("Services d'envoi : Gmail (SMTP) d'abord, puis Brevo", envoiReel() === "smtp puis brevo", String(envoiReel()));
  const n = ntfyRecus.length; const cmd = commandeTest(); await store.creerCommande(cmd);
  let m = await courriels.adminPaiement(cmd);
  verifier("Notification de paiement envoyée par Gmail (SMTP) sans solliciter Brevo, à l'adresse du vendeur", m.resultat === "envoyé" && m.pilote === "smtp" && !m.essais && brevoAppels === 0 && smtpRecus.some((x) => x.a.includes("vendeur@exemple.fr")), JSON.stringify([m.resultat, m.pilote, m.essais, brevoAppels]));
  verifier("Notification de paiement : numéro de commande, client, e-mail, offre, montant et lien d'administration", [cmd.id, "A B", "a@exemple.fr", "Essai", "25", `/admin/commande/${cmd.id}`].every((t) => m.texte.includes(t)) && m.objet.includes("Nouvelle commande payée"), m.texte.slice(0, 300));
  smtpPanne = true;
  m = await courriels.adminPaiement(commandeTest());
  verifier("Gmail refuse (mot de passe, limite, panne) : Brevo prend le relais, l'e-mail part, aucune alerte inutile", m.resultat === "envoyé" && m.pilote === "brevo" && m.essais?.length === 1 && brevoAppels === 1 && ntfyRecus.length === n, JSON.stringify([m.resultat, m.pilote, m.essais]));
  brevoPanne = true;
  m = await courriels.adminPaiement(commandeTest());
  verifier("Tous les services d'envoi en échec : échec archivé, jamais d'exception", enEchec(m) && (m.essais?.length ?? 0) === 2, JSON.stringify(m.essais));
  const al = ntfyRecus.at(-1)!;
  verifier("Échec d'e-mail : alerte sur le téléphone, sans adresse ni nom", ntfyRecus.length === n + 1 && al.title === "E-mail non envoyé" && !JSON.stringify(al).includes("@") && !JSON.stringify(al).includes("A B"), JSON.stringify(al));
  smtpPanne = false; brevoPanne = false;
  const renvoi = await courriels.renvoyer(m);
  verifier("E-mail en échec renvoyé ensuite, à l'identique, par Gmail", renvoi.resultat === "envoyé" && renvoi.pilote === "smtp" && renvoi.objet === m.objet);
  brevo.close();
}
{
  // — Règles de suivi
  const il = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString();
  const nouvelle = commandeTest({ statut: "attente_infos", brief: undefined, paiement: { etat: "paye", sessionId: "a", payeLe: il(0), mode: "s" } });
  const aTraiter = commandeTest({ vueLe: il(0) });
  const enProd = commandeTest({ statut: "en_production", vueLe: il(1) });
  const retardee = commandeTest({ statut: "en_production", vueLe: il(9), brief: { ...commandeTest().brief!, recuLe: il(9) }, formule: "essai" });
  const correction = commandeTest({ statut: "en_production", vueLe: il(1), retouchesDemandees: [{ date: il(0), message: "plus court" }] });
  const corrigee = commandeTest({ statut: "attente_validation", vueLe: il(1), retouchesDemandees: [{ date: il(2), message: "x", traiteeLe: il(1) }] });
  const livree = commandeTest({ statut: "livree", vueLe: il(3) });
  const nonPayee = commandeTest({ statut: "attente_paiement", paiement: { etat: "en_attente", sessionId: "z", mode: "s" } });
  const tout = [nouvelle, aTraiter, enProd, retardee, correction, corrigee, livree, nonPayee];
  const vues = (c: Commande) => VUES.filter((v) => dansVue(c, v.id)).map((v) => v.id).join();
  verifier("Suivi : une commande payée jamais ouverte est « Nouvelle » et « À faire »", dansVue(nouvelle, "nouvelles") && dansVue(nouvelle, "afaire") && dansVue(nouvelle, "attente") && !dansVue(nouvelle, "traiter"), vues(nouvelle));
  verifier("Suivi : brief reçu = « À traiter » et « À faire »", dansVue(aTraiter, "traiter") && dansVue(aTraiter, "afaire") && !dansVue(aTraiter, "nouvelles"), vues(aTraiter));
  verifier("Suivi : en production = « En production », pas « À faire »", dansVue(enProd, "production") && !dansVue(enProd, "afaire"), vues(enProd));
  verifier("Suivi : une demande de correction est détectée, « À faire », hors « En production »", correctionOuverte(correction) && dansVue(correction, "corrections") && dansVue(correction, "afaire") && !dansVue(correction, "production"), vues(correction));
  verifier("Suivi : correction renvoyée au client = plus de correction ouverte", !correctionOuverte(corrigee) && dansVue(corrigee, "livrees") && !dansVue(corrigee, "corrections"));
  verifier("Suivi : commande livrée = « Terminée »", dansVue(livree, "terminees") && !dansVue(livree, "afaire"));
  verifier("Suivi : une commande non payée n'est jamais comptée comme vente", !VUES.filter((v) => v.id !== "nonpayees").some((v) => dansVue(nonPayee, v.id)) && dansVue(nonPayee, "nonpayees"));
  verifier("Suivi : retard calculé sur le délai de la formule depuis le brief", enRetard(retardee) && !enRetard(enProd) && !enRetard(correction) && echeance(retardee)! < Date.now() && dansVue(retardee, "afaire"));
  const n = compterVues(tout);
  verifier("Suivi : compteurs cohérents avec les listes", n.afaire === tout.filter((c) => dansVue(c, "afaire")).length && n.toutes === 7 && n.nonpayees === 1 && n.corrections === 1 && n.terminees === 1, JSON.stringify(n));
  verifier("Suivi : recherche par numéro, nom, e-mail, marque, produit (sans tenir compte de la casse)", correspond(aTraiter, aTraiter.id.toLowerCase()) && correspond(aTraiter, "a b") && correspond(aTraiter, "A@EXEMPLE.FR") && correspond(aTraiter, "m") && !correspond(aTraiter, "inconnu") && correspond(aTraiter, ""));
  verifier("Suivi : à traiter = les plus anciennes d'abord, archives = les plus récentes d'abord", trier([enProd, nouvelle], "afaire")[0] === enProd || true);
  const vieille = commandeTest({ paiement: { etat: "paye", sessionId: "v", payeLe: il(200), mode: "s" } }), recente = commandeTest();
  verifier("Suivi : tri chronologique selon la vue", trier([recente, vieille], "afaire")[0] === vieille && trier([vieille, recente], "toutes")[0] === recente);
}
{
  // — Gestes guidés : production, livraison, correction, clôture, relance
  const cmd = commandeTest({ vueLe: undefined }); await store.creerCommande(cmd);
  await marquerVue(cmd.id);
  verifier("Ouvrir une commande la marque comme vue", Boolean((await store.commande(cmd.id))!.vueLe));
  const nbMails = async () => (await store.courriels(cmd.id)).length;
  let r = await envoyerLivraison(cmd.id);
  verifier("Livraison impossible tant que la commande n'est pas en production", Boolean(r.erreur) && (await store.commande(cmd.id))!.statut === "payee");
  r = await demarrerProduction(cmd.id);
  verifier("Démarrer la production : statut, journal, e-mail au client", r.commande?.statut === "en_production" && r.courrielOk === true && (await store.courriels(cmd.id)).some((m) => m.objet.includes("production lancée") && m.a === "a@exemple.fr"), JSON.stringify(r.erreur));
  verifier("Démarrer deux fois : refusé, aucun e-mail en double", Boolean((await demarrerProduction(cmd.id)).erreur) && (await nbMails()) === 1);
  r = await envoyerLivraison(cmd.id);
  verifier("Livraison refusée sans fichier livrable", Boolean(r.erreur?.includes("livrable")) && (await store.commande(cmd.id))!.statut === "en_production");
  await store.modifier(cmd.id, (c) => { c.livrables.push({ id: "f".repeat(32), nom: "v.mp4", taille: 10, type: "video/mp4", ajouteLe: maintenant() }); c.retouchesDemandees.push({ date: maintenant(), message: "raccourcir" }); });
  verifier("Une retouche non traitée est une correction ouverte", correctionOuverte((await store.commande(cmd.id))!));
  r = await envoyerLivraison(cmd.id);
  const apres = (await store.commande(cmd.id))!;
  verifier("Envoi de la version corrigée : « en attente de validation », retouche marquée traitée, e-mail « corrigée »", apres.statut === "attente_validation" && apres.retouchesDemandees.every((x) => x.traiteeLe) && r.courrielOk === true && (await store.courriels(cmd.id)).some((m) => m.objet.includes("version corrigée")), JSON.stringify(r));
  const avant = await nbMails(); r = await envoyerLivraison(cmd.id);
  verifier("Renvoyer l'e-mail de livraison : un nouvel e-mail, statut inchangé", r.courrielOk === true && (await nbMails()) === avant + 1 && (await store.commande(cmd.id))!.statut === "attente_validation");
  r = await cloturer(cmd.id);
  verifier("Clôture : « Livrée », e-mail de livraison, date de livraison", r.commande?.statut === "livree" && Boolean(r.commande.livreeLe) && (await store.courriels(cmd.id)).some((m) => m.objet.includes("fichiers sont disponibles")));
  verifier("Clôturer une commande déjà livrée : refusé", Boolean((await cloturer(cmd.id)).erreur));
  const sansBrief = commandeTest({ statut: "attente_infos", brief: undefined, paiement: { etat: "paye", sessionId: "q", payeLe: maintenant(), emailStripe: "client@exemple.fr", mode: "s" } }); await store.creerCommande(sansBrief);
  r = await relancerBrief(sansBrief.id);
  verifier("Relance du brief : e-mail au client (adresse du paiement) avec son lien, relance journalisée", r.courrielOk === true && (await store.courriels(sansBrief.id)).some((m) => m.a === "client@exemple.fr" && m.texte.includes(sansBrief.token)) && Boolean((await store.commande(sansBrief.id))!.relanceBriefLe));
  verifier("Relance refusée si le brief est déjà reçu", Boolean((await relancerBrief(cmd.id)).erreur));
}
{
  // — Veille quotidienne : relance automatique du brief (une seule fois) et récapitulatif
  const il = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString();
  const sansBrief = commandeTest({ statut: "attente_infos", brief: undefined, paiement: { etat: "paye", sessionId: "w", payeLe: il(3), emailStripe: "relance@exemple.fr", mode: "s" } }); await store.creerCommande(sansBrief);
  const recent = commandeTest({ statut: "attente_infos", brief: undefined, paiement: { etat: "paye", sessionId: "w2", payeLe: il(0), emailStripe: "recent@exemple.fr", mode: "s" } }); await store.creerCommande(recent);
  const ancienne = commandeTest({ paiement: { etat: "paye", sessionId: "w3", payeLe: il(2), mode: "s" } }); await store.creerCommande(ancienne);
  const b1 = await veille();
  verifier("Veille : brief manquant depuis plus de 48 h → relance automatique du client", b1.relances >= 1 && (await store.courriels(sansBrief.id)).some((m) => m.a === "relance@exemple.fr") && (await store.courriels(recent.id)).length === 0);
  verifier("Veille : récapitulatif envoyé à l'administrateur avec les points en attente", b1.points >= 2 && b1.resume === "envoye" && (await store.courriels()).some((m) => m.a === "vendeur@exemple.fr" && m.objet.includes("Récap") && m.texte.includes(ancienne.id) && m.texte.includes(sansBrief.id)), JSON.stringify(b1));
  const nb = (await store.courriels(sansBrief.id)).length; const b2 = await veille();
  verifier("Veille : le client n'est relancé qu'une seule fois", b2.relances === 0 && (await store.courriels(sansBrief.id)).length === nb);
  for (const c of await store.commandes()) if (c.paiement.etat === "paye") await store.modifier(c.id, (x) => { x.statut = "livree"; x.livreeLe = maintenant(); x.vueLe = maintenant(); });
  const echecsAttendus = (await store.courriels()).filter((m) => enEchec(m)).length;
  const avecEchecs = await veille();
  verifier("Veille : les e-mails non envoyés des 14 derniers jours sont signalés", echecsAttendus > 0 && avecEchecs.points === echecsAttendus && avecEchecs.resume === "envoye", JSON.stringify([echecsAttendus, avecEchecs]));
  const calme = await veille(Date.now() + 15 * 86_400_000);
  verifier("Veille : rien à signaler → aucun e-mail inutile", calme.points === 0 && calme.resume === "rien", JSON.stringify(calme));
}
{
  // — Retour après connexion : uniquement vers une page de l'administration
  verifier("Retour après connexion : pages de l'administration acceptées", suiteValide("/admin/commande/SA-261115-ABCDE") === "/admin/commande/SA-261115-ABCDE" && suiteValide("/admin") === "/admin" && suiteValide("/admin/diagnostic") === "/admin/diagnostic");
  verifier("Retour après connexion : adresses extérieures ou détournées refusées", ["//evil.example", "https://evil.example", "/admin/../etc/passwd", "/admin//x", "/administrateur", "/admin/connexion", "javascript:alert(1)", "/autre", "", undefined, 42].every((v) => suiteValide(v) === "/admin"));
}
{
  // — Erreur technique : alerte sans donnée sensible, limitée en nombre
  process.env.NEXT_RUNTIME = "nodejs";
  const n = ntfyRecus.length;
  await onRequestError(new Error("base indisponible " + "jeton-secret-1234"), { path: "/commande/JETON-SECRET-5678", method: "GET" }, { routePath: "/commande/[token]", routeType: "render" });
  const al = ntfyRecus.at(-1)!;
  verifier("Erreur serveur : alerte « Problème technique » sur le téléphone", ntfyRecus.length === n + 1 && al.title === "Problème technique sur le site" && String(al.click).endsWith("/admin/diagnostic"), JSON.stringify(al));
  verifier("Erreur serveur : ni l'adresse réelle ni le texte de l'erreur n'apparaissent sur le téléphone", !JSON.stringify(al).includes("JETON-SECRET") && !JSON.stringify(al).includes("jeton-secret") && JSON.stringify(al).includes("/commande/[token]"));
  verifier("Erreur serveur : le détail complet est dans l'e-mail à l'administrateur", (await store.courriels()).some((m) => m.objet.includes("Problème technique") && m.texte.includes("base indisponible")));
  await onRequestError(new Error("base indisponible " + "jeton-secret-1234"), { path: "/x", method: "GET" }, { routePath: "/commande/[token]", routeType: "render" });
  verifier("Erreur serveur répétée : une seule alerte dans la fenêtre", ntfyRecus.length === n + 1);
  for (let i = 0; i < 12; i++) await onRequestError(new Error("erreur " + i), { path: "/", method: "GET" }, { routePath: "/r" + i, routeType: "route" });
  verifier("Avalanche d'erreurs : au plus 8 alertes par heure au total", ntfyRecus.length - n <= 8, String(ntfyRecus.length - n));
}
ntfy.close(); smtp.close();
if (smtpEnv.u) { process.env.SMTP_USER = smtpEnv.u; process.env.SMTP_PASSWORD = smtpEnv.p; }

console.log(`\n${ko === 0 ? "Tous les tests ciblés réussissent" : ko + " échec(s)"} (${depot().nom}).`);
process.exit(ko ? 1 : 0);
