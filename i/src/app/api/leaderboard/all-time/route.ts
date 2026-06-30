import { initDb, sql } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const result = await sql`
    SELECT address, wins, losses, draws, total_points, win_streak, best_streak, is_holder
    FROM players
    ORDER BY total_points DESC, wins DESC
    LIMIT 100
  `;
  return json({ rows: result.rows });
}
