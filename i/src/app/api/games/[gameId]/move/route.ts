import { NextRequest } from "next/server";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { makeMove, sideForAddress, type GameState } from "@/lib/chess-game";
import { finalizePoints } from "@/lib/points";
import { getTokenFlags, getTokenTraits } from "@/lib/normies-api";
import { squareSchema } from "@/lib/validators";
import { json, errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ from: squareSchema, to: squareSchema });

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:move`, 90, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Too many move requests.");
    const address = await requireAuth(req);
    const { from, to } = bodySchema.parse(await req.json());
    await initDb();
    const game = await sql<{ state: GameState; result: string | null }>`
      SELECT state, result FROM games WHERE id = ${gameId} LIMIT 1
    `;
    if (!game.rows[0]) return errorResponse(404, "Game not found.");
    if (game.rows[0].result) return errorResponse(400, "Game already finished.");
    const side = sideForAddress(game.rows[0].state, address);
    if (!side) return errorResponse(403, "You are not a player in this game.");
    const previousUpdatedAt = game.rows[0].state.updatedAt;
    const moved = makeMove(game.rows[0].state, side, from, to);
    if (moved.capturedNormieId) {
      const capturedSide = side === "white" ? "black" : "white";
      const captured = moved.state.captured[capturedSide].find((piece) => piece.tokenId === moved.capturedNormieId);
      if (captured) {
        const traits = await getTokenTraits(captured.tokenId);
        const flags = await getTokenFlags(captured.tokenId, traits);
        captured.isZombie = flags.isZombie;
        captured.isAgent = flags.isAgent;
        captured.isLegendary = flags.isLegendary;
        captured.rarityRank = flags.rarityRank;
        captured.personaName = flags.personaName;
      }
    }
    const saved = await sql`
      UPDATE games
      SET state = ${JSON.stringify(moved.state)}::jsonb,
          pgn = ${moved.state.pgn},
          fen = ${moved.state.fen},
          result = ${moved.state.result},
          updated_at = NOW(),
          ended_at = CASE WHEN ${moved.state.result} IS NULL THEN ended_at ELSE NOW() END
      WHERE id = ${gameId}
        AND state->>'updatedAt' = ${previousUpdatedAt}
    `;
    if (saved.rowCount === 0) return errorResponse(409, "Game changed while your move was being processed. Refresh and try again.");
    await sql`
      INSERT INTO moves(game_id, move_number, player_address, from_square, to_square, san, normie_id, captured_normie_id, is_capture, is_check, is_checkmate)
      VALUES (${gameId}, ${moved.state.moveCount}, ${address}, ${from}, ${to}, ${moved.move.san}, ${moved.movingNormieId}, ${moved.capturedNormieId}, ${Boolean(moved.capturedNormieId)}, ${moved.isCheck}, ${moved.isCheckmate})
    `;
    let points = { white: 0, black: 0 };
    if (moved.state.result) {
      points = await finalizePoints(moved.state);
      await sql`
        UPDATE games
        SET white_points_earned = ${points.white}, black_points_earned = ${points.black}
        WHERE id = ${gameId}
      `;
    }
    return json({ state: moved.state, move: moved.move, points });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") return errorResponse(401, "Sign in required.");
    return errorResponse(400, (err as Error).message || "Move failed.");
  }
}
