import { sql, initDb } from "@/lib/db";

export async function takeRateSlot(scope: string, limit: number, windowSeconds = 60) {
  await initDb();
  const result = await sql<{ count: number; bucket_start: string }>`
    WITH bucket AS (
      SELECT to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}) AS bucket_start
    ),
    upsert AS (
      INSERT INTO rate_buckets(scope, bucket_start, count)
      SELECT ${scope}, bucket_start, 1 FROM bucket
      ON CONFLICT (scope, bucket_start)
      DO UPDATE SET count = rate_buckets.count + 1
      RETURNING count, bucket_start
    )
    SELECT count, bucket_start FROM upsert
  `;
  const row = result.rows[0];
  const allowed = row.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - row.count),
    retryAfter: allowed ? 0 : windowSeconds
  };
}
