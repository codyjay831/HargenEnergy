import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RequestCommentForm } from "@/components/forms/RequestCommentForm";
import { OverflowStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

interface PortalRequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortalRequestDetailPage({ params }: PortalRequestDetailPageProps) {
  const resolvedParams = await params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : undefined;
  const session = await auth();
  const clientId = session?.user?.clientId;

  if (!id || !clientId) {
    notFound();
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id },
    include: {
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: {
          authorUser: {
            select: { name: true, email: true }
          }
        }
      },
      timeEntries: {
        select: { minutes: true, billableType: true }
      }
    },
  });

  if (!request || request.clientId !== clientId) {
    notFound();
  }

  const includedMinutes = request.timeEntries
    .filter(e => e.billableType === "INCLUDED")
    .reduce((acc, curr) => acc + curr.minutes, 0);

  const overflowMinutes = request.timeEntries
    .filter(e => e.billableType === "OVERFLOW")
    .reduce((acc, curr) => acc + curr.minutes, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/portal/requests" 
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{request.title}</h1>
          <p className="text-muted-foreground">Submitted on {format(new Date(request.createdAt), "MMMM d, yyyy")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Info & Comments */}
        <div className="lg:col-span-2 space-y-8">
          {(request.status === "NEEDS_INFO" || request.needsInfo) && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 text-orange-800">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-bold">Information Needed</p>
                <p className="text-sm mt-1">Hargen Energy has requested more information to proceed with this request. Please review the update below and reply using the message form.</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Request Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-muted-foreground">Support Needed</Label>
                <p className="mt-1 font-medium">{request.supportNeeded}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Description / Bottleneck</Label>
                <p className="mt-1 text-slate-900 whitespace-pre-wrap text-sm">{request.description}</p>
              </div>

              {request.clientVisibleUpdate && (
                <div className="pt-6 border-t">
                  <Label className="text-primary font-bold">Latest Update from Hargen Energy</Label>
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-slate-900 text-sm whitespace-pre-wrap">{request.clientVisibleUpdate}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages / Comments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Messages & Responses
            </h3>
            
            <div className="space-y-4">
              {request.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4">No messages yet.</p>
              ) : (
                request.comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={cn(
                      "p-4 rounded-lg border max-w-[90%]",
                      comment.authorType === "ADMIN" 
                        ? "bg-slate-50 border-slate-200 ml-0" 
                        : "bg-primary/5 border-primary/10 ml-auto"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {comment.authorType === "ADMIN" ? "Hargen Energy" : "You"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))
              )}
            </div>

            <Card className="mt-8 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Send a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestCommentForm requestId={request.id} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Status & Time Summary */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Status Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="outline" className="capitalize">
                  {request.status.replace("_", " ").toLowerCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Urgency:</span>
                <span className="text-sm font-medium capitalize">{request.urgency.toLowerCase()}</span>
              </div>
              
              {request.overflowStatus !== OverflowStatus.NOT_NEEDED && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Overflow Status</Label>
                  <div className="mt-1">
                    <Badge variant={request.overflowStatus === "APPROVED" ? "default" : "secondary"} className="text-[10px]">
                      {request.overflowStatus.replace("_", " ")}
                    </Badge>
                  </div>
                  {request.overflowReason && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{request.overflowReason}</p>
                  )}
                </div>
              )}

              {request.deferredUntil && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Deferred Until</Label>
                  <p className="text-sm font-medium mt-1">{format(new Date(request.deferredUntil), "MMMM d, yyyy")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Time Tracked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Included:</span>
                <span className="font-medium">{includedMinutes}m</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overflow:</span>
                <span className="font-medium text-orange-600">{overflowMinutes}m</span>
              </div>
              <div className="pt-3 border-t flex justify-between font-bold text-sm">
                <span>Total:</span>
                <span>{includedMinutes + overflowMinutes}m</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                * Time is updated as work progresses.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}
