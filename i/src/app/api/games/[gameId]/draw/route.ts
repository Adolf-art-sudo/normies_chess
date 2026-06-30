import { NextRequest } from "next/server";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sideForAddress, type GameState } from "@/lib/chess-game";
import { finalizePoints } from "@/lib/points";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ action: z.enum(["offer", "accept"]) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;
    const address = await requireAuth(req);
    const { action } = bodySchema.parse(await req.json());
    await initDb();
    const game = await sql<{ state: GameState; result: string | null }>`SELECT state, result FROM games WHERE id = ${gameId}`;
    if (!game.rows[0]) return errorResponse(404, "Game not found.");
    if (game.rows[0].result) return errorResponse(400, "Game already finished.");
    const state = game.rows[0].state;
    const side = sideForAddress(state, address);
    if (!side) return errorResponse(403, "You are not a player in this game.");
    if (action === "offer") {
      if (state.moveCount < 10) return errorResponse(400, "Draw offers require at least 10 moves.");
      state.status = "draw_offered";
      state.drawOfferFrom = side;
    } else {
      if (!state.drawOfferFrom || state.drawOfferFrom === side) return errorResponse(400, "No opponent draw offer to accept.");
      state.status = "finished";
      state.result = "draw";
      state.reason = "agreed draw";
    }
    state.updatedAt = new Date().toISOString();
    let points = { white: 0, black: 0 };
    if (state.result) points = await finalizePoints(state);
    await sql`
      UPDATE games
      SET state = ${JSON.stringify(state)}::jsonb,
          result = ${state.result},
          white_points_earned = ${points.white},
          black_points_earned = ${points.black},
          ended_at = CASE WHEN ${state.result} IS NULL THEN ended_at ELSE NOW() END,
          updated_at = NOW()
      WHERE id = ${gameId}
    `;
    return json({ state, points });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") return errorResponse(401, "Sign in required.");
    return errorResponse(400, "Draw request failed.");
  }
}
