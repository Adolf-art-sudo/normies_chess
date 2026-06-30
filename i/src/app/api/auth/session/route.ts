import { NextRequest } from "next/server";
import { getSessionAddress } from "@/lib/auth";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-session-token");
  const address = await getSessionAddress(token);
  if (!address) return errorResponse(401, "Session expired.");
  return json({ address });
}
