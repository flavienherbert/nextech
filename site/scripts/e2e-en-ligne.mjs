// Parcours complet EN LIGNE, avec Stripe en MODE TEST : commande payée par carte de test, notifications, brief,
// production, livrables, livraison, correction, validation. À lancer une fois Supabase, Stripe (test) et l'e-mail configurés.
//   ADMIN_PASSWORD=… NTFY_TOPIC=… node scripts/e2e-en-ligne.mjs [adresse-du-site]
// Variables facultatives : PREPROD_PASSWORD (si le site est protégé), EMAIL_TEST (adresse du « client » ; par défaut
// celle du studio avec un suffixe +test, donc dans votre boîte), SANS_EMAIL=1 (tester tout le reste tant que l'e-mail n'est pas configuré), FAUX (faux services de notification, pour répéter le
// scénario en local), MOCK_STRIPE=1 (page de paiement du simulateur local).
// Garde-fous : refuse de continuer si le paiement n'est pas en mode test ; la carte est la carte de test 4242 ;
// aucune vente réelle n'est possible (une clé réelle est refusée par le site).
import { createRequire } from "node:module";
import crypto from "node:crypto";
const { chromium } = createRequire(import.meta.url)("playwright");

const B = (process.argv[2] || "https://studio-accroche-preprod.netlify.app").replace(/\/$/, "");
const ADM = process.env.ADMIN_PASSWORD || "", PRE = process.env.PREPROD_PASSWORD || "", TOPIC = process.env.NTFY_TOPIC || "";
const FAUX = process.env.FAUX || "", MOCK = process.env.MOCK_STRIPE === "1";
const COMMANDE_ID = process.env.COMMANDE_ID || ""; // reprendre sur une commande précise déjà payée dont le brief est reçu (production, livraison, correction, clôture)
const COMMANDE_PAYEE = process.env.COMMANDE_PAYEE === "1"; // reprendre sur la commande de test la plus récente déjà payée (brief non reçu), sans repasser par la page de paiement
const SANS_EMAIL = process.env.SANS_EMAIL === "1"; // e-mail pas encore configuré : les contrôles d'envoi deviennent de simples avertissements
const EMAIL = process.env.EMAIL_TEST || "contactstudioaccroche+test@gmail.com";
if (!ADM) { console.error("ADMIN_PASSWORD manquant."); process.exit(2); }

let echecs = 0;
const verifier = (nom, ok, detail = "") => { if (!ok) echecs++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Contrôle d'e-mail : un simple avertissement quand SANS_EMAIL=1.
const verifierMail = (nom, ok, detail = "") => { if (SANS_EMAIL && !ok) console.log(`⚠ ${nom}  → ${detail || "e-mail non envoyé (attendu : service d'envoi non configuré)"}`); else verifier(nom, ok, detail); };
const debut = Date.now() - (COMMANDE_PAYEE ? 45 * 60_000 : 5000);

// Notifications du téléphone : relues sur ntfy.sh (ou sur les faux services en local).
async function pushs() {
  try {
    if (FAUX) return await (await fetch(`${FAUX}/_recus`)).json();
    if (!TOPIC) return null;
    const t = await (await fetch(`https://ntfy.sh/${TOPIC}/json?poll=1&since=${Math.floor(debut / 1000)}`, { signal: AbortSignal.timeout(15000) })).text();
    return t.split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.event === "message");
  } catch { return null; }
}
async function attendrePush(pred, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const l = await pushs(); if (l === null) return undefined; const x = l.find(pred); if (x) return x; await pause(1500); }
  return null;
}

const nav = await chromium.launch();
const ctxOpts = { locale: "en-US", viewport: { width: 1280, height: 1000 }, ...(PRE ? { httpCredentials: { username: "x", password: PRE } } : {}) };
const client = await (await nav.newContext(ctxOpts)).newPage();
const admin = await (await nav.newContext({ ...ctxOpts, locale: "fr-FR" })).newPage();
client.setDefaultTimeout(45000); admin.setDefaultTimeout(45000);
const erreursConsole = []; client.on("pageerror", (e) => erreursConsole.push(e.message));

try {
  // ───────── Prérequis : diagnostic exécuté sur le serveur
  console.log("— Prérequis (diagnostic du serveur) —");
  await admin.goto(`${B}/admin/connexion`, { waitUntil: "networkidle" });
  await admin.fill('input[name="motdepasse"]', ADM); await admin.click('button[type="submit"]');
  await admin.waitForURL((u) => u.pathname === "/admin");
  const d = await (await admin.context().request.get(`${B}/api/admin/diagnostic`, { timeout: 60000 })).json();
  const ligne = (section, debutNom) => d.sections.find((s) => s.titre.startsWith(section))?.lignes.find((l) => l.nom.startsWith(debutNom));
  const lignes = (section) => d.sections.find((s) => s.titre.startsWith(section))?.lignes || [];
  const base = lignes("Base").every((l) => l.etat !== "ko") && lignes("Base").length > 0;
  const stockage = lignes("Stockage").some((l) => /^Connexion/.test(l.nom) && l.etat === "ok");
  for (const l of lignes("Stockage")) if (l.etat === "ko" && !/^Connexion/.test(l.nom)) console.log(`⚠ Stockage : ${l.nom} → ${l.detail || ""} (n'empêche pas le parcours ; à examiner dans le Diagnostic)`);
  const stripeOk = !lignes("Paiement").some((l) => l.etat === "ko") && lignes("Paiement").some((l) => /test/i.test(`${l.nom} ${l.detail || ""}`));
  verifier("Base de données PostgreSQL joignable (commandes conservées)", base, lignes("Base").filter((l) => l.etat === "ko").map((l) => `${l.nom} : ${l.detail}`).join(" | "));
  verifier("Stockage de fichiers joignable", stockage, lignes("Stockage").filter((l) => l.etat === "ko").map((l) => `${l.nom} : ${l.detail}`).join(" | "));
  verifier("Paiement Stripe en mode TEST", MOCK || stripeOk, lignes("Paiement").map((l) => `${l.nom} : ${l.detail}`).join(" | "));
  const mailOk = lignes("E-mails").some((l) => /Messagerie SMTP : connexion/.test(l.nom) && l.etat === "ok") || lignes("E-mails").some((l) => /Clé Brevo valide/.test(l.nom) && l.etat === "ok");
  if (SANS_EMAIL && !mailOk) console.log("⚠ E-mail : aucun service d'envoi ne fonctionne (SANS_EMAIL=1) : les contrôles d'e-mail ci-dessous sont des avertissements.");
  else verifier("Au moins un service d'envoi d'e-mail fonctionne (Gmail ou Brevo)", mailOk, lignes("E-mails").map((l) => `${l.etat} ${l.nom}`).join(" | "));
  if (echecs) throw new Error("Prérequis manquants : le parcours ne peut pas être lancé. Corrigez les lignes ✗ ci-dessus (voir MISE-EN-LIGNE.md).");

  // ───────── 1. Le client commande et paie (carte de test)
  let token, idRepris = "";
  if (COMMANDE_ID) {
    console.log(`\n— Reprise sur la commande ${COMMANDE_ID} (déjà payée, brief reçu) —`);
    await admin.goto(`${B}/admin/commande/${COMMANDE_ID}`);
    token = (await admin.locator(".code").first().textContent()).trim().split("/").pop();
    verifier(`Commande ${COMMANDE_ID} retrouvée dans l'administration`, /^[0-9a-f]{48}$/.test(token), token);
  } else if (COMMANDE_PAYEE) {
    console.log("\n— Reprise sur une commande de test déjà payée —");
    await admin.goto(`${B}/admin?vue=attente`);
    const premier = admin.locator('.tableau a[href^="/admin/commande/"]').first();
    if (!(await premier.count())) throw new Error("Aucune commande payée en attente de brief : passez d'abord une commande de test.");
    idRepris = (await premier.textContent()).trim();
    await admin.goto(`${B}/admin/commande/${idRepris}`);
    token = (await admin.locator(".code").first().textContent()).trim().split("/").pop();
    await client.goto(`${B}/commande/${token}`, { waitUntil: "networkidle" });
    await client.waitForSelector("form.formulaire", { timeout: 60000 });
    verifier(`Commande ${idRepris} : payée (webhook signé de Stripe), formulaire de brief affiché`, true);
  } else {
  console.log("\n— Commande et paiement (mode test) —");
  await client.goto(`${B}/commander/test`, { waitUntil: "networkidle" });
  await client.fill('input[name="entreprise"]', "Client Test Studio"); await client.check('input[name="pro"]');
  await client.check('input[name="cgv"]'); await client.check('input[name="ia"]');
  await client.click('button[type="submit"]');
  if (MOCK) {
    await client.waitForURL(/\/pay\//); await client.fill('input[name="email"]', EMAIL); await client.fill('input[name="nom"]', "Client Test Studio");
    await client.click('button[value="payer"]');
  } else {
    await client.waitForURL(/checkout\.stripe\.com/, { timeout: 60000 });
    verifier("Redirection vers la page de paiement Stripe (mode test)", /checkout\.stripe\.com/.test(client.url()));
    const rempli = async (essais, valeur) => { for (const f of essais) { const l = f(); if (await l.count().catch(() => 0)) { await l.first().fill(valeur); return true; } } return false; };
    await rempli([() => client.locator("#email"), () => client.getByLabel(/^e-?mail$/i)], EMAIL);
    await rempli([() => client.locator("#cardNumber"), () => client.getByPlaceholder("1234 1234 1234 1234"), () => client.getByLabel(/card number|numéro de carte/i)], "4242424242424242");
    await rempli([() => client.locator("#cardExpiry"), () => client.getByPlaceholder("MM / YY"), () => client.getByLabel(/expiration/i)], "1234");
    await rempli([() => client.locator("#cardCvc"), () => client.getByPlaceholder("CVC"), () => client.getByLabel(/cvc|code de sécurité/i)], "123");
    await rempli([() => client.locator("#billingName"), () => client.getByLabel(/name on card|cardholder|titulaire|nom/i)], "Client Test Studio");
    await rempli([() => client.locator("#billingPostalCode"), () => client.getByLabel(/postal|zip|code postal/i)], "75001");
    const pay = client.locator("button.SubmitButton, button[data-testid='hosted-payment-submit-button'], button[type='submit']").last();
    await pay.click();
  }
  await client.waitForURL(new RegExp(`${B.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/commande/`), { timeout: 90000 });
  token = new URL(client.url()).pathname.split("/").pop();
  verifier("Retour sur le site après paiement", true);
  await client.waitForSelector("form.formulaire", { timeout: 60000 });
  verifier("Paiement confirmé par le webhook signé de Stripe : formulaire de brief affiché", true);

  }

  // ───────── 2. Notification immédiate
  console.log("\n— Notification de commande —");
  const push = COMMANDE_ID ? undefined : await attendrePush((m) => m.title === "Nouvelle commande payée" && (m.time ? m.time * 1000 >= debut : true) && (!idRepris || String(m.message).includes(idRepris)));
  if (push === undefined) console.log("• Notifications téléphone non vérifiables ici (NTFY_TOPIC absent).");
  else verifier("Notification « Nouvelle commande payée » reçue sur le téléphone, avec lien direct, sans donnée personnelle", Boolean(push) && /\/admin\/commande\//.test(push.click || "") && !/@/.test(JSON.stringify(push)), JSON.stringify(push));
  const idCommande = COMMANDE_ID || push?.message?.match(/SA-\d{6}-[A-Z0-9]{5}/)?.[0];

  // ───────── 3. Le client envoie son brief et un fichier
  if (!COMMANDE_ID) {
  console.log("\n— Brief et fichiers du client —");
  const png = Buffer.concat([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"), Buffer.from("-test-en-ligne-" + crypto.randomBytes(4).toString("hex"))]);
  await client.setInputFiles("#depot", [{ name: "photo-produit-test.png", mimeType: "image/png", buffer: png }]);
  await client.waitForFunction(() => document.querySelectorAll(".depots li").length === 1, null, { timeout: 60000 });
  verifier("Fichier du client déposé directement dans le stockage", true);
  await client.fill('input[name="nom"]', "Client Test Studio"); await client.fill('input[name="marque"]', "Marque de test en ligne");
  await client.fill('input[name="nomFacture"]', "Client Test Studio"); await client.fill('textarea[name="adresseFacture"]', "1 rue du Test\n75001 Paris");
  // Pas de site internet : le champ reste vide (il est facultatif)
  await client.fill('input[name="produit"]', "Produit de test");
  await client.selectOption('select[name="style"]', "Complice");
  await client.click('form.formulaire button[type="submit"]');
  await client.waitForSelector(".jalons");
  verifier("Brief enregistré sans site internet (champ facultatif laissé vide)", true);
  }

  // ───────── 4. Le vendeur traite la commande
  console.log("\n— Traitement par le vendeur (administration) —");
  let id = idCommande;
  if (!COMMANDE_ID) {
    await admin.goto(`${B}/admin?vue=toutes&q=${encodeURIComponent("Marque de test en ligne")}`);
    id = idCommande || (await admin.locator('.tableau a[href^="/admin/commande/"]').first().textContent()).trim();
    verifier("La commande apparaît dans le tableau de bord (recherche par marque)", Boolean(id), "introuvable");
  }
  await admin.goto(`${B}/admin/commande/${id}`);
  const texte = await admin.locator(".admin-grille").textContent();
  if (!COMMANDE_ID) {
    verifier("Page de la commande : brief et fichier du client, rattachés à la bonne commande", ["Marque de test en ligne", "Produit de test", "photo-produit-test.png"].every((t) => texte.includes(t)));
    verifier("Brief sans site internet : aucune ligne « Lien » affichée, rien de cassé", !/Lien\s*https?:/.test(texte));
    const [dl] = await Promise.all([admin.waitForEvent("download"), admin.locator(`a[href^="/api/admin/fichier/${id}/"]`).first().click()]);
    verifier("Téléchargement du fichier du client", dl.suggestedFilename() === "photo-produit-test.png");
  } else {
    const nbFichiers = await admin.locator(`a[href^="/api/admin/fichier/${id}/"]`).count();
    if (nbFichiers) { const [dl] = await Promise.all([admin.waitForEvent("download"), admin.locator(`a[href^="/api/admin/fichier/${id}/"]`).first().click()]); verifier("Téléchargement d'un fichier du client par l'administrateur", Boolean(dl.suggestedFilename())); }
  }
  if (await admin.locator("button:has-text('Démarrer la production')").count()) {
    await admin.check('input[name="scriptValide"]');
    await admin.click("button:has-text('Démarrer la production')");
    await admin.waitForURL(/ok=production/);
  }
  const banniere = async () => (await admin.locator(".avis").allTextContents()).join(" ");
  const mailPart = async (r) => { const t = await banniere(); return /E-mail envoyé au client/.test(t) ? "oui" : /pas pu être envoyé/.test(t) ? "non" : r; };
  if (/ok=production/.test(admin.url())) verifierMail("Production démarrée : e-mail au client réellement expédié", (await mailPart("?")) === "oui", await banniere());
  const video = Buffer.concat([Buffer.from("00000018667479706d703432", "hex"), crypto.randomBytes(1024 * 1024)]);
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), crypto.randomBytes(4096)]);
  await admin.setInputFiles("#livrable", [{ name: "video-test.mp4", mimeType: "video/mp4", buffer: video }, { name: "script-test.pdf", mimeType: "application/pdf", buffer: pdf }]);
  await admin.waitForFunction(() => [...document.querySelectorAll(".telechargements a")].filter((a) => a.textContent.trim() === "Voir").length === 2, null, { timeout: 60000 });
  verifier("Vidéo et PDF déposés dans les livrables", true);
  await admin.goto(`${B}/admin/commande/${id}`);
  await admin.click("button:has-text('Envoyer la livraison au client')");
  await admin.waitForURL(/ok=livraison/);
  verifierMail("Livraison envoyée au client : e-mail réellement expédié", (await mailPart("?")) === "oui", await banniere());

  // L'e-mail de livraison (archivé, qu'il soit parti ou non) contient un lien privé par fichier, qui fonctionne sans connexion.
  await admin.goto(`${B}/admin/courriels`);
  const blocLiv = admin.locator("details.courriel", { hasText: id }).filter({ hasText: "à valider" }).first();
  await blocLiv.locator("summary").click();
  const texteLiv = await blocLiv.locator("pre").textContent();
  const liensMail = [...new Set([...texteLiv.matchAll(/https?:\/\/\S+\/api\/commande\/[0-9a-f]+\/fichier\/[0-9a-f]+/g)].map((x) => x[0]))];
  const dlMail = await Promise.all(liensMail.map(async (u) => { const rr = await fetch(u, PRE ? { headers: { Authorization: "Basic " + Buffer.from("x:" + PRE).toString("base64") } } : {}); return { statut: rr.status, disp: rr.headers.get("content-disposition") || "", n: (await rr.arrayBuffer()).byteLength }; }));
  verifier("E-mail de livraison : un lien privé par fichier (vidéo et PDF), qui télécharge sans aucune connexion, en pièce jointe", liensMail.length === 2 && dlMail.every((x) => x.statut === 200 && /attachment/.test(x.disp)) && dlMail.map((x) => x.n).sort((a, b) => a - b).join() === [pdf.length, video.length].sort((a, b) => a - b).join(), JSON.stringify({ liens: liensMail.length, dlMail }));
  const mauvaisJeton = liensMail[0]?.replace(/\/commande\/[0-9a-f]+\//, `/commande/${"c".repeat(48)}/`);
  verifier("Même lien avec un mauvais jeton : introuvable (404) — les fichiers restent privés", Boolean(mauvaisJeton) && (await fetch(mauvaisJeton)).status === 404);

  // ───────── 5. Le client télécharge, demande une correction
  console.log("\n— Livraison, correction et validation (client) —");
  await client.goto(`${B}/commande/${token}`);
  await client.waitForSelector(".telechargements");
  const lienVideo = await client.locator('.telechargements a[href*="/fichier/"]').first().getAttribute("href");
  const r = await fetch(new URL(lienVideo, B), PRE ? { headers: { Authorization: "Basic " + Buffer.from("x:" + PRE).toString("base64") } } : {});
  const recu = Buffer.from(await r.arrayBuffer());
  verifier("Le client télécharge ses fichiers par son lien privé (contenu intact)", r.status === 200 && (recu.equals(video) || recu.equals(pdf)), `HTTP ${r.status}, ${recu.length} octets`);
  await client.click("text=Demander un tour de retouches");
  await client.fill(".validation textarea", "Merci de mettre le prix en début de vidéo.");
  await client.click("text=Envoyer ma demande");
  await client.waitForSelector(".jalons li.courant:has-text('En production')");
  const pushCorr = await attendrePush((m) => m.title === "Correction demandée" && (m.time ? m.time * 1000 >= debut : true));
  if (pushCorr !== undefined) verifier("Correction demandée : alerte reçue sur le téléphone", Boolean(pushCorr), "aucune alerte");
  await admin.goto(`${B}/admin?vue=corrections`);
  verifier("Tableau de bord : la commande est dans « Corrections demandées »", (await admin.locator('.tableau a[href^="/admin/commande/"]').allTextContents()).map((s) => s.trim()).includes(id));
  await admin.goto(`${B}/admin/commande/${id}`);
  verifier("La demande du client est citée en haut de la commande", (await admin.locator(".etape").textContent()).includes("prix en début de vidéo"));
  await admin.click("button:has-text('Envoyer la version corrigée au client')");
  await admin.waitForURL(/ok=livraison/);
  verifierMail("Version corrigée envoyée : e-mail réellement expédié", (await mailPart("?")) === "oui", await banniere());
  await client.goto(`${B}/commande/${token}`);
  await client.click("text=Je valide la livraison");
  await client.waitForSelector("h1:has-text('livrée')");
  verifier("Validation par le client : commande livrée", true);
  await admin.goto(`${B}/admin?vue=terminees`);
  verifier("Tableau de bord : la commande est dans « Terminées »", (await admin.locator('.tableau a[href^="/admin/commande/"]').allTextContents()).map((s) => s.trim()).includes(id));
  await admin.goto(`${B}/admin/commande/${id}`);
  const histo = await admin.locator(".admin-grille").textContent();
  verifierMail("Aucun e-mail en échec dans l'historique de la commande", !/\((échec|non envoyé)/.test(histo) && /\(envoyé, via (smtp|brevo|resend)\)/.test(histo), histo.slice(histo.indexOf("Notifications"), histo.indexOf("Notifications") + 500));
  verifier("Aucune erreur JavaScript côté client", erreursConsole.length === 0, erreursConsole.join(" | "));
  // ───────── 6. Inventaire des e-mails de la commande : chacun doit exister, être RÉELLEMENT parti, et une seule fois
  console.log("\n— E-mails de la commande (un par étape) —");
  await admin.goto(`${B}/admin/courriels`);
  const resumes = await admin.locator("details.courriel", { hasText: id }).evaluateAll((els) => els.map((e) => e.querySelector("summary").innerText.replace(/\s+/g, " ").trim()));
  const adresseVendeur = process.env.ADMIN_EMAIL || "contactstudioaccroche@gmail.com";
  const ATTENDUS = [
    ["vendeur", /Nouvelle commande payée/, "Paiement confirmé : notification de nouvelle commande"],
    ["client", /confirmée — il nous manque votre brief/, "Paiement confirmé : confirmation et demande du brief"],
    ["vendeur", /Brief reçu/, "Brief reçu : notification au vendeur"],
    ["client", /brief bien reçu/, "Brief reçu : accusé au client"],
    ["client", /production lancée/, "Production lancée : e-mail au client"],
    ["client", /— à valider/, "Livraison : e-mail avec les liens de téléchargement"],
    ["vendeur", /Retouche demandée/, "Correction demandée : notification au vendeur"],
    ["client", /demande de retouche est bien reçue/, "Correction demandée : accusé de réception au client"],
    ["client", /version corrigée à valider/, "Version corrigée : e-mail avec les liens de téléchargement"],
    ["vendeur", /Commande validée/, "Validation : notification au vendeur"],
    ["client", /vos fichiers sont disponibles/, "Validation : e-mail de clôture au client"],
  ];
  for (const [qui, motif, nom] of ATTENDUS) {
    const trouves = resumes.filter((r) => motif.test(r));
    const partis = trouves.filter((r) => /· envoyé$/.test(r));
    const bonDest = partis.some((r) => (qui === "vendeur" ? r.includes(`à ${adresseVendeur}`) : !r.includes(`à ${adresseVendeur}`)));
    verifierMail(`${nom} : envoyé${qui === "vendeur" ? " à " + adresseVendeur : " au client"}, une seule fois`, partis.length === 1 && bonDest, `${trouves.length} archivé(s), ${partis.length} réellement envoyé(s)`);
  }

  console.log(`\nCommande de test : ${id} (visible dans l'administration, mode test).`);
} catch (e) {
  verifier("Déroulement du parcours", false, e.message.split("\n")[0]);
}
await nav.close();
console.log(echecs ? `\n${echecs} point(s) à traiter.` : "\nParcours complet réussi.");
process.exit(echecs ? 1 : 0);
