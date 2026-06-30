import { NextRequest } from "next/server";
import { initDb, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { json, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const address = await requireAuth(req);
    await initDb();
    const result = await sql`
      UPDATE challenges
      SET status = 'cancelled'
      WHERE id = ${id}
        AND challenger_address = ${address}
        AND status = 'open'
      RETURNING id
    `;
    if (result.rowCount === 0) return errorResponse(404, "Open challenge not found.");
    return json({ ok: true });
  } catch {
    return errorResponse(401, "Sign in required.");
  }
}
