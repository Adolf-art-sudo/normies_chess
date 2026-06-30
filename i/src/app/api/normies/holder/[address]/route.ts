import { NextRequest } from "next/server";
import { getHolderTokens } from "@/lib/normies-api";
import { upsertPlayer } from "@/lib/auth";
import { addressSchema, normalizeAddress } from "@/lib/validators";
import { json, errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address: rawAddress } = await params;
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:normies`, 60, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Too many Normies requests. Try again soon.");
    const address = normalizeAddress(addressSchema.parse(rawAddress));
    const tokenIds = await getHolderTokens(address);
    await upsertPlayer(address, tokenIds);
    return json({ address, tokenIds });
  } catch {
    return errorResponse(400, "Invalid holder request.");
  }
}
