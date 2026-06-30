import { NextRequest } from "next/server";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getHolderTokens, buildPieceData } from "@/lib/normies-api";
import { createGameState } from "@/lib/chess-game";
import { normieIdsSchema } from "@/lib/validators";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `ownedIds` is the subset of `normieIds` the client claims to own.
// Any id NOT listed in ownedIds is treated as an unverified/"borrowed"
// piece (e.g. from the auto-fill random-fetch flow) and is not checked
// against wallet holdings. Ids that ARE listed in ownedIds must be
// genuinely owned, or the request is rejected — this preserves the
// anti-cheat guarantee for manual entry (which marks everything as owned)
// while allowing auto-fill to work for wallets with fewer than 16 Normies.
const bodySchema = z.object({
  normieIds: normieIdsSchema,
  ownedIds: z.array(z.number().int().min(0).max(9999)).max(16).optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const opponent = await requireAuth(req);
    const { normieIds, ownedIds } = bodySchema.parse(await req.json());

    // Default to the old strict behavior if the client doesn't send ownedIds
    // (keeps this endpoint backward compatible with any other caller).
    const claimedOwned = ownedIds ?? normieIds;

    const holdings = new Set(await getHolderTokens(opponent));
    const missing = claimedOwned.filter((tokenId) => !holdings.has(tokenId));
    if (missing.length) return errorResponse(403, `You do not own: ${missing.join(", ")}`);

    await initDb();
    const accepted = await sql<{ challenger_address: string; challenger_normie_ids: number[] }>`
      UPDATE challenges
      SET status = 'accepted'
      WHERE id = ${id}
        AND status = 'open'
        AND expires_at > NOW()
        AND challenger_address <> ${opponent}
      RETURNING challenger_address, challenger_normie_ids
    `;
    const challenge = accepted.rows[0];
    if (!challenge) return errorResponse(409, "Challenge is no longer available.");
    const [whitePieces, blackPieces] = await Promise.all([
      buildPieceData(challenge.challenger_normie_ids),
      buildPieceData(normieIds)
    ]);
    const state = createGameState(challenge.challenger_address, opponent, whitePieces, blackPieces);
    await sql`
      INSERT INTO games(id, white_address, black_address, white_normie_ids, black_normie_ids, state, fen)
      VALUES (${state.id}, ${challenge.challenger_address}, ${opponent}, ${JSON.stringify(challenge.challenger_normie_ids)}::jsonb, ${JSON.stringify(normieIds)}::jsonb, ${JSON.stringify(state)}::jsonb, ${state.fen})
    `;
    await sql`UPDATE challenges SET game_id = ${state.id} WHERE id = ${id}`;
    return json({ gameId: state.id, state });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") return errorResponse(401, "Sign in required.");
    return errorResponse(400, "Could not accept challenge.");
  }
}
