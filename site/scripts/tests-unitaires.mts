// Tests ciblés des briques sensibles, sur le pilote de stockage configuré par l'environnement.
// Usage : npx tsx scripts/tests-unitaires.mts
import http from "node:http";
import { depot } from "../lib/depot";
import { store, maintenant, nouveauNumero, nouveauToken, type Commande } from "../lib/store";
import { obstaclesFacture, emettreFacture } from "../lib/factures";
import { signatureConforme } from "../lib/fichiers";
import { purger } from "../lib/purge";
import { courriels } from "../lib/mail";

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
process.env.RESEND_API_BASE = "http://localhost:1"; m = await courriels.confirmationCommande(commandeTest());
verifier("Service d'e-mail injoignable : l'échec est archivé, rien ne plante", m.resultat.startsWith("échec"));
delete process.env.RESEND_API_KEY; recus.length = 0; m = await courriels.confirmationCommande(commandeTest());
verifier("Sans service configuré : e-mail archivé, aucun envoi", m.pilote === "fichier" && recus.length === 0);
faux.close();

console.log(`\n${ko === 0 ? "Tous les tests ciblés réussissent" : ko + " échec(s)"} (${depot().nom}).`);
process.exit(ko ? 1 : 0);
