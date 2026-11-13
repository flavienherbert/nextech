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

const resultats = [];
const verifier = (nom, ok, detail = "") => { resultats.push({ nom, ok: Boolean(ok) }); console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
// Avec le stockage objet, l'état est recopié localement avant chaque lecture.
const rafraichir = () => { if (process.env.S3_BUCKET) execFileSync(process.execPath, ["scripts/miroir-s3.mjs"], { env: process.env }); };
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
  const corps = new URLSearchParams({ formule, cgv: "oui", ia: "oui" });
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
verifier("Accueil : trois formules avec prix", (await page.locator(".formule").count()) === 3 && (await page.locator(".formule .prix").allTextContents()).join("|").replace(/ | /g, " ") === "25 €|69 €|129 €", (await page.locator(".formule .prix").allTextContents()).join("|"));
await page.locator('.formule a[href="/commander/test"]').click();
await page.waitForURL("**/commander/test");
verifier("Clic sur « Pack Test » → page de commande à 69 €", (await page.locator(".total strong").textContent()).includes("69"));
await cap(page, "02-commander");
await page.locator('button[type="submit"]').click();
verifier("Paiement refusé tant que les deux cases ne sont pas cochées", page.url().includes("/commander/test"));
await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
const avant = new Set(commandes().map((c) => c.id));
await page.locator('button[type="submit"]').click();
await page.waitForURL(`${MOCK}/pay/**`);
verifier("Redirection vers la page de paiement", true);
let c = commandes().find((x) => !avant.has(x.id));
verifier("Commande créée avec un numéro unique, non payée", c && /^SA-\d{6}-[A-Z0-9]{5}$/.test(c.id) && c.paiement.etat === "en_attente" && c.statut === "attente_paiement", JSON.stringify(c?.id));
verifier("Montant envoyé à Stripe = 6900 centimes", (await session(c.paiement.sessionId)).amount_total === 6900);
await page.fill('input[name="email"]', "marie@exemple-marque.fr");
await page.click('button[value="payer"]');
await page.waitForURL(`${BASE}/commande/**`);
await page.waitForSelector("form.formulaire", { timeout: 15000 });
verifier("Retour sur le site après paiement, formulaire de brief affiché", true);
c = commande(c.id);
verifier("Commande marquée payée par le webhook", c.paiement.etat === "paye" && c.statut === "attente_infos" && c.paiement.emailStripe === "marie@exemple-marque.fr");
let m = courriels(c.id);
verifier("E-mail de confirmation rédigé pour le client", m.some((x) => x.a === "marie@exemple-marque.fr" && x.objet.includes(c.id) && x.texte.includes("/commande/" + c.token)));
verifier("Notification de paiement rédigée pour l'administrateur", m.some((x) => x.objet.includes("Paiement reçu") && x.objet.includes("69") && x.texte.includes("Pack Test")));
await cap(page, "03-brief");

// Brief : validation des champs, dépôt de fichiers
await page.click('form.formulaire button[type="submit"]');
await page.waitForSelector(".champ-erreur");
verifier("Brief incomplet refusé avec messages d'erreur", (await page.locator(".champ-erreur").count()) >= 6);
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
await page.fill('input[name="nomFacture"]', "Exemple Marque SAS");
await page.fill('textarea[name="adresseFacture"]', "12 rue de l'Exemple\n75000 Paris");
await page.fill('input[name="sirenClient"]', "123456789");
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
verifier("Notification admin : client, formule, montant, brief, fichiers, numéro", notif && ["Marie Durand", "Pack Test", "69", "Gourde inox 750 ml", "produit-face.png", c.id].every((s) => notif.texte.includes(s)), notif?.texte.slice(0, 200));
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
verifier("Accès direct à une commande sans session → connexion", admin.url().endsWith("/admin/connexion"));
verifier("Fichier client inaccessible sans session admin (401)", (await fetch(`${BASE}/api/admin/fichier/${idCommande}/${c.fichiersClient[0].id}`)).status === 401);
await admin.fill('input[name="motdepasse"]', "mauvais-mot-de-passe"); await admin.click('button[type="submit"]');
await admin.waitForURL("**/admin/connexion?erreur=refus");
verifier("Mauvais mot de passe refusé", true);
await admin.fill('input[name="motdepasse"]', MDP); await admin.click('button[type="submit"]');
await admin.waitForURL(`${BASE}/admin`);
verifier("Connexion administrateur", (await admin.locator(".tableau").textContent()).includes(idCommande));
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
await page.click("text=Demander une retouche");
await page.fill(".validation textarea", "Merci de raccourcir l'accroche de la première vidéo.");
await page.click("text=Envoyer la demande");
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
const corpsModifie = faux.replace('"amount_total":12900', '"amount_total":100');
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
verifier("Événement légitime appliqué une fois, ignoré la seconde (idempotence)", d1.applique === true && d2.doublon === true && commande(f4.c.id).paiement.etat === "paye" && courriels(f4.c.id).filter((x) => x.objet.includes("Paiement reçu")).length === 1, JSON.stringify([d1, d2]));
const ev5 = evenement("checkout.session.completed", s4);
const d3 = await (await webhook(ev5, signer(ev5))).json();
verifier("Second événement pour une commande déjà payée : aucun e-mail en double", d3.applique === true && courriels(f4.c.id).filter((x) => x.objet.includes("confirmée")).length === 1);

// ───────────── 5. Annulation et expiration ─────────────
console.log("\n— Paiement annulé ou expiré —");
await page.goto(`${BASE}/commander/essai`);
await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
const av = new Set(commandes().map((x) => x.id));
await page.locator('button[type="submit"]').click();
await page.waitForURL(`${MOCK}/pay/**`);
await page.click('button[value="annuler"]');
await page.waitForURL("**/commander/essai?annule=1");
const annulee = commandes().find((x) => !av.has(x.id));
verifier("Annulation : retour au site avec message, commande non payée, aucun e-mail", (await page.locator(".avis").first().textContent()).includes("rien n'a été débité") && annulee.paiement.etat === "en_attente" && courriels(annulee.id).length === 0);
await cap(page, "09-annulation");
await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
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
verifier("Autorisation d'une commande inutilisable sur une autre (403)", (await conf(f4.c.token, aut.jeton)).status !== 200);
if (!aut.direct) {
  verifier("Envoi au serveur sans autorisation valide refusé (403)", (await fetch(`${BASE}/api/depot/${"0".repeat(32)}?j=${falsifie}`, { method: "PUT", body: png })).status === 403);
  verifier("Envoi plus gros qu'annoncé refusé (413)", (await fetch(`${BASE}${aut.url}`, { method: "PUT", body: Buffer.concat([png, png, png]) })).status === 413);
}
verifier("Livrable : demande d'envoi refusée sans session administrateur (401)", (await fetch(`${BASE}/api/admin/commande/${idCommande}/livrable`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status === 401);
verifier("Livrable : requête venant d'un autre site refusée (403)", (await fetch(`${BASE}/api/admin/commande/${idCommande}/livrable`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookies, Origin: "https://site-malveillant.example" }, body: "{}" })).status === 403);
const faux2 = (await adminCtx.cookies()).find((k) => k.name === "sa_admin").value.replace(/^\d+/, String(Math.floor(Date.now() / 1000) + 999999));
verifier("Cookie de session modifié refusé", (await fetch(`${BASE}/api/admin/facture/${idCommande}`, { headers: { Cookie: `sa_admin=${faux2}` } })).status === 401);
const hd = (await fetch(`${BASE}/`)).headers, ha = (await fetch(`${BASE}/admin/connexion`)).headers, hc = (await fetch(`${BASE}/commande/${tokenClient}`)).headers;
verifier("En-têtes de sécurité présents (CSP, anti-cadre, nosniff, HSTS)", hd.get("content-security-policy")?.includes("frame-ancestors 'none'") && hd.get("x-frame-options") === "DENY" && hd.get("x-content-type-options") === "nosniff" && Boolean(hd.get("strict-transport-security")) && !hd.get("x-powered-by"));
verifier("Le lien secret de commande ne fuit pas vers d'autres sites (Referrer-Policy)", hc.get("referrer-policy") === "same-origin");
verifier("Administration et pages de commande exclues des moteurs de recherche", ha.get("x-robots-tag")?.includes("noindex") && hc.get("x-robots-tag")?.includes("noindex") && (await (await fetch(`${BASE}/robots.txt`)).text()).includes("/admin"));
const t0 = Date.now();
const ech = await fetch(`${BASE}/admin/connexion`, { redirect: "manual" });
verifier("Page de connexion accessible, sans indice sur le mot de passe", ech.status === 200 && !(await ech.text()).includes(MDP));

// ───────────── 8. Divers ─────────────
console.log("\n— Pages et liens —");
verifier("Commande sans cases cochées refusée côté serveur", (await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ formule: "essai" }), redirect: "manual" })).headers.get("location").includes("erreur=conditions"));
verifier("Formule inconnue → retour à l'accueil", (await fetch(`${BASE}/api/checkout`, { method: "POST", body: new URLSearchParams({ formule: "gratuit", cgv: "oui", ia: "oui" }), redirect: "manual" })).headers.get("location").endsWith("/#formules"));
verifier("Jeton de commande inconnu → 404", (await fetch(`${BASE}/commande/${"b".repeat(48)}`)).status === 404);
const liens = new Set();
for (const p of ["/", "/commander/essai", "/commander/test", "/commander/campagne", "/cgv", "/confidentialite", "/mentions-legales"]) {
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
