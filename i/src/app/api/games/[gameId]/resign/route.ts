import { NextRequest } from "next/server";
import { initDb, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sideForAddress, type GameState } from "@/lib/chess-game";
import { finalizePoints } from "@/lib/points";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;
    const address = await requireAuth(req);
    await initDb();
    const game = await sql<{ state: GameState; result: string | null }>`SELECT state, result FROM games WHERE id = ${gameId}`;
    if (!game.rows[0]) return errorResponse(404, "Game not found.");
    if (game.rows[0].result) return errorResponse(400, "Game already finished.");
    const side = sideForAddress(game.rows[0].state, address);
    if (!side) return errorResponse(403, "You are not a player in this game.");
    const state = game.rows[0].state;
    state.status = "finished";
    state.result = side === "white" ? "black_win" : "white_win";
    state.reason = "resignation";
    state.updatedAt = new Date().toISOString();
    const points = await finalizePoints(state);
    await sql`
      UPDATE games
      SET state = ${JSON.stringify(state)}::jsonb,
          result = ${state.result},
          white_points_earned = ${points.white},
          black_points_earned = ${points.black},
          ended_at = NOW(),
          updated_at = NOW()
      WHERE id = ${gameId}
    `;
    return json({ state, points });
  } catch {
    return errorResponse(401, "Sign in required.");
  }
}
