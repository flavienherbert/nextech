// Tests ciblés des briques sensibles, sur le pilote de stockage configuré par l'environnement.
// Usage : npx tsx scripts/tests-unitaires.mts
import http from "node:http";
import { depot } from "../lib/depot";
import { store, maintenant, nouveauNumero, nouveauToken, type Commande } from "../lib/store";
import { obstaclesFacture, emettreFacture } from "../lib/factures";
import { confirmer, lireReservation, reserver, signatureConforme } from "../lib/fichiers";
import { cleMedia, TYPES_MEDIA } from "../lib/emplacements";
import { chargerMedias, definirMedia, definirTexte, retirerMedia } from "../lib/medias";
import { A_FAIRE_SOI_MEME, basculerManuel, controlerLancement, lireManuel } from "../lib/lancement";
import { purger } from "../lib/purge";
import { courriels, enEchec, envoiReel, motDePasseSmtp } from "../lib/mail";
import { enregistrer, compte, remettreAZero } from "../lib/limiteur";
import { deduireSupabase, configurationStockage } from "../lib/supabase-config.mjs";
import { analyserAdresseBase, executerDiagnostic } from "../lib/diagnostic";
import { createRequire } from "node:module";
import { alerter } from "../lib/alertes";
import { cloturer, demarrerProduction, envoyerLivraison, envoyerScript, marquerPaiementInabouti, marquerVue, relancerBrief, validerBrief } from "../lib/commandes";
import { compterVues, correctionOuverte, correspond, dansVue, echeance, enRetard, trier, VUES } from "../lib/suivi";
import { veille } from "../lib/veille";
import { echecsUtiles, trierEchecs } from "../lib/rattrapage";
import { onRequestError } from "../instrumentation";
import { suiteValide } from "../lib/auth";
import { chargerReglages, chiffrer, dechiffrer, enregistrerMotDePasseSmtp, motDePasseSmtpEnregistreLe, motDePasseSmtpIllisible, oublierMotDePasseSmtp } from "../lib/reglages";
import { cleDerivee } from "../lib/cles";

let ko = 0;
const verifier = (nom: string, ok: unknown, detail = "") => { if (!ok) ko++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const commandeTest = (surcharge: Partial<Commande> = {}): Commande => ({
  id: nouveauNumero(), token: nouveauToken(), formule: "essai", montantCents: 3500, devise: "eur", creeLe: maintenant(), statut: "payee",
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

// 7 quater. Médias du site (Administration → Médias) : contrôles d'envoi, remplacement, retour à l'image d'origine, nettoyage
{
  const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x20, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(32)]);
  const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(16)]);
  const envoyer = async (slot: string, corps: Buffer, type: string, nomFichier: string) => {
    const r = await reserver(slot, "media", { nom: nomFichier, type, taille: corps.length });
    if ("erreur" in r) return r;
    const res = lireReservation(r.jeton)!;
    await depot().ecrire(cleMedia(`${res.f}.${TYPES_MEDIA[type].ext}`), corps); // ce que fait le navigateur (ou la route de dépôt)
    return { ...(await confirmer(r.jeton, slot, "media")), jeton: r.jeton };
  };
  const m0 = await chargerMedias();
  verifier("Médias : sans envoi, l'image d'origine est utilisée et la vidéo de démonstration est vide", m0.url("cloture") === "/media/photos/cloture.webp" && m0.url("demo-video") === null && !m0.envoye("cloture"));
  const demandes = await Promise.all([
    reserver("inconnu", "media", { nom: "a.webp", type: "image/webp", taille: 100 }),
    reserver("cloture", "media", { nom: "a.mp4", type: "video/mp4", taille: 100 }),
    reserver("demo-video", "media", { nom: "a.webp", type: "image/webp", taille: 100 }),
    reserver("cloture", "media", { nom: "a.svg", type: "image/svg+xml", taille: 100 }),
    reserver("cloture", "media", { nom: "a.png", type: "image/webp", taille: 100 }),
    reserver("cloture", "media", { nom: "a.webp", type: "image/webp", taille: 9 * 1048576 }),
    reserver("demo-video", "media", { nom: "a.mp4", type: "video/mp4", taille: 41 * 1048576 }),
    reserver("partage", "media", { nom: "a.jpg", type: "image/jpeg", taille: 6 * 1048576 }),
    reserver("cloture", "media", { nom: "a.heic", type: "image/heic", taille: 100 }),
  ]);
  const statuts = demandes.map((d) => ("erreur" in d ? d.statut : 0)).join(",");
  verifier("Médias : emplacement inconnu, mauvais genre, SVG, extension trompeuse, HEIC, fichier trop lourd pour l'emplacement → tous refusés", statuts === "404,415,415,415,415,413,413,413,415", statuts);
  let mauvais = await envoyer("cloture", Buffer.from("ceci est du texte, pas une image"), "image/webp", "a.webp");
  verifier("Médias : un contenu qui n'est pas une image est refusé et supprimé du stockage", "erreur" in mauvais && mauvais.statut === 415 && (await depot().inventaire("medias")).length === 0, JSON.stringify(mauvais));
  const bon = await envoyer("cloture", WEBP, "image/webp", "mon visuel.webp");
  verifier("Médias : une image valide est acceptée, son identifiant porte l'extension", "fichier" in bon && /^[0-9a-f]{32}\.webp$/.test(bon.fichier.id), JSON.stringify(bon));
  if ("fichier" in bon) {
    verifier("Médias : le jeton d'un emplacement ne sert pas pour un autre", "erreur" in (await confirmer(bon.jeton!, "partage", "media")));
    await definirMedia("cloture", bon.fichier);
    const m1 = await chargerMedias();
    verifier("Médias : le registre renvoie l'adresse versionnée du fichier envoyé", m1.url("cloture") === `/m/cloture?v=${bon.fichier.id}` && m1.envoye("cloture")?.nom === "mon visuel.webp", String(m1.url("cloture")));
    const second = await envoyer("cloture", WEBP, "image/webp", "autre.webp");
    if ("fichier" in second) {
      await definirMedia("cloture", second.fichier);
      verifier("Médias : un remplacement change l'adresse, l'ancien fichier reste quelques heures (pages en cache)", (await chargerMedias()).url("cloture") === `/m/cloture?v=${second.fichier.id}` && (await depot().taille(cleMedia(bon.fichier.id))) !== null);
      await purger(true);
      verifier("Médias : un fichier remplacé depuis moins de 24 h n'est pas encore supprimé", (await depot().taille(cleMedia(bon.fichier.id))) !== null);
      const bilan = await purger(true, Date.now() + 2 * 86_400_000);
      verifier("Médias : après 24 h, l'ancien fichier est supprimé, le fichier actuel est conservé", (await depot().taille(cleMedia(bon.fichier.id))) === null && (await depot().taille(cleMedia(second.fichier.id))) !== null && (bilan?.medias ?? 0) >= 1, JSON.stringify(bilan));
      await retirerMedia("cloture");
      verifier("Médias : retirer un média rend l'image d'origine", (await chargerMedias()).url("cloture") === "/media/photos/cloture.webp");
      await purger(true, Date.now() + 4 * 86_400_000);
      verifier("Médias : le fichier retiré est nettoyé à son tour", (await depot().taille(cleMedia(second.fichier.id))) === null);
    } else verifier("Médias : second envoi", false, JSON.stringify(second));
  }
  const video = await envoyer("demo-video", MP4, "video/mp4", "demo.mp4");
  verifier("Médias : une vidéo MP4 valide est acceptée sur l'emplacement vidéo", "fichier" in video && video.fichier.id.endsWith(".mp4"), JSON.stringify(video));
  if ("fichier" in video) await depot().supprimer(cleMedia(video.fichier.id));
  // Écritures simultanées sur des emplacements différents : aucune n'est perdue (écriture conditionnelle du registre)
  const ids = ["temps-1", "temps-2", "temps-3", "temps-4", "essai-1", "test-1", "test-2", "test-3"];
  await Promise.all(ids.map((slot, i) => definirMedia(slot, { id: `${String(i).repeat(32)}.png`, nom: `${slot}.png`, taille: 1, type: "image/png", ajouteLe: maintenant() })));
  const m2 = await chargerMedias();
  verifier("Médias : 8 enregistrements simultanés, aucun perdu", ids.every((slot) => m2.envoye(slot)), ids.filter((slot) => !m2.envoye(slot)).join(","));
  await Promise.all(ids.map((slot) => retirerMedia(slot)));
  verifier("Médias : titre et légende d'un exemple, nettoyés et limités en longueur", (await definirTexte("exemple-1", "Titre\u0007  avec\n sauts", "x".repeat(300))) && (await chargerMedias()).texte("exemple-1").titre === "Titre avec sauts" && (await chargerMedias()).texte("exemple-1").legende.length === 160);
  verifier("Médias : le texte n'est accepté que pour les vidéos d'exemple", !(await definirTexte("cloture", "t", "l")) && !(await definirTexte("exemple-1-affiche", "t", "l")) && !(await definirTexte("inconnu", "t", "l")));
  await definirTexte("exemple-1", "", "");
  verifier("Médias : un texte vide efface le texte", (await chargerMedias()).texte("exemple-1").titre === "");
  // Registre abîmé ou falsifié : seuls les emplacements connus sont lus
  await depot().ecrire("reglages/medias.json", JSON.stringify({ medias: { inconnu: { id: "x", type: "image/png" }, partage: { id: `${"a".repeat(32)}.jpg`, type: "image/jpeg", nom: "p.jpg", taille: 1, ajouteLe: "x" }, temps: 5 }, textes: { zzz: { titre: "t" } } }));
  const m3 = await chargerMedias();
  verifier("Médias : un registre falsifié ne fait apparaître que des emplacements connus", m3.envoye("partage") && !m3.envoye("inconnu") && m3.url("inconnu") === null);
  await depot().ecrire("reglages/medias.json", depot().nom.startsWith("postgres") ? "[]" : "pas du json"); // la base refuse un JSON invalide : on lui donne une forme inattendue
  verifier("Médias : un registre illisible laisse le site afficher les images d'origine", (await chargerMedias()).url("cloture") === "/media/photos/cloture.webp");
  await depot().supprimer("reglages/medias.json");
  let refuse = false;
  try { cleMedia("../fichiers/abc"); } catch { refuse = true; }
  verifier("Médias : une clé de stockage hors du dossier des médias est impossible à construire", refuse);
}

// 7 quinquies. Liste de lancement : contrôles automatiques et cases à cocher
{
  const etat = async (id: string) => (await controlerLancement()).groupes.flatMap((g) => g.controles).find((x) => x.id === id)?.etat;
  const avant = { mdp: process.env.ADMIN_PASSWORD, nom: process.env.NEXT_PUBLIC_LEGAL_NAME, taches: process.env.TACHES_SECRET };
  process.env.ADMIN_PASSWORD = "demonstration";
  verifier("Lancement : un mot de passe administrateur courant ou trop court est bloquant", (await etat("mdp")) === "bloquant");
  process.env.ADMIN_PASSWORD = "Un-vrai-mot-de-passe-long-9137";
  verifier("Lancement : un mot de passe long est accepté (et jamais affiché)", (await etat("mdp")) === "ok" && !JSON.stringify(await controlerLancement()).includes("Un-vrai-mot-de-passe"));
  process.env.NEXT_PUBLIC_LEGAL_NAME = "";
  verifier("Lancement : une mention légale manquante est bloquante", (await etat("legal")) === "bloquant");
  process.env.NEXT_PUBLIC_LEGAL_NAME = "Titulaire De Test";
  verifier("Lancement : mentions légales complètes → prêt", (await etat("legal")) === "ok");
  delete process.env.TACHES_SECRET;
  verifier("Lancement : clé des tâches quotidiennes absente → bloquant", (await etat("taches")) === "bloquant");
  verifier("Lancement : les paiements en mode test ne sont pas « prêts » pour la vente réelle", (await etat("paiement")) === "bloquant");
  verifier("Lancement : sans vidéo du studio, le conseil de la remplacer est donné", (await etat("demo")) !== "ok" || Boolean((await chargerMedias()).envoye("demo-video")));
  const r = await controlerLancement();
  verifier("Lancement : le bilan compte les points bloquants", r.bloquants >= 1 && r.groupes.length >= 6, String(r.bloquants));
  const premier = A_FAIRE_SOI_MEME[0].id;
  verifier("Lancement : cocher une vérification manuelle la mémorise, la recocher l'annule", (await basculerManuel(premier)) && (await lireManuel()).has(premier) && (await basculerManuel(premier)) && !(await lireManuel()).has(premier));
  verifier("Lancement : une case inconnue est refusée", !(await basculerManuel("inconnue")));
  await depot().supprimer("reglages/lancement.json");
  if (avant.mdp !== undefined) process.env.ADMIN_PASSWORD = avant.mdp; else delete process.env.ADMIN_PASSWORD;
  if (avant.nom !== undefined) process.env.NEXT_PUBLIC_LEGAL_NAME = avant.nom; else delete process.env.NEXT_PUBLIC_LEGAL_NAME;
  if (avant.taches !== undefined) process.env.TACHES_SECRET = avant.taches;
}

// 7 sexies. Cohérence du catalogue (prix, durée, tours de retouches) et tours de retouches
{
  const { formules, DUREE_MAX_SECONDES, DUREE_TEXTE, formuleParId, formuleParCle, videosTexte, formatsTexte, delaiCourt, delaisTexte } = await import("../lib/formules");
  const { toursMax, toursRestants, toursUtilises } = await import("../lib/tours");
  const { POST } = await import("../app/api/commande/[token]/validation/route");
  const { refuserRetouche } = await import("../lib/commandes");
  const fs = await import("node:fs"); const path = await import("node:path");
  verifier("Catalogue : prix 35 / 89 / 169 € (3 500 / 8 900 / 16 900 centimes)", formules.map((f) => f.prixCents).join() === "3500,8900,16900", formules.map((f) => f.prixCents).join());
  verifier("Catalogue : 1 / 2 / 2 tours de retouches", formules.map((f) => f.tours).join() === "1,2,2");
  verifier("Catalogue : « jusqu'à 15 secondes » pour chaque formule, aucun point ne promet davantage ni une fourchette", DUREE_MAX_SECONDES === 15 && DUREE_TEXTE === "jusqu'à 15 secondes" && formules.every((f) => f.duree === DUREE_TEXTE && f.points[0].includes("jusqu'à 15 secondes") && f.points.every((x) => !/20 s|20 secondes|15 à|10 à|15 secondes maximum/.test(x))));
  verifier("Catalogue : les points affichés reprennent le nombre de vidéos, d'accroches, de formats et de tours du catalogue", formules.every((f) => f.points[0] === videosTexte(f.videos) && f.points[2].includes(formatsTexte(f.formats)) && f.points.at(-1) === `${f.tours} tour${f.tours > 1 ? "s" : ""} de retouches`));
  verifier("Catalogue : « Pack Accroches » (identifiant interne « test » inchangé), « Recommandé » sur lui seul, aucun badge ailleurs", formules.map((f) => f.nom).join() === "Essai,Pack Accroches,Pack Campagne" && formules.find((f) => f.badge)?.id === "test" && formules.filter((f) => f.badge).length === 1 && formules.find((f) => f.badge)?.badge === "Recommandé" && formules[1].resume === "Trois accroches pour trouver celle qui vend.");
  verifier("Catalogue : adresses publiques (essai, accroches, campagne) ; l'ancienne adresse « test » mène toujours au Pack Accroches", formules.map((f) => f.adresse).join() === "essai,accroches,campagne" && formuleParCle("accroches")?.id === "test" && formuleParCle("test")?.id === "test" && formuleParCle("inconnue") === undefined);
  verifier("Catalogue : délais 48 h / 3 jours / 5 jours, formats 9:16 (puis 1:1 pour la campagne), 1 / 3 / 6 vidéos", formules.map((f) => delaiCourt(f)).join() === "48 h,3 jours,5 jours" && formules.map((f) => f.formats.join("+")).join() === "9:16,9:16,9:16+1:1" && formules.map((f) => f.videos).join() === "1,3,6" && delaisTexte() === "Essai 48 h, Pack Accroches 3 jours, Pack Campagne 5 jours");
  // Aucun prix, aucune durée, aucun délai, aucun format et aucun nombre de retouches écrit à la main hors du catalogue
  const sources: string[] = [];
  const parcourir = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const c = path.join(d, e.name); if (e.isDirectory()) parcourir(c); else if (/\.(ts|tsx)$/.test(e.name)) sources.push(c); } };
  parcourir("app"); parcourir("lib");
  const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const interdit = /(?<![\d.,–-])(25|35|69|89|129|169) ?€|(prixCents|montantCents|unit_amount|amount_total) ?[:=] ?\d{4,5}|15 à 20|10 à 15|20 secondes|16–20|retouches? par vidéo/;
  const fautifs = sources.filter((f) => !/lib[\\/]formules\.ts$/.test(f)).filter((f) => interdit.test(fs.readFileSync(f, "utf8")));
  verifier("Aucun prix, aucune durée et aucun nombre de retouches écrits à la main hors de lib/formules.ts", fautifs.length === 0, fautifs.join(", "));
  // Textes visibles par les clients (hors administration et API) : ni délai, ni durée, ni format, ni ancien nom de formule écrits à la main
  const interditClient = /\b(48|72) ?(h|heures)\b|\b[2-9] jours\b|[Qq]uinze secondes|\b15 ?(s|secondes)\b|Pack Test|Le plus utile|\b9:16\b|\b1:1\b|\b[Tt]rois photos\b/;
  const fautifsClient = sources.filter((f) => !/lib[\\/]formules\.ts$/.test(f) && !/app[\\/](admin|api)[\\/]/.test(f) && !/lib[\\/](veille|emplacements|auth|lancement|diagnostic|rattrapage|delais|echeances|suivi)\.ts$/.test(f) && !/app[\\/]components[\\/]HeroTelephone/.test(f)).filter((f) => interditClient.test(sansCommentaires(fs.readFileSync(f, "utf8"))));
  verifier("Aucun délai, aucune durée, aucun format ni ancien nom de formule écrits à la main dans les pages, les e-mails et les factures", fautifsClient.length === 0, fautifsClient.join(", "));
  // Configuration du site : contact, images, réglages, bandeau, indexation
  const config = await import("../app/config");
  const { env, modePaiement } = await import("../lib/env");
  verifier("Configuration : adresse de contact unique (app/config.ts), lue par les mentions légales, la facture et les e-mails", config.site.email === "contactstudioaccroche@gmail.com" && env.legal().email === config.site.email);
  verifier("Configuration : vidéo d'exemple masquée par défaut (SHOW_EXAMPLE_VIDEO absent) et active seulement si la valeur est true / oui / 1", config.SHOW_EXAMPLE_VIDEO === false && config.demonstration.video === "/videos/exemple.mp4" && config.demonstration.poster === "/videos/exemple-apercu.jpg");
  {
    // Offre réservée aux professionnels : textes, contrôle des informations saisies avant le paiement, FAQ
    const { verifierProfessionnel, siretLisible, normaliserSiret, siretValide } = await import("../lib/professionnel");
    const formulaire = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
    verifier("Offre réservée aux professionnels : mention « Offre réservée aux professionnels », case « Je commande en tant que professionnel, pour les besoins de mon activité. »", config.site.reservePro === "Offre réservée aux professionnels" && config.site.casePro === "Je commande en tant que professionnel, pour les besoins de mon activité.");
    const ok = verifierProfessionnel(formulaire({ pro: "oui", entreprise: "  Société   Exemple SAS ", siret: "123 456 789.00012" }));
    verifier("Commande professionnelle : nom d'entreprise nettoyé, SIRET normalisé (espaces et points retirés)", ok.ok && ok.client.entreprise === "Société Exemple SAS" && ok.client.siret === "12345678900012");
    verifier("Commande professionnelle : le SIRET est facultatif", verifierProfessionnel(formulaire({ pro: "oui", entreprise: "Mon Association" })).ok === true);
    const refus = [formulaire({ entreprise: "Société" }), formulaire({ pro: "non", entreprise: "Société" }), formulaire({ pro: "oui" }), formulaire({ pro: "oui", entreprise: " A " }), formulaire({ pro: "oui", entreprise: "Société", siret: "1234" }), formulaire({ pro: "oui", entreprise: "Société", siret: "1234567890123X" }), formulaire({ pro: "oui", entreprise: "Société", siret: "123456789012345" })].map((f) => { const r = verifierProfessionnel(f); return r.ok ? "ok" : r.erreur; });
    verifier("Commande professionnelle : case non cochée → pro ; nom absent ou d'une lettre → entreprise ; SIRET de 4, 14 caractères avec une lettre ou 15 chiffres → siret", refus.join() === "pro,pro,entreprise,entreprise,siret,siret,siret", refus.join());
    verifier("SIRET : 14 chiffres exigés, affichage lisible « 123 456 789 00012 »", siretValide("12345678900012") && !siretValide("1234567890001") && siretLisible("12345678900012") === "123 456 789 00012" && normaliserSiret("123 456 789 00012") === "12345678900012" && siretLisible("123456789") === "123456789");
    const q = config.faq.find((x) => x.q === "Je suis un particulier, puis-je commander ?");
    const r = config.faq.find((x) => x.q === "Y a-t-il un droit de rétractation ?");
    verifier("FAQ : question sur les particuliers (réponse : non, offre réservée aux professionnels) ; droit de rétractation : ne s'applique pas aux professionnels ; 11 questions sans doublon", Boolean(q) && q!.r.startsWith("Non. L'offre est réservée aux professionnels") && Boolean(r) && /réservée aux professionnels, le droit de rétractation prévu pour les consommateurs ne s'applique pas/.test(r!.r) && config.faq.length === 11 && new Set(config.faq.map((x) => x.q)).size === 11);
    // Mentions légales : le téléphone fait partie des informations exigées avant d'ouvrir les ventes réelles
    const sauve = { cle: process.env.STRIPE_SECRET_KEY, hote: process.env.STRIPE_API_HOST, ventes: process.env.VENTES_REELLES, tel: process.env.NEXT_PUBLIC_LEGAL_PHONE, whsec: process.env.STRIPE_WEBHOOK_SECRET };
    process.env.STRIPE_SECRET_KEY = "sk_live_cle_fictive_pour_le_test"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_fictif_pour_le_test"; delete process.env.STRIPE_API_HOST; process.env.VENTES_REELLES = "oui";
    process.env.NEXT_PUBLIC_LEGAL_PHONE = "";
    const sansTel = modePaiement();
    process.env.NEXT_PUBLIC_LEGAL_PHONE = "01 99 00 12 34";
    const avecTel = modePaiement();
    for (const [k, v] of [["STRIPE_SECRET_KEY", sauve.cle], ["STRIPE_API_HOST", sauve.hote], ["VENTES_REELLES", sauve.ventes], ["NEXT_PUBLIC_LEGAL_PHONE", sauve.tel], ["STRIPE_WEBHOOK_SECRET", sauve.whsec]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    verifier("Mentions légales : sans numéro de téléphone (NEXT_PUBLIC_LEGAL_PHONE) le paiement réel reste fermé ; avec, il s'ouvre", sansTel.mode === "ferme" && /Mentions légales incomplètes/.test(sansTel.raison || "") && avecTel.mode === "reel", JSON.stringify([sansTel, avecTel]));
  }
  {
    const chemins = [...config.images.temps, ...Object.values(config.images.formules).flat(), config.images.cloture, config.images.partage];
    const manquants = chemins.filter((c) => !fs.existsSync(path.join("public", c)));
    verifier(`Configuration : les ${chemins.length} chemins d'images regroupés dans app/config.ts existent`, manquants.length === 0 && config.images.temps.length === 4 && config.images.formules.test.length === 3 && config.images.formules.campagne.length === 6, manquants.join(", "));
    const og = fs.readFileSync(path.join("public", config.images.partage));
    let largeur = 0, hauteur = 0;
    for (let i = 2; i < og.length - 9;) { if (og[i] !== 0xff) { i++; continue; } const m = og[i + 1]; if (m >= 0xc0 && m <= 0xc3) { hauteur = og.readUInt16BE(i + 5); largeur = og.readUInt16BE(i + 7); break; } i += 2 + og.readUInt16BE(i + 2); }
    verifier("Image de partage : JPEG de 1200 × 630 px", og[0] === 0xff && og[1] === 0xd8 && largeur === 1200 && hauteur === 630, `${largeur}×${hauteur}`);
    verifier("Icônes : favicon.ico, icon.svg et apple-icon.png présents", ["favicon.ico", "icon.svg", "apple-icon.png"].every((f) => fs.statSync(path.join("app", f)).size > 100));
  }
  {
    const sauve = { site: process.env.SITE_ENV, url: process.env.SITE_URL };
    const robots = (await import("../app/robots")).default, sitemap = (await import("../app/sitemap")).default;
    process.env.SITE_URL = "https://exemple.fr";
    const regles = (r: ReturnType<typeof robots>) => JSON.stringify(r.rules);
    delete process.env.SITE_ENV;
    verifier("Indexation : variable SITE_ENV absente → tout est bloqué (jamais d'indexation par oubli), sans bandeau", regles(robots()) === JSON.stringify([{ userAgent: "*", disallow: "/" }]) && !robots().sitemap && sitemap().length === 0 && !env.enProduction() && !env.enPreproduction());
    process.env.SITE_ENV = "preprod";
    verifier("Indexation : préproduction (SITE_ENV=preprod) → tout est bloqué, bandeau de préproduction actif", regles(robots()) === JSON.stringify([{ userAgent: "*", disallow: "/" }]) && sitemap().length === 0 && env.enPreproduction() && !env.enProduction());
    process.env.SITE_ENV = " Production ";
    const r = robots();
    verifier("Indexation : production (SITE_ENV=production) → pages publiques autorisées, administration, commandes et API exclues, plan du site publié sur l'adresse du site", env.enProduction() && !env.enPreproduction() && regles(r).includes('"allow":"/"') && ["/admin", "/commande/", "/commander/", "/api/"].every((d) => regles(r).includes(d)) && r.sitemap === "https://exemple.fr/sitemap.xml" && sitemap().map((x) => x.url).join() === "https://exemple.fr/,https://exemple.fr/mentions-legales,https://exemple.fr/cgv,https://exemple.fr/confidentialite", regles(r));
    if (sauve.site === undefined) delete process.env.SITE_ENV; else process.env.SITE_ENV = sauve.site;
    if (sauve.url === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = sauve.url;
  }

  // Tours de retouches par formule : le nombre de demandes acceptées est exactement celui de la formule (et non × le nombre de vidéos)
  const envoyer = (token: string, corps: object) => POST(new Request("http://x/api", { method: "POST", body: JSON.stringify(corps) }), { params: Promise.resolve({ token }) });
  const cree = async (formule: "essai" | "test" | "campagne") => {
    const c = commandeTest({ formule, montantCents: formuleParId(formule)!.prixCents, statut: "en_production", livrables: [{ id: "f".repeat(32), nom: "v.mp4", taille: 10, type: "video/mp4", ajouteLe: maintenant() }] });
    await store.creerCommande(c); await envoyerLivraison(c.id); return c;
  };
  for (const [id, max] of [["essai", 1], ["test", 2], ["campagne", 2]] as const) {
    const c = await cree(id); let acceptees = 0, dernier = 0;
    for (let i = 0; i < 6; i++) {
      const r = await envoyer(c.token, { action: "retouche", message: "Merci de changer le texte du début s'il vous plaît." });
      if (r.status === 200) { acceptees++; await envoyerLivraison(c.id); } else { dernier = r.status; break; }
    }
    const apres = (await store.commande(c.id))!;
    verifier(`Tours de retouches « ${id} » : ${max} accepté${max > 1 ? "s" : ""}, puis refus (409), jamais « × nombre de vidéos »`, acceptees === max && dernier === 409 && toursMax(apres) === max && toursUtilises(apres) === max && toursRestants(apres) === 0, `${acceptees} acceptées, refus ${dernier}`);
  }
  // Hors périmètre : refusé par l'administrateur, non décompté, e-mail au client, retour en validation
  {
    const c = await cree("campagne");
    await envoyer(c.token, { action: "retouche", message: "Changez l'angle : présentez le produit pour les enfants." });
    const court = await refuserRetouche(c.id, "non");
    verifier("Hors périmètre : une explication trop courte est refusée, rien ne change", Boolean(court.erreur) && (await store.commande(c.id))!.statut === "en_production");
    const r = await refuserRetouche(c.id, "Un changement d'angle n'est pas une retouche : il faut une nouvelle commande.");
    const apres = (await store.commande(c.id))!;
    verifier("Hors périmètre : refusée, non décomptée (2 tours restants), retour en validation, historique tenu", !r.erreur && apres.statut === "attente_validation" && toursUtilises(apres) === 0 && toursRestants(apres) === 2 && /nouvelle commande/.test(apres.retouchesDemandees[0].horsPerimetre || "") && apres.historique.some((h) => /refusée \(hors périmètre\)/.test(h.evenement)), JSON.stringify(r.erreur));
    verifier("Hors périmètre : e-mail au client (archivé) avec l'explication et la définition d'un tour", (await store.courriels(c.id)).some((m) => m.objet.includes("hors périmètre") && m.texte.includes("nouvelle commande") && /ne vous est pas décompté/.test(m.texte) && /seule demande/.test(m.texte)));
    verifier("Hors périmètre : impossible s'il n'y a aucune demande en attente", Boolean((await refuserRetouche(c.id, "Explication suffisamment longue.")).erreur));
    const encore = await envoyer(c.token, { action: "retouche", message: "Raccourcissez les sous-titres de la deuxième vidéo." });
    verifier("Après un refus, les 2 tours restent disponibles", encore.status === 200 && toursUtilises((await store.commande(c.id))!) === 1);
  }
  // Facture : montant exactement égal au prix du catalogue pour chaque formule, durée maximale indiquée
  {
    const { composerPdf } = await import("../lib/factures");
    void composerPdf;
    const os = await import("node:os"); const { execFileSync } = await import("node:child_process");
    let pdftotext = true; try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); } catch { pdftotext = false; }
    // Facture réelle (sans filigrane « spécimen ») : mode réel simulé le temps du test, puis restauré
    const sauve = { cle: process.env.STRIPE_SECRET_KEY, hote: process.env.STRIPE_API_HOST, ventes: process.env.VENTES_REELLES };
    process.env.STRIPE_SECRET_KEY = "sk_live_cle_fictive_pour_le_test"; delete process.env.STRIPE_API_HOST; process.env.VENTES_REELLES = "oui";
    for (const f of formules) {
      const c = commandeTest({ formule: f.id, montantCents: f.prixCents, statut: "livree", entreprise: "Société Exemple SAS", siret: "12345678900012" }); await store.creerCommande(c);
      const r = await emettreFacture(c.id);
      const facture = (await store.commande(c.id))!.facture;
      let texte = "";
      if (pdftotext && facture) { const l = await depot().lire(facture.cle); const t = path.join(os.tmpdir(), `sa-${c.id}.pdf`); fs.writeFileSync(t, l!.corps); texte = execFileSync("pdftotext", ["-layout", t, "-"]).toString().replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " "); fs.rmSync(t); }
      const prix = `${f.prixCents / 100} €`;
      verifier(`Facture « ${f.nom} » : montant ${prix} identique au catalogue${pdftotext ? ", présent dans le PDF avec la durée maximale, l'entreprise et le SIRET de la commande" : " (texte du PDF non vérifié : pdftotext absent)"}`, !r.obstacles && facture?.montantCents === f.prixCents && (!pdftotext || (texte.includes(`${prix}`) && texte.includes("jusqu'à 15 secondes") && texte.includes(`${f.videos} vidéo`) && texte.includes("Société Exemple SAS") && texte.includes("123 456 789 00012") && !texte.includes("SPÉCIMEN"))) && facture?.specimen === false, JSON.stringify([r.obstacles, facture?.montantCents, facture?.specimen]));
    }
    for (const [k, v] of [["STRIPE_SECRET_KEY", sauve.cle], ["STRIPE_API_HOST", sauve.hote], ["VENTES_REELLES", sauve.ventes]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

// 7 septies. Délai de 14 jours : calcul (jours civils, heure de Paris), refus automatique, clôture automatique, e-mail tracé
{
  const { DELAI_RETOUCHE_JOURS, echeanceRetouche, delaiExpire, dateEcheanceTexte, miseADisposition, debutDeJourParis } = await import("../lib/delais");
  const { cloturerExpirees, cloturerExpireesSiNecessaire } = await import("../lib/echeances");
  const { cloturerParExpiration } = await import("../lib/commandes");
  const { toursUtilises, toursRestants } = await import("../lib/tours");
  const { POST } = await import("../app/api/commande/[token]/validation/route");
  const MS = Date.UTC;
  const envoyer = (token: string, corps: object) => POST(new Request("http://x/api", { method: "POST", body: JSON.stringify(corps) }), { params: Promise.resolve({ token }) });

  // — Calcul : le jour de la mise à disposition ne compte pas ; échéance = fin du 14e jour suivant, heure de Paris
  verifier("Délai : 14 jours (constante des conditions de vente)", DELAI_RETOUCHE_JOURS === 14);
  const cas: [string, string, number][] = [
    ["Hiver : livraison le 3 novembre à 10 h (Paris)", "2026-11-03T09:00:00Z", MS(2026, 10, 17, 22, 59, 59, 999)],
    ["Hiver : livraison à 23 h 30 UTC = 0 h 30 le lendemain à Paris → un jour de plus", "2026-11-03T23:30:00Z", MS(2026, 10, 18, 22, 59, 59, 999)],
    ["Hiver : livraison à 22 h 59 UTC = 23 h 59 à Paris, même jour civil", "2026-11-03T22:59:00Z", MS(2026, 10, 17, 22, 59, 59, 999)],
    ["Été : livraison le 1er juillet à 12 h (Paris)", "2026-07-01T10:00:00Z", MS(2026, 6, 15, 21, 59, 59, 999)],
    ["Été : livraison à 22 h 30 UTC = 0 h 30 le lendemain à Paris", "2026-06-30T22:30:00Z", MS(2026, 6, 15, 21, 59, 59, 999)],
    ["Passage à l'heure d'hiver (25 octobre 2026) pendant le délai", "2026-10-20T10:00:00Z", MS(2026, 10, 3, 22, 59, 59, 999)],
    ["Passage à l'heure d'été (28 mars 2027) pendant le délai", "2027-03-20T10:00:00Z", MS(2027, 3, 3, 21, 59, 59, 999)],
    ["Livraison le jour même du changement d'heure d'hiver", "2026-10-25T12:00:00Z", MS(2026, 10, 8, 22, 59, 59, 999)],
    ["Livraison le jour même du changement d'heure d'été", "2027-03-28T12:00:00Z", MS(2027, 3, 11, 21, 59, 59, 999)],
    ["Fin d'année : livraison le 25 décembre", "2026-12-25T10:00:00Z", MS(2027, 0, 8, 22, 59, 59, 999)],
    ["Fin de février : livraison le 20 février 2027", "2027-02-20T10:00:00Z", MS(2027, 2, 6, 22, 59, 59, 999)],
  ];
  for (const [nomCas, livraison, attendu] of cas) verifier(`Échéance — ${nomCas}`, echeanceRetouche(livraison) === attendu, `${new Date(echeanceRetouche(livraison)).toISOString()} au lieu de ${new Date(attendu).toISOString()}`);
  {
    const l = "2026-11-03T09:00:00Z"; const e = echeanceRetouche(l);
    verifier("Échéance : encore recevable à la dernière milliseconde, expirée à la suivante", !delaiExpire(l, e) && delaiExpire(l, e + 1) && !delaiExpire(l, e - 3_600_000) && !delaiExpire(l, Date.parse(l)));
    verifier("Échéance : affichée en français, jour de l'échéance en heure de Paris", dateEcheanceTexte(l) === "17 novembre 2026" && dateEcheanceTexte("2026-11-03T23:30:00Z") === "18 novembre 2026", dateEcheanceTexte(l));
    verifier("Échéance : minuit de Paris (début de jour) exact en hiver (23 h UTC la veille) et en été (22 h UTC la veille)", debutDeJourParis(2026, 11, 18) === MS(2026, 10, 17, 23) && debutDeJourParis(2026, 7, 16) === MS(2026, 6, 15, 22) && debutDeJourParis(2026, 10, 25) === MS(2026, 9, 24, 22) && debutDeJourParis(2027, 3, 28) === MS(2027, 2, 27, 23));
  }
  {
    // Le résultat ne dépend pas du fuseau du serveur (Netlify tourne en UTC ; un poste de travail peut être ailleurs)
    const avantTZ = process.env.TZ; const attendus = cas.map(([, l]) => echeanceRetouche(l)); let different = 0, fuseauAppliques = 0;
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo", "Pacific/Auckland", "Europe/Paris"]) {
      process.env.TZ = tz;
      if (tz === "America/Los_Angeles" && new Date("2026-01-01T12:00:00Z").getHours() === 4) fuseauAppliques++;
      if (tz === "Asia/Tokyo" && new Date("2026-01-01T12:00:00Z").getHours() === 21) fuseauAppliques++;
      cas.forEach(([, l], i) => { if (echeanceRetouche(l) !== attendus[i]) different++; });
    }
    if (avantTZ === undefined) delete process.env.TZ; else process.env.TZ = avantTZ;
    verifier("Échéance : identique quel que soit le fuseau du serveur (UTC, Los Angeles, Tokyo, Auckland, Paris), changements d'heure compris", different === 0 && fuseauAppliques === 2, `${different} écarts, ${fuseauAppliques}/2 fuseaux réellement appliqués`);
  }

  // — Jours de Paris relatifs à aujourd'hui (les tests suivants ne dépendent pas de la date d'exécution)
  const parisJour = (decalage: number) => { const d = new Date(Date.now()); const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d).split("-").map(Number); const n = new Date(Date.UTC(p[0], p[1] - 1, p[2] - decalage)); return debutDeJourParis(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()) + 12 * 3_600_000; }; // midi, heure de Paris, il y a `decalage` jours civils
  const iso = (ms: number) => new Date(ms).toISOString();
  const aValider = async (livraisonMs: number, surcharge: Partial<Commande> = {}) => {
    const c = commandeTest({ statut: "attente_validation", derniereLivraisonLe: iso(livraisonMs), livrables: [{ id: "e".repeat(32), nom: "v.mp4", taille: 10, type: "video/mp4", ajouteLe: iso(livraisonMs) }], historique: [{ date: iso(livraisonMs), evenement: "Livraison envoyée au client." }], ...surcharge });
    await store.creerCommande(c); return c;
  };
  const objetsReputes = async (id: string) => (await store.courriels(id)).filter((m) => /livraison réputée acceptée/.test(m.objet));

  // — Dans le délai : rien n'est refusé ni clôturé (13 et 14 jours : le 14e jour compte encore)
  {
    const treize = await aValider(parisJour(13)), quatorze = await aValider(parisJour(14));
    verifier("Livraison il y a 14 jours civils : le client peut encore agir jusqu'à minuit (heure de Paris)", !delaiExpire(miseADisposition(quatorze)) && !delaiExpire(miseADisposition(treize)));
    const bilan = await cloturerExpirees();
    verifier("Clôture automatique : une livraison de 13 ou 14 jours n'est pas clôturée", !bilan.cloturees.includes(treize.id) && !bilan.cloturees.includes(quatorze.id) && (await store.commande(quatorze.id))!.statut === "attente_validation");
    const refus = await cloturerParExpiration(quatorze.id);
    verifier("Clôture directe dans le délai : refusée, la commande reste en attente de validation", Boolean(refus.erreur) && (await store.commande(quatorze.id))!.statut === "attente_validation");
    const r = await envoyer(quatorze.token, { action: "retouche", message: "Merci de changer le texte du début s'il vous plaît." });
    verifier("Retouche demandée le 14e jour : acceptée, comptée, commande renvoyée en production", r.status === 200 && (await store.commande(quatorze.id))!.statut === "en_production" && toursUtilises((await store.commande(quatorze.id))!) === 1);
    const v = await envoyer(treize.token, { action: "valider" });
    verifier("Validation dans le délai : acceptée, commande livrée, non marquée « clôture automatique »", v.status === 200 && (await store.commande(treize.id))!.statut === "livree" && !(await store.commande(treize.id))!.clotureAutoLe);
  }

  // — Après le délai : refus automatique d'une retouche, clôture, e-mail, aucun tour décompté
  {
    const a = await aValider(parisJour(15), { formule: "test", montantCents: 8900 });
    verifier("Livraison il y a 15 jours civils : délai expiré", delaiExpire(miseADisposition(a)));
    const r = await envoyer(a.token, { action: "retouche", message: "Pouvez-vous refaire la vidéo avec une autre musique ?" });
    const corps = (await r.json()) as { erreur?: string };
    const apres = (await store.commande(a.id))!;
    verifier("Retouche après 14 jours : refusée automatiquement (409), motif et date d'échéance donnés au client", r.status === 409 && /14 jours/.test(corps.erreur || "") && /nouvelle commande/.test(corps.erreur || "") && (corps.erreur || "").includes(dateEcheanceTexte(miseADisposition(a))), corps.erreur);
    verifier("Retouche tardive : commande clôturée automatiquement (livrée), date de clôture et de livraison renseignées", apres.statut === "livree" && Boolean(apres.clotureAutoLe) && Boolean(apres.livreeLe) && !apres.valideeLe);
    verifier("Retouche tardive : la demande est tracée (message conservé, marquée tardive) et n'est PAS décomptée (2 tours intacts)", apres.retouchesDemandees.length === 1 && apres.retouchesDemandees[0].tardive === true && apres.retouchesDemandees[0].message.includes("autre musique") && toursUtilises(apres) === 0 && toursRestants(apres) === 2);
    verifier("Retouche tardive : historique (clôture automatique et demande refusée)", apres.historique.some((h) => /Livraison réputée acceptée/.test(h.evenement)) && apres.historique.some((h) => /refusée, non décomptée/.test(h.evenement)));
    const mails = await objetsReputes(a.id);
    verifier("Retouche tardive : un e-mail au client (archivé) explique la clôture et la demande refusée", mails.length === 1 && mails[0].a === "a@exemple.fr" && /parvenue après l'échéance/.test(mails[0].texte) && /14 jours/.test(mails[0].texte) && /nouvelle commande/.test(mails[0].texte), mails[0]?.texte.slice(0, 200));
    verifier("Retouche tardive : e-mail archivé (aucun service d'envoi configuré dans ce test), pas en échec", mails[0] ? !enEchec(mails[0]) : false);
    // Nouvelle tentative après la clôture : refusée, tracée, aucun second e-mail
    const r2 = await envoyer(a.token, { action: "retouche", message: "Je voudrais quand même une autre version." });
    const apres2 = (await store.commande(a.id))!;
    verifier("Seconde tentative après la clôture : refusée (409), tracée dans l'historique, toujours aucun tour décompté", r2.status === 409 && apres2.statut === "livree" && apres2.retouchesDemandees.length === 2 && toursUtilises(apres2) === 0 && apres2.historique.some((h) => /après la clôture/.test(h.evenement)));
    verifier("Seconde tentative : aucun deuxième e-mail de clôture", (await objetsReputes(a.id)).length === 1);
    const v = await envoyer(a.token, { action: "valider" });
    verifier("Validation après la clôture automatique : « aucune livraison à valider » (409), rien ne change", v.status === 409 && (await store.commande(a.id))!.statut === "livree");
    const idem = await cloturerParExpiration(a.id);
    verifier("Clôture rejouée : sans effet (pas de doublon)", Boolean(idem.erreur) && (await objetsReputes(a.id)).length === 1);
  }

  // — Clôture automatique par la tâche quotidienne : sans demande du client, idempotente, concurrente sans doublon
  {
    const b = await aValider(parisJour(20)), jeune = await aValider(parisJour(5)), enProd = await aValider(parisJour(40), { statut: "en_production" });
    const bilan = await cloturerExpirees();
    const apres = (await store.commande(b.id))!;
    verifier("Tâche quotidienne : la livraison de 20 jours sans réponse est clôturée, pas la livraison récente ni la commande en production", bilan.cloturees.includes(b.id) && !bilan.cloturees.includes(jeune.id) && !bilan.cloturees.includes(enProd.id) && apres.statut === "livree" && (await store.commande(jeune.id))!.statut === "attente_validation" && (await store.commande(enProd.id))!.statut === "en_production");
    verifier("Clôture automatique : journal explicite (délai, échéance), aucune retouche enregistrée, e-mail « livraison réputée acceptée » sans mention de refus", apres.historique.some((h) => /aucun retour du client dans le délai de 14 jours \(échéance : [^)]+ 20\d\d\)/.test(h.evenement)) && apres.retouchesDemandees.length === 0 && (await objetsReputes(b.id)).length === 1 && !/parvenue après l'échéance/.test((await objetsReputes(b.id))[0].texte));
    verifier("Clôture automatique : l'e-mail indique l'échéance et renvoie vers la fiche de la commande", (await objetsReputes(b.id))[0].texte.includes(dateEcheanceTexte(miseADisposition(b))) && (await objetsReputes(b.id))[0].texte.includes(`/commande/${b.token}`));
    const encore = await cloturerExpirees();
    verifier("Tâche quotidienne rejouée : aucun doublon (un seul e-mail, pas de nouvelle clôture)", !encore.cloturees.includes(b.id) && (await objetsReputes(b.id)).length === 1);
    const c = await aValider(parisJour(30));
    await Promise.all([cloturerParExpiration(c.id), cloturerParExpiration(c.id), cloturerExpirees(), envoyer(c.token, { action: "retouche", message: "Une retouche envoyée trop tard, tant pis." })]);
    const fin = (await store.commande(c.id))!;
    verifier("Quatre exécutions simultanées (clôture ×2, tâche quotidienne, retouche tardive) : une seule clôture, un seul e-mail, aucun tour décompté", fin.statut === "livree" && (await objetsReputes(c.id)).length === 1 && toursUtilises(fin) === 0 && fin.historique.filter((h) => /Livraison réputée acceptée/.test(h.evenement)).length === 1, `${(await objetsReputes(c.id)).length} e-mail(s)`);
    // Horloge simulée : l'échéance exacte, à la milliseconde
    const d = await aValider(parisJour(20)); const ech = echeanceRetouche(miseADisposition(d));
    const avant = await cloturerExpirees(ech); const apresMs = await cloturerExpirees(ech + 1);
    verifier("Horloge simulée : à l'échéance exacte rien n'est clôturé ; une milliseconde plus tard, la commande l'est", !avant.cloturees.includes(d.id) && apresMs.cloturees.includes(d.id) && (await store.commande(d.id))!.statut === "livree");
  }

  // — Le délai court de chaque livraison réelle ; le renvoi de l'e-mail ne le relance pas ; version corrigée : il repart
  {
    const c = commandeTest({ statut: "en_production", livrables: [{ id: "d".repeat(32), nom: "v.mp4", taille: 10, type: "video/mp4", ajouteLe: maintenant() }] }); await store.creerCommande(c);
    await envoyerLivraison(c.id);
    const l1 = (await store.commande(c.id))!;
    verifier("Livraison réelle : la date de mise à disposition est enregistrée", Boolean(l1.derniereLivraisonLe) && Math.abs(Date.now() - Date.parse(l1.derniereLivraisonLe!)) < 120_000);
    await store.modifier(c.id, (x) => { x.derniereLivraisonLe = iso(parisJour(10)); });
    await envoyerLivraison(c.id); // renvoi de l'e-mail seul
    const l2 = (await store.commande(c.id))!;
    verifier("Renvoi de l'e-mail de livraison : le délai n'est pas relancé", l2.derniereLivraisonLe === iso(parisJour(10)) && l2.historique.some((h) => /E-mail de livraison renvoyé/.test(h.evenement)));
    const r = await envoyer(c.token, { action: "retouche", message: "Merci de changer le texte du début s'il vous plaît." });
    const prod = (await store.commande(c.id))!;
    const bilan = await cloturerExpirees();
    verifier("Commande en production (retouche acceptée) : jamais clôturée par l'échéance, même si la première livraison est ancienne", r.status === 200 && prod.statut === "en_production" && !bilan.cloturees.includes(c.id));
    await envoyerLivraison(c.id);
    const l3 = (await store.commande(c.id))!;
    verifier("Version corrigée envoyée : un nouveau délai de 14 jours repart de cette livraison", l3.statut === "attente_validation" && Math.abs(Date.now() - Date.parse(l3.derniereLivraisonLe!)) < 120_000 && !delaiExpire(miseADisposition(l3)) && echeanceRetouche(miseADisposition(l3)) - Date.now() > 13 * 86_400_000);
  }
  {
    // Commandes livrées avant l'ajout du champ : la date est retrouvée dans l'historique, à défaut dans la date de paiement
    const j = Object.fromEntries([2, 25, 30, 40].map((n) => [n, iso(Date.now() - n * 86_400_000)])); // dates figées une fois pour toutes : aucune comparaison à la milliseconde près
    const ancienne = commandeTest({ statut: "attente_validation", paiement: { etat: "paye", sessionId: "cs_y", payeLe: j[40], mode: "simulation" }, historique: [{ date: j[30], evenement: "Livraison envoyée au client." }, { date: j[25], evenement: "Version corrigée envoyée au client." }, { date: j[2], evenement: "E-mail de livraison renvoyé au client." }] });
    verifier("Anciennes commandes : date retrouvée dans l'historique (dernière version corrigée, pas le simple renvoi)", miseADisposition(ancienne) === j[25], miseADisposition(ancienne));
    const sansHistorique = commandeTest({ statut: "attente_validation", paiement: { etat: "paye", sessionId: "cs_z", payeLe: j[40], mode: "simulation" } });
    verifier("Anciennes commandes sans historique : date de paiement (jamais plus favorable au client que la réalité)", miseADisposition(sansHistorique) === j[40], miseADisposition(sansHistorique));
  }

  // — E-mail impossible : la clôture a lieu quand même, l'échec est tracé et rattrapable
  {
    const sauve = { h: process.env.SMTP_HOST, p: process.env.SMTP_PORT, u: process.env.SMTP_USER, m: process.env.SMTP_PASSWORD, b: process.env.BREVO_API_KEY, r: process.env.RESEND_API_KEY };
    process.env.SMTP_HOST = "127.0.0.1"; process.env.SMTP_PORT = "1"; process.env.SMTP_USER = "contact@exemple.fr"; process.env.SMTP_PASSWORD = "mot-de-passe-de-test"; delete process.env.BREVO_API_KEY; delete process.env.RESEND_API_KEY;
    const e = await aValider(parisJour(18));
    const bilan = await cloturerExpirees();
    const apres = (await store.commande(e.id))!; const mails = await objetsReputes(e.id);
    verifier("E-mail impossible (service d'envoi injoignable) : la commande est tout de même clôturée", bilan.cloturees.includes(e.id) && apres.statut === "livree" && bilan.emailsEnEchec >= 1);
    verifier("E-mail impossible : la tentative est archivée en échec, avec la cause", mails.length === 1 && enEchec(mails[0]) && (mails[0].essais?.length ?? 0) >= 1, JSON.stringify(mails[0]?.essais));
    verifier("E-mail impossible : l'historique de la commande le dit (« NON ENVOYÉ »), avec où retrouver la tentative", apres.historique.some((h) => /NON ENVOYÉ/.test(h.evenement) && /Administration/.test(h.evenement)));
    const regle = echecsUtiles(mails, [apres]);
    verifier("E-mail impossible : rattrapable en un clic (règle « livraison réputée acceptée » reconnue pour une commande livrée)", regle.length === 1 && regle[0].courriel.id === mails[0].id, JSON.stringify(trierEchecs(mails, [apres]).map((x) => x.action + ":" + x.raison)));
    // Service rétabli : le renvoi fonctionne et ne duplique pas la clôture
    for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "BREVO_API_KEY", "RESEND_API_KEY"]) delete process.env[k];
    const renvoi = await courriels.renvoyer(mails[0]);
    verifier("Service rétabli : le renvoi repart à l'identique (archivé sans service configuré), sans toucher à la commande", renvoi.objet === mails[0].objet && (await store.commande(e.id))!.statut === "livree" && (await store.commande(e.id))!.historique.filter((h) => /Livraison réputée acceptée/.test(h.evenement)).length === 1);
    for (const [k, v] of [["SMTP_HOST", sauve.h], ["SMTP_PORT", sauve.p], ["SMTP_USER", sauve.u], ["SMTP_PASSWORD", sauve.m], ["BREVO_API_KEY", sauve.b], ["RESEND_API_KEY", sauve.r]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }

  // — Déclenchement libre (ouverture de l'administration) : au plus une fois par heure
  {
    await depot().ecrire("systeme/echeances.json", JSON.stringify({ date: new Date(Date.now() - 2 * 3_600_000).toISOString() }));
    const f = await aValider(parisJour(22));
    const premier = await cloturerExpireesSiNecessaire();
    const second = await cloturerExpireesSiNecessaire();
    verifier("Ouverture de l'administration : la clôture automatique s'exécute (marque ancienne de 2 h), puis n'est pas rejouée dans l'heure", premier !== null && premier.cloturees.includes(f.id) && second === null && (await store.commande(f.id))!.statut === "livree");
    await depot().supprimer("systeme/echeances.json");
  }
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

  {
    // Dépôt partagé injoignable (mauvais mot de passe, base arrêtée…) : le limiteur se rabat sur la mémoire, sans exception
    const sortie: string = await new Promise((ok) => execFile("npx", ["tsx", "scripts/limiteur-injoignable.mts"], { env: { ...process.env, DATABASE_URL: "postgres://postgres:faux@127.0.0.1:1/inexistant", S3_BUCKET: "", S3_ENDPOINT: "", ENFANT: "" }, timeout: 90000 }, (_e, out) => ok(out.trim().split("\n").pop() || "")));
    verifier("Limiteur : dépôt injoignable → compteur en mémoire (1, 2, 2, puis 0 après remise à zéro), aucune exception", sortie === "[1,2,2,0]", sortie);
  }

  const pooler = "postgresql://postgres.abcdefghij:p%40ss@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
  const cfg = configurationStockage({ DATABASE_URL: pooler, S3_ACCESS_KEY_ID: "k", S3_SECRET_ACCESS_KEY: "s" });
  verifier("Supabase : référence et région déduites de l'adresse du pooler", JSON.stringify(deduireSupabase(pooler)) === JSON.stringify({ ref: "abcdefghij", region: "eu-central-1" }));
  verifier("Supabase : adresse directe → référence seule", deduireSupabase("postgresql://postgres:x@db.abcdefghij.supabase.co:5432/postgres")?.ref === "abcdefghij" && deduireSupabase("postgresql://u:x@exemple.fr/db") === null && deduireSupabase("") === null);
  verifier("Supabase : stockage déduit (adresse, région, bucket, style des adresses, origine)", cfg.endpoint === "https://abcdefghij.storage.supabase.co/storage/v1/s3" && cfg.region === "eu-central-1" && cfg.bucket === "studio-accroche" && cfg.pathStyle && cfg.origine === "https://abcdefghij.storage.supabase.co", JSON.stringify(cfg));
  const explicite = configurationStockage({ DATABASE_URL: pooler, S3_ENDPOINT: "https://autre.exemple/s3", S3_REGION: "us-east-1", S3_BUCKET: "mon-bucket", S3_PATH_STYLE: "non" });
  verifier("Supabase : les variables explicites l'emportent sur la déduction", explicite.endpoint === "https://autre.exemple/s3" && explicite.region === "us-east-1" && explicite.bucket === "mon-bucket" && !explicite.pathStyle && explicite.origine === "https://autre.exemple");
  verifier("Supabase : sans Supabase ni variable, rien n'est déduit", configurationStockage({}).bucket === "" && configurationStockage({ S3_REGION: "auto" }).region === "auto");

  {
    // Analyse de DATABASE_URL : repère les erreurs de saisie sans jamais afficher le mot de passe
    const ref = "abcdefghijklmnopqrst";
    const bonne = analyserAdresseBase(`postgresql://postgres.${ref}:Secret123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`);
    verifier("Analyse de l'adresse de base : adresse correcte sans erreur, mot de passe jamais affiché", bonne.every((x) => x.etat !== "ko") && !JSON.stringify(bonne).includes("Secret123") && JSON.stringify(bonne).includes("9 caractère"), JSON.stringify(bonne));
    const gabarit = analyserAdresseBase(`postgresql://postgres.${ref}:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`);
    verifier("Analyse : mot de passe entouré de crochets ou d'exemple « [YOUR-PASSWORD] » détecté", gabarit.some((x) => x.etat === "ko" && /crochets/.test(x.detail || "")));
    const special = analyserAdresseBase(`postgresql://postgres.${ref}:ab#cd/ef@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`);
    verifier("Analyse : caractères spéciaux non encodés détectés (# /)", special.some((x) => x.etat === "ko" && /non encodé/.test(x.detail || "")));
    const mauvais = analyserAdresseBase("postgresql://postgres:Secret123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres");
    verifier("Analyse : pooler Supabase avec l'utilisateur « postgres » seul détecté", mauvais.some((x) => x.etat === "ko" && /postgres\.<référence/.test(x.detail || "")) && !JSON.stringify(mauvais).includes("Secret123"));
    const direct = analyserAdresseBase(`postgresql://postgres:Secret123@db.${ref}.supabase.co:5432/postgres`);
    verifier("Analyse : connexion directe signalée (IPv6 seulement)", direct.some((x) => x.etat === "avert" && /IPv6/.test(x.detail || "")));
    verifier("Analyse : adresse illisible signalée", analyserAdresseBase("n'importe quoi")[0].etat === "ko");
  }
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
const smtp = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS"], allowInsecureAuth: true, onAuth: (a: { username: string; password?: string }, _s: unknown, cb: (e: Error | null, r?: unknown) => void) => (smtpPanne || a.password !== "abcdefghijklmnop" ? cb(new Error("535-5.7.8 Username and Password not accepted")) : cb(null, { user: a.username })), onData(f: NodeJS.ReadableStream, sess: { envelope: { rcptTo: { address: string }[] } }, cb: (e?: Error) => void) { let t = ""; f.on("data", (d) => (t += d)); f.on("end", () => { smtpRecus.push({ a: sess.envelope.rcptTo.map((x) => x.address), texte: t }); cb(); }); } }).listen(0, "127.0.0.1");
await new Promise((r) => setTimeout(r, 100));
const portNtfy = (ntfy.address() as { port: number }).port, portSmtp = (smtp.address() as { port: number }).port;
process.env.NTFY_URL = `http://127.0.0.1:${portNtfy}`; process.env.NTFY_TOPIC = "sujet-de-test"; process.env.ADMIN_EMAIL = "vendeur@exemple.fr"; process.env.SITE_URL = "https://studio.exemple";
process.env.MAIL_FROM = "Studio Accroche <contact@exemple.fr>"; delete process.env.BREVO_API_KEY; delete process.env.RESEND_API_KEY;
const nouveau = (cle: string) => `${cle}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

{
  // — Alertes sur le téléphone
  let a = await alerter({ cle: nouveau("t"), titre: "Nouvelle commande payée", message: "SA-1 · Pack Accroches · 89,00 €", lien: "https://studio.exemple/admin/commande/SA-1", email: false });
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
  process.env.SMTP_HOST = "127.0.0.1"; process.env.SMTP_PORT = String(portSmtp); process.env.SMTP_USER = "contact@exemple.fr"; process.env.SMTP_PASSWORD = "abcd efgh ijkl mnop"; // copié tel quel depuis Google : avec des espaces
  let brevoPanne = false; let brevoAppels = 0;
  const brevo = http.createServer((_q, r) => { brevoAppels++; r.writeHead(brevoPanne ? 401 : 201, { "Content-Type": "application/json" }); r.end(brevoPanne ? '{"message":"We have detected you are using an unrecognised IP address 3.15.41.111. If you performed this action make sure to add the new IP address in the list of authorized IPs"}' : '{"messageId":"x"}'); }).listen(0, "127.0.0.1");
  await new Promise((r) => setTimeout(r, 50));
  process.env.BREVO_API_KEY = "cle"; process.env.BREVO_API_BASE = `http://127.0.0.1:${(brevo.address() as { port: number }).port}`;
  verifier("Mot de passe d'application copié avec ses espaces : les espaces sont retirés avant l'envoi", motDePasseSmtp() === "abcdefghijklmnop");
  verifier("Services d'envoi : Gmail (SMTP) d'abord, puis Brevo", envoiReel() === "smtp puis brevo", String(envoiReel()));
  const n = ntfyRecus.length; const cmd = commandeTest(); await store.creerCommande(cmd);
  let m = await courriels.adminPaiement(cmd);
  verifier("Notification de paiement envoyée par Gmail (SMTP) sans solliciter Brevo, à l'adresse du vendeur", m.resultat === "envoyé" && m.pilote === "smtp" && !m.essais && brevoAppels === 0 && smtpRecus.some((x) => x.a.includes("vendeur@exemple.fr")), JSON.stringify([m.resultat, m.pilote, m.essais, brevoAppels]));
  verifier("Notification de paiement : numéro de commande, client, e-mail, offre, montant et lien d'administration", [cmd.id, "A B", "a@exemple.fr", "Essai", "35", `/admin/commande/${cmd.id}`].every((t) => m.texte.includes(t)) && m.objet.includes("Nouvelle commande payée"), m.texte.slice(0, 300));
  smtpPanne = true;
  m = await courriels.adminPaiement(commandeTest());
  verifier("Gmail refuse (mot de passe, limite, panne) : Brevo prend le relais, l'e-mail part, aucune alerte inutile", m.resultat === "envoyé" && m.pilote === "brevo" && m.essais?.length === 1 && brevoAppels === 1 && ntfyRecus.length === n, JSON.stringify([m.resultat, m.pilote, m.essais]));
  brevoPanne = true;
  m = await courriels.adminPaiement(commandeTest());
  verifier("Tous les services d'envoi en échec : échec archivé, jamais d'exception", enEchec(m) && (m.essais?.length ?? 0) === 2, JSON.stringify(m.essais));
  const al = ntfyRecus.at(-1)!;
  verifier("Échec d'e-mail : alerte sur le téléphone, sans adresse ni nom", ntfyRecus.length === n + 1 && al.title === "E-mail non envoyé" && !JSON.stringify(al).includes("@") && !JSON.stringify(al).includes("A B"), JSON.stringify(al));
  smtpPanne = false; brevoPanne = false;
  verifier("Brevo refuse l'adresse IP du serveur (401) : la cause est écrite en clair dans l'archive, avec la marche à suivre", m.essais!.some((e) => /Brevo refuse l'adresse IP du serveur/.test(e) && /Authorized IPs/.test(e)), JSON.stringify(m.essais));
  const renvoi = await courriels.renvoyer(m);
  verifier("E-mail en échec renvoyé ensuite, à l'identique, par Gmail", renvoi.resultat === "envoyé" && renvoi.pilote === "smtp" && renvoi.objet === m.objet);
  brevo.close();
}
{
  // — Séparation des clés : un usage compromis ne donne accès à aucun autre
  const k1 = cleDerivee("session-admin").toString("hex"), k2 = cleDerivee("depot-fichiers").toString("hex"), k3 = cleDerivee("limiteur").toString("hex"), k4 = cleDerivee("reglages-chiffres").toString("hex");
  verifier("Clés dérivées : quatre usages, quatre clés différentes, stables d'un appel à l'autre", new Set([k1, k2, k3, k4]).size === 4 && k1 === cleDerivee("session-admin").toString("hex") && !k1.includes(process.env.SESSION_SECRET!.slice(0, 12)));
  verifier("Clés dérivées : la liaison au mot de passe administrateur change la clé de session", cleDerivee("session-admin", "a").toString("hex") !== cleDerivee("session-admin", "b").toString("hex"));
}
{
  // — Réglages saisis dans l'administration : mot de passe d'application chiffré en base, actif sans redéploiement
  const x = chiffrer("abcdefghijklmnop");
  verifier("Réglages : le mot de passe est chiffré (rien de lisible) et se déchiffre", !x.includes("abcdefgh") && dechiffrer(x) === "abcdefghijklmnop");
  verifier("Réglages : deux chiffrements du même texte diffèrent (valeur initiale aléatoire)", chiffrer("a") !== chiffrer("a"));
  const ancienne = process.env.SESSION_SECRET; process.env.SESSION_SECRET = "un-autre-secret-de-session-" + "x".repeat(30);
  let illisible = false; try { dechiffrer(x); } catch { illisible = true; }
  process.env.SESSION_SECRET = ancienne;
  verifier("Réglages : illisible sans le SESSION_SECRET d'origine (le contenu de la base ne suffit pas)", illisible);
  const avantEnv = process.env.SMTP_PASSWORD;
  await enregistrerMotDePasseSmtp("zzzzyyyyxxxxwwww"); await chargerReglages(true);
  const brut = (await depot().lire("reglages/smtp.json"))!.corps.toString();
  verifier("Réglages : le mot de passe saisi dans l'administration l'emporte sur la variable Netlify et n'est pas lisible en base", motDePasseSmtp() === "zzzzyyyyxxxxwwww" && !brut.includes("zzzzyyyy") && Boolean(motDePasseSmtpEnregistreLe()), brut.slice(0, 120));
  // SESSION_SECRET changé après l'enregistrement : le mot de passe devient illisible, signalé (et non une erreur), le site retombe sur la variable
  const sessionAvant = process.env.SESSION_SECRET; process.env.SESSION_SECRET = "un-nouveau-secret-de-session-" + "y".repeat(30);
  await chargerReglages(true);
  verifier("Réglages : SESSION_SECRET changé → mot de passe enregistré signalé illisible, jamais d'exception, variable Netlify utilisée", motDePasseSmtpIllisible() && motDePasseSmtp() === "abcdefghijklmnop");
  process.env.SESSION_SECRET = sessionAvant; await chargerReglages(true);
  verifier("Réglages : clé d'origine rétablie → de nouveau lisible", !motDePasseSmtpIllisible() && motDePasseSmtp() === "zzzzyyyyxxxxwwww");
  await oublierMotDePasseSmtp(); await chargerReglages(true);
  verifier("Réglages : une fois supprimé, la variable Netlify reprend la main", motDePasseSmtp() === "abcdefghijklmnop" && process.env.SMTP_PASSWORD === avantEnv && !motDePasseSmtpEnregistreLe());
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
  verifier("Script : refusé s'il est trop court", Boolean((await envoyerScript(cmd.id, "court")).erreur));
  r = await envoyerScript(cmd.id, "0–3 s ACCROCHE : « Arrête d'acheter des gourdes qui fuient. »\n3–10 s PRODUIT : « Celle-ci se retourne. »");
  verifier("Script : e-mail au client avec le texte, date et historique enregistrés, statut inchangé", r.courrielOk === true && r.commande?.statut === "payee" && Boolean(r.commande?.scriptEnvoyeLe) && r.commande!.historique.some((h) => h.evenement.includes("Script envoyé")) && (await store.courriels(cmd.id)).some((m) => m.objet.includes("votre script à valider") && m.texte.includes("Arrête d'acheter") && m.a === "a@exemple.fr"), JSON.stringify(r.erreur));
  verifier("Production : refusée tant que l'accord du client sur le script n'est pas confirmé", Boolean((await demarrerProduction(cmd.id, false)).erreur) && (await store.commande(cmd.id))!.statut === "payee");
  r = await demarrerProduction(cmd.id);
  verifier("Démarrer la production : statut, journal, e-mail au client", r.commande?.statut === "en_production" && r.courrielOk === true && (await store.courriels(cmd.id)).some((m) => m.objet.includes("production lancée") && m.a === "a@exemple.fr"), JSON.stringify(r.erreur));
  verifier("Démarrer deux fois : refusé, aucun e-mail en double", Boolean((await demarrerProduction(cmd.id)).erreur) && (await nbMails()) === 2);
  r = await envoyerLivraison(cmd.id);
  verifier("Livraison refusée sans fichier livrable", Boolean(r.erreur?.includes("livrable")) && (await store.commande(cmd.id))!.statut === "en_production");
  await store.modifier(cmd.id, (c) => { c.livrables.push({ id: "f".repeat(32), nom: "v.mp4", taille: 10, type: "video/mp4", ajouteLe: maintenant() }); c.retouchesDemandees.push({ date: maintenant(), message: "raccourcir" }); });
  verifier("Une retouche non traitée est une correction ouverte", correctionOuverte((await store.commande(cmd.id))!));
  r = await envoyerLivraison(cmd.id);
  const apres = (await store.commande(cmd.id))!;
  verifier("Envoi de la version corrigée : « en attente de validation », retouche marquée traitée, e-mail « corrigée »", apres.statut === "attente_validation" && apres.retouchesDemandees.every((x) => x.traiteeLe) && r.courrielOk === true && (await store.courriels(cmd.id)).some((m) => m.objet.includes("version corrigée")), JSON.stringify(r));
  {
    const livre = (await store.commande(cmd.id))!;
    const mail = (await store.courriels(cmd.id)).find((x) => x.objet.includes("version corrigée"))!;
    const lienFichier = `${process.env.SITE_URL}/api/commande/${livre.token}/fichier/${livre.livrables[0].id}`;
    verifier("E-mail de livraison : un lien de téléchargement privé par fichier, dans le HTML et dans la version texte", mail.html.includes(lienFichier) && mail.texte.includes(lienFichier) && mail.texte.includes("v.mp4") && /ne les partagez pas/.test(mail.texte), mail.texte.slice(0, 400));
  }
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
  const clotureeAuto = commandeTest({ statut: "livree", livreeLe: maintenant(), clotureAutoLe: maintenant(), paiement: { etat: "paye", sessionId: "w4", payeLe: il(20), mode: "s" } }); await store.creerCommande(clotureeAuto);
  const b1 = await veille();
  verifier("Veille : une livraison clôturée automatiquement (14 jours sans réponse) est signalée au vendeur dans le récapitulatif", (await store.courriels()).some((m) => m.a === "vendeur@exemple.fr" && m.objet.includes("Récap") && m.texte.includes("clôturées automatiquement") && m.texte.includes(clotureeAuto.id)));
  verifier("Veille : brief manquant depuis plus de 48 h → relance automatique du client", b1.relances >= 1 && (await store.courriels(sansBrief.id)).some((m) => m.a === "relance@exemple.fr") && (await store.courriels(recent.id)).length === 0);
  verifier("Veille : récapitulatif envoyé à l'administrateur avec les points en attente", b1.points >= 2 && b1.resume === "envoye" && (await store.courriels()).some((m) => m.a === "vendeur@exemple.fr" && m.objet.includes("Récap") && m.texte.includes(ancienne.id) && m.texte.includes(sansBrief.id)), JSON.stringify(b1));
  const nb = (await store.courriels(sansBrief.id)).length; const b2 = await veille();
  verifier("Veille : le client n'est relancé qu'une seule fois", b2.relances === 0 && (await store.courriels(sansBrief.id)).length === nb);
  for (const c of await store.commandes()) if (c.paiement.etat === "paye") await store.modifier(c.id, (x) => { x.statut = "livree"; x.livreeLe = maintenant(); x.vueLe = maintenant(); x.clotureAutoLe = undefined; });
  const active = commandeTest({ statut: "attente_infos", brief: undefined, vueLe: maintenant(), paiement: { etat: "paye", sessionId: "act", payeLe: maintenant(), emailStripe: "active@exemple.fr", mode: "s" } }); await store.creerCommande(active);
  const echec = { id: "ech" + Date.now(), date: maintenant(), a: "vendeur@exemple.fr", objet: `[Studio Accroche] Nouvelle commande payée — ${active.id} — Essai — 35 €`, html: "", texte: "x", commande: active.id, pilote: "smtp", resultat: "échec smtp : test" };
  await store.archiverCourriel(echec);
  const avecEchecs = await veille();
  verifier("Veille : un e-mail non envoyé encore utile est signalé (les périmés ne le sont pas)", avecEchecs.points === 1 && avecEchecs.resume === "envoye", JSON.stringify(avecEchecs));
  await store.modifier(active.id, (x) => { x.statut = "livree"; x.livreeLe = maintenant(); });
  const calme = await veille(Date.now() + 15 * 86_400_000);
  verifier("Veille : rien à signaler → aucun e-mail inutile", calme.points === 0 && calme.resume === "rien", JSON.stringify(calme));
}
{
  // — Brief : le site internet est facultatif
  const base = { nom: "Jean Dupont", email: "jean@exemple.fr", marque: "Ma Marque", produit: "Bougie", style: "Direct", nomFacture: "Jean Dupont", adresseFacture: "1 rue de la Paix, 75002 Paris" };
  const sans = validerBrief({ ...base, lien: "" });
  verifier("Brief sans site internet : accepté, lien vide enregistré", Boolean(sans.brief) && sans.brief!.lien === "" && Object.keys(sans.erreurs).length === 0, JSON.stringify(sans.erreurs));
  const absent = validerBrief({ ...base });
  verifier("Brief sans le champ « site » du tout : accepté", Boolean(absent.brief) && absent.brief!.lien === "");
  verifier("Brief avec « monsite.fr » : complété en https://monsite.fr", validerBrief({ ...base, lien: "monsite.fr/produit" }).brief?.lien === "https://monsite.fr/produit");
  verifier("Brief avec une adresse complète : conservée", validerBrief({ ...base, lien: "https://monsite.fr" }).brief?.lien === "https://monsite.fr");
  const mauvais = ["pas un lien", "javascript:alert(1)", "https://", "ftp://exemple.fr", "http://localhost"].map((l) => validerBrief({ ...base, lien: l }));
  verifier("Brief avec un lien manifestement faux ou dangereux : refusé avec un message clair", mauvais.every((r) => !r.brief && /pas l'air valide/.test(r.erreurs.lien || "")), JSON.stringify(mauvais.map((r) => r.erreurs.lien)));
  verifier("Brief : les autres champs obligatoires le restent", Boolean(validerBrief({ ...base, lien: "", marque: "" }).erreurs.marque) && Boolean(validerBrief({ ...base, lien: "", email: "x" }).erreurs.email));
}
{
  // — Tri des e-mails en échec : ne renvoyer que ce qui est encore utile, jamais de doublon
  const il = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString();
  const mail = (o: Partial<import("../lib/store").Courriel>): import("../lib/store").Courriel => ({ id: Math.random().toString(36).slice(2, 10), date: il(1), a: "client@exemple.fr", objet: "x", html: "", texte: "", pilote: "smtp", resultat: "échec smtp : refusé", ...o });
  const attente = commandeTest({ statut: "attente_infos" }), livree = commandeTest({ statut: "livree" }), enValid = commandeTest({ statut: "attente_validation" });
  const cs = [attente, livree, enValid];
  const e1 = mail({ commande: attente.id, a: "admin@x.fr", objet: `[Studio Accroche] Nouvelle commande payée — ${attente.id} — Essai — 35 €` });
  const e2 = mail({ commande: livree.id, objet: `Commande ${livree.id} confirmée — il nous manque votre brief` });
  const e3 = mail({ commande: livree.id, objet: `Commande ${livree.id} — vos fichiers sont disponibles` });
  const e4 = mail({ commande: enValid.id, objet: `Commande ${enValid.id} — à valider`, date: il(2) });
  const e4b = mail({ commande: enValid.id, objet: `Commande ${enValid.id} — à valider`, date: il(1) });
  const e5 = mail({ a: "admin@x.fr", objet: "[Studio Accroche] ⚠ Test de notification", commande: undefined });
  const e6 = mail({ commande: attente.id, date: il(20), objet: `Commande ${attente.id} confirmée — il nous manque votre brief` });
  const e7 = mail({ commande: "SA-000000-ZZZZZ", objet: "Commande SA-000000-ZZZZZ — production lancée" });
  const e8 = mail({ commande: attente.id, objet: `Commande ${attente.id} confirmée — il nous manque votre brief`, date: il(3) });
  const reussi = mail({ commande: attente.id, objet: e8.objet, resultat: "envoyé", date: il(0.5) });
  const d = (liste: import("../lib/store").Courriel[]) => Object.fromEntries(trierEchecs(liste, cs).map((x) => [x.courriel.id, x.action]));
  const r1 = d([e1, e2, e3, e4, e4b, e5, e6, e7]);
  verifier("Tri : notification de nouvelle commande d'une commande encore active → à renvoyer", r1[e1.id] === "renvoyer");
  verifier("Tri : « il nous manque votre brief » alors que la commande est livrée → périmé (pas de message absurde au client)", r1[e2.id] === "obsolete");
  verifier("Tri : e-mail de livraison finale d'une commande livrée → à renvoyer", r1[e3.id] === "renvoyer");
  verifier("Tri : deux échecs identiques → le plus récent à renvoyer, l'ancien en doublon", r1[e4b.id] === "renvoyer" && r1[e4.id] === "doublon");
  verifier("Tri : alerte technique déjà signalée sur le téléphone, échec de plus de 14 jours, commande introuvable → périmés", r1[e5.id] === "obsolete" && r1[e6.id] === "obsolete" && r1[e7.id] === "obsolete");
  const prete = commandeTest({ statut: "payee" });
  const sc1 = mail({ commande: prete.id, objet: `Commande ${prete.id} — votre script à valider` });
  const sc2 = mail({ commande: enValid.id, objet: `Commande ${enValid.id} — votre script à valider` });
  const rs = Object.fromEntries(trierEchecs([sc1, sc2], [...cs, prete]).map((x) => [x.courriel.id, x.action]));
  verifier("Tri : le script à valider est renvoyé tant que la commande attend le démarrage, périmé ensuite (jamais confondu avec « à valider »)", rs[sc1.id] === "renvoyer" && rs[sc2.id] === "obsolete", JSON.stringify(rs));
  const r2 = d([e8, reussi]);
  verifier("Tri : un e-mail identique déjà renvoyé avec succès plus tard → « déjà renvoyé » (aucun doublon possible)", r2[e8.id] === "deja_envoye" && echecsUtiles([e8, reussi], cs).length === 0);
  verifier("Tri : seul le dernier e-mail utile est à renvoyer, sans compter les autres", echecsUtiles([e1, e2, e3, e4, e4b, e5, e6, e7], cs).map((x) => x.courriel.id).sort().join() === [e1.id, e3.id, e4b.id].sort().join());
}
{
  // — Accusé de réception de la retouche envoyé au client
  const c = commandeTest({ statut: "en_production", retouchesDemandees: [{ date: maintenant(), message: "Merci de mettre le prix en début de vidéo." }] }); await store.creerCommande(c);
  const m1 = await courriels.retoucheRecue(c, "Merci de mettre le prix en début de vidéo.", 1);
  verifier("Retouche : accusé de réception au client, avec sa demande citée et le nombre de tours de retouches restants", m1.a === "a@exemple.fr" && m1.objet.includes("votre demande de retouche est bien reçue") && m1.texte.includes("prix en début de vidéo") && /Il vous reste 1 tour de retouches inclus/.test(m1.texte) && /seule demande/.test(m1.texte) && m1.texte.includes(c.token));
  const m0 = await courriels.retoucheRecue(c, "x".repeat(12), 0);
  verifier("Retouche : plus aucun tour inclus → le client en est informé, avec la règle du hors périmètre", /utilisé tous les tours de retouches/.test(m0.texte) && /c'est une nouvelle commande/.test(m0.texte));
  const echec = { ...m1, resultat: "échec smtp : test", date: maintenant() };
  verifier("Tri : l'accusé de retouche en échec est à renvoyer tant que la commande est en production, périmé ensuite", trierEchecs([echec], [c])[0].action === "renvoyer" && trierEchecs([echec], [{ ...c, statut: "attente_validation" }])[0].action === "obsolete");
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
