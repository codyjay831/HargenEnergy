import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, User, Mail, Phone, Globe, MapPin, Clock, AlertCircle, TrendingUp, MessageSquare } from "lucide-react";
import { UpdateRequestForm } from "@/components/forms/UpdateRequestForm";
import { OverflowPrioritizationForm } from "@/components/forms/OverflowPrioritizationForm";
import { LogTimeForm } from "@/components/forms/LogTimeForm";
import { RequestCommentForm } from "@/components/forms/RequestCommentForm";
import { buttonVariants } from "@/components/ui/button";
import { cn, safeExternalHref } from "@/lib/utils";
import { calculateWeeklyUsage } from "@/lib/usage";
import { OverflowStatus } from "@/generated/prisma/client";
import { startOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const resolvedParams = await params;
  const id = typeof resolvedParams?.id === "string" ? resolvedParams.id : undefined;

  if (!id) {
    notFound();
  }

  const request = await prisma.supportRequest.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          timeEntries: {
            where: {
              date: {
                gte: startOfWeek(new Date(), { weekStartsOn: 1 })
              }
            }
          }
        }
      },
      timeEntries: {
        orderBy: { date: "desc" },
        take: 10
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          authorUser: {
            select: { name: true, email: true }
          }
        }
      }
    },
  });

  if (!request) {
    notFound();
  }

  const usage = calculateWeeklyUsage(request.client.timeEntries, request.client.weeklyHours);
  const isNearOrOverLimit = usage.isNearLimit || usage.isOverLimit;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/requests" 
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Request Details</h1>
          <p className="text-muted-foreground">Submitted on {format(new Date(request.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Info */}
        <div className="lg:col-span-2 space-y-8">
          {isNearOrOverLimit && (
            <div className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              usage.isOverLimit ? "bg-red-50 border-red-200 text-red-800" : "bg-orange-50 border-orange-200 text-orange-800"
            )}>
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-bold">Capacity Warning: Client is {usage.isOverLimit ? "over" : "near"} their weekly limit.</p>
                <p className="text-sm mt-1">
                  This client has used {usage.includedMinutesThisWeek}m of their {usage.weeklyReservedMinutes}m reserved block this week.
                  Consider prioritizing high-impact work or requesting overflow approval.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Intake Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-muted-foreground">Support Needed</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {request.supportNeeded?.split(", ").map((item, i) => (
                    <Badge key={i} variant="secondary">{item}</Badge>
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
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <span className="font-medium">{request.urgency.replace("_", " ")}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Preferred Support Level</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">{request.client.planType} Support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update Status & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <UpdateRequestForm request={request} />
            </CardContent>
          </Card>

          <Card className={cn(
            "border-2",
            request.overflowStatus === OverflowStatus.NEEDS_APPROVAL ? "border-orange-200 bg-orange-50/30" : 
            request.overflowStatus === OverflowStatus.APPROVED ? "border-green-200 bg-green-50/30" : "border-slate-200"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Overflow & Prioritization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OverflowPrioritizationForm request={request} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {request.timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No time logged for this request yet.</p>
              ) : (
                <div className="space-y-4">
                  {request.timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, yyyy")} • {entry.billableType.replace("_", " ")}
                        </p>
                      </div>
                      <div className="text-sm font-bold ml-4">
                        {entry.minutes}m
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t flex justify-between items-center font-bold">
                    <span>Total Tracked</span>
                    <span>{request.timeEntries.reduce((acc, curr) => acc + curr.minutes, 0)}m</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages / Comments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Client Communication
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
                        ? "bg-primary/5 border-primary/10 ml-auto" 
                        : "bg-slate-50 border-slate-200 ml-0"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {comment.authorType === "ADMIN" ? "You (Admin)" : "Client"}
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
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Send a Message to Client</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestCommentForm requestId={request.id} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Client Info & Log Time */}
        <div className="space-y-8">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Log Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LogTimeForm 
                clientId={request.clientId} 
                supportRequestId={request.id} 
                isOverflowApproved={request.overflowStatus === OverflowStatus.APPROVED}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">{request.client.companyName}</p>
                  <p className="text-xs text-muted-foreground">Company</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">{request.client.contactName}</p>
                  <p className="text-xs text-muted-foreground">{request.client.role || "Contact Person"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">{request.client.email}</p>
                  <p className="text-xs text-muted-foreground">Email</p>
                </div>
              </div>
              {request.client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{request.client.phone}</p>
                    <p className="text-xs text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}
              {request.client.website && (() => {
                const href = safeExternalHref(request.client.website);
                return (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-sm font-medium text-primary hover:underline">
                          {request.client.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-slate-700">{request.client.website}</span>
                      )}
                      <p className="text-xs text-muted-foreground">Website</p>
                    </div>
                  </div>
                );
              })()}
              {request.client.serviceArea && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{request.client.serviceArea}</p>
                    <p className="text-xs text-muted-foreground">Service Area</p>
                  </div>
                </div>
              )}
              
              {request.client.currentTools && (
                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Tools</Label>
                  <p className="text-sm mt-1">{request.client.currentTools}</p>
                </div>
              )}
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
