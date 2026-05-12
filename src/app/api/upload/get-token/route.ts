import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, clientId, requestId } = body;

    if (type === "logo") {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only admins can upload logos" },
          { status: 403 }
        );
      }

      if (!clientId) {
        return NextResponse.json(
          { error: "Client ID is required for logo uploads" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        metadata: {
          type: "logo",
          clientId,
          userId: session.user.id,
        },
      });
    }

    if (type === "attachment") {
      if (!session.user.clientId && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "User must have a client ID or be an admin" },
          { status: 403 }
        );
      }

      const uploadClientId = clientId || session.user.clientId;

      if (!uploadClientId) {
        return NextResponse.json(
          { error: "Client ID is required" },
          { status: 400 }
        );
      }

      if (session.user.role !== "ADMIN" && session.user.clientId !== uploadClientId) {
        return NextResponse.json(
          { error: "Cannot upload files for another client" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        metadata: {
          type: "attachment",
          clientId: uploadClientId,
          requestId: requestId || null,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid upload type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Upload token error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload token" },
      { status: 500 }
    );
  }
}
