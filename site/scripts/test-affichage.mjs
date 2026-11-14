// Test d'affichage : vérifie que toutes les sections du site sont réellement visibles,
// en mode développement comme en mode compilé, sur ordinateur et sur mobile.
// Il existe pour qu'une politique de sécurité trop stricte (ou tout script qui plante)
// ne puisse plus laisser la page à moitié vide sans que cela se voie.
//
// Usage : BASE=http://localhost:3000 MODE=dev|prod node scripts/test-affichage.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE || "http://localhost:3000";
const MODE = process.env.MODE || "dev";
const CAPTURES = process.env.CAPTURES || "";
let ko = 0, total = 0;
const verifier = (nom, ok, detail = "") => { total++; if (!ok) ko++; console.log(`${ok ? "✓" : "✗"} ${nom}${ok ? "" : "  → " + detail}`); };

// 1. En-tête de sécurité : 'unsafe-eval' seulement en développement
const csp = (await fetch(BASE)).headers.get("content-security-policy") || "";
verifier("Politique de contenu présente", csp.includes("default-src 'self'") && csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'"));
if (MODE === "dev") verifier("Développement : 'unsafe-eval' autorisé (nécessaire à l'outil de compilation)", /script-src[^;]*'unsafe-eval'/.test(csp), csp);
else {
  verifier("Version compilée : 'unsafe-eval' absent", !csp.includes("unsafe-eval"), csp);
  verifier("Version compilée : aucune ouverture WebSocket générale", !/connect-src[^;]*\bws:/.test(csp), csp);
  verifier("Version compilée : HTTPS imposé", Boolean((await fetch(BASE)).headers.get("strict-transport-security")));
}

const nav = await chromium.launch();

async function parcourir(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const pas = Math.round((await page.viewportSize()).height * 0.6);
  for (let y = 0; y < h; y += pas) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(180); }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1600); // fin des transitions
}

const etat = (page) => page.evaluate(() => {
  const visible = (el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.opacity === "1" && s.visibility !== "hidden" && s.display !== "none" && r.width > 1 && r.height > 1; };
  const tous = (sel) => [...document.querySelectorAll(sel)];
  const compte = (sel) => ({ n: tous(sel).length, visibles: tous(sel).filter(visible).length });
  return {
    reveles: compte(".revele"),
    sections: tous("main > section").map((s) => ({ id: s.id || s.className, h: Math.round(s.getBoundingClientRect().height), texte: s.innerText.trim().length })),
    titre: visible(document.querySelector("h1")) && document.querySelector("h1").innerText.length > 10,
    titreAnime: tous(".ligne > span").every((e) => new DOMMatrix(getComputedStyle(e).transform).m42 === 0),
    temps: compte(".temps-carte"), angles: compte(".angle"), etapes: compte(".etapes li"), formules: compte(".formule"),
    prix: tous(".formule .prix").filter(visible).map((e) => e.innerText.replace(/\s/g, " ")),
    boutons: tous('.formule a[href^="/commander/"]').filter(visible).length,
    engagements: compte(".engagements > div"), questions: compte("details"),
    images: tous("img").map((i) => i.complete && i.naturalWidth > 0), imagesVisibles: tous(".temps-cadre img, .pile img").filter(visible).length,
    videos: tous("video").length,
    debordement: document.documentElement.scrollWidth - window.innerWidth,
    classeAnim: document.documentElement.classList.contains("anim"),
  };
});

for (const [nom, viewport, mobile] of [["Ordinateur 1440", { width: 1440, height: 900 }, false], ["Mobile 390", { width: 390, height: 844 }, true]]) {
  console.log(`\n— ${nom} (${MODE}) —`);
  const ctx = await nav.newContext({ viewport, isMobile: mobile, hasTouch: mobile, userAgent: mobile ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36" : undefined });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text().slice(0, 200)); });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600); // animation d'ouverture
  await parcourir(page);
  const e = await etat(page);
  if (CAPTURES) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300); await page.screenshot({ path: `${CAPTURES}/${MODE}-${mobile ? "mobile" : "ordinateur"}.png`, fullPage: true }); }

  verifier("Aucune erreur dans la console du navigateur", erreurs.length === 0, [...new Set(erreurs)].join(" | "));
  verifier("Aucune erreur de politique de contenu", !erreurs.some((x) => /Content Security Policy|EvalError/i.test(x)));
  verifier("Titre d'ouverture visible, animation terminée", e.titre && e.titreAnime);
  verifier(`Tous les blocs animés sont visibles (${e.reveles.visibles}/${e.reveles.n})`, e.reveles.n >= 20 && e.reveles.visibles === e.reveles.n);
  verifier("Le script d'apparition est actif", e.classeAnim);
  const vides = e.sections.filter((s) => s.h < 150 || s.texte < 20);
  verifier(`Aucune section vide (${e.sections.length} sections)`, e.sections.length >= 8 && vides.length === 0, JSON.stringify(vides));
  verifier("Anatomie : 4 plans visibles", e.temps.n === 4 && e.temps.visibles === 4);
  verifier("Accroches : 3 angles visibles", e.angles.n === 3 && e.angles.visibles === 3);
  verifier("Parcours : 4 étapes visibles", e.etapes.n === 4 && e.etapes.visibles === 4);
  verifier("Offres : 3 formules visibles avec leurs prix", e.formules.visibles === 3 && e.prix.join("|") === "25 €|69 €|129 €", e.prix.join("|"));
  verifier("Offres : 3 boutons de commande visibles", e.boutons === 3);
  verifier("Engagements : 3 blocs visibles", e.engagements.n === 3 && e.engagements.visibles === 3);
  verifier("Questions : 5 entrées visibles", e.questions.n === 5 && e.questions.visibles === 5);
  verifier(`Toutes les images sont chargées (${e.images.length})`, e.images.length >= 12 && e.images.every(Boolean));
  verifier("Images des plans et des formules visibles", e.imagesVisibles >= 14, String(e.imagesVisibles));
  verifier("Aucun débordement horizontal", e.debordement <= 0, String(e.debordement));

  // Interactions
  await page.locator("details summary").first().scrollIntoViewIfNeeded();
  await page.locator("details summary").first().click();
  verifier("Questions : une réponse s'ouvre au clic", await page.locator("details[open] p").first().isVisible());
  await page.locator('.formule a[href="/commander/test"]').scrollIntoViewIfNeeded();
  await page.locator('.formule a[href="/commander/test"]').click();
  await page.waitForURL("**/commander/test");
  await page.waitForSelector(".recap");
  verifier("Commande : page récapitulative affichée à 69 €", (await page.locator(".total strong").innerText()).includes("69") && await page.locator('.recap button[type="submit"]').isVisible());
  const actif = await page.locator('.recap button[type="submit"]').isEnabled();
  if (actif) {
    await page.check('input[name="cgv"]'); await page.check('input[name="ia"]');
    await page.locator('.recap button[type="submit"]').click();
    await page.waitForURL(/\/pay\/|checkout\.stripe\.com/, { timeout: 20000 });
    verifier("Commande : passage à la page de paiement", true);
    if (page.url().includes("/pay/")) {
      await page.click('button[value="payer"]');
      await page.waitForSelector("form.formulaire", { timeout: 25000 });
      verifier("Commande : retour sur le site, formulaire de brief affiché", (await page.locator("form.formulaire fieldset").count()) >= 4);
    }
  } else verifier("Commande : bouton de paiement désactivé (paiements fermés dans cette configuration)", true);
  for (const chemin of ["/cgv", "/confidentialite", "/mentions-legales", "/admin/connexion"]) {
    const r = await page.goto(BASE + chemin, { waitUntil: "networkidle" });
    verifier(`Page ${chemin} affichée`, r.status() === 200 && (await page.locator("h1").first().isVisible()));
  }
  verifier("Aucune erreur sur l'ensemble du parcours", erreurs.length === 0, [...new Set(erreurs)].join(" | "));
  await ctx.close();
}

// 3. Robustesse : même si l'application ne démarre pas, rien ne reste invisible
console.log(`\n— Robustesse (${MODE}) —`);
{
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.route("**/_next/static/**/*.js", (r) => r.abort()); // l'application est bloquée, pas le script d'apparition
  await page.goto(BASE, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(2600);
  await parcourir(page);
  const e = await etat(page);
  verifier(`Application bloquée : tous les blocs restent visibles (${e.reveles.visibles}/${e.reveles.n})`, e.reveles.visibles === e.reveles.n && e.formules.visibles === 3);
  await ctx.close();
}
{
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" }); await page.waitForTimeout(2600);
  const visibles = await page.locator(".revele").evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "1").length);
  const n = await page.locator(".revele").count();
  verifier(`JavaScript désactivé : tous les blocs sont visibles (${visibles}/${n})`, n >= 20 && visibles === n);
  await ctx.close();
}
{
  // Une politique de contenu qui interdirait tout script ne doit pas masquer le contenu
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.route(BASE + "/", async (r) => { const rep = await r.fetch(); await r.fulfill({ response: rep, headers: { ...rep.headers(), "content-security-policy": "script-src 'none'" } }); });
  await page.goto(BASE + "/", { waitUntil: "load" }); await page.waitForTimeout(2600);
  const visibles = await page.locator(".revele").evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "1").length);
  const n = await page.locator(".revele").count();
  verifier(`Tous les scripts interdits par la politique : contenu visible (${visibles}/${n})`, visibles === n);
  await ctx.close();
}

await nav.close();
console.log(`\n${total - ko}/${total} vérifications d'affichage réussies (${MODE}).`);
process.exit(ko ? 1 : 0);
