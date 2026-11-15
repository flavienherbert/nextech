// Faux services de test : ni e-mail ni notification réels ne sont envoyés.
//  - ntfy simulé  : POST http://localhost:4343/  (corps JSON {topic,title,message,…}), mémorisé.
//  - SMTP simulé  : localhost:2525 (sans chiffrement, identifiants quelconques), messages mémorisés.
//  - Inspection   : GET  http://localhost:4343/_recus      → notifications reçues
//                   GET  http://localhost:4343/_courriels  → e-mails reçus (destinataire, objet, texte)
//                   POST http://localhost:4343/_vider      → efface tout
//                   POST http://localhost:4343/_panne?ntfy=1&smtp=1 → simule une panne (0 pour la lever)
import http from "node:http";
import { createRequire } from "node:module";
const { SMTPServer } = createRequire(import.meta.url)("smtp-server");

const recus = [], courriels = [];

// Décodage minimal d'un e-mail MIME (en-tête encodé, parties quoted-printable ou base64) pour pouvoir lire objet et texte.
const qp = (t) => Buffer.from(t.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8");
const mot = (t) => t.replace(/\?=\s+=\?/g, "?==?").replace(/=\?UTF-8\?([QB])\?([^?]*)\?=/gi, (_, k, v) => (k.toUpperCase() === "B" ? Buffer.from(v, "base64").toString("utf8") : qp(v.replace(/_/g, " "))));
function analyser(brut) {
  const [entete, ...reste] = brut.replace(/\r/g, "").split("\n\n");
  const enteteDeplie = entete.replace(/\n[ \t]+/g, " ");
  const objet = mot((enteteDeplie.match(/^Subject: (.*)$/m) || [])[1] || "");
  const decoder = (corps, cte) => (/quoted-printable/i.test(cte) ? qp(corps) : /base64/i.test(cte) ? Buffer.from(corps.replace(/\s/g, ""), "base64").toString("utf8") : corps);
  const parties = [];
  const visiter = (texte) => {
    const [h, ...c] = texte.split("\n\n"); const corps = c.join("\n\n"); const hd = h.replace(/\n[ \t]+/g, " ");
    const lim = hd.match(/boundary="?([^";\s]+)"?/i);
    if (lim) { for (const p of corps.split("--" + lim[1])) if (p.trim() && p.trim() !== "--") visiter(p.replace(/^\n/, "")); return; }
    parties.push(decoder(corps, (hd.match(/Content-Transfer-Encoding: (\S+)/i) || [])[1] || ""));
  };
  visiter(brut.replace(/\r/g, ""));
  return { objet, texte: parties.join("\n") };
}
const panne = { ntfy: false, smtp: false };

new SMTPServer({
  authOptional: true, disabledCommands: ["STARTTLS"], allowInsecureAuth: true,
  onAuth: (a, _s, cb) => (panne.smtp ? cb(new Error("535 simulation de panne")) : cb(null, { user: a.username })),
  onData(flux, session, cb) {
    let brut = ""; flux.on("data", (d) => (brut += d)); flux.on("end", () => {
      if (panne.smtp) return cb(new Error("451 simulation de panne"));
      const { objet, texte } = analyser(brut);
      courriels.push({ a: session.envelope.rcptTo.map((x) => x.address), de: session.envelope.mailFrom.address, objet, texte });
      cb();
    });
  },
}).listen(2525, "127.0.0.1");

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
    const json = (o, code = 200) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.method === "POST" && u.pathname === "/") {
      if (panne.ntfy) return json({ error: "panne simulée" }, 503);
      try { recus.push(JSON.parse(b)); } catch { return json({ error: "json" }, 400); }
      return json({ id: "ok" });
    }
    if (u.pathname === "/_recus") return json(recus);
    if (u.pathname === "/_courriels") return json(courriels);
    if (u.pathname === "/_vider") { recus.length = 0; courriels.length = 0; return json({ ok: true }); }
    if (u.pathname === "/_panne") { for (const k of ["ntfy", "smtp"]) if (u.searchParams.has(k)) panne[k] = u.searchParams.get(k) === "1"; return json(panne); }
    json({ error: "inconnu" }, 404);
  });
}).listen(4343, "127.0.0.1", () => console.log("Faux services prêts : ntfy http://localhost:4343, SMTP localhost:2525"));
