import { NextRequest, NextResponse } from "next/server";
import { processWalkthroughReminders } from "@/lib/walkthrough-scheduling/reminder-processor";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processWalkthroughReminders();
  return NextResponse.json({ success: true, ...result });
}
