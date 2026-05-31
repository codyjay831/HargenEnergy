import { NextRequest, NextResponse } from "next/server";
import { pruneStaleDiscoveries } from "@/lib/outreach-discovery";
import { processPendingEnrichmentQueue } from "@/lib/outreach-enrichment";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (request.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await pruneStaleDiscoveries();
    const enriched = await processPendingEnrichmentQueue(3);
    return NextResponse.json({
      success: true,
      deletedDiscoveries: deleted,
      enrichmentsProcessed: enriched,
    });
  } catch (error) {
    console.error("Outreach maintenance cron failed:", error);
    return NextResponse.json({ error: "Outreach maintenance failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
