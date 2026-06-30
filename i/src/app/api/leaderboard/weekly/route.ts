import { initDb, sql } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const result = await sql`
    WITH week AS (
      SELECT (date_trunc('week', now()))::date AS week_start
    )
    SELECT p.address, p.wins, p.losses, p.draws, wp.points AS weekly_points, p.win_streak, p.best_streak, p.is_holder
    FROM weekly_points wp
    JOIN players p ON p.address = wp.player_address
    JOIN week ON week.week_start = wp.week_start
    ORDER BY wp.points DESC, p.wins DESC
    LIMIT 100
  `;
  return json({ rows: result.rows });
}
