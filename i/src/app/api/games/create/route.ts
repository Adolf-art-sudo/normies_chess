import { NextRequest } from "next/server";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { requireAuth, upsertPlayer } from "@/lib/auth";
import { buildPieceData, getHolderTokens } from "@/lib/normies-api";
import { createGameState } from "@/lib/chess-game";
import { addressSchema, normieIdsSchema, normalizeAddress } from "@/lib/validators";
import { json, errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  blackAddress: addressSchema,
  whiteNormieIds: normieIdsSchema,
  blackNormieIds: normieIdsSchema,
  verifyOwnership: z.boolean().default(true)
});

async function verifyOwnership(address: string, ids: number[]) {
  const holdings = new Set(await getHolderTokens(address));
  return ids.filter((id) => !holdings.has(id));
}

export async function POST(req: NextRequest) {
  try {
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:create-game`, 6, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Game creation is rate limited.");
    const whiteAddress = await requireAuth(req);
    const body = bodySchema.parse(await req.json());
    const blackAddress = normalizeAddress(body.blackAddress);
    if (whiteAddress === blackAddress) return errorResponse(400, "Self-play is disabled for ranked games.");
    if (body.verifyOwnership) {
      const missingWhite = await verifyOwnership(whiteAddress, body.whiteNormieIds);
      if (missingWhite.length) return errorResponse(403, `White does not own: ${missingWhite.join(", ")}`);
      const missingBlack = await verifyOwnership(blackAddress, body.blackNormieIds);
      if (missingBlack.length) return errorResponse(403, `Black does not own: ${missingBlack.join(", ")}`);
    }
    const [whitePieces, blackPieces] = await Promise.all([
      buildPieceData(body.whiteNormieIds),
      buildPieceData(body.blackNormieIds)
    ]);
    const state = createGameState(whiteAddress, blackAddress, whitePieces, blackPieces);
    await initDb();
    await upsertPlayer(whiteAddress);
    await upsertPlayer(blackAddress);
    await sql`
      INSERT INTO games(id, white_address, black_address, white_normie_ids, black_normie_ids, state, fen)
      VALUES (
        ${state.id},
        ${whiteAddress},
        ${blackAddress},
        ${JSON.stringify(body.whiteNormieIds)}::jsonb,
        ${JSON.stringify(body.blackNormieIds)}::jsonb,
        ${JSON.stringify(state)}::jsonb,
        ${state.fen}
      )
    `;
    return json({ gameId: state.id, state });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") return errorResponse(401, "Sign in required.");
    return errorResponse((err as Error & { status?: number }).status || 400, "Could not create game.");
  }
}
