// Factures PDF : numérotation continue, mentions obligatoires, archivage dans le dépôt.
// Une facture n'est émise que si l'identité du vendeur est complète. Hors ventes réelles,
// le document est un SPÉCIMEN, numéroté à part, pour ne pas entamer la série officielle.
import PDFDocument from "pdfkit";
import { depot } from "./depot";
import { env, modePaiement } from "./env";
import { euros, formuleParId } from "./formules";
import { store, journal, maintenant, type Commande, type Facture } from "./store";

export type Vendeur = { nom: string; siret: string; adresse: string; email: string };

export function vendeur(): { complet: boolean; manquants: string[]; v: Vendeur } {
  const l = env.legal();
  const siret = l.siret.replace(/\s/g, "");
  const manquants = [
    !l.nom && "nom du titulaire",
    !/^\d{14}$/.test(siret) && "SIRET (14 chiffres)",
    !l.adresse && "adresse",
    !l.email && "e-mail de contact",
  ].filter(Boolean) as string[];
  return { complet: manquants.length === 0, manquants, v: { nom: l.nom, siret, adresse: l.adresse, email: l.email } };
}

// Ce qui empêche d'émettre la facture d'une commande, ou [] si tout est prêt.
export function obstaclesFacture(c: Commande): string[] {
  const o: string[] = [];
  if (c.paiement.etat !== "paye") o.push("commande non payée");
  if (!c.brief) o.push("brief non reçu (identité et adresse du client inconnues)");
  else {
    if (!c.brief.nomFacture) o.push("nom à facturer manquant");
    if (!c.brief.adresseFacture) o.push("adresse de facturation manquante");
  }
  const v = vendeur();
  if (!v.complet) o.push(`identité du vendeur incomplète : ${v.manquants.join(", ")}`);
  return o;
}

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

export function composerPdf(c: Commande, f: Facture, v: Vendeur): Promise<Buffer> {
  return new Promise((resoudre, rejeter) => {
    const b = c.brief!;
    const formule = formuleParId(c.formule)!;
    const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `Facture ${f.numero}`, Author: "Studio Accroche", Subject: `Commande ${c.id}`, CreationDate: new Date(f.date) } });
    const morceaux: Buffer[] = [];
    doc.on("data", (m: Buffer) => morceaux.push(m));
    doc.on("end", () => resoudre(Buffer.concat(morceaux)));
    doc.on("error", rejeter);

    const G = "Helvetica-Bold", N = "Helvetica", gris = "#666666", noir = "#17140f", accent = "#e2441a";
    const L = 56, R = 539, largeur = R - L;

    if (f.specimen) {
      doc.save().rotate(-35, { origin: [297, 420] }).font(G).fontSize(74).fillColor("#000000").fillOpacity(0.08)
        .text("SPÉCIMEN", 60, 380, { width: 480, align: "center" }).restore().fillOpacity(1);
    }

    // En-tête
    doc.font(G).fontSize(20).fillColor(noir).text("Studio ", L, 56, { continued: true }).fillColor(accent).text("Accroche");
    doc.font(G).fontSize(22).fillColor(noir).text("FACTURE", L, 52, { width: largeur, align: "right" });
    doc.font(N).fontSize(10).fillColor(gris).text(`N° ${f.numero}`, L, 80, { width: largeur, align: "right" })
      .text(`Date d'émission : ${dateFr(f.date)}`, { width: largeur, align: "right" });

    // Vendeur / client
    const yBlocs = 138;
    doc.font(G).fontSize(8.5).fillColor(gris).text("VENDEUR", L, yBlocs);
    doc.font(G).fontSize(10.5).fillColor(noir).text(`${v.nom} EI`, L, yBlocs + 14, { width: 220 });
    doc.font(N).fontSize(10).fillColor(noir).text("Entrepreneur individuel — Studio Accroche", { width: 220 }).text(v.adresse, { width: 220 })
      .text(`SIREN : ${v.siret.slice(0, 9)}`).text(`SIRET : ${v.siret}`).text(v.email);
    const yFinVendeur = doc.y;
    doc.font(G).fontSize(8.5).fillColor(gris).text("CLIENT", 320, yBlocs);
    doc.font(G).fontSize(10.5).fillColor(noir).text(b.nomFacture, 320, yBlocs + 14, { width: 219 });
    doc.font(N).fontSize(10).text(b.adresseFacture, { width: 219 });
    if (b.sirenClient) doc.text(`${b.sirenClient.length === 9 ? "SIREN" : "SIRET"} : ${b.sirenClient}`);
    doc.text(b.email);

    // Références
    let y = Math.max(yFinVendeur, doc.y) + 26;
    const livraison = c.livreeLe || c.valideeLe;
    const refs: [string, string][] = [
      ["Commande", c.id],
      ["Nature de l'opération", "Prestation de services"],
      ["Date de la prestation", livraison ? dateFr(livraison) : `à livrer — paiement reçu le ${dateFr(c.paiement.payeLe!)}`],
    ];
    doc.font(N).fontSize(10);
    for (const [k, val] of refs) {
      doc.fillColor(gris).text(k, L, y, { width: 150 });
      doc.fillColor(noir).text(val, L + 150, y, { width: largeur - 150 });
      y = doc.y + 4;
    }

    // Tableau
    y += 16;
    const cols = { des: L, qte: 330, pu: 390, tot: 470 };
    doc.rect(L, y, largeur, 22).fill("#f1ede6");
    doc.font(G).fontSize(9).fillColor(noir)
      .text("Désignation", cols.des + 8, y + 7)
      .text("Qté", cols.qte, y + 7, { width: 40, align: "right" })
      .text("Prix unitaire HT", cols.pu, y + 7, { width: 70, align: "right" })
      .text("Total HT", cols.tot, y + 7, { width: R - cols.tot - 8, align: "right" });
    y += 32;
    const designation = `Réalisation de ${formule.videos} vidéo${formule.videos > 1 ? "s" : ""} publicitaire${formule.videos > 1 ? "s" : ""} verticale${formule.videos > 1 ? "s" : ""} — formule « ${formule.nom} »`;
    doc.font(N).fontSize(10).fillColor(noir).text(designation, cols.des + 8, y, { width: 262 });
    doc.fontSize(9).fillColor(gris).text(`Script, présentateur généré par IA, voix, sous-titres. Produit : ${b.produit} (${b.marque}).`, cols.des + 8, doc.y + 2, { width: 262 });
    const yFinLigne = doc.y;
    doc.font(N).fontSize(10).fillColor(noir)
      .text("1", cols.qte, y, { width: 40, align: "right" })
      .text(euros(f.montantCents), cols.pu, y, { width: 70, align: "right" })
      .text(euros(f.montantCents), cols.tot, y, { width: R - cols.tot - 8, align: "right" });
    y = yFinLigne + 12;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor("#cfc8bb").stroke();

    // Totaux
    y += 14;
    const ligne = (k: string, val: string, gras = false) => {
      doc.font(gras ? G : N).fontSize(gras ? 12 : 10).fillColor(noir).text(k, 330, y, { width: 130 }).text(val, 460, y, { width: R - 460 - 8, align: "right" });
      y = doc.y + 6;
    };
    ligne("Total HT", euros(f.montantCents));
    ligne("TVA", "—");
    ligne("Total à payer", euros(f.montantCents), true);
    doc.font(N).fontSize(9.5).fillColor(noir).text("TVA non applicable, art. 293 B du code général des impôts.", L, y + 4, { width: largeur });

    // Paiement
    y = doc.y + 18;
    doc.rect(L, y, largeur, 36).lineWidth(0.8).strokeColor(noir).stroke();
    doc.font(G).fontSize(10.5).fillColor(noir).text(`Facture acquittée — payée le ${dateFr(c.paiement.payeLe!)} par carte bancaire`, L + 12, y + 8, { width: largeur - 24 });
    doc.font(N).fontSize(9).fillColor(gris).text(`Référence du paiement : ${c.paiement.intentId || c.paiement.sessionId}`, L + 12, y + 22, { width: largeur - 24 });

    // Mentions
    y += 54;
    doc.font(N).fontSize(8.5).fillColor(gris).text(
      "Conditions de paiement : paiement comptant à la commande. Escompte pour paiement anticipé : néant. " +
      "En cas de retard de paiement, pénalités au taux de trois fois le taux d'intérêt légal, et indemnité forfaitaire " +
      "pour frais de recouvrement de 40 € due par les clients professionnels (articles L441-10 et D441-5 du code de commerce). " +
      "Les vidéos livrées sont générées par intelligence artificielle.",
      L, y, { width: largeur, align: "justify" });

    if (f.specimen) {
      doc.font(G).fontSize(9).fillColor(accent).text(
        "SPÉCIMEN — document de préproduction sans valeur comptable ni fiscale. Ne pas transmettre à un client.",
        L, 770, { width: largeur, align: "center" });
    }
    doc.end();
  });
}

// Émet la facture d'une commande. Idempotent : une commande n'a jamais deux factures.
export async function emettreFacture(id: string): Promise<{ facture?: Facture; obstacles?: string[] }> {
  const c = await store.commande(id);
  if (!c) return { obstacles: ["commande introuvable"] };
  if (c.facture) return { facture: c.facture };
  const obstacles = obstaclesFacture(c);
  if (obstacles.length) return { obstacles };

  const specimen = modePaiement().mode !== "reel";
  const annee = new Date().getFullYear();
  const n = await store.suivant(specimen ? `specimens-${annee}` : `factures-${annee}`);
  const numero = `${specimen ? "SPECIMEN" : "F"}-${annee}-${String(n).padStart(4, "0")}`;
  const facture: Facture = { numero, date: maintenant(), cle: `factures/${numero}.pdf`, specimen, montantCents: c.montantCents };
  const pdf = await composerPdf(c, facture, vendeur().v);
  // Le numéro est réservé : le PDF ne doit jamais écraser une facture existante.
  if (!(await depot().ecrire(facture.cle, pdf, { siAbsent: true }))) throw new Error(`La facture ${numero} existe déjà.`);
  let attachee = false;
  const maj = await store.modifier(id, (cmd) => {
    attachee = false;
    if (cmd.facture) return false;
    attachee = true;
    cmd.facture = facture;
    journal(cmd, `Facture ${numero} émise${specimen ? " (spécimen)" : ""}.`);
  });
  if (!attachee) {
    // Une autre requête a émis la facture entre-temps : le numéro reste consommé et tracé.
    await depot().ecrire(`factures/_non-attribuees/${numero}.json`, JSON.stringify({ commande: id, date: facture.date }));
  }
  return { facture: maj?.facture };
}
