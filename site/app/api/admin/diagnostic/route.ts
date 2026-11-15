import { estAdmin } from "@/lib/auth";
import { executerDiagnostic } from "@/lib/diagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

// Diagnostic au format JSON, réservé à la session administrateur.
export async function GET() {
  if (!(await estAdmin())) return new Response("Non autorisé", { status: 401 });
  return Response.json(await executerDiagnostic(), { headers: { "Cache-Control": "private, no-store" } });
}
