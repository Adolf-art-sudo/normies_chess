import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { sql, initDb } from "@/lib/db";
import { SESSION_TTL_HOURS } from "@/lib/config";
import { normalizeAddress } from "@/lib/validators";

export function hashToken(token: string) {
  const secret = process.env.SESSION_SECRET || "development-secret";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

export async function upsertPlayer(address: string, normieIds: number[] = []) {
  await initDb();
  const normalized = normalizeAddress(address);
  await sql`
    INSERT INTO players(address, normie_ids, is_holder, last_seen)
    VALUES (${normalized}, ${JSON.stringify(normieIds)}::jsonb, ${normieIds.length > 0}, NOW())
    ON CONFLICT(address)
    DO UPDATE SET
      normie_ids = CASE WHEN ${normieIds.length} > 0 THEN ${JSON.stringify(normieIds)}::jsonb ELSE players.normie_ids END,
      is_holder = CASE WHEN ${normieIds.length} > 0 THEN true ELSE players.is_holder END,
      last_seen = NOW()
  `;
  return normalized;
}

export async function createSession(address: string) {
  await initDb();
  await upsertPlayer(address);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  await sql`
    INSERT INTO sessions(token_hash, address, expires_at)
    VALUES (${tokenHash}, ${normalizeAddress(address)}, NOW() + (${SESSION_TTL_HOURS} || ' hours')::interval)
  `;
  return token;
}

export async function getSessionAddress(token: string | null) {
  if (!token) return null;
  await initDb();
  const tokenHash = hashToken(token);
  const result = await sql<{ address: string }>`
    SELECT address FROM sessions
    WHERE token_hash = ${tokenHash} AND expires_at > NOW()
    LIMIT 1
  `;
  return result.rows[0]?.address || null;
}

export async function requireAuth(req: NextRequest) {
  const headerToken = req.headers.get("x-session-token");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const address = await getSessionAddress(headerToken || bearer || null);
  if (!address) throw new Error("UNAUTHORIZED");
  return address;
}

export async function deleteSession(token: string | null) {
  if (!token) return;
  await initDb();
  await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
}
