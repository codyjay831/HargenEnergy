"use client";

import { formatInTimeZone } from "date-fns-tz";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type WalkthroughSlotOption = {
  startUtc: string;
  endUtc: string;
  displayTimezone: string;
};

interface WalkthroughSlotPickerProps {
  slots: WalkthroughSlotOption[];
  selectedSlot: WalkthroughSlotOption | null;
  onSelect: (slot: WalkthroughSlotOption) => void;
  onContinue?: () => void;
  continueLabel?: string;
  showContinue?: boolean;
}

export function WalkthroughSlotPicker({
  slots,
  selectedSlot,
  onSelect,
  onContinue,
  continueLabel = "Continue",
  showContinue = true,
}: WalkthroughSlotPickerProps) {
  if (slots.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No times available"
        description="There are no open slots in the current booking window. Please check back later or contact Hargen Energy."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {slots.map((slot) => {
          const selected = selectedSlot?.startUtc === slot.startUtc;
          return (
            <button
              key={slot.startUtc}
              type="button"
              onClick={() => onSelect(slot)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                selected && "border-primary bg-primary/5 ring-1 ring-primary/20",
              )}
            >
              <p className="font-medium">
                {formatInTimeZone(new Date(slot.startUtc), slot.displayTimezone, "EEEE, MMM d")}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatInTimeZone(new Date(slot.startUtc), slot.displayTimezone, "h:mm a")}
                {" – "}
                {formatInTimeZone(new Date(slot.endUtc), slot.displayTimezone, "h:mm a zzz")}
              </p>
            </button>
          );
        })}
      </div>

      {showContinue && onContinue && (
        <Button className="w-full sm:w-auto" disabled={!selectedSlot} onClick={onContinue}>
          {continueLabel}
        </Button>
      )}
    </>
  );
}
