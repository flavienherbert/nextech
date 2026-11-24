// Tests de bout en bout du parcours de commande, contre le site lancé avec le simulateur Stripe.
// Prérequis : site sur BASE, simulateur sur MOCK, DATA_DIR identique à celui du site.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE || "http://localhost:3000";
const MOCK = process.env.MOCK || "http://localhost:4242";
const DATA = path.resolve(process.env.DATA_DIR || "./data");
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_simulation";
const MDP = process.env.ADMIN_PASSWORD || "demonstration";
const CAPTURES = process.env.CAPTURES || "";
// Contrat de prix et de retouches décidé le 22 novembre 2026. lib/formules.ts est la source unique : en changer une valeur impose de changer celle-ci,
// et ce test le rappelle. Les montants sont en centimes.
const PRIX = { essai: 3500, test: 8900, campagne: 16900 };
const eur = (cents) => `${cents / 100}`;

const resultats = [];
const verifier = (nom, ok, detail = "") => { resultats.push({ nom, ok: Boolean(ok) }); console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
// Avec le stockage objet, l'état est recopié localement avant chaque lecture.
const rafraichir = () => { if (process.env.S3_BUCKET || process.env.DATABASE_URL) execFileSync(process.execPath, ["scripts/miroir-s3.mjs"], { env: process.env }); };
const commandes = () => rafraichir() ?? fs.existsSync(`${DATA}/commandes`) ? fs.readdirSync(`${DATA}/commandes`).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(`${DATA}/commandes/${f}`, "utf8"))) : [];
const commande = (id) => rafraichir() ?? JSON.parse(fs.readFileSync(`${DATA}/commandes/${id}.json`, "utf8"));
const courriels = (id) => rafraichir() ?? fs.existsSync(`${DATA}/courriels`) ? fs.readdirSync(`${DATA}/courriels`).map((f) => JSON.parse(fs.readFileSync(`${DATA}/courriels/${f}`, "utf8"))).filter((m) => m.commande === id) : [];
const signer = (corps, secret = SECRET, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex")}`;
const evenement = (type, session, id = `evt_test_${crypto.randomBytes(6).toString("hex")}`) => JSON.stringify({ id, object: "event", type, livemode: false, created: Math.floor(Date.now() / 1000), data: { object: session } });
const webhook = (corps, signature) => fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signature }, body: corps });
const session = async (id) => (await fetch(`${MOCK}/v1/checkout/sessions/${id}`)).json();
const cap = async (page, nom) => { if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: true }); };

// Crée une commande sans la payer (le client s'arrête sur la page de paiement).
async function commandeNonPayee(formule = "essai") {
  const avant = new Set(commandes().map((c) => c.id));
  const corps = new URLSearchParams({ formule, cgv: "oui", ia: "oui", pro: "oui", entreprise: "Société Test SARL" }); // offre réservée aux professionnels
  const r = await fetch(`${BASE}/api/checkout`, { method: "POST", body: corps, redirect: "manual" });
  const c = commandes().find((x) => !avant.has(x.id));
  return { c, redirection: r.headers.get("location"), statut: r.status };
}

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const erreursConsole = [];
page.on("pageerror", (e) => erreursConsole.push(e.message));

// ───────────── 1. Parcours client complet ─────────────
console.log("\n— Parcours client —");
await page.goto(BASE);
verifier("Accueil : trois formules avec prix", (await page.locator(".formule").count()) === 3 && (await page.locator(".formule .prix").allTextContents()).join("|").replace(/ | /g, " ") === Object.values(PRIX).map((c) => `${eur(c)} €`).join("|"), (await page.locator(".formule .prix").allTextContents()).join("|"));
{
  // Cohérence des textes commerciaux de l'accueil et des conditions de vente avec le catalogue
  const norm = (t) => t.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ");
  const accueil = norm(await page.locator("body").innerText());
  verifier("Accueil : « jusqu'à 15 secondes » dans chaque formule, jamais « 15 à 20 » ni « 10 à 15 », aucun ancien prix", (accueil.match(/jusqu'à 15 secondes/g) || []).length >= 3 && !/15 secondes maximum|15 à 20|10 à 15|20 secondes/.test(accueil) && !/(^|[^\d])(25|69|129) €/.test(accueil), accueil.match(/.{20}(15 à 20|10 à 15|(25|69|129) €).{20}/)?.[0]);
  verifier("Accueil : fourchette de prix et délais lus dans le catalogue", accueil.includes("De 35 € à 169 € selon la formule") && accueil.includes("Essai 48 h, Pack Accroches 3 jours, Pack Campagne 5 jours"));
  verifier("Accueil : 1 / 2 / 2 tours de retouches dans les trois formules", (await page.locator(".formule").allInnerTexts()).map((t) => t.match(/(\d) tours? de retouches/)?.[1]).join("/") === "1/2/2");
  // Refonte du 23 novembre 2026 : ouverture, formules, illustrations, vidéo d'exemple, bandeau, FAQ, métadonnées
  const h1 = norm(await page.locator("h1").innerText());
  verifier("Ouverture : titre « Des pubs vidéo avec présentateur IA pour votre boutique. », accroche « Trois secondes pour arrêter un pouce. » conservée", h1 === "Des pubs vidéo avec présentateur IA pour votre boutique." && accueil.includes("Trois secondes pour arrêter un pouce."), h1);
  verifier("Ouverture : bouton principal vers les formules, bouton secondaire vers l'Essai", (await page.locator(".hero-actions a").first().getAttribute("href")) === "#formules" && (await page.locator(".hero-actions a").nth(1).getAttribute("href")) === "/commander/essai");
  verifier("Ouverture : plus de photographie de tournage, une maquette de téléphone à la place", (await page.locator(".hero img, .hero video, .hero picture").count()) === 0 && (await page.locator(".hero .maquette").count()) === 1);
  verifier("Formules : un seul badge « Recommandé », sur le Pack Accroches ; « Pack Test » et « Le plus utile pour tester » n'existent plus", (await page.locator(".formule .badge").allTextContents()).join() === "Recommandé" && (await page.locator(".formule.formule-avant h3").innerText()) === "Pack Accroches" && !/Pack Test|Le plus utile pour tester/.test(accueil) && accueil.includes("Trois accroches pour trouver celle qui vend."));
  verifier("Illustrations : plus de badge « Illustration », ni de paragraphe répétant que ce ne sont pas nos vidéos, une seule mention discrète en bas de page", (await page.locator(".etiquette-illustration").count()) === 0 && (accueil.match(/illustration/gi) || []).length === 1 && (await page.locator(".pied .pied-note").innerText()) === "Photographies d'illustration." && !/ce ne sont pas\s+des extraits/.test(accueil), String((accueil.match(/illustration/gi) || []).length));
  verifier("Vidéo d'exemple : section absente tant que SHOW_EXAMPLE_VIDEO n'est pas activé, sans texte de remplacement, ni lecteur YouTube, ni « Exemple externe »", (await page.locator("#demonstration").count()) === 0 && (await page.locator("iframe").count()) === 0 && (await page.locator('.navigation a[href="#demonstration"]').count()) === 0 && !/Exemple externe|autre studio|YouTube|Emplacement réservé|en cours de production|Slow Machine/.test(accueil));
  verifier("Bandeau de préproduction affiché (SITE_ENV=preprod dans cet environnement de test)", (await page.locator(".bandeau-mode").count()) === 1);
  {
    const questions = await page.locator("#questions details summary").allTextContents();
    const attendues = ["Quels produits acceptez-vous ?", "Combien de photos faut-il envoyer ?", "En combien de temps je reçois mes vidéos ?", "Et si le rendu ne me plaît pas ?", "Puis-je utiliser les vidéos en publicité payante ?", "Pourquoi la mention « générée par IA » ?"];
    attendues.push("Je suis un particulier, puis-je commander ?");
    verifier("FAQ : accordéon de 11 questions sans doublon, avec produits, particuliers, photos, délais, retouches, publicité payante et mention IA", questions.length === 11 && new Set(questions).size === 11 && attendues.every((q) => questions.includes(q)) && (await page.locator("#questions details[name=faq]").count()) === 11, questions.join(" | "));
    const reponses = norm(await page.locator("#questions").evaluate((e) => [...e.querySelectorAll("details")].map((d) => d.textContent).join(" ")));
    const texteDe = async (motif) => norm(await page.locator("#questions details", { hasText: motif }).evaluate((e) => e.textContent)); // textContent : la réponse d'une question fermée n'est pas « rendue »
    const rep = await texteDe("Je suis un particulier");
    const retract = await texteDe("droit de rétractation");
    verifier("FAQ : « Je suis un particulier, puis-je commander ? » → non, offre réservée aux professionnels ; rétractation : ne s'applique pas aux professionnels", /Non\. L'offre est réservée aux professionnels/.test(rep) && /réservée aux professionnels, le droit de rétractation prévu pour les consommateurs ne s'applique pas/.test(retract), rep + " || " + retract);
    verifier("Offre réservée aux professionnels : mention sous les cartes de formules et en bas de page", norm(await page.locator("#formules .mention-pro").innerText()) === "Offre réservée aux professionnels." && norm(await page.locator(".pied").innerText()).includes("Offre réservée aux professionnels"));
    verifier("FAQ : réponses alignées sur le catalogue (délais, retouches, durée, photos, droits publicitaires)", reponses.includes("Essai 48 h, Pack Accroches 3 jours, Pack Campagne 5 jours") && reponses.includes("1 pour Essai, 2 pour Pack Accroches, 2 pour Pack Campagne") && reponses.includes("jusqu'à 15 secondes") && reponses.includes("3 à 5 photos nettes") && reponses.includes("droits d'exploitation publicitaire"));
  }
  {
    const html = await (await fetch(BASE)).text();
    const balise = (re) => html.match(re)?.[1];
    verifier("Référencement : titre et description en français, image de partage absolue (adresse du site), favicon et icône d'application", /Studio Accroche — Publicités vidéo avec présentateur IA/.test(balise(/<title>([^<]*)<\/title>/) || "") && /présentateur généré par IA/.test(balise(/<meta name="description" content="([^"]*)"/) || "") && (balise(/<meta property="og:image" content="([^"]*)"/) || "") === `${BASE}/media/og-studio-accroche.jpg` && /rel="icon"[^>]*href="\/favicon\.ico/.test(html) && /rel="icon"[^>]*href="\/icon\.svg/.test(html) && /rel="apple-touch-icon"/.test(html), html.match(/<meta property="og:image"[^>]*>/)?.[0]);
    const og = await fetch(`${BASE}/media/og-studio-accroche.jpg`);
    verifier("Image de partage servie (JPEG)", og.status === 200 && /image\/jpeg/.test(og.headers.get("content-type") || "") && (await og.arrayBuffer()).byteLength > 20000);
    const ml = norm(await (await fetch(`${BASE}/mentions-legales`)).text().then((h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&amp;/g, "&")));
    verifier("Mentions légales : éditeur, micro-entreprise, SIRET, adresse, téléphone, e-mail, hébergeur Netlify avec son adresse, TVA non applicable (article 293 B), plus de médiation de la consommation", ["micro-entreprise", "SIRET : 00000000000000", "Adresse : 1 rue du Test, 00000 Testville", "Téléphone : 01 99 00 12 34", "contactstudioaccroche@gmail.com", "Netlify, Inc.", "101 2nd Street, San Francisco", "TVA non applicable, article 293 B du CGI"].every((t) => ml.includes(t)) && !/édiation|médiateur/.test(ml), ml.slice(0, 400));
    verifier("Pied de page : adresse de contact lue dans la configuration (app/config.ts)", accueil.includes("Contact : contactstudioaccroche@gmail.com") && html.includes("mailto:contactstudioaccroche@gmail.com"));
  }
  const cg = await ctx.newPage();
  await cg.goto(`${BASE}/cgv`);
  const cgv = norm(await cg.locator("body").innerText());
  verifier("Conditions de vente : prix, durée (jusqu'à 15 secondes) et tours de retouches identiques au catalogue", [`Essai — 35 €`, `Pack Accroches — 89 €`, `Pack Campagne — 169 €`, "1 vidéo, jusqu'à 15 secondes, 1 tour de retouches", "3 vidéos, jusqu'à 15 secondes chacune, 2 tours de retouches", "6 vidéos, jusqu'à 15 secondes chacune, 2 tours de retouches"].every((t) => cgv.includes(t)) && !/retouches? par vidéo|15 à 20|10 à 15/.test(cgv), cgv.match(/Essai — .{0,160}/)?.[0]);
  verifier("Conditions de vente : clause « Offre réservée aux professionnels », droit de rétractation et médiation de la consommation écartés, plus aucune clause consommateur", /Offre réservée aux professionnels\. L'offre du studio s'adresse exclusivement aux professionnels/.test(cgv) && /case, commander en tant que professionnel pour les besoins de son activité/.test(cgv) && /Les dispositions du Code de la consommation propres aux consommateurs, notamment le droit de rétractation et la médiation de la consommation, ne s'appliquent donc pas/.test(cgv) && !/médiateur|L221-28|client consommateur|professionnel ou consommateur|droits que la loi reconnaît aux consommateurs/.test(cgv), cgv.slice(0, 600));
  verifier("Conditions de vente : définition d'un tour (demande consolidée), hors périmètre = nouvelle commande, durée supérieure non proposée", /Un tour de retouches est une seule demande, qui regroupe toutes vos remarques sur l'ensemble des vidéos livrées/.test(cgv) && /changement de produit, de brief, de script validé, de présentateur, d'angle ou de durée n'est pas une retouche/.test(cgv) && /Une durée supérieure n'est pas proposée à ce jour/.test(cgv));
  await cg.close();
}
await page.locator('.formule a[href="/commander/accroches"]').click();
await page.waitForURL("**/commander/accroches");
verifier(`Clic sur « Pack Accroches » → page de commande à ${eur(PRIX.test)} €`, (await page.locator(".total strong").textContent()).includes(eur(PRIX.test)));
await cap(page, "02-commander");
await page.locator('button[type="submit"]').click();
verifier("Paiement refusé tant que les cases ne sont pas cochées et le nom de l'entreprise absent", page.url().includes("/commander/accroches"));
{
  // Offre réservée aux professionnels : la page de commande, côté navigateur puis côté serveur
  const norm2 = (t) => t.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ");
  const corps = norm2(await page.locator(".recap").innerText());
  verifier("Commande : mention « Offre réservée aux professionnels », case « Je commande en tant que professionnel, pour les besoins de mon activité. » obligatoire, nom de l'entreprise obligatoire, SIRET facultatif", /offre réservée aux professionnels/i.test(corps) && corps.includes("Je commande en tant que professionnel, pour les besoins de mon activité.") && (await page.locator('input[name="pro"]').getAttribute("required")) !== null && (await page.locator('input[name="entreprise"]').getAttribute("required")) !== null && (await page.locator('input[name="siret"]').getAttribute("required")) === null && corps.includes("Nom de l'entreprise *") && /SIRET\s*\(facultatif\)/.test(corps), corps.slice(0, 300));
  const poster = (champs) => fetch(`${BASE}/api/checkout`, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ formule: "essai", cgv: "oui", ia: "oui", ...champs }) });
  const dest = async (champs) => (await poster(champs)).headers.get("location") || "";
  const nb0 = commandes().length;
  const refus = [await dest({ entreprise: "Société Test" }), await dest({ pro: "oui" }), await dest({ pro: "oui", entreprise: "A" }), await dest({ pro: "oui", entreprise: "Société Test", siret: "123" }), await dest({ pro: "oui", entreprise: "Société Test", siret: "1234567890123X" }), await dest({ pro: "oui", entreprise: "Société Test", cgv: "non" })];
  verifier("Côté serveur : sans la case « professionnel » (erreur=pro), sans nom d'entreprise (erreur=entreprise), avec un SIRET invalide (erreur=siret) ou sans les conditions, le paiement est refusé et aucune commande n'est créée", /erreur=pro/.test(refus[0]) && /erreur=entreprise/.test(refus[1]) && /erreur=entreprise/.test(refus[2]) && /erreur=siret/.test(refus[3]) && /erreur=siret/.test(refus[4]) && /erreur=conditions/.test(refus[5]) && commandes().length === nb0, refus.join(" | "));
  await page.goto(`${BASE}/commander/accroches?erreur=siret&entreprise=${encodeURIComponent("Société Test")}&siret=123`);
  verifier("Commande : le message d'erreur du SIRET s'affiche et les valeurs saisies sont conservées", (await page.locator(".avis-erreur").innerText()).includes("14 chiffres") && (await page.locator('input[name="entreprise"]').inputValue()) === "Société Test" && (await page.locator('input[name="siret"]').inputValue()) === "123");
  await page.goto(`${BASE}/commander/accroches?erreur=pro`);
  verifier("Commande : le refus sans la case « professionnel » est expliqué", (await page.locator(".avis-erreur").innerText()).includes("réservée aux professionnels"));
  await page.goto(`${BASE}/commander/accroches`);
}
await page.fill('input[name="entreprise"]', "Exemple Marque SAS"); await page.fill('input[name="siret"]', "123 456 789 00012");
await page.check('input[name="pro"]'); await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
const avant = new Set(commandes().map((c) => c.id));
await page.locator('button[type="submit"]').click();
await page.waitForURL(`${MOCK}/pay/**`);
verifier("Redirection vers la page de paiement", true);
let c = commandes().find((x) => !avant.has(x.id));
verifier("Commande créée avec un numéro unique, non payée", c && /^SA-\d{6}-[A-Z0-9]{5}$/.test(c.id) && c.paiement.etat === "en_attente" && c.statut === "attente_paiement", JSON.stringify(c?.id));
verifier("Commande : nom de l'entreprise, SIRET (sans espaces) et déclaration « professionnel » enregistrés avec la commande et tracés dans l'historique", c.entreprise === "Exemple Marque SAS" && c.siret === "12345678900012" && Boolean(c.professionnelDeclareLe) && c.historique.some((h) => /Client déclaré professionnel, pour les besoins de son activité : Exemple Marque SAS \(SIRET 12345678900012\)/.test(h.evenement)), JSON.stringify([c.entreprise, c.siret, c.professionnelDeclareLe]));
verifier(`Montant envoyé à Stripe = ${PRIX.test} centimes`, (await session(c.paiement.sessionId)).amount_total === PRIX.test);
for (const [id, cents] of Object.entries(PRIX)) {
  const x = await commandeNonPayee(id);
  const sx = await session(x.c.paiement.sessionId);
  verifier(`Stripe : la formule « ${id} » est facturée exactement ${cents} centimes en euros, et la commande enregistre le même montant`, x.c.montantCents === cents && sx.amount_total === cents && sx.currency === "eur", JSON.stringify([x.c.montantCents, sx.amount_total, sx.currency]));
}
await page.fill('input[name="email"]', "marie@exemple-marque.fr");
await page.click('button[value="payer"]');
await page.waitForURL(`${BASE}/commande/**`);
await page.waitForSelector("form.formulaire", { timeout: 15000 });
verifier("Retour sur le site après paiement, formulaire de brief affiché", true);
c = commande(c.id);
verifier("Commande marquée payée par le webhook", c.paiement.etat === "paye" && c.statut === "attente_infos" && c.paiement.emailStripe === "marie@exemple-marque.fr");
let m = courriels(c.id);
verifier("E-mail de confirmation rédigé pour le client", m.some((x) => x.a === "marie@exemple-marque.fr" && x.objet.includes(c.id) && x.texte.includes("/commande/" + c.token)));
verifier("Notification de paiement rédigée pour l'administrateur", m.some((x) => x.objet.includes("Nouvelle commande payée") && x.objet.includes(eur(PRIX.test)) && x.texte.includes("Pack Accroches")));
await cap(page, "03-brief");

// Brief : validation des champs, dépôt de fichiers
await page.click('form.formulaire button[type="submit"]');
await page.waitForSelector(".champ-erreur");
verifier("Brief incomplet refusé avec messages d'erreur (le nom à facturer est déjà rempli depuis la commande)", (await page.locator(".champ-erreur").count()) >= 5);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
await page.setInputFiles("#depot", [{ name: "produit-face.png", mimeType: "image/png", buffer: png }, { name: "logo.png", mimeType: "image/png", buffer: png }]);
await page.waitForFunction(() => document.querySelectorAll(".depots li").length === 2);
verifier("Deux fichiers déposés et listés", true);
await page.setInputFiles("#depot", [{ name: "virus.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") }]);
await page.waitForSelector(".avis-erreur");
verifier("Fichier au format interdit refusé", (await page.locator(".avis-erreur").textContent()).includes("Format non accepté"));
await page.setInputFiles("#depot", [{ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("MZ\x90\x00 ceci n'est pas une image") }]);
await page.waitForFunction(() => document.querySelector(".avis-erreur")?.textContent.includes("contenu"));
verifier("Fichier déguisé (extension image, contenu différent) refusé", (await page.locator(".depots li").count()) === 2);
await page.fill('input[name="nom"]', "Marie Durand");
await page.fill('input[name="marque"]', "Exemple Marque");
await page.fill('input[name="telephone"]', "06 00 00 00 00");
verifier("Brief : le nom à facturer et le SIRET saisis à la commande sont déjà remplis", (await page.locator('input[name="nomFacture"]').inputValue()) === "Exemple Marque SAS" && (await page.locator('input[name="sirenClient"]').inputValue()) === "12345678900012");
await page.fill('textarea[name="adresseFacture"]', "12 rue de l'Exemple\n75000 Paris");
await page.fill('input[name="lien"]', "https://exemple-marque.fr/produits/gourde");
await page.fill('input[name="produit"]', "Gourde inox 750 ml");
await page.selectOption('select[name="style"]', "Complice");
await page.fill('textarea[name="cible"]', "Actifs de 25 à 40 ans, au bureau et en déplacement.");
await page.fill('textarea[name="arguments"]', "Zéro fuite.\nGarde le froid 24 h.\n<script>alert(1)</script>");
await page.fill('textarea[name="aEviter"]', "Ne pas citer de concurrent.");
await page.click('form.formulaire button[type="submit"]');
await page.waitForSelector(".jalons");
c = commande(c.id);
verifier("Brief enregistré, commande « Payée — brief reçu »", c.statut === "payee" && c.brief.marque === "Exemple Marque" && c.fichiersClient.length === 2);
m = courriels(c.id);
const notif = m.find((x) => x.objet.includes("Brief reçu"));
verifier("Notification admin : client, formule, montant, brief, fichiers, numéro", notif && ["Marie Durand", "Pack Accroches", eur(PRIX.test), "Gourde inox 750 ml", "produit-face.png", c.id].every((s) => notif.texte.includes(s)), notif?.texte.slice(0, 200));
verifier("Contenu saisi par le client échappé dans l'e-mail HTML", notif && !notif.html.includes("<script>alert(1)</script>") && notif.html.includes("&lt;script&gt;"));
verifier("Accusé de réception du brief rédigé pour le client", m.some((x) => x.a === "marie@exemple-marque.fr" && x.objet.includes("brief bien reçu")));
await cap(page, "04-suivi");
const tokenClient = c.token, idCommande = c.id;

// ───────────── 2. Administration ─────────────
console.log("\n— Espace administrateur —");
const adminCtx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const admin = await adminCtx.newPage();
await admin.goto(`${BASE}/admin`);
verifier("Accès à /admin sans session → page de connexion", admin.url().endsWith("/admin/connexion"));
await admin.goto(`${BASE}/admin/commande/${idCommande}`);
verifier("Accès direct à une commande sans session → connexion, avec retour prévu sur cette commande", admin.url().includes("/admin/connexion?suite=") && decodeURIComponent(admin.url()).endsWith(`suite=/admin/commande/${idCommande}`), admin.url());
verifier("Fichier client inaccessible sans session admin (401)", (await fetch(`${BASE}/api/admin/fichier/${idCommande}/${c.fichiersClient[0].id}`)).status === 401);
await admin.fill('input[name="motdepasse"]', "mauvais-mot-de-passe"); await admin.click('button[type="submit"]');
await admin.waitForURL(/erreur=refus/);
verifier("Mauvais mot de passe refusé", true);
await admin.fill('input[name="motdepasse"]', MDP); await admin.click('button[type="submit"]');
await admin.waitForURL(`${BASE}/admin/commande/${idCommande}`);
verifier("Connexion depuis le lien d'une notification : retour direct sur la commande demandée", (await admin.locator("h1").first().textContent()).includes(idCommande));
await admin.goto(`${BASE}/admin`);
verifier("Connexion administrateur", (await admin.locator(".tableau").textContent()).includes(idCommande));
{
  const cookie = (await adminCtx.cookies()).find((k) => k.name === "sa_admin");
  verifier("Cookie de session : HttpOnly, SameSite, valable 7 jours au plus", cookie.httpOnly && cookie.sameSite === "Lax" && cookie.expires - Date.now() / 1000 <= 7 * 86400 + 60 && cookie.expires - Date.now() / 1000 > 6 * 86400, JSON.stringify(cookie));
}
await cap(admin, "05-admin-liste");
await admin.click(`a[href="/admin/commande/${idCommande}"]`);
await admin.waitForSelector(".admin-grille");
const texteDetail = await admin.locator(".admin-grille").textContent();
verifier("Détail : brief complet et fichiers visibles", ["Marie Durand", "Exemple Marque", "Zéro fuite", "produit-face.png", "logo.png"].every((s) => texteDetail.includes(s)));
const [dl] = await Promise.all([admin.waitForEvent("download"), admin.locator(`a[href^="/api/admin/fichier/${idCommande}/"]`).first().click()]);
verifier("L'administrateur télécharge un fichier du client", dl.suggestedFilename() === "produit-face.png");

await admin.selectOption('select[name="statut"]', "attente_validation");
await admin.locator('form:has(select[name="statut"]) button').click();
await admin.waitForSelector(".avis-erreur");
verifier("Livraison impossible sans livrable", commande(idCommande).statut === "payee");
await admin.selectOption('select[name="statut"]', "en_production");
await admin.locator('form:has(select[name="statut"]) button').click();
await admin.waitForURL("**?ok=statut");
verifier("Statut « En production » + e-mail au client", commande(idCommande).statut === "en_production" && courriels(idCommande).some((x) => x.objet.includes("production lancée")));
const video = Buffer.concat([Buffer.from("00000018667479706d703432", "hex"), crypto.randomBytes(3 * 1024 * 1024)]);
await admin.setInputFiles("#livrable", { name: "exemple-marque-accroche-A.mp4", mimeType: "video/mp4", buffer: video });
await admin.waitForSelector('.telechargements a:has-text("Voir")');
verifier("Livrable ajouté par l'administrateur", commande(idCommande).livrables.length === 1);
const idLivrable = commande(idCommande).livrables[0].id;
verifier("Livrable non téléchargeable par le client avant mise en validation (404)", (await fetch(`${BASE}/api/commande/${tokenClient}/fichier/${idLivrable}`)).status === 404);
await admin.selectOption('select[name="statut"]', "attente_validation");
await admin.locator('form:has(select[name="statut"]) button').click();
await admin.waitForSelector(".admin-tete .etat-attente_validation");
verifier("Statut « En attente de validation » + e-mail « à valider »", commande(idCommande).statut === "attente_validation" && courriels(idCommande).some((x) => x.objet.includes("à valider")));
await cap(admin, "06-admin-detail");

// ───────────── 3. Validation et livraison ─────────────
console.log("\n— Validation et livraison —");
await page.reload();
await page.waitForSelector(".telechargements");
const r = await fetch(`${BASE}/api/commande/${tokenClient}/fichier/${idLivrable}`);
const recu = Buffer.from(await r.arrayBuffer());
verifier("Le client télécharge sa vidéo par son lien privé, fichier intact (3 Mo)", r.status === 200 && recu.equals(video) && r.headers.get("content-disposition").includes("attachment"));
verifier("Lien de téléchargement inutilisable avec un autre jeton (404)", (await fetch(`${BASE}/api/commande/${"a".repeat(48)}/fichier/${idLivrable}`)).status === 404);
await page.click("text=Demander un tour de retouches");
await page.fill(".validation textarea", "Merci de raccourcir l'accroche de la première vidéo.");
await page.click("text=Envoyer ma demande");
await page.waitForSelector(".jalons li.courant:has-text('En production')");
verifier("Retouche demandée → retour en production + e-mail admin", commande(idCommande).statut === "en_production" && courriels(idCommande).some((x) => x.objet.includes("Retouche demandée") && x.texte.includes("raccourcir")));
await admin.goto(`${BASE}/admin/commande/${idCommande}`);
await admin.selectOption('select[name="statut"]', "attente_validation");
await admin.locator('form:has(select[name="statut"]) button').click();
await admin.waitForSelector(".admin-tete .etat-attente_validation");
await page.reload();
await page.click("text=Je valide la livraison");
await page.waitForSelector("h1:has-text('livrée')");
c = commande(idCommande);
verifier("Validation par le client → « Livrée » + e-mails de livraison", c.statut === "livree" && c.valideeLe && courriels(idCommande).some((x) => x.objet.includes("fichiers sont disponibles")) && courriels(idCommande).some((x) => x.objet.includes("Commande validée")));
await cap(page, "07-livree");

// ───────────── 4. Fausses confirmations et webhooks ─────────────
console.log("\n— Protection contre les fausses confirmations —");
const f1 = await commandeNonPayee("campagne");
verifier("Nouvelle commande non payée créée (redirection 303 vers le paiement)", f1.statut === 303 && f1.redirection.startsWith(MOCK) && f1.c.paiement.etat === "en_attente");
await page.goto(`${BASE}/commande/${f1.c.token}?retour=paiement`);
await page.waitForSelector(".attente");
verifier("Arriver sur la page de retour sans avoir payé n'affiche pas le formulaire", (await page.locator("form.formulaire").count()) === 0);
await cap(page, "08-fausse-confirmation");
verifier("Envoi d'un brief sans paiement refusé (403)", (await fetch(`${BASE}/api/commande/${f1.c.token}/brief`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: "X" }) })).status === 403);
const demande = (token, corps) => fetch(`${BASE}/api/commande/${token}/fichiers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
verifier("Dépôt de fichier sans paiement refusé (403)", (await demande(f1.c.token, { nom: "a.png", type: "image/png", taille: png.length })).status === 403);

const s1 = await session(f1.c.paiement.sessionId);
const faux = evenement("checkout.session.completed", { ...s1, payment_status: "paid", status: "complete" });
verifier("Webhook sans signature refusé (400)", (await webhook(faux, "")).status === 400);
verifier("Webhook avec signature inventée refusé (400)", (await webhook(faux, `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`)).status === 400);
verifier("Webhook signé avec un autre secret refusé (400)", (await webhook(faux, signer(faux, "whsec_autre_secret"))).status === 400);
verifier("Webhook bien signé mais daté d'une heure refusé (400, anti-rejeu)", (await webhook(faux, signer(faux, SECRET, Math.floor(Date.now() / 1000) - 3600))).status === 400);
const corpsModifie = faux.replace(`"amount_total":${PRIX.campagne}`, '"amount_total":100');
verifier("Corps modifié après signature refusé (400)", (await webhook(corpsModifie, signer(faux))).status === 400);
let rep = await (await webhook(faux, signer(faux))).json();
verifier("Webhook correctement signé mais session non payée chez Stripe : non appliqué", rep.applique === false && /non abouti/.test(rep.motif), JSON.stringify(rep));
verifier("La commande reste non payée après toutes ces tentatives", commande(f1.c.id).paiement.etat === "en_attente" && courriels(f1.c.id).length === 0);

// Montant falsifié côté Stripe
const f2 = await commandeNonPayee("essai");
await fetch(`${MOCK}/_test/modifier`, { method: "POST", body: JSON.stringify({ session: f2.c.paiement.sessionId, patch: { payment_status: "paid", status: "complete", amount_total: 100 } }) });
const ev2 = evenement("checkout.session.completed", await session(f2.c.paiement.sessionId));
rep = await (await webhook(ev2, signer(ev2))).json();
verifier("Session payée mais montant différent du prix : non appliqué", rep.applique === false && /montant/.test(rep.motif) && commande(f2.c.id).paiement.etat === "en_attente", JSON.stringify(rep));

// Session d'une autre commande
const f3 = await commandeNonPayee("essai"); const f4 = await commandeNonPayee("essai");
await fetch(`${MOCK}/_test/modifier`, { method: "POST", body: JSON.stringify({ session: f4.c.paiement.sessionId, patch: { payment_status: "paid", status: "complete" } }) });
const s4 = await session(f4.c.paiement.sessionId);
const ev3 = evenement("checkout.session.completed", { ...s4, metadata: { commande: f3.c.id }, client_reference_id: f3.c.id });
rep = await (await webhook(ev3, signer(ev3))).json();
verifier("Paiement d'une commande présenté pour une autre : non appliqué", rep.applique === false && commande(f3.c.id).paiement.etat === "en_attente", JSON.stringify(rep));

// Doublon : le même événement livré deux fois
const ev4 = evenement("checkout.session.completed", s4, "evt_test_doublon_" + crypto.randomBytes(4).toString("hex"));
const d1 = await (await webhook(ev4, signer(ev4))).json(); const d2 = await (await webhook(ev4, signer(ev4))).json();
verifier("Événement légitime appliqué une fois, ignoré la seconde (idempotence)", d1.applique === true && d2.doublon === true && commande(f4.c.id).paiement.etat === "paye" && courriels(f4.c.id).filter((x) => x.objet.includes("Nouvelle commande payée")).length === 1, JSON.stringify([d1, d2]));
const ev5 = evenement("checkout.session.completed", s4);
const d3 = await (await webhook(ev5, signer(ev5))).json();
verifier("Second événement pour une commande déjà payée : aucun e-mail en double", d3.applique === true && courriels(f4.c.id).filter((x) => x.objet.includes("confirmée")).length === 1);

// ───────────── 5. Annulation et expiration ─────────────
console.log("\n— Paiement annulé ou expiré —");
await page.goto(`${BASE}/commander/essai`);
await page.fill('input[name="entreprise"]', "Exemple Marque SAS"); await page.check('input[name="pro"]'); await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
const av = new Set(commandes().map((x) => x.id));
await page.locator('button[type="submit"]').click();
await page.waitForURL(`${MOCK}/pay/**`);
await page.click('button[value="annuler"]');
await page.waitForURL("**/commander/essai?annule=1");
const annulee = commandes().find((x) => !av.has(x.id));
verifier("Annulation : retour au site avec message, commande non payée, aucun e-mail", (await page.locator(".avis").first().textContent()).includes("rien n'a été débité") && annulee.paiement.etat === "en_attente" && courriels(annulee.id).length === 0);
await cap(page, "09-annulation");
await page.fill('input[name="entreprise"]', "Exemple Marque SAS"); await page.check('input[name="pro"]'); await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
const av2 = new Set(commandes().map((x) => x.id));
await page.locator('button[type="submit"]').click();
await page.waitForURL(`${MOCK}/pay/**`);
await page.click('button[value="expirer"]');
await page.waitForSelector("h1:has-text('non abouti')");
const expiree = commandes().find((x) => !av2.has(x.id));
verifier("Session expirée : commande annulée, page « paiement non abouti »", expiree.paiement.etat === "expire" && expiree.statut === "annulee");
const tardif = evenement("checkout.session.expired", s4);
await webhook(tardif, signer(tardif));
verifier("Un événement « expiré » tardif n'annule pas une commande payée", commande(f4.c.id).paiement.etat === "paye");

// ───────────── 6. Facture ─────────────
console.log("\n— Facturation —");
c = commande(idCommande);
verifier("Facture émise automatiquement à la livraison, numérotée", c.facture && /^(SPECIMEN|F)-\d{4}-0001$/.test(c.facture.numero), JSON.stringify(c.facture));
verifier("En préproduction, la facture est un spécimen hors série officielle", c.facture?.specimen === true && c.facture.numero.startsWith("SPECIMEN-"));
const cookies = (await adminCtx.cookies()).map((k) => `${k.name}=${k.value}`).join("; ");
const pdfR = await fetch(`${BASE}/api/admin/facture/${idCommande}`, { headers: { Cookie: cookies } });
const pdf = Buffer.from(await pdfR.arrayBuffer());
verifier("L'administrateur télécharge la facture en PDF", pdfR.status === 200 && pdf.subarray(0, 5).toString() === "%PDF-" && pdf.length > 1500);
if (CAPTURES) fs.writeFileSync(`${CAPTURES}/facture-specimen.pdf`, pdf);
{
  // Offre réservée aux professionnels : l'entreprise et le SIRET saisis à la commande figurent sur la facture
  let texte = null;
  try { const t = `/tmp/sa-facture-${process.pid}.pdf`; fs.writeFileSync(t, pdf); texte = execFileSync("pdftotext", ["-layout", t, "-"], { encoding: "utf8" }).replace(/\s+/g, " "); fs.rmSync(t, { force: true }); } catch { /* pdftotext absent */ }
  verifier(texte === null ? "Facture : entreprise et SIRET de la commande (texte du PDF non vérifié : pdftotext absent)" : "Facture : le nom de l'entreprise et le SIRET saisis à la commande y figurent", texte === null || (texte.includes("Exemple Marque SAS") && texte.includes("123 456 789 00012")), (texte || "").slice(0, 400));
}
verifier("Facture inaccessible sans session administrateur (401)", (await fetch(`${BASE}/api/admin/facture/${idCommande}`)).status === 401);
verifier("Un spécimen n'est jamais remis au client (404)", (await fetch(`${BASE}/api/commande/${tokenClient}/facture`)).status === 404);
verifier("Journal de la commande : émission tracée", c.historique.some((h) => h.evenement.includes(c.facture.numero)));
// Deuxième commande payée, avec brief, puis facture émise à la main : le numéro suit.
await admin.goto(`${BASE}/admin/commande/${f4.c.id}`);
verifier("Sans brief, la facture est bloquée et la raison est affichée", (await admin.locator(".admin-grille").textContent()).includes("brief non reçu"));
const briefApi = await fetch(`${BASE}/api/commande/${f4.c.token}/brief`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: "Paul Martin", email: "paul@exemple.fr", marque: "Deuxième", lien: "https://exemple.fr", produit: "Bougie", style: "Direct", nomFacture: "Paul Martin", adresseFacture: "3 place du Test, 69000 Lyon" }) });
await admin.reload();
await admin.click("text=Émettre la facture");
await admin.waitForURL("**?ok=facture");
verifier("Deuxième facture : numéro suivant, sans trou ni doublon", briefApi.status === 200 && /-0002$/.test(commande(f4.c.id).facture?.numero || ""), commande(f4.c.id).facture?.numero);
await admin.goto(`${BASE}/admin/commande/${f4.c.id}`);
verifier("Une commande n'a jamais deux factures", (await admin.locator("text=Émettre la facture").count()) === 0);

// ───────────── 7. Sécurité des fichiers et de l'administration ─────────────
console.log("\n— Sécurité —");
const rsv = await (await demande(f4.c.token, { nom: "x.png", type: "image/png", taille: 10 })).json().catch(() => ({}));
verifier("Dépôt fermé une fois le brief transmis (409)", (await demande(f4.c.token, { nom: "x.png", type: "image/png", taille: 10 })).status === 409, JSON.stringify(rsv));
const f5 = await commandeNonPayee("essai");
await fetch(`${MOCK}/_test/modifier`, { method: "POST", body: JSON.stringify({ session: f5.c.paiement.sessionId, patch: { payment_status: "paid", status: "complete" } }) });
const ev6 = evenement("checkout.session.completed", await session(f5.c.paiement.sessionId)); await webhook(ev6, signer(ev6));
verifier("Fichier trop volumineux refusé dès la demande (413)", (await demande(f5.c.token, { nom: "g.mp4", type: "video/mp4", taille: 41 * 1024 * 1024 })).status === 413);
verifier("Type non autorisé refusé dès la demande (415)", (await demande(f5.c.token, { nom: "page.html", type: "text/html", taille: 100 })).status === 415);
const aut = await (await demande(f5.c.token, { nom: "ok.png", type: "image/png", taille: png.length })).json();
const falsifie = aut.jeton.slice(0, -3) + (aut.jeton.endsWith("AAA") ? "BBB" : "AAA");
const conf = (token, jeton) => fetch(`${BASE}/api/commande/${token}/fichiers/confirmer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jeton }) });
verifier("Autorisation d'envoi falsifiée refusée (403)", (await conf(f5.c.token, falsifie)).status === 403);
verifier("Confirmation sans fichier réellement déposé refusée (409)", (await conf(f5.c.token, aut.jeton)).status === 409);
if (aut.direct) {
  const aut2 = await (await demande(f5.c.token, { nom: "type.png", type: "image/png", taille: png.length })).json();
  const rType = await fetch(aut2.url, { method: "PUT", headers: { "Content-Type": "text/html" }, body: png });
  const cType = rType.ok ? await conf(f5.c.token, aut2.jeton) : null;
  verifier("Fichier envoyé avec un autre type que celui annoncé : refusé à l'envoi ou à la confirmation", !rType.ok || cType.status === 415, `PUT ${rType.status}, confirmation ${cType?.status}`);
}
verifier("Autorisation d'une commande inutilisable sur une autre (403)", (await conf(f4.c.token, aut.jeton)).status !== 200);
if (!aut.direct) {
  verifier("Envoi au serveur sans autorisation valide refusé (403)", (await fetch(`${BASE}/api/depot/${"0".repeat(32)}?j=${falsifie}`, { method: "PUT", body: png })).status === 403);
  verifier("Envoi plus gros qu'annoncé refusé (413)", (await fetch(`${BASE}${aut.url}`, { method: "PUT", body: Buffer.concat([png, png, png]) })).status === 413);
}
console.log("\n— Pages d'erreur, diagnostic, tâche quotidienne —");
const r404 = await fetch(`${BASE}/cette-page-n-existe-pas`);
const t404 = await r404.text();
verifier("Page inexistante : 404 avec une page du site, en français", r404.status === 404 && /existe pas/.test(t404) && /Retour à l(&#x27;|&apos;|')accueil/.test(t404), String(r404.status));
verifier("Page inexistante : aucune trace technique (chemins, pile d'appels)", !/node_modules|at Object|\.tsx?:\d+|Error:/.test(t404));
verifier("Commande avec un faux lien : 404", (await fetch(`${BASE}/commande/${"a".repeat(48)}`)).status === 404);
verifier("Diagnostic : refusé sans session administrateur (401)", (await fetch(`${BASE}/api/admin/diagnostic`)).status === 401);
const rDiag = await fetch(`${BASE}/api/admin/diagnostic`, { headers: { Cookie: cookies } });
const diag = rDiag.status === 200 ? await rDiag.json() : null;
verifier("Diagnostic : rapport complet pour l'administrateur, sans secret", Boolean(diag) && diag.sections.length === 7 && !JSON.stringify(diag).includes(process.env.SESSION_SECRET || "∅") && !JSON.stringify(diag).includes(process.env.ADMIN_PASSWORD || "∅"), String(rDiag.status));
verifier("Diagnostic : les lignes de test sont supprimées", !diag || !diag.sections.some((s) => s.lignes.some((l) => l.etat === "ko" && /Nettoyage/.test(l.nom))));
{
  // Limiteur de connexion partagé : 5 échecs puis blocage, même avec le bon mot de passe. Adresse fictive aléatoire : ne bloque pas les autres tests.
  const ipFictive = `198.51.100.${1 + Math.floor(Math.random() * 200)}`;
  const ctxLimite = await nav.newContext({ extraHTTPHeaders: { "x-nf-client-connection-ip": ipFictive } });
  const pl = await ctxLimite.newPage();
  let tentatives = 0, bloque = false;
  while (!bloque && tentatives < 8) {
    await pl.goto(`${BASE}/admin/connexion`);
    await pl.fill('input[type="password"]', `mauvais-mot-de-passe-${tentatives}`);
    await pl.click('button[type="submit"]');
    await pl.waitForURL(/erreur=/);
    tentatives++;
    bloque = pl.url().includes("erreur=essais");
  }
  verifier("Connexion administrateur : bloquée après 5 échecs consécutifs", bloque && tentatives === 6, `${tentatives} tentatives`);
  const alerteBlocage = await (async () => { try { for (let i = 0; i < 20; i++) { if ((await (await fetch(`${process.env.FAUX || "http://localhost:4343"}/_recus`)).json()).some((x) => String(x.title).startsWith("Tentatives de connexion"))) return true; await new Promise((r) => setTimeout(r, 250)); } } catch { /* faux services absents */ } return false; })();
  verifier("Blocage de la connexion : alerte sur le téléphone (le site étant public, signe d'une tentative d'intrusion)", alerteBlocage);
  await pl.goto(`${BASE}/admin/connexion`); await pl.fill('input[type="password"]', MDP); await pl.click('button[type="submit"]'); await pl.waitForURL(/erreur=|\/admin$/);
  verifier("Connexion administrateur : le bon mot de passe est refusé tant que le blocage dure", pl.url().includes("erreur=essais"), pl.url());
  await ctxLimite.close();
}
const tache = (h) => fetch(`${BASE}/api/taches/quotidienne`, { method: "POST", headers: h });
verifier("Tâche quotidienne : introuvable sans secret (404)", (await tache({})).status === 404);
verifier("Tâche quotidienne : introuvable avec un mauvais secret (404)", (await tache({ "x-taches-secret": "faux" })).status === 404);
const rTache = await tache({ "x-taches-secret": process.env.TACHES_SECRET });
const bilanTache = rTache.status === 200 ? await rTache.json() : null;
verifier("Tâche quotidienne : exécutée avec le bon secret, bilan de clôture automatique, de purge et de veille renvoyés", bilanTache?.ok === true && Array.isArray(bilanTache.echeances?.cloturees) && typeof bilanTache.bilan === "object" && typeof bilanTache.veille === "object", String(rTache.status));
verifier("Livrable : demande d'envoi refusée sans session administrateur (401)", (await fetch(`${BASE}/api/admin/commande/${idCommande}/livrable`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status === 401);
verifier("Livrable : requête venant d'un autre site refusée (403)", (await fetch(`${BASE}/api/admin/commande/${idCommande}/livrable`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookies, Origin: "https://site-malveillant.example" }, body: "{}" })).status === 403);
{
  // Une session ne se fabrique pas avec SESSION_SECRET seul : il faut aussi le mot de passe administrateur
  const exp = String(Math.floor(Date.now() / 1000) + 3600);
  const hmacHex = (cle, v) => crypto.createHmac("sha256", cle).update(v).digest("hex");
  const SS = process.env.SESSION_SECRET || "";
  const derivee = (lier) => crypto.createHmac("sha256", SS).update(`studio-accroche|session-admin|${lier}`).digest();
  const testCookie = async (valeur) => (await fetch(`${BASE}/api/admin/facture/${idCommande}`, { headers: { Cookie: `sa_admin=${valeur}` } })).status;
  verifier("Session : un cookie signé avec SESSION_SECRET seul (ancienne méthode) est refusé", (await testCookie(`${exp}.${hmacHex(SS, exp)}`)) === 401);
  verifier("Session : un cookie signé avec la clé dérivée mais sans le mot de passe administrateur est refusé", (await testCookie(`${exp}.${hmacHex(derivee(""), exp)}`)) === 401);
  verifier("Session : un cookie signé avec les DEUX secrets (schéma documenté) est accepté — la liaison est bien celle décrite", (await testCookie(`${exp}.${hmacHex(derivee(crypto.createHash("sha256").update(MDP).digest("hex")), exp)}`)) === 200);
}
const faux2 = (await adminCtx.cookies()).find((k) => k.name === "sa_admin").value.replace(/^\d+/, String(Math.floor(Date.now() / 1000) + 999999));
verifier("Cookie de session modifié refusé", (await fetch(`${BASE}/api/admin/facture/${idCommande}`, { headers: { Cookie: `sa_admin=${faux2}` } })).status === 401);
const hd = (await fetch(`${BASE}/`)).headers, ha = (await fetch(`${BASE}/admin/connexion`)).headers, hc = (await fetch(`${BASE}/commande/${tokenClient}`)).headers;
verifier("En-têtes de sécurité présents (CSP, anti-cadre, nosniff, HSTS)", hd.get("content-security-policy")?.includes("frame-ancestors 'none'") && hd.get("x-frame-options") === "DENY" && hd.get("x-content-type-options") === "nosniff" && Boolean(hd.get("strict-transport-security")) && !hd.get("x-powered-by"));
verifier("Site entier non référencé tant que l'ouverture commerciale n'a pas eu lieu (noindex partout, robots.txt interdit tout)", /noindex/.test(hd.get("x-robots-tag") || "") && /Disallow:\s*\/\s*$/m.test(await (await fetch(`${BASE}/robots.txt`)).text()));
verifier("Le lien secret de commande ne fuit pas vers d'autres sites (Referrer-Policy)", hc.get("referrer-policy") === "same-origin");
verifier("Administration et pages de commande exclues des moteurs de recherche", ha.get("x-robots-tag")?.includes("noindex") && hc.get("x-robots-tag")?.includes("noindex") && /Disallow:\s*\//.test(await (await fetch(`${BASE}/robots.txt`)).text()));
const t0 = Date.now();
const ech = await fetch(`${BASE}/admin/connexion`, { redirect: "manual" });
verifier("Page de connexion accessible, sans indice sur le mot de passe", ech.status === 200 && !(await ech.text()).includes(MDP));

// ───────────── 7 bis. Organisation côté vendeur : notifications, tableau de bord, traitement, livraison ─────────────
console.log("\n— Organisation côté vendeur (notifications, tableau de bord, traitement, livraison) —");
const FAUX = process.env.FAUX || "http://localhost:4343";
const fauxJson = async (chemin, methode = "GET") => (await fetch(`${FAUX}${chemin}`, { method: methode })).json();
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const attendrePush = async (pred, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const x = (await fauxJson("/_recus")).find(pred); if (x) return x; await attendre(250); } return null; };
let fauxActif = false;
try { await fauxJson("/_vider", "POST"); fauxActif = true; } catch { /* absent */ }
verifier("Faux services de notification et de messagerie disponibles (scripts/faux-services.mjs)", fauxActif);
if (fauxActif) {
  const payerParWebhook = async (cmd, detail = { email: "client.test@example.com", name: "Client Test" }) => {
    await fetch(`${MOCK}/_test/modifier`, { method: "POST", body: JSON.stringify({ session: cmd.paiement.sessionId, patch: { payment_status: "paid", status: "complete", customer_details: detail } }) });
    const ev = evenement("checkout.session.completed", await session(cmd.paiement.sessionId));
    return (await webhook(ev, signer(ev))).status;
  };
  const idsVue = async (vue, q = "") => { await admin.goto(`${BASE}/admin?vue=${vue}${q ? "&q=" + encodeURIComponent(q) : ""}`); return admin.locator('.tableau a[href^="/admin/commande/"]').evaluateAll((els) => els.map((e) => e.getAttribute("href").split("/").pop())); };
  const mails = async () => fauxJson("/_courriels");
  const SITE = (process.env.SITE_URL || BASE).replace(/\/$/, "");

  // — Commande non payée : aucune notification de vente, aucune alerte
  await fauxJson("/_vider", "POST");
  const NP = await commandeNonPayee("test");
  verifier("Commande créée mais non payée : ni notification de vente, ni e-mail, ni alerte", (await mails()).length === 0 && (await fauxJson("/_recus")).length === 0 && courriels(NP.c.id).length === 0);

  // — Commande payée : notification immédiate (e-mail + téléphone)
  const A0 = await commandeNonPayee("campagne");
  const statutWebhook = await payerParWebhook(A0.c, { email: "claire@exemple-boutique.fr", name: "Claire Boutique" });
  const A = commande(A0.c.id);
  verifier("Paiement confirmé par le webhook signé : commande payée, en attente du brief", statutWebhook === 200 && A.paiement.etat === "paye" && A.statut === "attente_infos" && A.paiement.nomStripe === "Claire Boutique");
  const recusMail = await mails();
  const notif = recusMail.find((m) => m.objet.includes("Nouvelle commande payée") && m.objet.includes(A.id));
  verifier("E-mail réellement expédié au vendeur dès le paiement (adresse administrateur)", Boolean(notif) && notif.a.includes("admin@example.com"), JSON.stringify(recusMail.map((m) => m.objet)));
  verifier("E-mail vendeur : numéro, nom du client, e-mail du client, offre, montant payé, accès direct à la commande", notif && [A.id, "Claire Boutique", "claire@exemple-boutique.fr", "Pack Campagne", eur(PRIX.campagne), `${SITE}/admin/commande/${A.id}`].every((t) => notif.texte.includes(t)), notif?.texte.slice(0, 400));
  verifier("Le client reçoit aussi sa confirmation avec son lien privé", recusMail.some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes(A.id) && m.texte.includes(`/commande/${A.token}`)));
  const push = await attendrePush((x) => x.title === "Nouvelle commande payée" && String(x.message).includes(A.id));
  verifier("Notification sur le téléphone : titre, numéro, offre, montant et lien direct", push && String(push.message).includes("Pack Campagne") && String(push.message).includes(eur(PRIX.campagne)) && String(push.click) === `${SITE}/admin/commande/${A.id}` && push.topic === "sa-test-notifications", JSON.stringify(push));
  verifier("Notification téléphone : aucune donnée personnelle (ni nom, ni e-mail)", push && !/claire|boutique|@/i.test(JSON.stringify(push)));
  const rejoue = evenement("checkout.session.completed", await session(A.paiement.sessionId)); await webhook(rejoue, signer(rejoue));
  verifier("Webhook rejoué : une seule notification de vente (e-mail et téléphone)", (await mails()).filter((m) => m.objet.includes("Nouvelle commande payée") && m.objet.includes(A.id)).length === 1 && (await fauxJson("/_recus")).filter((x) => x.title === "Nouvelle commande payée" && String(x.message).includes(A.id)).length === 1);

  // — Tableau de bord : catégories, recherche, ouverture
  const compteur = async (nom) => Number(await admin.locator(".compteurs-vues a", { hasText: nom }).locator("strong").textContent());
  const afaire = await idsVue("afaire");
  verifier("Tableau de bord : la nouvelle commande est dans « À faire maintenant »", afaire.includes(A.id) && (await compteur("À faire maintenant")) === afaire.length, afaire.join());
  verifier("Tableau de bord : elle est « Nouvelle » (jamais ouverte) et « En attente du client »", (await idsVue("nouvelles")).includes(A.id) && (await idsVue("attente")).includes(A.id) && !(await idsVue("traiter")).includes(A.id));
  verifier("Tableau de bord : la commande non payée n'apparaît dans aucune catégorie de vente", ![...afaire, ...(await idsVue("toutes"))].includes(NP.c.id) && (await idsVue("nonpayees")).includes(NP.c.id));
  verifier("Recherche par e-mail, par nom, par numéro ; une recherche sans résultat est signalée", (await idsVue("toutes", "claire@exemple")).includes(A.id) && (await idsVue("toutes", "claire boutique")).includes(A.id) && (await idsVue("toutes", A.id.toLowerCase())).join() === A.id && (await idsVue("toutes", "zzz-introuvable")).length === 0 && (await admin.locator(".vide").textContent()).includes("Aucune commande"));
  verifier("Recherche : les commandes anciennes et terminées restent retrouvables (par marque)", (await idsVue("toutes", "Exemple Marque")).includes(idCommande) && (await idsVue("terminees")).includes(idCommande));
  await cap(admin, "10-admin-tableau");

  // — Ouverture de la commande : étape suivante, relance
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  verifier("Commande ouverte : le panneau « Prochaine étape » explique quoi faire", (await admin.locator(".etape").textContent()).includes("n'a pas encore envoyé son brief"));
  verifier("Ouvrir la commande la marque comme vue (plus « Nouvelle »)", !(await idsVue("nouvelles")).includes(A.id) && Boolean(commande(A.id).vueLe));
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  await admin.click("button:has-text('Relancer le client maintenant')");
  await admin.waitForURL(/ok=relance&mail=oui/);
await admin.waitForSelector(".avis-ok:has-text('E-mail envoyé')");
  verifier("Relance du client en un clic : retour visible « E-mail envoyé », e-mail parti, journal tenu", (await admin.locator(".avis-ok").allTextContents()).join(" ").includes("E-mail envoyé au client") && (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.texte.includes(`/commande/${A.token}`) && /brief/i.test(m.objet)) && commande(A.id).historique.some((h) => /Relance du brief/.test(h.evenement)));

  // — Le client envoie son brief et un fichier ; vérification de l'association fichier ↔ commande
  const pngA = Buffer.concat([png, Buffer.from("-fichier-de-claire")]);
  await page.goto(`${BASE}/commande/${A.token}`);
  await page.waitForSelector("form.formulaire");
  await page.setInputFiles("#depot", [{ name: "claire-produit.png", mimeType: "image/png", buffer: pngA }]);
  await page.waitForFunction(() => document.querySelectorAll(".depots li").length === 1);
  await page.fill('input[name="nom"]', "Claire Boutique"); await page.fill('input[name="marque"]', "Boutique Claire");
  await page.fill('input[name="nomFacture"]', "Boutique Claire SARL"); await page.fill('textarea[name="adresseFacture"]', "5 avenue du Test\n33000 Bordeaux");
  // Claire n'a pas de site internet : le champ reste vide et la commande doit passer
  await page.fill('input[name="produit"]', "Bougie parfumée");
  await page.selectOption('select[name="style"]', "Complice");
  await page.click('form.formulaire button[type="submit"]');
  await page.waitForSelector(".jalons");
  const A2 = commande(A.id);
  verifier("Brief reçu : commande « Payée — brief reçu », fichier rattaché à CETTE commande", A2.statut === "payee" && A2.brief.marque === "Boutique Claire" && A2.brief.lien === "" && A2.fichiersClient.length === 1 && A2.fichiersClient[0].nom === "claire-produit.png");
  verifier("Notification vendeur « Brief reçu » expédiée, avec le fichier du client", (await mails()).some((m) => m.objet.includes("Brief reçu") && m.objet.includes(A.id) && m.texte.includes("claire-produit.png")));
  const premier = commande(idCommande);
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  const texteA = await admin.locator(".admin-grille").textContent();
  verifier("Page de la commande : tous les éléments du client (brief, fichier), et aucun fichier d'une autre commande", ["Boutique Claire", "Bougie parfumée", "claire-produit.png"].every((t) => texteA.includes(t)) && !texteA.includes("produit-face.png") && !texteA.includes("logo.png"));
  const [dlA] = await Promise.all([admin.waitForEvent("download"), admin.locator(`a[href^="/api/admin/fichier/${A.id}/"]`).first().click()]);
  const octetsA = fs.readFileSync(await dlA.path());
  verifier("Téléchargement du fichier du client : contenu identique à celui déposé", dlA.suggestedFilename() === "claire-produit.png" && octetsA.equals(pngA));
  verifier("Un fichier d'une commande est introuvable via une autre commande (404, dans les deux sens)", (await fetch(`${BASE}/api/admin/fichier/${A.id}/${premier.fichiersClient[0].id}`, { headers: { Cookie: cookies } })).status === 404 && (await fetch(`${BASE}/api/admin/fichier/${premier.id}/${A2.fichiersClient[0].id}`, { headers: { Cookie: cookies } })).status === 404);
  await admin.goto(`${BASE}/admin/commande/${premier.id}`);
  verifier("La première commande ne montre que ses propres fichiers", !(await admin.locator(".admin-grille").textContent()).includes("claire-produit.png"));
  verifier("Tableau de bord : brief reçu → « À traiter »", (await idsVue("traiter")).includes(A.id) && !(await idsVue("attente")).includes(A.id));

  // — Production
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  const etapeTexte = await admin.locator(".etape").textContent();
  verifier("Panneau « Prochaine étape » : script d'abord, puis démarrage de la production", etapeTexte.includes("Rédigez le script") && etapeTexte.includes("démarrez la production"));
  verifier("La fiche de production est disponible et ne contient ni e-mail ni adresse de facturation du client", await admin.locator("details.fiche-production textarea").evaluate((t) => /COMMANDE SA-/.test(t.value) && /Marque :/.test(t.value) && !/@/.test(t.value) && !/Adresse de facturation/i.test(t.value)));
  await admin.fill('textarea[name="script"]', "0–3 s ACCROCHE : « Arrête d'acheter des gourdes qui fuient dans ton sac. »\n3–10 s PRODUIT : « Celle-ci, tu peux la retourner. »");
  await admin.click("button:has-text('Envoyer le script au client')");
  await admin.waitForURL(/ok=script&mail=oui/);
  verifier("Script envoyé : e-mail au client avec le texte, date et historique tracés", (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("votre script à valider") && m.texte.includes("Arrête d'acheter des gourdes") && m.texte.includes("répondez simplement")) && Boolean(commande(A.id).scriptEnvoyeLe) && commande(A.id).historique.some((h) => h.evenement.includes("Script envoyé")) && commande(A.id).statut === "payee");
  await admin.waitForSelector('input[name="scriptValide"]');
  verifier("Le bouton de démarrage exige la confirmation de l'accord du client", (await admin.locator('input[name="scriptValide"][required]').count()) === 1);
  await admin.check('input[name="scriptValide"]');
  await admin.click("button:has-text('Démarrer la production')");
  await admin.waitForURL(/ok=production&mail=oui/);
await admin.waitForSelector(".avis-ok:has-text('E-mail envoyé')");
  verifier("Production démarrée : statut, retour visible, e-mail au client expédié", commande(A.id).statut === "en_production" && (await admin.locator(".avis-ok").allTextContents()).join(" ").includes("Production lancée") && (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("production lancée")));
  verifier("Sans livrable, l'envoi de la livraison est impossible (bouton absent, explication affichée)", (await admin.locator("button:has-text('Envoyer la livraison au client')").count()) === 0 && (await admin.locator(".etape").textContent()).includes("Ajoutez d'abord"));

  // — Dépôt des livrables (vidéo + PDF) et livraison
  const videoA = Buffer.concat([Buffer.from("00000018667479706d703432", "hex"), crypto.randomBytes(512 * 1024)]);
  const pdfA = Buffer.concat([Buffer.from("%PDF-1.4\n"), crypto.randomBytes(2048)]);
  await admin.setInputFiles("#livrable", [{ name: "claire-video.mp4", mimeType: "video/mp4", buffer: videoA }, { name: "claire-script.pdf", mimeType: "application/pdf", buffer: pdfA }]);
  await admin.waitForFunction(() => [...document.querySelectorAll(".telechargements a")].filter((a) => a.textContent.trim() === "Voir").length === 2, null, { timeout: 20000 });
  await attendre(500);
  const A3 = commande(A.id);
  verifier("Vidéo et PDF déposés dans les livrables de la bonne commande", A3.livrables.map((x) => x.nom).sort().join() === "claire-script.pdf,claire-video.mp4" && commande(premier.id).livrables.every((x) => !/claire/.test(x.nom)));
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  await admin.click("button:has-text('Envoyer la livraison au client')");
  await admin.waitForURL(/ok=livraison&mail=oui/);
  const A4 = commande(A.id);
  {
    const mailLiv = (await mails()).find((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("à valider") && !m.objet.includes("corrigée") && !m.objet.includes("script"));
    const liens = [...(mailLiv?.texte.matchAll(/https?:\/\/\S+\/api\/commande\/[0-9a-f]+\/fichier\/[0-9a-f]+/g) || [])].map((x) => x[0]);
    const uniques = [...new Set(liens)];
    const recus = await Promise.all(uniques.map(async (u) => { const rr = await fetch(u.replace(/^https?:\/\/[^/]+/, BASE)); return { statut: rr.status, taille: (await rr.arrayBuffer()).byteLength, disp: rr.headers.get("content-disposition") || "" }; }));
    verifier("E-mail de livraison : un lien de téléchargement privé par fichier (vidéo et PDF), qui fonctionne sans aucune connexion", uniques.length === 2 && recus.every((x) => x.statut === 200 && /attachment/.test(x.disp)) && recus.map((x) => x.taille).sort((a, b) => a - b).join() === [pdfA.length, videoA.length].sort((a, b) => a - b).join(), JSON.stringify({ uniques: uniques.length, recus }));
    verifier("Lien de téléchargement dont le jeton est faux ou le fichier d'une autre commande : introuvable (404)", uniques.length > 0 && (await fetch(uniques[0].replace(/^https?:\/\/[^/]+/, BASE).replace(/\/commande\/[0-9a-f]+\//, `/commande/${"c".repeat(48)}/`))).status === 404);
  }
  verifier("Livraison envoyée : « En attente de validation », e-mail du lien privé expédié au client, journal tenu", A4.statut === "attente_validation" && (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("à valider") && m.texte.includes(`/commande/${A.token}`)) && A4.historique.some((h) => /Livraison envoyée/.test(h.evenement)));
  {
    // Délai de 14 jours (conditions de vente, article 7) : échéance annoncée au client et au vendeur, et aucune clôture avant l'échéance
    const [an, mois, jour] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(A4.derniereLivraisonLe)).split("-").map(Number);
    const attendu = new Date(Date.UTC(an, mois - 1, jour + 14)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const net = (t) => t.replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&nbsp;|\u00a0|\u202f/g, " ");
    verifier("Livraison : la date de mise à disposition est enregistrée (point de départ des 14 jours)", Boolean(A4.derniereLivraisonLe) && Math.abs(Date.now() - Date.parse(A4.derniereLivraisonLe)) < 600_000);
    const mailLiv14 = (await mails()).find((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("à valider") && !m.objet.includes("corrigée") && !m.objet.includes("script"));
    verifier(`E-mail de livraison : l'échéance du délai est indiquée (jusqu'au ${attendu} inclus, heure de Paris)`, net(mailLiv14?.texte || "").includes(`jusqu'au ${attendu} inclus (heure de Paris)`), (mailLiv14?.texte || "").slice(0, 300));
    const htmlClient = net(await (await fetch(`${BASE}/commande/${A.token}`)).text());
    verifier("Page du client : « Vous avez jusqu'au … inclus (heure de Paris) » avec la bonne date, et la règle de clôture", htmlClient.includes(`jusqu'au ${attendu} inclus (heure de Paris)`) && /réputée acceptée/.test(htmlClient), attendu);
    await admin.goto(`${BASE}/admin/commande/${A.id}`);
    verifier("Administration : échéance affichée sur la commande, avec la clôture automatique annoncée", net(await admin.locator(".etape").textContent()).includes(`jusqu'au ${attendu} inclus (heure de Paris)`) && /clôturée automatiquement/.test(await admin.locator(".etape").textContent()));
    const rT2 = await tache({ "x-taches-secret": process.env.TACHES_SECRET });
    const bT2 = rT2.status === 200 ? await rT2.json() : null;
    verifier("Tâche quotidienne : une livraison toute récente n'est jamais clôturée avant l'échéance", bT2?.ok === true && !bT2.echeances.cloturees.includes(A.id) && commande(A.id).statut === "attente_validation" && !commande(A.id).clotureAutoLe);
  }
  verifier("Tableau de bord : la commande est dans « Livrées »", (await idsVue("livrees")).includes(A.id) && !(await idsVue("afaire")).includes(A.id));
  const rVideo = await fetch(`${BASE}/api/commande/${A.token}/fichier/${A4.livrables.find((x) => x.nom.endsWith(".mp4")).id}`);
  verifier("Le client télécharge sa vidéo par son lien : fichier intact", rVideo.status === 200 && Buffer.from(await rVideo.arrayBuffer()).equals(videoA));
  {
    // Lecture intégrée à la page du client (téléphone compris) : vidéo seulement, mêmes conditions d'accès que le téléchargement
    const idVideo = A4.livrables.find((x) => x.nom.endsWith(".mp4")).id, idPdf = A4.livrables.find((x) => x.nom.endsWith(".pdf")).id;
    const htmlClient = await (await fetch(`${BASE}/commande/${A.token}`)).text();
    verifier("Page du client : un lecteur intégré pour la vidéo, aucun pour le PDF", htmlClient.includes(`/api/commande/${A.token}/lecture/${idVideo}`) && !htmlClient.includes(`/lecture/${idPdf}`));
    const lect = await fetch(`${BASE}/api/commande/${A.token}/lecture/${idVideo}`, { headers: { Range: "bytes=0-9" } });
    const octets = Buffer.from(await lect.arrayBuffer());
    verifier("Lecture intégrée : lecture partielle (206), contenu exact, type vidéo, jamais en pièce jointe", lect.status === 206 && octets.length === 10 && octets.equals(videoA.subarray(0, 10)) && /^video\/mp4/.test(lect.headers.get("content-type") || "") && !/attachment/.test(lect.headers.get("content-disposition") || ""), `${lect.status} ${lect.headers.get("content-type")} ${octets.length}`);
    const autres = await Promise.all([
      fetch(`${BASE}/api/commande/${"c".repeat(48)}/lecture/${idVideo}`),
      fetch(`${BASE}/api/commande/${A.token}/lecture/${idPdf}`),
      fetch(`${BASE}/api/commande/${A.token}/lecture/${"d".repeat(32)}`),
      fetch(`${BASE}/api/commande/${premier.token}/lecture/${idVideo}`),
    ]);
    verifier("Lecture intégrée : mauvais jeton, PDF, fichier inconnu, fichier d'une autre commande → 404", autres.every((r) => r.status === 404), autres.map((r) => r.status).join(","));
  }

  // — Demande de correction du client
  await fauxJson("/_vider", "POST");
  await page.goto(`${BASE}/commande/${A.token}`);
  await page.click("text=Demander un tour de retouches");
  await page.fill(".validation textarea", "Merci de mettre le prix en début de vidéo.");
  await page.click("text=Envoyer ma demande");
  await page.waitForSelector(".jalons li.courant:has-text('En production')");
  const pushCorrection = await attendrePush((x) => x.title === "Correction demandée" && String(x.message).includes(A.id));
  verifier("Correction demandée : alerte sur le téléphone avec lien direct, sans le texte du client", pushCorrection && String(pushCorrection.click).endsWith(`/admin/commande/${A.id}`) && !/prix|Claire|@/i.test(JSON.stringify(pushCorrection)), JSON.stringify(pushCorrection));
  verifier("Correction demandée : accusé de réception envoyé au client (sa demande citée, retouches restantes)", (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("votre demande de retouche est bien reçue") && m.texte.includes("prix en début de vidéo") && /retouche/.test(m.texte)));
  verifier("Correction demandée : e-mail au vendeur avec le message du client", (await mails()).some((m) => m.a.includes("admin@example.com") && m.objet.includes("Retouche demandée") && m.texte.includes("prix en début de vidéo")));
  verifier("Tableau de bord : « Corrections demandées » et « À faire » contiennent la commande", (await idsVue("corrections")).includes(A.id) && (await idsVue("afaire")).includes(A.id) && (await compteur("Corrections demandées")) >= 1);
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  verifier("Page de la commande : la demande est citée en haut, retouche « à traiter »", (await admin.locator(".etape").textContent()).includes("prix en début de vidéo") && (await admin.locator(".admin-grille").textContent()).includes("à traiter"));
  await admin.click("button:has-text('Envoyer la version corrigée au client')");
  await admin.waitForURL(/ok=livraison&mail=oui/);
  const A5 = commande(A.id);
  verifier("Version corrigée envoyée : retouche marquée traitée, e-mail « version corrigée » expédié", A5.statut === "attente_validation" && A5.retouchesDemandees.every((r) => r.traiteeLe) && (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("version corrigée")));
  verifier("Tableau de bord : plus dans « Corrections demandées »", !(await idsVue("corrections")).includes(A.id) && (await idsVue("livrees")).includes(A.id));
  {
    // — Tours de retouches (Pack Campagne : 2 tours). Un tour = une demande consolidée ; hors périmètre : refusé, non décompté ; au-delà : refusé.
    const API = (corps) => fetch(`${BASE}/api/commande/${A.token}/validation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    const utilises = () => commande(A.id).retouchesDemandees.filter((x) => !x.horsPerimetre).length;
    await page.goto(`${BASE}/commande/${A.token}`);
    verifier("Page du client : « Tours de retouches restants : 1 sur 2 » (Pack Campagne, un tour déjà utilisé)", (await page.locator(".validation .petit", { hasText: "Tours de retouches" }).first().textContent()).includes("restants : 1 sur 2"));
    let r = await API({ action: "retouche", message: "Finalement, changez l'angle : présentez le produit pour les enfants." });
    verifier("2e demande acceptée à l'enregistrement (la commande repasse en production)", r.status === 200 && commande(A.id).statut === "en_production");
    await admin.goto(`${BASE}/admin/commande/${A.id}`);
    verifier("Administration : « Tour de retouches 2 sur 2 » et formulaire « Refuser : hors périmètre »", (await admin.locator(".etape").textContent()).includes("Tour de retouches 2 sur 2") && (await admin.locator('button:has-text("Refuser : hors périmètre")').count()) === 1);
    await admin.fill('textarea[name="explication"]', "Un changement d'angle n'est pas une retouche : il faut une nouvelle commande.");
    await admin.click('button:has-text("Refuser : hors périmètre")');
    await admin.waitForURL(/ok=refus&mail=oui/);
    const A6 = commande(A.id);
    verifier("Demande hors périmètre : refusée, retour en validation, historique tenu, tour non décompté (1 utilisé sur 2)", A6.statut === "attente_validation" && /nouvelle commande/.test(A6.retouchesDemandees.at(-1).horsPerimetre || "") && utilises() === 1 && A6.historique.some((h) => /refusée \(hors périmètre\)/.test(h.evenement)));
    verifier("Demande hors périmètre : e-mail au client avec l'explication, « ne vous est pas décompté » et la définition du tour", (await mails()).some((m) => m.a.includes("claire@exemple-boutique.fr") && m.objet.includes("hors périmètre") && m.texte.includes("nouvelle commande") && /ne vous est pas décompté/.test(m.texte) && /seule demande/.test(m.texte)));
    await page.goto(`${BASE}/commande/${A.token}`);
    verifier("Page du client : la raison du refus est affichée, il reste 1 tour sur 2", (await page.locator(".avis").allTextContents()).join(" ").includes("ne pouvait pas être traitée comme une retouche") && (await page.locator(".validation .petit", { hasText: "Tours de retouches" }).first().textContent()).includes("restants : 1 sur 2"));
    r = await API({ action: "retouche", message: "Raccourcissez les sous-titres de la deuxième vidéo, merci." });
    verifier("2e tour valable accepté (2 sur 2)", r.status === 200 && utilises() === 2);
    await admin.goto(`${BASE}/admin/commande/${A.id}`);
    await admin.click("button:has-text('Envoyer la version corrigée au client')");
    await admin.waitForURL(/ok=livraison&mail=oui/);
    r = await API({ action: "retouche", message: "Encore une petite modification, s'il vous plaît." });
    const rj = await r.json();
    verifier("Au-delà des 2 tours : refusé (409) avec explication, aucun tour de plus", r.status === 409 && /utilisés/.test(rj.erreur) && /nouvelle commande/.test(rj.erreur) && utilises() === 2);
    await page.goto(`${BASE}/commande/${A.token}`);
    verifier("Page du client : plus de bouton de retouche quand les tours sont utilisés", (await page.locator('button:has-text("Demander un tour de retouches")').count()) === 0 && (await page.locator(".validation .petit", { hasText: "Tours de retouches" }).first().textContent()).includes("ont été utilisés"));
  }
  const avantRenvoi = (await mails()).length;
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  await admin.getByRole("button", { name: /Renvoyer l.e-mail de livraison/ }).click();
  await admin.waitForURL(/ok=livraison&mail=oui/);
  verifier("Renvoi de l'e-mail de livraison au client : un nouvel e-mail, statut inchangé", (await mails()).length === avantRenvoi + 1 && commande(A.id).statut === "attente_validation");
  await page.goto(`${BASE}/commande/${A.token}`);
  await page.click("text=Je valide la livraison");
  await page.waitForSelector("h1:has-text('livrée')");
  verifier("Validation par le client → « Terminées » dans le tableau de bord, facture émise", commande(A.id).statut === "livree" && (await idsVue("terminees")).includes(A.id) && Boolean(commande(A.id).facture));
  await admin.goto(`${BASE}/admin/commande/${A.id}`);
  const histoA = await admin.locator(".admin-grille").textContent();
  verifier("Historique complet de la commande : paiement, brief, production, livraison, correction, validation, e-mails", ["Paiement confirmé", "Brief reçu", "Statut passé à « en_production »", "Livraison envoyée", "Notifications et e-mails", "Retouche"].every((t) => histoA.includes(t)) && /\(envoyé, via smtp\)/.test(histoA), histoA.slice(histoA.indexOf("Historique"), histoA.indexOf("Historique") + 600));
  await cap(admin, "11-admin-commande-terminee");

  // — Paiement échoué / session expirée
  await fauxJson("/_vider", "POST");
  const PF = await commandeNonPayee("essai");
  const evEchec = evenement("checkout.session.async_payment_failed", await session(PF.c.paiement.sessionId));
  await webhook(evEchec, signer(evEchec));
  const pushEchec = await attendrePush((x) => x.title === "Paiement échoué" && String(x.message).includes(PF.c.id));
  verifier("Paiement refusé : alerte sur le téléphone et e-mail au vendeur, commande non vendue", pushEchec && commande(PF.c.id).paiement.etat === "echoue" && (await mails()).some((m) => m.a.includes("admin@example.com") && m.objet.includes("Paiement échoué")) && !(await mails()).some((m) => m.objet.includes("Nouvelle commande payée")), JSON.stringify(pushEchec));
  verifier("Paiement échoué : visible dans « Non payées / annulées », absent de « À faire »", (await idsVue("nonpayees")).includes(PF.c.id) && !(await idsVue("afaire")).includes(PF.c.id));
  const PX = await commandeNonPayee("essai"); await fauxJson("/_vider", "POST");
  const evExp = evenement("checkout.session.expired", await session(PX.c.paiement.sessionId)); await webhook(evExp, signer(evExp));
  await attendre(600);
  verifier("Session de paiement simplement expirée (abandon du client) : aucune alerte", (await fauxJson("/_recus")).length === 0 && (await mails()).length === 0);

  // — Problème technique : alerte immédiate, sans donnée sensible
  await fauxJson("/_vider", "POST");
  const rErr = await fetch(`${BASE}/api/test-erreur`);
  const pushErr = await attendrePush((x) => x.title === "Problème technique sur le site", 10000);
  verifier("Erreur serveur : le client reçoit une erreur, le vendeur est alerté sur le téléphone avec lien vers le diagnostic", rErr.status === 500 && pushErr && String(pushErr.click).endsWith("/admin/diagnostic") && !String(pushErr.message).includes("erreur volontaire"), `${rErr.status} ${JSON.stringify(pushErr)}`);
  verifier("Erreur serveur : détail technique complet dans l'e-mail du vendeur", (await mails()).some((m) => m.a.includes("admin@example.com") && m.objet.includes("Problème technique") && m.texte.includes("erreur volontaire de test")));
  await fetch(`${BASE}/api/test-erreur`); await attendre(1500);
  verifier("Même erreur répétée : une seule alerte (pas d'avalanche)", (await fauxJson("/_recus")).filter((x) => x.title === "Problème technique sur le site").length === 1);

  // — Panne de la messagerie : le téléphone prévient, rien n'est perdu, renvoi possible
  await fauxJson("/_vider", "POST"); await fetch(`${FAUX}/_panne?smtp=1`, { method: "POST" });
  const MP = await commandeNonPayee("essai");
  await payerParWebhook(MP.c, { email: "panne@exemple.fr", name: "Client Panne" });
  const pushVente = await attendrePush((x) => x.title === "Nouvelle commande payée" && String(x.message).includes(MP.c.id));
  const pushMail = await attendrePush((x) => x.title === "E-mail non envoyé");
  verifier("Messagerie en panne : la vente est enregistrée ET le téléphone prévient quand même (vente + e-mail non envoyé)", commande(MP.c.id).paiement.etat === "paye" && Boolean(pushVente) && Boolean(pushMail) && !/panne@|Client Panne/.test(JSON.stringify(pushMail)), JSON.stringify([pushVente, pushMail]));
  const archiveMP = courriels(MP.c.id).find((m) => m.objet.includes("Nouvelle commande payée"));
  verifier("Messagerie en panne : la notification est archivée comme « échec », avec le détail des essais", archiveMP && /^échec/.test(archiveMP.resultat) && archiveMP.essais?.length >= 1, JSON.stringify(archiveMP?.resultat));
  await admin.goto(`${BASE}/admin`);
  verifier("Tableau de bord : bandeau d'alerte « e-mail non envoyé » avec lien pour renvoyer", (await admin.locator(".avis-erreur").allTextContents()).join(" ").includes("non envoyé") && (await admin.locator('a[href="/admin/courriels"]').count()) >= 1);
  await fetch(`${FAUX}/_panne?smtp=0`, { method: "POST" });
  await admin.goto(`${BASE}/admin/courriels`);
  const bloc = admin.locator("details.courriel").filter({ hasText: MP.c.id }).filter({ hasText: "Nouvelle commande payée" }).filter({ hasText: "échec" }).first();
  await bloc.locator("summary").click();
  await bloc.locator("button:has-text('Renvoyer cet e-mail')").click();
  await admin.waitForURL(/ok=renvoi/);
  verifier("Service rétabli : l'e-mail en échec est renvoyé en un clic et arrive au vendeur", (await mails()).some((m) => m.a.includes("admin@example.com") && m.objet.includes("Nouvelle commande payée") && m.objet.includes(MP.c.id)));

  // — Renvoi groupé : seulement ce qui est encore utile, sans aucun doublon
  await admin.goto(`${BASE}/admin/courriels`);
  verifier("Page E-mails : les e-mails encore utiles sont listés avec la raison, et le bouton de renvoi groupé est proposé", (await admin.locator("main").textContent()).includes("encore utile") && (await admin.locator("button:has-text('Renvoyer ces e-mails maintenant')").count()) === 1);
  await admin.click("button:has-text('Renvoyer ces e-mails maintenant')");
  await admin.waitForURL(/lot=/);
  const apresLot = await mails();
  const pourClient = apresLot.filter((m) => m.a.includes("panne@exemple.fr") && m.objet.includes(MP.c.id));
  const notifsAdmin = apresLot.filter((m) => m.a.includes("admin@example.com") && m.objet.includes("Nouvelle commande payée") && m.objet.includes(MP.c.id));
  verifier("Renvoi groupé : l'e-mail du client part une seule fois, la notification déjà renvoyée n'est pas dupliquée", pourClient.length === 1 && notifsAdmin.length === 1, JSON.stringify({ client: pourClient.length, admin: notifsAdmin.length }));
  await admin.goto(`${BASE}/admin/courriels`);
  verifier("Après le renvoi groupé : plus aucun e-mail utile en attente (bouton absent), rien à renvoyer deux fois", (await admin.locator("button:has-text('Renvoyer ces e-mails maintenant')").count()) === 0 && (await admin.locator("main").textContent()).includes("Aucun e-mail utile"));
  const avantDeuxieme = (await mails()).length;
  await admin.goto(`${BASE}/admin`);
  verifier("Tableau de bord : le bandeau « e-mail non envoyé » a disparu, aucun e-mail supplémentaire n'est parti", !(await admin.locator(".avis-erreur").allTextContents()).join(" ").includes("non envoyé") && (await mails()).length === avantDeuxieme);

  // — Réglages e-mail : mot de passe d'application saisi dans l'administration (actif sans redéploiement), testé avant d'être enregistré
  await fauxJson("/_vider", "POST"); await fetch(`${FAUX}/_panne?smtp=1`, { method: "POST" });
  const MQ = await commandeNonPayee("essai");
  await payerParWebhook(MQ.c, { email: "panne2@exemple.fr", name: "Client Deux" });
  await admin.goto(`${BASE}/admin/reglages`);
  await admin.fill('input[name="mdp"]', "trop-court"); await admin.click("button:has-text('Enregistrer et tester')");
  await admin.waitForURL(/erreur=/);
  verifier("Réglages e-mail : un mot de passe qui n'a pas la forme d'un mot de passe d'application est refusé avec une explication", (await admin.locator(".avis-erreur").textContent()).includes("16 lettres minuscules"));
  await admin.fill('input[name="mdp"]', "qwer tyui opas dfgh"); await admin.click("button:has-text('Enregistrer et tester')");
  await admin.waitForSelector(".avis-erreur:has-text('Google refuse')");
  verifier("Réglages e-mail : Gmail refuse le mot de passe → il n'est PAS enregistré, message clair (compte, révocation)", (await admin.locator(".avis-erreur").textContent()).includes("Google refuse ce mot de passe") && /Mot de passe enregistré ici\s*non \(/.test(await admin.locator("main").textContent()), (await admin.locator("main").textContent()).replace(/\s+/g, " ").slice(0, 700));
  await fetch(`${FAUX}/_panne?smtp=0`, { method: "POST" });
  await fauxJson("/_vider", "POST");
  await admin.fill('input[name="mdp"]', "qwer tyui opas dfgh"); await admin.click("button:has-text('Enregistrer et tester')");
  await admin.waitForURL(/ok=1/);
  const apresGmail = await mails();
  const texteReglages = await admin.content();
  verifier("Réglages e-mail : mot de passe testé puis enregistré, e-mail de test réellement envoyé à l'adresse du vendeur", (await admin.locator(".avis-ok").textContent()).includes("Gmail fonctionne") && apresGmail.some((m) => m.a.includes("admin@example.com") && /Test de notification/.test(m.objet)), JSON.stringify(apresGmail.map((m) => m.objet)));
  verifier("Réglages e-mail : les e-mails restés en échec et encore utiles sont renvoyés une seule fois (client et vendeur), sans doublon", apresGmail.filter((m) => m.a.includes("panne2@exemple.fr") && m.objet.includes(MQ.c.id)).length === 1 && apresGmail.filter((m) => m.a.includes("admin@example.com") && m.objet.includes("Nouvelle commande payée") && m.objet.includes(MQ.c.id)).length === 1, JSON.stringify(apresGmail.map((m) => [m.a[0], m.objet.slice(0, 50)])));
  verifier("Réglages e-mail : le mot de passe n'apparaît jamais dans la page", !texteReglages.includes("qwertyuiopasdfgh") && !texteReglages.includes("qwer tyui") && /oui \(depuis/.test(await admin.locator("main").textContent()), JSON.stringify({ dansPage: texteReglages.includes("qwertyuiopasdfgh") || texteReglages.includes("qwer tyui"), etat: (await admin.locator("main").textContent()).replace(/\s+/g, " ").slice(0, 400) }));
  await admin.goto(`${BASE}/admin/diagnostic`);
  verifier("Diagnostic : le mot de passe enregistré dans l'administration est signalé, sans être affiché", (await admin.locator("main").textContent()).includes("enregistré dans l'administration") && !(await admin.content()).includes("qwertyuiopasdfgh"));
  await admin.goto(`${BASE}/admin/reglages`);
  await admin.click("button:has-text('Supprimer le mot de passe enregistré ici')");
  await admin.waitForURL(/supprime=1/);
  verifier("Réglages e-mail : suppression du mot de passe enregistré (la variable Netlify reprend la main)", /non \(/.test(await admin.locator("main").textContent()));
  verifier("Réglages e-mail : page inaccessible sans session administrateur", (await fetch(`${BASE}/admin/reglages`, { redirect: "manual" })).status !== 200);

  // — Diagnostic et notification de test
  await admin.goto(`${BASE}/admin/diagnostic`);
  const texteDiag = await admin.locator("main").textContent();
  verifier("Diagnostic : messagerie SMTP vérifiée, notifications téléphone et adresse vendeur contrôlées", texteDiag.includes("Messagerie SMTP : connexion et mot de passe valides") && texteDiag.includes("Notifications sur le téléphone (ntfy)") && texteDiag.includes("Adresse qui reçoit les commandes"), texteDiag.slice(0, 300));
  await fauxJson("/_vider", "POST");
  await admin.click("button:has-text('Envoyer une notification de test')");
  await admin.waitForURL(/test=ok-ok/);
  verifier("Notification de test : téléphone et e-mail reçus", (await attendrePush((x) => x.title === "Test de notification")) && (await mails()).some((m) => m.objet.includes("Test de notification")));
  const nt = (h) => fetch(`${BASE}/api/admin/notification-test`, { method: "POST", headers: h });
  const rNt = await nt({ Cookie: cookies });
  const jNt = rNt.status === 200 ? await rNt.json() : null;
  verifier("Route de notification de test : refusée sans session (401) et depuis un autre site (403), sinon téléphone + e-mail envoyés", (await nt({})).status === 401 && (await nt({ Cookie: cookies, Origin: "https://site-malveillant.example" })).status === 403 && jNt?.push === "envoye" && jNt?.email === "envoye", JSON.stringify(jNt));
  const wh = (h, q = "") => fetch(`${BASE}/api/admin/stripe-webhook${q}`, { method: "POST", headers: h });
  const w1 = await wh({ Cookie: cookies }); const j1 = w1.status === 200 ? await w1.json() : null;
  verifier("Configuration du webhook Stripe depuis l'administration : refusée sans session (401) et depuis un autre site (403)", (await wh({})).status === 401 && (await wh({ Cookie: cookies, Origin: "https://site-malveillant.example" })).status === 403);
  verifier("Webhook Stripe créé en mode test : adresse du site, quatre événements, secret de signature renvoyé", j1 && j1.livemode === false && j1.url === `${SITE}/api/stripe/webhook` && j1.secret?.startsWith("whsec_") && j1.evenements?.length === 4, JSON.stringify(j1 && { ...j1, secret: "…" }));
  const w2 = await wh({ Cookie: cookies });
  verifier("Webhook déjà créé : refus (409), l'ancien secret n'est pas invalidé par accident", w2.status === 409);
  const j3 = await (await wh({ Cookie: cookies }, "?remplacer=oui")).json();
  verifier("Remplacement explicite : nouveau point d'accès, ancien supprimé", j3.id && j1 && j3.id !== j1.id && j3.remplaces === 1 && j3.secret !== j1.secret);
  await admin.goto(`${BASE}/admin/aide`);
  const texteAide = await admin.locator("main").textContent();
  verifier("Page « Mode d'emploi » : les trois rubriques et le sujet de notification à saisir dans ntfy", ["Je reçois une commande ici", "Je traite une commande ici", "Je livre les vidéos ici"].every((t) => texteAide.includes(t)) && texteAide.includes("sa-test-notifications"));
  verifier("Page « Mode d'emploi » inaccessible sans session administrateur", (await fetch(`${BASE}/admin/aide`, { redirect: "manual" })).status !== 200);

  // — Tâche quotidienne : récapitulatif
  await fauxJson("/_vider", "POST");
  const rQ = await fetch(`${BASE}/api/taches/quotidienne`, { method: "POST", headers: { "x-taches-secret": process.env.TACHES_SECRET } });
  const bQ = await rQ.json();
  verifier("Tâche quotidienne : récapitulatif envoyé au vendeur avec ce qui attend (e-mail non envoyé signalé)", bQ.ok && bQ.veille?.points >= 1 && bQ.veille.resume === "envoye" && (await mails()).some((m) => m.a.includes("admin@example.com") && m.objet.includes("Récap")), JSON.stringify(bQ.veille));

  // — Aucune donnée personnelle sur le téléphone, jamais
  const tous = JSON.stringify(await fauxJson("/_recus"));
  verifier("Bilan : aucun nom ni e-mail de client dans les messages envoyés sur le téléphone", !/claire|panne@|Client Panne|marie@|durand|@/i.test(tous));
}

// ───────────── 8. Divers ─────────────
console.log("\n— Pages et liens —");
verifier("Commande sans aucune case cochée refusée côté serveur (déclaration « professionnel » d'abord, puis conditions)", (await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ formule: "essai" }), redirect: "manual" })).headers.get("location").includes("erreur=pro") && (await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ formule: "essai", pro: "oui", entreprise: "Société Test" }), redirect: "manual" })).headers.get("location").includes("erreur=conditions"));
verifier("Formule inconnue → retour à l'accueil", (await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ formule: "gratuit", cgv: "oui", ia: "oui" }), redirect: "manual" })).headers.get("location").endsWith("/#formules"));
verifier("Jeton de commande inconnu → 404", (await fetch(`${BASE}/commande/${"b".repeat(48)}`)).status === 404);
const liens = new Set();
for (const p of ["/", "/commander/essai", "/commander/accroches", "/commander/test", "/commander/campagne", "/cgv", "/confidentialite", "/mentions-legales"]) {
  const rr = await fetch(BASE + p); verifier(`Page ${p} répond 200`, rr.status === 200, String(rr.status));
  for (const h of (await rr.text()).matchAll(/href="(\/[^"#?]*)/g)) if (!h[1].startsWith("/_next") && !h[1].startsWith("/media")) liens.add(h[1]);
}
const morts = [];
for (const l of liens) { const s = (await fetch(BASE + l, { redirect: "manual" })).status; if (s >= 400) morts.push(`${l} (${s})`); }
verifier(`Aucun lien interne cassé (${liens.size} liens vérifiés)`, morts.length === 0, morts.join(", "));
verifier("Aucune erreur JavaScript pendant le parcours", erreursConsole.length === 0, erreursConsole.join(" | "));

await nav.close();
const ko = resultats.filter((x) => !x.ok);
console.log(`\n${resultats.length - ko.length}/${resultats.length} vérifications réussies.`);
process.exit(ko.length ? 1 : 0);
