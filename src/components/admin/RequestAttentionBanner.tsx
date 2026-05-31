import { AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RequestAttentionBannerProps {
  variant: "awaiting_client" | "client_responded";
  staffMessage?: string | null;
  attachmentCount?: number;
  className?: string;
}

export function RequestAttentionBanner({
  variant,
  staffMessage,
  attachmentCount = 0,
  className,
}: RequestAttentionBannerProps) {
  if (variant === "awaiting_client") {
    return (
      <div
        className={cn(
          "p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-900",
          className,
        )}
      >
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="space-y-2 min-w-0">
          <p className="font-bold">Awaiting client response</p>
          {staffMessage ? (
            <p className="text-sm whitespace-pre-wrap">{staffMessage}</p>
          ) : (
            <p className="text-sm">
              This request is flagged as needing information from the client.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 text-blue-900",
        className,
      )}
    >
      <MessageSquare className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="space-y-1 min-w-0">
        <p className="font-bold">Client responded — review below</p>
        <p className="text-sm">
          {attachmentCount > 0
            ? `Includes ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}. `
            : ""}
          <Link href="#client-communication" className="underline font-medium">
            Jump to communication
          </Link>
        </p>
      </div>
    </div>
  );
}
