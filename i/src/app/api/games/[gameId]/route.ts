import { initDb, sql } from "@/lib/db";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  await initDb();
  const result = await sql`
    SELECT id, white_address, black_address, state, result, started_at, ended_at
    FROM games WHERE id = ${gameId}
    LIMIT 1
  `;
  if (!result.rows[0]) return errorResponse(404, "Game not found.");
  return json(result.rows[0]);
}
