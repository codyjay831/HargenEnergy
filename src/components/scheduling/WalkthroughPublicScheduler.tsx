"use client";

import { useEffect, useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar, CheckCircle2, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import {
  bookWalkthroughSlot,
  cancelWalkthroughAppointment,
  getWalkthroughSchedulingPageData,
} from "@/app/actions/walkthrough-scheduling-public";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WalkthroughPublicSchedulerProps {
  token: string;
}

type SlotOption = {
  startUtc: string;
  endUtc: string;
  displayTimezone: string;
};

type BookPageData = {
  mode: "book";
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  slots: SlotOption[];
};

type ManagePageData = {
  mode: "manage";
  companyName: string;
  contactName: string;
  appointment: {
    scheduledStartUtc: string;
    scheduledEndUtc: string;
    timezone: string;
    meetingUrl: string | null;
    status: string;
  };
};

type PageData = BookPageData | ManagePageData;

export function WalkthroughPublicScheduler({ token }: WalkthroughPublicSchedulerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<"unavailable" | "invalid" | null>(null);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"slots" | "confirm">("slots");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    startTransition(async () => {
      const data = await getWalkthroughSchedulingPageData(token);
      if (cancelled) return;

      if ("unavailable" in data && data.unavailable) {
        setPageError("unavailable");
        setPageData(null);
        setIsLoading(false);
        return;
      }
      if ("invalid" in data && data.invalid) {
        setPageError("invalid");
        setPageData(null);
        setIsLoading(false);
        return;
      }

      if (data.mode === "book") {
        setContactName(data.contactName);
        setEmail(data.email);
        setPhone(data.phone ?? "");
      }

      setPageError(null);
      setPageData(data);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleBook = () => {
    if (!selectedSlot) return;

    startTransition(async () => {
      const result = await bookWalkthroughSlot(token, selectedSlot.startUtc, {
        contactName,
        email,
        phone: phone.trim() || undefined,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Your walkthrough is booked");
      const refreshed = await getWalkthroughSchedulingPageData(token);
      if ("mode" in refreshed && refreshed.mode === "manage") {
        setPageData(refreshed);
        setStep("slots");
        setSelectedSlot(null);
      }
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelWalkthroughAppointment(token);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Appointment canceled");
      const refreshed = await getWalkthroughSchedulingPageData(token);
      if ("mode" in refreshed && refreshed.mode === "book") {
        setContactName(refreshed.contactName);
        setEmail(refreshed.email);
        setPhone(refreshed.phone ?? "");
        setPageData(refreshed);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pageError === "unavailable") {
    return (
      <EmptyState
        icon={Calendar}
        title="Scheduling unavailable"
        description="Walkthrough scheduling is temporarily unavailable. Please contact Hargen Energy directly."
      />
    );
  }

  if (pageError === "invalid") {
    return (
      <EmptyState
        icon={Calendar}
        title="Link expired or invalid"
        description="This scheduling link is no longer active. Reply to your Hargen email or request a new link."
      />
    );
  }

  if (!pageData) {
    return null;
  }

  if (pageData.mode === "manage") {
    const { appointment } = pageData;
    const canCancel = appointment.status === "SCHEDULED";

    return (
      <Card>
        <CardHeader>
          <CardTitle>Your walkthrough is scheduled</CardTitle>
          <CardDescription>
            {pageData.companyName} · {pageData.contactName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium">
                  {formatInTimeZone(
                    new Date(appointment.scheduledStartUtc),
                    appointment.timezone,
                    "EEEE, MMMM d, yyyy",
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatInTimeZone(
                    new Date(appointment.scheduledStartUtc),
                    appointment.timezone,
                    "h:mm a",
                  )}
                  {" – "}
                  {formatInTimeZone(
                    new Date(appointment.scheduledEndUtc),
                    appointment.timezone,
                    "h:mm a zzz",
                  )}
                </p>
              </div>
            </div>
          </div>

          {appointment.meetingUrl && (
            <a
              href={appointment.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              <Video className="mr-2 h-4 w-4" />
              Join meeting
            </a>
          )}

          {canCancel && (
            <Button variant="outline" disabled={isPending} onClick={handleCancel}>
              Cancel appointment
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule your walkthrough</CardTitle>
        <CardDescription>
          Pick a time for {pageData.companyName}. Times shown in your local availability window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "slots" && (
          <>
            {pageData.slots.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No times available"
                description="There are no open slots in the current booking window. Please check back later or contact Hargen Energy."
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {pageData.slots.map((slot) => {
                  const selected = selectedSlot?.startUtc === slot.startUtc;
                  return (
                    <button
                      key={slot.startUtc}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                        selected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                      )}
                    >
                      <p className="font-medium">
                        {formatInTimeZone(
                          new Date(slot.startUtc),
                          slot.displayTimezone,
                          "EEEE, MMM d",
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatInTimeZone(
                          new Date(slot.startUtc),
                          slot.displayTimezone,
                          "h:mm a",
                        )}
                        {" – "}
                        {formatInTimeZone(new Date(slot.endUtc), slot.displayTimezone, "h:mm a zzz")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <Button
              className="w-full sm:w-auto"
              disabled={!selectedSlot}
              onClick={() => setStep("confirm")}
            >
              Continue
            </Button>
          </>
        )}

        {step === "confirm" && selectedSlot && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">
                {formatInTimeZone(
                  new Date(selectedSlot.startUtc),
                  selectedSlot.displayTimezone,
                  "EEEE, MMMM d, yyyy 'at' h:mm a zzz",
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Your name</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep("slots")}>
                Back
              </Button>
              <Button
                disabled={isPending || !contactName.trim() || !email.trim()}
                onClick={handleBook}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm booking"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
