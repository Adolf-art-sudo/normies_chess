import { NextRequest } from "next/server";
import { tokenIdSchema } from "@/lib/validators";
import { getTokenFlags, getTokenTraits, assignPiece } from "@/lib/normies-api";
import { json, errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:token`, 60, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Too many token requests.");
    const tokenId = tokenIdSchema.parse(Number(id));
    const traits = await getTokenTraits(tokenId);
    const flags = await getTokenFlags(tokenId, traits);
    return json({ tokenId, traits, ...flags, piece: assignPiece(traits, flags) });
  } catch {
    return errorResponse(400, "Invalid token request.");
  }
}
