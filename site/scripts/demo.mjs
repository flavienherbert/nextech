// Lance le site en préproduction locale avec le simulateur de paiement.
// Usage : npm run demo   puis ouvrir http://localhost:3000
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const port = process.env.PORT || "3000";
const env = {
  ...process.env,
  PORT: port,
  SITE_URL: `http://localhost:${port}`,
  DATA_DIR: process.env.DATA_DIR || "./data",
  STRIPE_SECRET_KEY: "sk_test_simulation",
  STRIPE_WEBHOOK_SECRET: "whsec_simulation",
  STRIPE_API_HOST: "http://localhost:4242",
  MOCK_WEBHOOK_URL: `http://localhost:${port}/api/stripe/webhook`,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "demonstration",
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@example.com",
};
const lancer = (cmd, args) => spawn(cmd, args, { env, stdio: "inherit", shell: process.platform === "win32" });
const sim = lancer("node", ["scripts/mock-stripe.mjs"]);
const site = lancer("npx", ["next", process.argv[2] === "prod" ? "start" : "dev", "-p", port]);
console.log(`\n  Site            : http://localhost:${port}\n  Administration  : http://localhost:${port}/admin   (mot de passe : ${env.ADMIN_PASSWORD})\n  Paiement        : simulé, rien n'est débité\n`);
const fin = () => { sim.kill(); site.kill(); process.exit(0); };
process.on("SIGINT", fin); process.on("SIGTERM", fin);
site.on("exit", fin);
