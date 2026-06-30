import { initDb, sql } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const result = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM players) AS players,
      (SELECT COUNT(*)::int FROM games WHERE result IS NOT NULL) AS games,
      (SELECT COALESCE(MAX(total_points), 0)::int FROM players) AS highest_score,
      (SELECT COALESCE(MAX(best_streak), 0)::int FROM players) AS longest_streak
  `;
  return json(result.rows[0]);
}
