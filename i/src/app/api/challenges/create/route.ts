import { NextRequest } from "next/server";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getHolderTokens } from "@/lib/normies-api";
import { normieIdsSchema, stripHtml } from "@/lib/validators";
import { json, errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  normieIds: normieIdsSchema,
  message: z.string().max(240).optional().default("")
});

export async function POST(req: NextRequest) {
  try {
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:challenge-create`, 10, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Challenge creation is rate limited.");
    const address = await requireAuth(req);
    const body = bodySchema.parse(await req.json());
    const holdings = new Set(await getHolderTokens(address));
    const missing = body.normieIds.filter((id) => !holdings.has(id));
    if (missing.length) return errorResponse(403, `You do not own: ${missing.join(", ")}`);
    const id = crypto.randomUUID();
    await initDb();
    await sql`
      INSERT INTO challenges(id, challenger_address, challenger_normie_ids, message, expires_at)
      VALUES (${id}, ${address}, ${JSON.stringify(body.normieIds)}::jsonb, ${stripHtml(body.message)}, NOW() + interval '24 hours')
    `;
    return json({ id, shareUrl: `/challenge/${id}` });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") return errorResponse(401, "Sign in required.");
    return errorResponse(400, "Could not create challenge.");
  }
}
