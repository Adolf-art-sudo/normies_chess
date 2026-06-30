import { NextRequest, NextResponse } from "next/server";
import { getSanitizedSvg } from "@/lib/normies-api";
import { tokenIdSchema } from "@/lib/validators";
import { errorResponse, clientIp } from "@/lib/http";
import { takeRateSlot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ipSlot = await takeRateSlot(`ip:${clientIp(req)}:image`, 120, 60);
    if (!ipSlot.allowed) return errorResponse(429, "Too many image requests.");
    const tokenId = tokenIdSchema.parse(Number(id));
    const svg = await getSanitizedSvg(tokenId);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; sandbox"
      }
    });
  } catch {
    return errorResponse(404, "Image not available.");
  }
}
