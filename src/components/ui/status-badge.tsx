"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RequestStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const STATUS_DESCRIPTIONS: Record<RequestStatus, string> = {
  NEW: "Request has been submitted and is awaiting initial review.",
  REVIEWED: "We've audited the request and it's in our queue.",
  IN_PROGRESS: "We are actively working on this request.",
  NEEDS_INFO: "We need a document or clarification from you to proceed.",
  WAITING_ON_CUSTOMER: "We are waiting for a response or action from you.",
  WAITING_ON_THIRD_PARTY: "Waiting for AHJ/Utility response (e.g., Permit approval or PTO).",
  COMPLETE: "The work for this request has been finished.",
  CANCELLED: "This request has been cancelled.",
};

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge 
          variant="outline" 
          className={cn("cursor-help text-[10px] uppercase tracking-wider", className)}
        >
          {status.replace(/_/g, " ")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-center">
        {STATUS_DESCRIPTIONS[status]}
      </TooltipContent>
    </Tooltip>
  );
}
