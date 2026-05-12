"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { UpdateRequestForm } from "@/components/forms/UpdateRequestForm";
import { LogTimeForm } from "@/components/forms/LogTimeForm";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";
import { RequestStatusValue } from "@/lib/ui-enums";

interface WalkthroughDrawerProps {
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
    client: {
      planType: string;
    };
    timeEntries: Array<{
      id: string;
      description: string;
      minutes: number;
      date: Date;
      billableType: string;
    }>;
  } | null;
}

export function WalkthroughDrawer({ request }: WalkthroughDrawerProps) {
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
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{PRODUCT_LANGUAGE.walkthrough.detailTitle}</SheetTitle>
          <SheetDescription>
            Submitted on {format(new Date(request.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Lead Context Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-muted-foreground">Support Needed</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {request.supportNeeded?.split(", ").map((item, i) => (
                    <Badge key={i} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Current Bottleneck</Label>
                <p className="mt-1 text-slate-900 whitespace-pre-wrap">{request.description}</p>
              </div>

              {request.mostHelpful && (
                <div>
                  <Label className="text-muted-foreground">Most Helpful First Step</Label>
                  <p className="mt-1 text-slate-900 whitespace-pre-wrap">{request.mostHelpful}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Urgency</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">{request.urgency.replace("_", " ")}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan Interest</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-medium">{request.client.planType} Support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualification Card */}
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

          {/* Log Walkthrough Time Card */}
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

          {/* Discovery Time List */}
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
      </SheetContent>
    </Sheet>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}
