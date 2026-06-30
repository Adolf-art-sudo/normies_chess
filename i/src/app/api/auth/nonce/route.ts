import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { initDb, sql } from "@/lib/db";
import { json, errorResponse, clientIp } from "@/lib/http";
import { addressSchema, normalizeAddress } from "@/lib/validators";
import { takeRateSlot } from "@/lib/rate-limit";
import { NONCE_TTL_MINUTES } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ address: addressSchema });

export async function POST(req: NextRequest) {
  try {
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:auth`, 20, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Too many auth attempts. Try again shortly.");
    const { address } = bodySchema.parse(await req.json());
    await initDb();
    const nonce = crypto.randomBytes(16).toString("hex");
    await sql`
      INSERT INTO nonces(nonce, address, expires_at)
      VALUES (${nonce}, ${normalizeAddress(address)}, NOW() + (${NONCE_TTL_MINUTES} || ' minutes')::interval)
    `;
    return json({ nonce, domain: process.env.SIWE_DOMAIN || req.nextUrl.host });
  } catch {
    return errorResponse(400, "Invalid nonce request.");
  }
}
