// Outils communs aux scripts de lancement, d'arrêt et de diagnostic.
import net from "node:net";
import { execSync, spawnSync } from "node:child_process";

const WIN = process.platform === "win32";
const sh = (cmd) => { try { return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }); } catch (e) { return String(e.stdout || ""); } };

// Vrai si quelque chose répond sur ce port (IPv4 ou IPv6).
export function portOccupe(port) {
  const essai = (hote) => new Promise((ok) => {
    const s = net.connect({ port: Number(port), host: hote });
    s.setTimeout(700);
    s.on("connect", () => { s.destroy(); ok(true); });
    s.on("timeout", () => { s.destroy(); ok(false); });
    s.on("error", () => ok(false));
  });
  return Promise.all([essai("127.0.0.1"), essai("::1")]).then((r) => r.some(Boolean));
}

// Identifiants des processus à l'écoute sur un port.
export function pidsSurPort(port) {
  const pids = new Set();
  if (WIN) {
    for (const l of sh("netstat -ano -p TCP").split(/\r?\n/)) {
      const m = l.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
      if (m && Number(m[1]) === Number(port)) pids.add(Number(m[2]));
    }
  } else {
    for (const p of sh(`lsof -nP -tiTCP:${port} -sTCP:LISTEN`).split(/\s+/)) if (/^\d+$/.test(p)) pids.add(Number(p));
    if (!pids.size) for (const p of sh(`fuser ${port}/tcp 2>/dev/null`).split(/\s+/)) if (/^\d+$/.test(p)) pids.add(Number(p));
  }
  pids.delete(process.pid);
  return [...pids];
}

export function decrire(pid) {
  const t = WIN
    ? sh(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`)
    : sh(`ps -o args= -p ${pid}`);
  return t.trim().replace(/\s+/g, " ").slice(0, 110) || "(processus inconnu)";
}

// Arrête un processus et tous ceux qu'il a lancés.
export function tuerArbre(pid) {
  if (!pid) return;
  if (WIN) return void spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  const enfants = sh(`pgrep -P ${pid}`).split(/\s+/).filter((x) => /^\d+$/.test(x));
  for (const e of enfants) tuerArbre(Number(e));
  try { process.kill(pid, "SIGTERM"); } catch {}
}

export async function libererPort(port) {
  const pids = pidsSurPort(port);
  for (const p of pids) tuerArbre(p);
  for (let i = 0; i < 20 && (await portOccupe(port)); i++) await new Promise((ok) => setTimeout(ok, 250));
  // Dernier recours pour un processus qui ignore la demande d'arrêt.
  if (!WIN && (await portOccupe(port))) for (const p of pidsSurPort(port)) { try { process.kill(p, "SIGKILL"); } catch {} }
  return pids;
}

export function version() {
  const commit = sh("git rev-parse --short HEAD").trim();
  const branche = sh("git rev-parse --abbrev-ref HEAD").trim();
  return { commit: commit || "inconnu", branche: branche || "inconnue", modifs: sh("git status --porcelain -- .").trim().split("\n").filter(Boolean).length };
}

export const directive = (csp, nom) => (csp || "").split(";").map((x) => x.trim()).find((x) => x.startsWith(nom)) || "(absente)";
