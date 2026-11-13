// Simulateur local de Stripe, pour la préproduction sans compte ni clé.
// Il reproduit : la création et la lecture d'une session de paiement, une page de paiement
// factice, et l'envoi de webhooks signés exactement comme Stripe (HMAC-SHA256 sur « t.corps »).
// Il ne débite rien et ne parle jamais au vrai Stripe.
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_STRIPE_PORT || 4242);
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_simulation";
const WEBHOOK = process.env.MOCK_WEBHOOK_URL || "http://localhost:3000/api/stripe/webhook";
const sessions = new Map();

function aplatir(params) {
  const o = {};
  for (const [k, v] of params) {
    const chemin = k.replace(/\]/g, "").split("[");
    let n = o;
    chemin.forEach((p, i) => {
      if (i === chemin.length - 1) n[p] = v;
      else n = n[p] ??= {};
    });
  }
  return o;
}

export function signer(corps, secret = SECRET, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${corps}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

async function webhook(type, session) {
  const corps = JSON.stringify({ id: `evt_sim_${crypto.randomBytes(8).toString("hex")}`, object: "event", api_version: "2025-01-01", created: Math.floor(Date.now() / 1000), type, livemode: false, data: { object: session } });
  const r = await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": signer(corps) }, body: corps });
  return r.status;
}

const page = (s) => `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paiement simulé</title>
<body style="font-family:system-ui,sans-serif;background:#f6f8fa;margin:0;padding:40px 20px;color:#1a1f36"><div style="max-width:440px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
<p style="background:#fff4e5;border:1px solid #f5c26b;padding:10px 12px;border-radius:8px;font-size:14px;margin:0 0 22px"><strong>Simulateur de paiement.</strong> Cette page remplace Stripe en préproduction. Aucune carte n'est demandée, rien n'est débité.</p>
<p style="color:#697386;margin:0">${s.line_items_nom}</p><p style="font-size:38px;font-weight:600;margin:6px 0 24px">${(s.amount_total / 100).toFixed(2).replace(".", ",")} €</p>
<form method="post" action="/pay/${s.id}"><label style="font-size:14px;display:block;margin-bottom:6px">E-mail</label><input name="email" type="email" required value="client.test@example.com" style="width:100%;box-sizing:border-box;padding:11px;border:1px solid #d5dbe1;border-radius:6px;font-size:16px;margin-bottom:18px">
<button name="action" value="payer" style="width:100%;padding:13px;background:#635bff;color:#fff;border:0;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer">Payer (carte de test acceptée)</button>
<button name="action" value="annuler" formnovalidate style="width:100%;padding:11px;background:none;border:0;color:#697386;margin-top:10px;cursor:pointer;font-size:14px">← Annuler et revenir au site</button>
<button name="action" value="expirer" formnovalidate style="width:100%;padding:8px;background:none;border:0;color:#a3acb9;cursor:pointer;font-size:13px">Simuler une session expirée</button></form></div></body></html>`;

const lire = (req) => new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
const json = (res, code, o) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const corps = await lire(req);

  if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
    const p = aplatir(new URLSearchParams(corps));
    const item = p.line_items?.["0"] || {};
    const id = `cs_test_sim_${crypto.randomBytes(12).toString("hex")}`;
    const s = { id, object: "checkout.session", mode: "payment", livemode: false, status: "open", payment_status: "unpaid", currency: item.price_data?.currency || "eur", amount_total: Number(item.price_data?.unit_amount || 0) * Number(item.quantity || 1), client_reference_id: p.client_reference_id || null, metadata: p.metadata || {}, success_url: p.success_url, cancel_url: p.cancel_url, payment_intent: null, customer_details: null, url: `http://localhost:${PORT}/pay/${id}`, line_items_nom: item.price_data?.product_data?.name || "Commande" };
    sessions.set(id, s);
    return json(res, 200, s);
  }

  const lecture = url.pathname.match(/^\/v1\/checkout\/sessions\/([\w]+)$/);
  if (req.method === "GET" && lecture) {
    const s = sessions.get(lecture[1]);
    return s ? json(res, 200, s) : json(res, 404, { error: { type: "invalid_request_error", message: "No such checkout.session" } });
  }

  const pay = url.pathname.match(/^\/pay\/([\w]+)$/);
  if (pay) {
    const s = sessions.get(pay[1]);
    if (!s) { res.writeHead(404); return res.end("Session inconnue"); }
    if (req.method === "GET") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(page(s)); }
    const f = new URLSearchParams(corps);
    const action = f.get("action");
    if (action === "payer" && s.status === "open") {
      Object.assign(s, { status: "complete", payment_status: "paid", payment_intent: `pi_sim_${crypto.randomBytes(8).toString("hex")}`, customer_details: { email: f.get("email") || null } });
      await webhook("checkout.session.completed", s).catch((e) => console.error("[simulateur] webhook non livré :", e.message));
      res.writeHead(303, { Location: s.success_url }); return res.end();
    }
    if (action === "expirer" && s.status === "open") {
      s.status = "expired";
      await webhook("checkout.session.expired", s).catch(() => {});
      res.writeHead(303, { Location: s.success_url }); return res.end();
    }
    res.writeHead(303, { Location: s.cancel_url }); return res.end();
  }

  // Outils de test : renvoyer un webhook arbitraire pour une session (signature valide).
  if (req.method === "POST" && url.pathname === "/_test/webhook") {
    const { type, session, patch } = JSON.parse(corps || "{}");
    const s = sessions.get(session);
    if (!s) return json(res, 404, {});
    return json(res, 200, { status: await webhook(type, { ...s, ...(patch || {}) }) });
  }
  if (req.method === "POST" && url.pathname === "/_test/modifier") {
    const { session, patch } = JSON.parse(corps || "{}");
    const s = sessions.get(session);
    if (s) Object.assign(s, patch);
    return json(res, s ? 200 : 404, s || {});
  }
  json(res, 404, { error: { message: `Route non simulée : ${req.method} ${url.pathname}` } });
}).listen(PORT, () => console.log(`[simulateur Stripe] http://localhost:${PORT} → webhooks vers ${WEBHOOK}`));
