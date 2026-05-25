import { NextRequest, NextResponse } from "next/server";
import { del, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (request.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DELETE_PER_RUN = 250;

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  let deleted = 0;
  let cursor: string | undefined;

  try {
    while (deleted < MAX_DELETE_PER_RUN) {
      const page = await list({
        prefix: "attachments/",
        cursor,
        limit: 200,
      });
      if (page.blobs.length === 0) break;

      const stale = page.blobs
        .filter((b) => b.pathname.includes("/pending/"))
        .filter((b) => new Date(b.uploadedAt).getTime() < cutoff)
        .map((b) => b.url);

      if (stale.length > 0) {
        const toDelete = stale.slice(0, MAX_DELETE_PER_RUN - deleted);
        await del(toDelete);
        deleted += toDelete.length;
      }

      cursor = page.cursor;
      if (!cursor) break;
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Blob cleanup cron failed:", error);
    return NextResponse.json({ error: "Blob cleanup failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
