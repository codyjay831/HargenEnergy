import { NextRequest, NextResponse } from "next/server";
import { processRecurringTasksInternal } from "@/lib/recurring-processor";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processRecurringTasksInternal();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Recurring cron failed:", error);
    return NextResponse.json({ error: "Recurring cron failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
