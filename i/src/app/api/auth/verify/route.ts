import { NextRequest } from "next/server";
import { SiweMessage } from "siwe";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { createSession, upsertPlayer } from "@/lib/auth";
import { siweDomain } from "@/lib/config";
import { json, errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";
import { normalizeAddress } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(10).max(4000),
  signature: z.string().min(20).max(300)
});

export async function POST(req: NextRequest) {
  try {
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:auth`, 20, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Too many auth attempts. Try again shortly.");
    const { message, signature } = bodySchema.parse(await req.json());
    const siwe = new SiweMessage(message);
    const nonce = siwe.nonce;
    const domain = process.env.SIWE_DOMAIN || req.nextUrl.host;
    if (domain !== siweDomain() && process.env.NODE_ENV === "production") {
      return errorResponse(400, "SIWE domain is not configured correctly.");
    }
    await initDb();
    const nonceRow = await sql<{ address: string }>`
      DELETE FROM nonces
      WHERE nonce = ${nonce} AND expires_at > NOW()
      RETURNING address
    `;
    const expectedAddress = nonceRow.rows[0]?.address;
    if (!expectedAddress) return errorResponse(401, "Nonce expired or not found.");
    await siwe.verify({ signature, domain, nonce });
    const address = normalizeAddress(siwe.address);
    if (address !== expectedAddress) return errorResponse(401, "Signature address mismatch.");
    await upsertPlayer(address);
    const sessionToken = await createSession(address);
    return json({ address, sessionToken, expiresInHours: 24 });
  } catch {
    return errorResponse(401, "Signature verification failed.");
  }
}
