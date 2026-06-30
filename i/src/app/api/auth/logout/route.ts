import { NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await deleteSession(req.headers.get("x-session-token"));
  return json({ ok: true });
}
