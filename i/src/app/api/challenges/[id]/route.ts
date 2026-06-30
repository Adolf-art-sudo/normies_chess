import { initDb, sql } from "@/lib/db";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await initDb();
  const result = await sql`
    SELECT id, challenger_address, challenger_normie_ids, message, status, game_id, expires_at
    FROM challenges
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!result.rows[0]) return errorResponse(404, "Challenge not found.");
  return json(result.rows[0]);
}
