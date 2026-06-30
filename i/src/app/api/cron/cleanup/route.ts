import { initDb, sql } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  await sql`DELETE FROM nonces WHERE expires_at < NOW()`;
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
  await sql`DELETE FROM api_cache WHERE expires_at < NOW()`;
  await sql`DELETE FROM rate_buckets WHERE bucket_start < NOW() - interval '2 hours'`;
  await sql`UPDATE challenges SET status = 'cancelled' WHERE status = 'open' AND expires_at < NOW()`;
  return json({ ok: true });
}
