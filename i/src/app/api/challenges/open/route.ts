import { initDb, sql } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const result = await sql`
    SELECT id, challenger_address, message, created_at, expires_at
    FROM challenges
    WHERE status = 'open' AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return json({ challenges: result.rows });
}
