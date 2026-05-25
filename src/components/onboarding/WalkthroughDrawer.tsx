"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail, Phone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { UpdateRequestForm } from "@/components/forms/UpdateRequestForm";
import { LogTimeForm } from "@/components/forms/LogTimeForm";
import { IntakeLeadSnapshot } from "@/components/intake/IntakeLeadSnapshot";
import { StatusBadge } from "@/components/ui/status-badge";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import type { IntakeSnapshotClient, IntakeSnapshotMetadata } from "@/lib/intake-snapshot";
import { RequestStatusValue } from "@/lib/ui-enums";

interface WalkthroughDrawerProps {
  client: IntakeSnapshotClient;
  request: {
    id: string;
    clientId: string;
    title: string;
    supportNeeded: string | null;
    description: string;
    mostHelpful: string | null;
    urgency: string;
    status: RequestStatusValue;
    needsInfo: boolean;
    internalNotes: string | null;
    clientVisibleUpdate: string | null;
    estimatedMinutes: number | null;
    createdAt: Date;
    timeEntries: Array<{
      id: string;
      description: string;
      minutes: number;
      date: Date;
      billableType: string;
    }>;
  } | null;
  metadata?: IntakeSnapshotMetadata | null;
}

export function WalkthroughDrawer({ client, request, metadata }: WalkthroughDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const open = searchParams?.get("open") === "walkthrough" && request !== null;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("open");
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
      router.replace(newUrl);
    }
  };

  if (!request) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">{client.companyName}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </a>
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {client.phone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusBadge status={request.status} />
              {request.status === "NEW" && (
                <Badge variant="destructive" className="text-[10px]">
                  Needs review
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
        <SheetHeader className="pt-4">
          <SheetTitle>{PRODUCT_LANGUAGE.walkthrough.detailTitle}</SheetTitle>
          <SheetDescription>
            Submitted on {format(new Date(request.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Context</CardTitle>
            </CardHeader>
            <CardContent>
              <IntakeLeadSnapshot
                client={client}
                request={{
                  supportNeeded: request.supportNeeded,
                  description: request.description,
                  mostHelpful: request.mostHelpful,
                  urgency: request.urgency,
                }}
                metadata={metadata}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Update internal notes and qualification stage. Client-visible updates and billing workflows happen after activation.
              </p>
              <UpdateRequestForm request={request} />
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                Log Walkthrough Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Walkthrough and discovery time must be non-billable.
              </p>
              <LogTimeForm
                clientId={request.clientId}
                supportRequestId={request.id}
                isOverflowApproved={false}
                defaultBillableType="NON_BILLABLE"
                onSuccess={() => router.refresh()}
              />
            </CardContent>
          </Card>

          {request.timeEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Discovery Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, yyyy")} • {entry.billableType.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-sm font-bold ml-4">{entry.minutes}m</div>
                    </div>
                  ))}
                  <div className="pt-4 border-t flex justify-between items-center font-bold">
                    <span>Total Tracked</span>
                    <span>{request.timeEntries.reduce((acc, curr) => acc + curr.minutes, 0)}m</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
