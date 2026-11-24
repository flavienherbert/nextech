// Test de bout en bout de la bibliothèque de publicités (Administration → Publicités, Avatars ; portfolio public), contre le site lancé.
// Prérequis : site sur BASE (mêmes variables que scripts/e2e-medias.mjs), ffmpeg pour fabriquer les fichiers de test.
// Usage : BASE=http://localhost:3300 node scripts/e2e-bibliotheque.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE || "http://localhost:3000";
const MDP = process.env.ADMIN_PASSWORD || "demonstration";
const CAPTURES = process.env.CAPTURES || "";
const resultats = [];
const verifier = (nom, ok, detail = "") => { resultats.push({ nom, ok: Boolean(ok) }); console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };

// Fichiers de test (le dossier de travail est jeté à la fin)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sa-biblio-"));
const jpg = path.resolve("scripts/fixtures/demonstration.jpg");
const mp4 = path.resolve("scripts/fixtures/demonstration.mp4");
const tailleMp4 = fs.statSync(mp4).size;
const paysage = path.join(tmp, "paysage.mp4");
const longue = path.join(tmp, "longue.mp4");
const faux = path.join(tmp, "faux.mp4");
const ffmpeg = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a]);
ffmpeg("-f", "lavfi", "-i", "color=c=0x224466:s=320x180:r=10", "-t", "3", "-c:v", "libx264", "-pix_fmt", "yuv420p", paysage);
ffmpeg("-f", "lavfi", "-i", "color=c=0x442266:s=160x90:r=1", "-t", "65", "-c:v", "libx264", "-pix_fmt", "yuv420p", longue);
fs.writeFileSync(faux, "ceci n'est pas une vidéo");

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const admin = await ctx.newPage();
const erreursAdmin = [];
admin.on("console", (m) => { if (m.type() === "error") erreursAdmin.push(m.text()); });
admin.on("pageerror", (e) => erreursAdmin.push(String(e)));
const apres = async (motif) => { await admin.waitForURL(motif, { timeout: 20000 }); await admin.waitForSelector(".avis-ok, .avis-erreur", { timeout: 20000 }); };
const cap = async (page, nom) => { if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/${nom}.png`, fullPage: true }); };
const page = async (chemin) => { const r = await fetch(`${BASE}${chemin}`); return { status: r.status, html: await r.text(), entetes: r.headers }; };

// — Accès protégé
await admin.goto(`${BASE}/admin/publicites`);
verifier("La galerie des publicités exige la connexion", admin.url().includes("/admin/connexion"), admin.url());
for (const chemin of ["/admin/publicites/nouvelle", "/admin/publicites/PUB-001", "/admin/avatars"]) {
  await admin.goto(`${BASE}${chemin}`);
  verifier(`${chemin} exige la connexion`, admin.url().includes("/admin/connexion"), admin.url());
}
const sansSession = await Promise.all([
  fetch(`${BASE}/api/admin/bibliotheque`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: "a.mp4", type: "video/mp4", taille: 100 }) }),
  fetch(`${BASE}/api/admin/bibliotheque/confirmer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
  fetch(`${BASE}/api/admin/bibliotheque/fichier/${"a".repeat(32)}.mp4`),
]);
verifier("Sans connexion : réservation, confirmation et lecture privée des fichiers refusées (401)", sansSession.every((r) => r.status === 401), sansSession.map((r) => r.status).join(","));
await admin.goto(`${BASE}/admin/publicites`);
await admin.fill('input[name="motdepasse"]', MDP); await admin.click('button[type="submit"]');
await admin.waitForURL(/\/admin\/publicites/, { timeout: 15000 });
verifier("Après connexion, retour sur la galerie", (await admin.textContent("h1")).includes("Bibliothèque de publicités"));
await admin.goto(`${BASE}/admin`);
verifier("La barre de l'administration porte les liens « Publicités » et « Avatars »", (await admin.locator('.actions a[href="/admin/publicites"]').count()) === 1 && (await admin.locator('.actions a[href="/admin/avatars"]').count()) === 1);

// — État initial : aucune publicité publiée, rien dans le menu
await admin.goto(`${BASE}/admin/publicites`);
const nbDepart = await admin.locator("article.pub-carte").count();
const accueil0 = await page("/");
const real0 = await page("/realisations");
const AUCUNE = /Aucune réalisation n(&#x27;|')est présentée/;
const MENTION = /Création de démonstration réalisée avec l(&#x27;|')IA — marque et produit fictifs\./;
verifier("Aucune publicité publiée : « Réalisations » absent du menu de l'accueil, la page affiche un message simple", nbDepart === 0 && !accueil0.html.includes('href="/realisations"') && real0.status === 200 && AUCUNE.test(real0.html), `${nbDepart} ${real0.status}`);
verifier("Aucune publicité à la une : l'accueil garde ses emplacements habituels (aucune section « Voir toutes les réalisations »)", !accueil0.html.includes("Voir toutes les réalisations"));
await cap(admin, "bibliotheque-vide");

// — Contrôles côté navigateur sur le formulaire
await admin.goto(`${BASE}/admin/publicites/nouvelle`);
await admin.setInputFiles("#envoi-video", faux);
await admin.waitForSelector(".pub-fichiers .avis-erreur");
verifier("Fichier qui n'est pas une vidéo : refusé avec un message clair", (await admin.locator(".pub-fichiers .avis-erreur").first().innerText()).includes("pas une vidéo lisible"));
await admin.setInputFiles("#envoi-video", longue);
await admin.waitForSelector('.pub-fichiers .avis-erreur:has-text("65 secondes")', { timeout: 15000 });
verifier("Vidéo de plus de 60 secondes : refusée", (await admin.locator(".pub-fichiers .avis-erreur").first().innerText()).includes("65 secondes"));
await admin.setInputFiles("#envoi-video", paysage);
await admin.waitForSelector(".pub-fichiers .pub-envoi-apercu video", { timeout: 20000 });
verifier("Vidéo 16:9 alors que le format choisi est 9:16 : alerte (sans blocage), durée remplie depuis la vidéo", (await admin.locator(".pub-fichiers .avis").first().innerText()).includes("format choisi") && (await admin.locator('[name="dureeSecondes"]').inputValue()) === "3", await admin.locator('[name="dureeSecondes"]').inputValue());
await admin.locator('[name="format"]').selectOption("16:9");
const alerteDisparue = await admin.waitForFunction(() => !/format choisi/.test(document.querySelector(".pub-fichiers")?.textContent || ""), null, { timeout: 5000 }).then(() => true, () => false);
verifier("En passant le format à 16:9, l'alerte disparaît", alerteDisparue);

// — Création d'une première fiche, avec vidéo et miniature capturée dans le navigateur
await admin.goto(`${BASE}/admin/publicites/nouvelle`);
await admin.locator('[name="nom"]').fill("Gourde test");
await admin.locator('[name="produit"]').fill("Gourde isotherme");
await admin.locator('[name="categorie"]').selectOption("Sport");
await admin.locator('[name="avatarId"]').selectOption("femme-01");
await admin.locator('[name="style"]').selectOption("UGC présentateur");
await admin.locator('[name="statut"]').selectOption("validee");
await admin.getByLabel("Script", { exact: true }).fill("Ligne secrète du script\nSeconde ligne");
await admin.getByLabel("Prompt de génération").fill("PROMPT-SECRET-HIGGSFIELD");
await admin.setInputFiles("#envoi-video", mp4);
await admin.waitForSelector(".pub-fichiers .pub-envoi-apercu video", { timeout: 30000 });
verifier("Sans miniature, le bouton « Capturer la miniature » est proposé", (await admin.getByRole("button", { name: "Capturer la miniature" }).count()) === 1);
await admin.getByRole("button", { name: "Capturer la miniature" }).click();
await admin.waitForSelector(".pub-fichiers .pub-envoi-apercu img", { timeout: 30000 });
verifier("Miniature capturée dans le navigateur (image envoyée, aucun traitement serveur)", (await admin.locator(".pub-fichiers .pub-envoi-apercu img").count()) === 1 && (await admin.getByRole("button", { name: "Capturer la miniature" }).count()) === 0);
await cap(admin, "bibliotheque-formulaire");
await admin.getByRole("button", { name: "Créer la publicité" }).click();
await admin.waitForURL(/\/admin\/publicites\/PUB-\d+\?ok=cree/, { timeout: 20000 });
const pub1 = /PUB-\d+/.exec(admin.url())[0];
verifier("Création : numéro attribué par le serveur (PUB-xxx), publicité privée au départ", /^PUB-\d{3}$/.test(pub1) && (await admin.locator(".admin-tete .pastille", { hasText: "Privée" }).count()) === 1, pub1);
const idVideo1 = (await admin.locator(".pub-apercu video").getAttribute("src")).split("/").pop();
const idMini1 = (await admin.locator(".pub-apercu video").getAttribute("poster")).split("/").pop();
verifier("La fiche relit ses données : vidéo, miniature, script, prompt, avatar", /^[0-9a-f]{32}\.mp4$/.test(idVideo1) && /^[0-9a-f]{32}\.jpg$/.test(idMini1) && (await admin.getByLabel("Script", { exact: true }).inputValue()).startsWith("Ligne secrète") && (await admin.getByLabel("Prompt de génération").inputValue()) === "PROMPT-SECRET-HIGGSFIELD" && (await admin.locator('[name="avatarId"]').inputValue()) === "femme-01", `${idVideo1} ${idMini1}`);

// — Lecture privée (administrateur) et fichiers inaccessibles publiquement tant que la fiche n'est pas publiée
const priveV = await ctx.request.get(`${BASE}/api/admin/bibliotheque/fichier/${idVideo1}`, { headers: { Range: "bytes=0-99" }, maxRedirects: 0 });
verifier("Lecture privée de la vidéo par l'administrateur (lecture par plages ou lien signé, jamais en cache)", [200, 206, 302].includes(priveV.status()) && /no-store/.test(priveV.headers()["cache-control"] || ""), `${priveV.status()} ${priveV.headers()["cache-control"]}`);
const priveM = await ctx.request.get(`${BASE}/api/admin/bibliotheque/fichier/${idMini1}`);
verifier("Lecture privée de la miniature : image, no-store, sandbox", priveM.status() === 200 && priveM.headers()["content-type"] === "image/jpeg" && /no-store/.test(priveM.headers()["cache-control"]) && /sandbox/.test(priveM.headers()["content-security-policy"] || ""), `${priveM.status()} ${priveM.headers()["content-type"]}`);
const prive404 = await Promise.all(["../fichiers/x", `${"0".repeat(32)}.mp4`, `${idVideo1.replace(".mp4", ".svg")}`].map((id) => ctx.request.get(`${BASE}/api/admin/bibliotheque/fichier/${encodeURIComponent(id)}`)));
verifier("Lecture privée : chemin détourné, fichier inconnu, extension non admise → 404", prive404.every((r) => r.status() === 404), prive404.map((r) => r.status()).join(","));
const publicNon = async () => (await Promise.all([
  fetch(`${BASE}/b/${idVideo1}?p=${pub1}`, { redirect: "manual" }), fetch(`${BASE}/b/${idMini1}?p=${pub1}`, { redirect: "manual" }), fetch(`${BASE}/b/${idVideo1}`, { redirect: "manual" }),
  fetch(`${BASE}/b/${idVideo1}?p=PUB-9999`, { redirect: "manual" }), fetch(`${BASE}/b/..%2Ffichiers%2Fx?p=${pub1}`, { redirect: "manual" }), fetch(`${BASE}/b/${idVideo1}?p=${encodeURIComponent("../publicites/" + pub1)}`, { redirect: "manual" }),
])).map((r) => r.status);
const avantPub = await publicNon();
verifier("Fiche non publiée : ni la vidéo, ni la miniature ne sont accessibles au public (404), sans adresse devinable", avantPub.every((s) => s === 404), avantPub.join(","));
verifier("Les fichiers de la bibliothèque ne sont pas dans les médias du site (/m/ ne les sert pas)", (await fetch(`${BASE}/m/temps-1?v=${idMini1}`)).status === 404);

// — Publication
await admin.getByRole("button", { name: "Publier", exact: true }).click();
await apres(/ok=publiee/);
verifier("Publication : la fiche est marquée « Publiée »", (await admin.locator(".admin-tete .pastille", { hasText: "Publiée" }).count()) === 1);
const lireP = async (id, plage) => { const r = await fetch(`${BASE}/b/${id}?p=${pub1}`, { headers: plage ? { Range: plage } : {} }); return { r, b: Buffer.from(await r.arrayBuffer()) }; };
const pleine = await lireP(idVideo1);
verifier("Après publication : la vidéo est servie au public, taille exacte, plages acceptées", pleine.r.status === 200 && pleine.b.length === tailleMp4 && /video\/mp4/.test(pleine.r.headers.get("content-type") || ""), `${pleine.r.status} ${pleine.b.length}/${tailleMp4}`);
const pl1 = await lireP(idVideo1, "bytes=0-99"), pl2 = await lireP(idVideo1, "bytes=-50");
verifier("Lecture par plages (indispensable sur iPhone)", pl1.r.status === 206 && pl1.b.length === 100 && pl2.r.status === 206 && pl2.b.length === 50, `${pl1.r.status} ${pl1.b.length} ${pl2.r.status} ${pl2.b.length}`);
const miniP = await fetch(`${BASE}/b/${idMini1}?p=${pub1}`);
const etag = miniP.headers.get("etag");
verifier("Après publication : la miniature est servie (image, cache d'une heure, nosniff, sandbox) et la requête conditionnelle donne 304", miniP.status === 200 && miniP.headers.get("content-type") === "image/jpeg" && /max-age=3600/.test(miniP.headers.get("cache-control") || "") && !/immutable/.test(miniP.headers.get("cache-control") || "") && miniP.headers.get("x-content-type-options") === "nosniff" && /sandbox/.test(miniP.headers.get("content-security-policy") || "") && (await fetch(`${BASE}/b/${idMini1}?p=${pub1}`, { headers: { "If-None-Match": etag } })).status === 304, `${miniP.status} ${miniP.headers.get("cache-control")}`);
const autres = await Promise.all([fetch(`${BASE}/b/${idVideo1}`), fetch(`${BASE}/b/${idVideo1}?p=PUB-9999`), fetch(`${BASE}/b/${"0".repeat(32)}.mp4?p=${pub1}`), fetch(`${BASE}/b/${idVideo1.replace(".mp4", ".svg")}?p=${pub1}`)]);
verifier("Publiée : seul le fichier réellement rattaché à cette publicité est servi (sans « p », autre publicité, fichier inconnu, extension non admise → 404)", autres.every((r) => r.status === 404), autres.map((r) => r.status).join(","));

// — Portfolio public
const real1 = await page("/realisations");
verifier("Portfolio : la publicité publiée y figure, avec la mention « création de démonstration » bien visible", real1.html.includes("Gourde test") && MENTION.test(real1.html));
verifier("Portfolio : adresses publiques /b/…?p=…, catégorie, style et durée affichés", real1.html.includes(`/b/${idVideo1}?p=${pub1}`) && real1.html.includes("Sport") && real1.html.includes("UGC présentateur") && /\d+ s/.test(real1.html));
verifier("Portfolio : ni prompt, ni script, ni avatar, ni statut, ni numéro de fiche interne exposés", !/PROMPT-SECRET|Ligne secrète|femme-01|Femme 01|Validée|validee/.test(real1.html));
const accueil1 = await page("/");
verifier("Accueil : le menu propose « Réalisations » dès qu'une publicité est publiée", accueil1.html.includes('href="/realisations"'));
verifier("Accueil : sans publicité à la une, la section « Exemples » de la bibliothèque n'apparaît pas", !accueil1.html.includes("Voir toutes les réalisations"));

// — À la une
await admin.getByRole("button", { name: "Mettre à la une" }).click();
await apres(/ok=une/);
const accueil2 = await page("/");
verifier("À la une : l'accueil affiche la publicité, avec la mention IA et le lien « Voir toutes les réalisations »", accueil2.html.includes("Gourde test") && accueil2.html.includes("Voir toutes les réalisations") && accueil2.html.includes(`/b/${idVideo1}?p=${pub1}`) && MENTION.test(accueil2.html) && accueil2.html.includes('id="exemples"'));
verifier("Accueil : aucun prompt ni script de la bibliothèque dans le code de la page", !/PROMPT-SECRET|Ligne secrète|femme-01/.test(accueil2.html));
await cap(admin, "bibliotheque-fiche");

// — Une deuxième fiche, pour les filtres du portfolio
await admin.goto(`${BASE}/admin/publicites/nouvelle`);
await admin.locator('[name="nom"]').fill("Crème éclat");
await admin.locator('[name="categorie"]').selectOption("Beauté");
await admin.locator('[name="style"]').selectOption("Unboxing");
await admin.locator('[name="statut"]').selectOption("validee");
await admin.setInputFiles("#envoi-video", mp4);
await admin.waitForSelector(".pub-fichiers .pub-envoi-apercu video", { timeout: 30000 });
await admin.setInputFiles("#envoi-miniature", jpg);
await admin.waitForSelector(".pub-fichiers .pub-envoi-apercu img", { timeout: 30000 });
await admin.getByRole("button", { name: "Créer la publicité" }).click();
await admin.waitForURL(/\/admin\/publicites\/PUB-\d+\?ok=cree/, { timeout: 20000 });
const pub2 = /PUB-\d+/.exec(admin.url())[0];
await admin.getByRole("button", { name: "Publier", exact: true }).click();
await apres(/ok=publiee/);
verifier("Deuxième fiche : numéro différent et suivant, publiée", pub2 !== pub1 && Number(pub2.slice(4)) === Number(pub1.slice(4)) + 1, `${pub1} ${pub2}`);

const visiteur = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const erreursVisiteur = [];
visiteur.on("console", (m) => { if (m.type() === "error") erreursVisiteur.push(m.text()); });
visiteur.on("pageerror", (e) => erreursVisiteur.push(String(e)));
await visiteur.goto(`${BASE}/realisations`);
await visiteur.waitForSelector("figure.realisation");
verifier("Portfolio (téléphone) : deux réalisations, filtres par catégorie et par style proposés", (await visiteur.locator("figure.realisation").count()) === 2 && (await visiteur.locator(".realisations-filtre").count()) === 2);
await visiteur.getByRole("button", { name: "Beauté" }).click();
const visibles = async () => visiteur.locator("figure.realisation:not([hidden]) strong").allInnerTexts();
verifier("Filtre « Beauté » : seule la crème reste visible", (await visibles()).join() === "Crème éclat", (await visibles()).join());
await visiteur.getByRole("button", { name: "Toutes" }).first().click();
await visiteur.getByRole("button", { name: "Unboxing" }).click();
verifier("Filtre par style « Unboxing » : seule la crème reste visible", (await visibles()).join() === "Crème éclat", (await visibles()).join());
await visiteur.getByRole("button", { name: "Sport" }).click();
verifier("Catégorie « Sport » + style « Unboxing » : aucun résultat, message affiché", (await visibles()).length === 0 && (await visiteur.locator(".avis", { hasText: "Aucune réalisation ne correspond" }).count()) === 1);
await visiteur.getByRole("button", { name: "Toutes" }).nth(0).click();
await visiteur.getByRole("button", { name: "Toutes" }).nth(1).click();
verifier("« Toutes » rétablit l'ensemble des réalisations", (await visibles()).length === 2);
const largeur = await visiteur.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
verifier("Portfolio (téléphone) : aucun défilement horizontal", largeur[0] <= largeur[1], largeur.join("/"));
await visiteur.locator("figure.realisation .demo-lecture").first().click();
await visiteur.waitForFunction(() => { const v = document.querySelector("figure.realisation video"); return v && !v.paused && v.currentTime > 0.2; }, null, { timeout: 20000 }).catch(() => {});
const lecture = await visiteur.evaluate(() => { const v = document.querySelector("figure.realisation video"); return { pause: v.paused, t: v.currentTime }; });
verifier("Navigateur : la vidéo du portfolio se lit au clic (adresse publique /b/, par plages)", !lecture.pause && lecture.t > 0, JSON.stringify(lecture));
verifier("Navigateur : aucune erreur de politique de sécurité sur le portfolio", erreursVisiteur.filter((e) => /Content Security|Refused|blocked/i.test(e)).length === 0, erreursVisiteur.join(" | "));
await cap(visiteur, "realisations-mobile");

// — Galerie d'administration : cartes, compteurs, recherche, filtres dans l'adresse
await admin.goto(`${BASE}/admin/publicites`);
verifier("Galerie : une carte par publicité (miniature, numéro, nom, statut, « Publiée », « À la une »)", (await admin.locator("article.pub-carte").count()) === 2 && (await admin.locator(`article.pub-carte:has-text("${pub1}")`).innerText()).includes("Gourde test") && /à la une/i.test(await admin.locator(`article.pub-carte:has-text("${pub1}")`).innerText()) && (await admin.locator(`article.pub-carte:has-text("${pub2}") img`).count()) === 1);
const compteurs = await admin.locator(".compteurs").innerText();
verifier("Galerie : compteurs (total, par statut, publiées)", /2\s*publicités/.test(compteurs) && /2\s*Validée/.test(compteurs) && /2\s*publiées/.test(compteurs), compteurs.replace(/\s+/g, " "));
const nbCartes = async (q) => { await admin.goto(`${BASE}/admin/publicites${q}`); return admin.locator("article.pub-carte").count(); };
verifier("Filtres dans l'adresse : catégorie, statut, publiée, avatar", (await nbCartes("?categorie=Sport")) === 1 && (await nbCartes("?categorie=Beaut%C3%A9&statut=validee")) === 1 && (await nbCartes("?statut=refusee")) === 0 && (await nbCartes("?publiee=non")) === 0 && (await nbCartes("?publiee=oui")) === 2 && (await nbCartes("?avatar=femme-01")) === 1 && (await nbCartes("?avatar=aucun")) === 1 && (await nbCartes("?style=Unboxing")) === 1);
verifier("Recherche sans accent ni majuscule (nom, produit, numéro)", (await nbCartes("?q=creme")) === 1 && (await nbCartes("?q=ISOTHERME")) === 1 && (await nbCartes(`?q=${pub2.toLowerCase()}`)) === 1 && (await nbCartes("?q=introuvable")) === 0);
await admin.goto(`${BASE}/admin/publicites`);
await admin.locator('[name="categorie"]').selectOption("Beauté");
await admin.getByRole("button", { name: "Filtrer" }).click();
await admin.waitForURL(/categorie=Beaut/);
verifier("Le formulaire de filtre met les critères dans l'adresse (partageable) et la page les relit", (await admin.locator("article.pub-carte").count()) === 1 && (await admin.locator('[name="categorie"]').inputValue()) === "Beauté");
await admin.goBack();
verifier("Retour en arrière : la galerie complète est de nouveau affichée", (await admin.locator("article.pub-carte").count()) === 2);
const admLarg = await admin.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
verifier("Galerie (bureau) : aucun défilement horizontal", admLarg[0] <= admLarg[1], admLarg.join("/"));
await cap(admin, "bibliotheque-galerie");

// — Avatars
await admin.goto(`${BASE}/admin/avatars`);
const nomsAvatars = await admin.locator("article.avatar-carte h2").allInnerTexts();
verifier("Avatars : les quatre avatars de base sont présents", ["Femme 01", "Femme 02", "Homme 01", "Homme 02"].every((n) => nomsAvatars.some((x) => x.startsWith(n))), nomsAvatars.join("|"));
verifier("Avatars : « Femme 01 » est lié à une publicité (lien vers la galerie filtrée) et ne peut pas être supprimé", (await admin.locator("#femme-01 a[href='/admin/publicites?avatar=femme-01']").count()) === 1 && (await admin.locator("#femme-01 button:has-text('Supprimer')").isDisabled()));
await admin.goto(`${BASE}/admin/avatars?erreur=lie&avatar=femme-01`);
verifier("Refus de suppression : la liste des publicités concernées est affichée", (await admin.locator(".avis-erreur").innerText()).includes(pub1));
await admin.goto(`${BASE}/admin/avatars`);
const ajout = admin.locator('section[aria-labelledby="ajout-avatar"]');
await ajout.locator('[name="nom"]').fill("Léa Test");
await ajout.locator('[name="genre"]').selectOption("femme");
await ajout.locator('[name="description"]').fill("Brune, ton chaleureux");
await ajout.locator('[name="reference"]').fill("Higgsfield · Soul ID test");
await ajout.locator('input[type="file"]').setInputFiles(jpg);
await ajout.locator(".pub-envoi-apercu img").waitFor({ timeout: 30000 });
await ajout.getByRole("button", { name: "Ajouter l'avatar" }).click();
await admin.waitForSelector("#lea-test", { timeout: 20000 });
verifier("Avatars : ajout d'un avatar libre (identifiant déduit du nom, photo, description, référence)", (await admin.locator("#lea-test").innerText()).includes("Higgsfield · Soul ID test") && (await admin.locator("#lea-test .avatar-photo img").count()) === 1);
const photoSrc = await admin.locator("#lea-test .avatar-photo img").getAttribute("src");
verifier("Avatars : la photo n'est servie qu'à l'administrateur (jamais publiquement)", (await ctx.request.get(`${BASE}${photoSrc}`)).status() === 200 && (await fetch(`${BASE}${photoSrc}`)).status === 401 && (await fetch(`${BASE}/b/${photoSrc.split("/").pop()}?p=${pub1}`)).status === 404);
await admin.locator("#lea-test summary").click();
await admin.locator('#lea-test [name="description"]').fill("Brune, ton très chaleureux");
await admin.locator("#lea-test").getByRole("button", { name: "Enregistrer" }).click();
await admin.waitForFunction(() => /Enregistré\./.test(document.querySelector("#lea-test")?.textContent || ""));
await admin.reload();
verifier("Avatars : modification enregistrée", (await admin.locator("#lea-test").innerText()).includes("très chaleureux"));
await admin.locator("#lea-test form button:has-text('Supprimer')").click();
await apres(/ok=supprime/);
verifier("Avatars : un avatar non lié se supprime", (await admin.locator("#lea-test").count()) === 0);
await cap(admin, "bibliotheque-avatars");

// — Dépublication, publication automatique retirée, duplication, suppression
await admin.goto(`${BASE}/admin/publicites/${pub1}`);
await admin.getByRole("button", { name: "Dépublier" }).click();
await apres(/ok=depubliee/);
const apresDepub = await publicNon();
verifier("Après dépublication : la vidéo et la miniature ne sont plus accessibles au public (404), la une est retirée", apresDepub.slice(0, 2).every((s) => s === 404) && (await admin.locator(".admin-tete .pastille", { hasText: "À la une" }).count()) === 0);
const accueil3 = await page("/");
verifier("Après dépublication : la publicité a disparu de l'accueil, le menu « Réalisations » reste (une autre est publiée)", !accueil3.html.includes("Gourde test") && accueil3.html.includes('href="/realisations"'));
verifier("Le bouton « Mettre à la une » est inactif tant que la fiche n'est pas publiée", await admin.getByRole("button", { name: "Mettre à la une" }).isDisabled());
await admin.getByRole("button", { name: "Publier", exact: true }).click();
await apres(/ok=publiee/);
verifier("Republication : le fichier est de nouveau accessible", (await lireP(idVideo1)).r.status === 200);
await admin.locator('[name="statut"]').selectOption("refusee");
await admin.getByRole("button", { name: "Enregistrer" }).click();
await admin.waitForFunction(() => /Enregistré\./.test(document.body.textContent || ""));
await admin.reload();
verifier("Statut passé à « Refusée » : la publicité est dépubliée automatiquement et son fichier n'est plus public", (await admin.locator(".admin-tete .pastille", { hasText: "Privée" }).count()) === 1 && (await publicNon()).every((s) => s === 404) && await admin.getByRole("button", { name: "Publier", exact: true }).isDisabled());
await admin.locator('[name="statut"]').selectOption("validee");
await admin.getByRole("button", { name: "Enregistrer" }).click();
await admin.waitForFunction(() => /Enregistré\./.test(document.body.textContent || ""));
await admin.getByRole("button", { name: "Dupliquer" }).click();
await apres(/ok=duplique/);
const pub3 = /PUB-\d+/.exec(admin.url())[0];
verifier("Duplication : nouvelle fiche, nouveau numéro, mêmes champs, sans vidéo ni miniature, « En cours », privée", Number(pub3.slice(4)) === Number(pub2.slice(4)) + 1 && (await admin.locator('[name="nom"]').inputValue()) === "Gourde test (copie)" && (await admin.locator('[name="statut"]').inputValue()) === "en_cours" && (await admin.locator(".pub-apercu video").count()) === 0 && (await admin.locator(".admin-tete .pastille", { hasText: "Privée" }).count()) === 1, pub3);
verifier("Duplication : l'avatar et le prompt sont conservés", (await admin.locator('[name="avatarId"]').inputValue()) === "femme-01" && (await admin.getByLabel("Prompt de génération").inputValue()) === "PROMPT-SECRET-HIGGSFIELD");

await admin.locator(".pub-suppression summary").click();
await admin.locator('input[name="confirmation"]').fill("PUB-000");
await admin.getByRole("button", { name: "Supprimer définitivement" }).click();
await apres(/erreur=confirmation/);
verifier("Suppression : sans retaper le bon numéro, rien n'est supprimé", (await admin.locator(".avis-erreur").innerText()).includes("non confirmée") && (await fetch(`${BASE}/admin/publicites/${pub3}`, { headers: { Cookie: (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ") } })).status === 200);
await admin.locator(".pub-suppression summary").click();
await admin.locator('input[name="confirmation"]').fill(pub3);
await admin.getByRole("button", { name: "Supprimer définitivement" }).click();
await apres(/ok=supprimee/);
verifier("Suppression : après confirmation, la fiche est supprimée et la galerie le dit", (await admin.locator(".avis-ok").innerText()).includes(pub3) && (await admin.locator(`article.pub-carte:has-text("${pub3}")`).count()) === 0);
const gone = await admin.goto(`${BASE}/admin/publicites/${pub3}`);
verifier("Une fiche supprimée n'existe plus (404)", gone.status() === 404);
const nouvelle = await admin.goto(`${BASE}/admin/publicites/nouvelle`);
await admin.locator('[name="nom"]').fill("Test numéro");
await admin.getByRole("button", { name: "Créer la publicité" }).click();
await apres(/ok=cree/);
verifier("Le numéro d'une fiche supprimée n'est jamais réattribué", Number(/PUB-(\d+)/.exec(admin.url())[1]) === Number(pub3.slice(4)) + 1 && nouvelle.status() === 200, admin.url());
verifier("Une publicité sans vidéo reste privée : « Publier » est inactif", await admin.getByRole("button", { name: "Publier", exact: true }).isDisabled());

// — Dernière fiche publiée retirée : le menu et la page se vident
for (const p of [pub1, pub2]) {
  await admin.goto(`${BASE}/admin/publicites/${p}`);
  const dep = admin.getByRole("button", { name: "Dépublier" });
  if (await dep.count()) { await dep.click(); await apres(/ok=depubliee/); }
}
const accueil4 = await page("/");
const real4 = await page("/realisations");
verifier("Plus aucune publicité publiée : « Réalisations » disparaît du menu, la page affiche un message simple", !accueil4.html.includes('href="/realisations"') && /Aucune réalisation n(&#x27;|')est présentée/.test(real4.html));

// — Contrôles du serveur (formats, poids, contenu forgé, requête d'un autre site)
const reserver = (corps, entetes = {}) => ctx.request.post(`${BASE}/api/admin/bibliotheque`, { data: corps, headers: entetes });
const refus = await Promise.all([
  reserver({ nom: "a.heic", type: "image/heic", taille: 100 }), reserver({ nom: "a.mov", type: "video/quicktime", taille: 100 }), reserver({ nom: "a.pdf", type: "application/pdf", taille: 100 }),
  reserver({ nom: "a.svg", type: "image/svg+xml", taille: 100 }), reserver({ nom: "a.png", type: "image/webp", taille: 100 }), reserver({ nom: "a.mp4", type: "video/mp4", taille: 41 * 1048576 }),
]);
verifier("Serveur : HEIC, MOV, PDF, SVG, extension trompeuse (415) et plus de 40 Mo (413) refusés", refus.map((r) => r.status()).join() === "415,415,415,415,415,413", refus.map((r) => r.status()).join());
const autreSite = await reserver({ nom: "a.mp4", type: "video/mp4", taille: 100 }, { Origin: "https://evil.example" });
verifier("Serveur : requête venue d'un autre site refusée (403)", autreSite.status() === 403, String(autreSite.status()));
const res = await reserver({ nom: "forge.png", type: "image/png", taille: 12 });
const reserve = await res.json();
verifier("Serveur : réservation valide, mais le contenu envoyé sera contrôlé", res.status() === 200 && reserve.jeton);
if (res.status() === 200) {
  const put = await ctx.request.put(reserve.url.startsWith("http") ? reserve.url : `${BASE}${reserve.url}`, { headers: { "Content-Type": "image/png" }, data: Buffer.from("pas un png!!") });
  const conf = await ctx.request.post(`${BASE}/api/admin/bibliotheque/confirmer`, { data: { jeton: reserve.jeton } });
  verifier("Serveur : contenu forgé (faux PNG) refusé à la confirmation (415)", put.ok() && conf.status() === 415, `${put.status()} ${conf.status()}`);
}
verifier("Navigateur (administration) : aucune erreur de politique de sécurité pendant tout le parcours", erreursAdmin.filter((e) => /Content Security|Refused|blocked/i.test(e)).length === 0, erreursAdmin.filter((e) => /Content Security|Refused|blocked/i.test(e)).join(" | "));

// — Nettoyage : les fiches créées par ce test sont supprimées
for (const p of (await (async () => { await admin.goto(`${BASE}/admin/publicites`); return admin.locator("article.pub-carte .pub-carte-id strong").allInnerTexts(); })())) {
  await admin.goto(`${BASE}/admin/publicites/${p}`);
  await admin.locator(".pub-suppression summary").click();
  await admin.locator('input[name="confirmation"]').fill(p);
  await admin.getByRole("button", { name: "Supprimer définitivement" }).click();
  await apres(/ok=supprimee/);
}
verifier("Nettoyage du test : la galerie est vide", (await admin.locator("article.pub-carte").count()) === 0);

await nav.close();
fs.rmSync(tmp, { recursive: true, force: true });
const ko = resultats.filter((r) => !r.ok).length;
console.log(`\n${resultats.length - ko}/${resultats.length} vérifications réussies`);
process.exit(ko ? 1 : 0);
