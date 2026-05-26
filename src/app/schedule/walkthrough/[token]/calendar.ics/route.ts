import { buildWalkthroughIcsResponseFromToken } from "@/lib/walkthrough-scheduling/calendar-ics-response";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const resolvedParams = await params;
  const token = typeof resolvedParams?.token === "string" ? resolvedParams.token : "";
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const response = await buildWalkthroughIcsResponseFromToken(token);
  if (!response) {
    return new Response("Not found", { status: 404 });
  }

  return response;
}
