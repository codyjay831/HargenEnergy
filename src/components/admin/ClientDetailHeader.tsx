"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LogClientOpsSheet } from "@/components/admin/LogClientOpsSheet";
import { LogTimeSheet } from "@/components/admin/LogTimeSheet";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ClientStatus, EngagementType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

type ClientDetailHeaderProps = {
  clientId: string;
  companyName: string;
  status: ClientStatus;
  engagementType: EngagementType;
  engagementLabel: string;
  statusDateLabel: string;
};

export function ClientDetailHeader({
  clientId,
  companyName,
  status,
  engagementType,
  engagementLabel,
  statusDateLabel,
}: ClientDetailHeaderProps) {
  const isActive = status === ClientStatus.ACTIVE;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <Link href="/admin/clients" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to clients</span>
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active client" : "Prospect"}
            </Badge>
            {isActive && <Badge variant="outline">{engagementLabel}</Badge>}
          </div>
          <p className="text-muted-foreground">{statusDateLabel}</p>
        </div>
      </div>
      {isActive && (
        <div className="flex items-center gap-2">
          <LogTimeSheet clientId={clientId} engagementType={engagementType} companyName={companyName} />
          <LogClientOpsSheet clientId={clientId} companyName={companyName} />
        </div>
      )}
    </div>
  );
}
