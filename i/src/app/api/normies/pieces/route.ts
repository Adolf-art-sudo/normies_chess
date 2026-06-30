import { NextRequest } from "next/server";
import { z } from "zod";
import { buildPieceData, getHolderTokens } from "@/lib/normies-api";
import { requireAuth } from "@/lib/auth";
import { json, errorResponse, clientIp } from "@/lib/http";
import { normieIdsSchema } from "@/lib/validators";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tokenIds: normieIdsSchema,
  verifyOwnership: z.boolean().default(true)
});

export async function POST(req: NextRequest) {
  try {
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:pieces`, 12, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Piece building is rate limited. Try again shortly.");
    const address = await requireAuth(req);
    const { tokenIds, verifyOwnership } = bodySchema.parse(await req.json());
    if (verifyOwnership) {
      const holdings = new Set(await getHolderTokens(address));
      const missing = tokenIds.filter((id) => !holdings.has(id));
      if (missing.length) return errorResponse(403, `You do not own these tokens: ${missing.join(", ")}`);
    }
    const pieces = await buildPieceData(tokenIds);
    return json({ pieces });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") return errorResponse(401, "Sign in required.");
    const status = (err as Error & { status?: number }).status || 400;
    return errorResponse(status, "Could not build Normies pieces.");
  }
}
