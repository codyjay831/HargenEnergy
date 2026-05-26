"use client";

import { useEffect, useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar, CalendarX2, CheckCircle2, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import {
  bookWalkthroughSlot,
  cancelWalkthroughAppointment,
  getWalkthroughSchedulingPageData,
  getWalkthroughSchedulingSlots,
  rebookWalkthroughAppointment,
  rescheduleWalkthroughAppointment,
} from "@/app/actions/walkthrough-scheduling-public";
import { WalkthroughSlotPicker, type WalkthroughSlotOption } from "@/components/scheduling/WalkthroughSlotPicker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WalkthroughPublicSchedulerProps {
  token: string;
}

type SlotOption = WalkthroughSlotOption;

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
  calendarLinks: {
    googleUrl: string;
    icsUrl: string;
  };
};

type CanceledPageData = {
  mode: "canceled";
  companyName: string;
  contactName: string;
  customerEmail: string;
  appointment: {
    scheduledStartUtc: string;
    scheduledEndUtc: string;
    timezone: string;
  };
};

type ClosedPageData = {
  mode: "closed";
  companyName: string;
  contactName: string;
  appointment: {
    scheduledStartUtc: string;
    scheduledEndUtc: string;
    timezone: string;
    status: string;
  };
};

type PageData = BookPageData | ManagePageData | CanceledPageData | ClosedPageData;

function formatAppointmentRange(
  startUtc: string,
  endUtc: string,
  timezone: string,
) {
  return {
    date: formatInTimeZone(new Date(startUtc), timezone, "EEEE, MMMM d, yyyy"),
    time: `${formatInTimeZone(new Date(startUtc), timezone, "h:mm a")} – ${formatInTimeZone(
      new Date(endUtc),
      timezone,
      "h:mm a zzz",
    )}`,
  };
}

export function WalkthroughPublicScheduler({ token }: WalkthroughPublicSchedulerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<"unavailable" | "invalid" | null>(null);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bookStep, setBookStep] = useState<"slots" | "confirm">("slots");
  const [manageStep, setManageStep] = useState<"details" | "reschedule">("details");
  const [canceledStep, setCanceledStep] = useState<"confirmation" | "rebook">("confirmation");
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotOption[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshPageData = async () => {
    const data = await getWalkthroughSchedulingPageData(token);
    if ("unavailable" in data && data.unavailable) {
      setPageError("unavailable");
      setPageData(null);
      return;
    }
    if ("invalid" in data && data.invalid) {
      setPageError("invalid");
      setPageData(null);
      return;
    }

    if (data.mode === "book") {
      setContactName(data.contactName);
      setEmail(data.email);
      setPhone(data.phone ?? "");
    }

    setPageError(null);
    setPageData(data as PageData);
    setManageStep("details");
    setCanceledStep("confirmation");
    setBookStep("slots");
    setSelectedSlot(null);
  };

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
      setPageData(data as PageData);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadRescheduleSlots = () => {
    startTransition(async () => {
      const result = await getWalkthroughSchedulingSlots(token);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRescheduleSlots(result.slots);
    });
  };

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
      await refreshPageData();
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelWalkthroughAppointment(token);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setCancelDialogOpen(false);
      toast.success("Appointment canceled");
      await refreshPageData();
    });
  };

  const handleReschedule = () => {
    if (!selectedSlot) return;

    startTransition(async () => {
      const result = await rescheduleWalkthroughAppointment(token, selectedSlot.startUtc);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Walkthrough rescheduled");
      await refreshPageData();
    });
  };

  const handleRebook = () => {
    if (!selectedSlot) return;

    startTransition(async () => {
      const result = await rebookWalkthroughAppointment(token, selectedSlot.startUtc);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success("Your walkthrough is booked");
      await refreshPageData();
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

  if (pageData.mode === "closed") {
    const { date, time } = formatAppointmentRange(
      pageData.appointment.scheduledStartUtc,
      pageData.appointment.scheduledEndUtc,
      pageData.appointment.timezone,
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Walkthrough complete</CardTitle>
          <CardDescription>
            {pageData.companyName} · {pageData.contactName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This walkthrough is no longer available to manage online. Contact Hargen Energy if you
            need assistance.
          </p>
          <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{date}</p>
            <p>{time}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pageData.mode === "canceled") {
    const { date, time } = formatAppointmentRange(
      pageData.appointment.scheduledStartUtc,
      pageData.appointment.scheduledEndUtc,
      pageData.appointment.timezone,
    );

    if (canceledStep === "rebook") {
      const slots = rescheduleSlots.length > 0 ? rescheduleSlots : [];

      return (
        <Card>
          <CardHeader>
            <CardTitle>Pick a new time</CardTitle>
            <CardDescription>
              Choose a new walkthrough time for {pageData.companyName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WalkthroughSlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              showContinue={false}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setCanceledStep("confirmation")}>
                Back
              </Button>
              <Button disabled={isPending || !selectedSlot} onClick={handleRebook}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm new time"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Walkthrough canceled</CardTitle>
          <CardDescription>
            {pageData.companyName} · {pageData.contactName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your walkthrough has been canceled. A confirmation was sent to{" "}
            <span className="text-foreground">{pageData.customerEmail}</span>.
          </p>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <CalendarX2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground line-through">{date}</p>
                <p className="text-sm text-muted-foreground line-through">{time}</p>
              </div>
            </div>
          </div>
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setCanceledStep("rebook");
              setSelectedSlot(null);
              loadRescheduleSlots();
            }}
          >
            Pick a new time
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (pageData.mode === "manage") {
    const { appointment } = pageData;
    const { date, time } = formatAppointmentRange(
      appointment.scheduledStartUtc,
      appointment.scheduledEndUtc,
      appointment.timezone,
    );

    if (manageStep === "reschedule") {
      const slots = rescheduleSlots.length > 0 ? rescheduleSlots : [];

      return (
        <Card>
          <CardHeader>
            <CardTitle>Reschedule walkthrough</CardTitle>
            <CardDescription>Pick a new time for {pageData.companyName}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WalkthroughSlotPicker
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              showContinue={false}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setManageStep("details")}>
                Back
              </Button>
              <Button disabled={isPending || !selectedSlot} onClick={handleReschedule}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  "Confirm new time"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
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
                  <p className="font-medium">{date}</p>
                  <p className="text-sm text-muted-foreground">{time}</p>
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

            <p className="text-sm text-muted-foreground">
              Add to calendar:{" "}
              <a
                href={pageData.calendarLinks.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                Google Calendar
              </a>
              {" · "}
              <a
                href={pageData.calendarLinks.icsUrl}
                className="text-foreground underline underline-offset-2"
              >
                Apple Calendar
              </a>
              {" · "}
              <a
                href={pageData.calendarLinks.icsUrl}
                className="text-foreground underline underline-offset-2"
              >
                Outlook
              </a>
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setManageStep("reschedule");
                  setSelectedSlot(null);
                  loadRescheduleSlots();
                }}
              >
                Reschedule
              </Button>
              <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
                Cancel appointment
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent showCloseButton={!isPending}>
            <DialogHeader>
              <DialogTitle>Cancel this walkthrough?</DialogTitle>
              <DialogDescription>
                This will remove the event from our calendar and send you a cancellation
                confirmation. You can pick a new time afterward.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => setCancelDialogOpen(false)}
              >
                Keep appointment
              </Button>
              <Button variant="destructive" disabled={isPending} onClick={handleCancel}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  "Cancel walkthrough"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
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
        {bookStep === "slots" && (
          <>
            <WalkthroughSlotPicker
              slots={pageData.slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              onContinue={() => setBookStep("confirm")}
            />
          </>
        )}

        {bookStep === "confirm" && selectedSlot && (
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
              <Button variant="outline" onClick={() => setBookStep("slots")}>
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
