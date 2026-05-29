"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getSlotDayKey,
  groupDiscoveryDayGroupsByMonth,
  groupDiscoverySlotsByDay,
} from "@/lib/discovery-scheduling/group-slots-by-day";
import { cn } from "@/lib/utils";

export type DiscoverySlotOption = {
  startUtc: string;
  endUtc: string;
  displayTimezone: string;
};

interface DiscoverySlotPickerProps {
  slots: DiscoverySlotOption[];
  selectedSlot: DiscoverySlotOption | null;
  onSelect: (slot: DiscoverySlotOption) => void;
  onContinue?: () => void;
  continueLabel?: string;
  showContinue?: boolean;
}

export function DiscoverySlotPicker({
  slots,
  selectedSlot,
  onSelect,
  onContinue,
  continueLabel = "Continue",
  showContinue = true,
}: DiscoverySlotPickerProps) {
  const timePanelRef = useRef<HTMLDivElement>(null);
  const dayGroups = useMemo(() => groupDiscoverySlotsByDay(slots), [slots]);
  const monthGroups = useMemo(() => groupDiscoveryDayGroupsByMonth(dayGroups), [dayGroups]);

  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const activeDay =
    dayGroups.find((day) => day.dayKey === selectedDayKey) ?? dayGroups[0] ?? null;

  const displayTimezone = slots[0]?.displayTimezone ?? "UTC";
  const timezoneLabel = formatInTimeZone(new Date(), displayTimezone, "zzz");

  useEffect(() => {
    if (dayGroups.length === 0) {
      setSelectedDayKey(null);
      return;
    }

    if (selectedSlot) {
      const key = getSlotDayKey(selectedSlot);
      const matching = dayGroups.find((day) => day.dayKey === key);
      if (matching) {
        setSelectedDayKey(key);
        return;
      }
    }

    const firstDay = dayGroups[0];
    setSelectedDayKey(firstDay.dayKey);
    onSelect(firstDay.slots[0]);
  }, [slots, dayGroups, selectedSlot, onSelect]);

  const handleDaySelect = (dayKey: string) => {
    const day = dayGroups.find((group) => group.dayKey === dayKey);
    if (!day) return;

    setSelectedDayKey(dayKey);
    onSelect(day.slots[0]);
    timePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

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
    <div className="space-y-4">
      <div className="md:grid md:grid-cols-[minmax(11rem,13rem)_1fr] md:gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Select a day
          </p>
          <div
            className="flex gap-2 overflow-x-auto pb-1 md:block md:max-h-[min(24rem,60vh)] md:overflow-y-auto md:overflow-x-hidden md:pb-0"
            role="listbox"
            aria-label="Available days"
          >
            {monthGroups.map((month, monthIndex) => (
              <div
                key={month.monthKey}
                className={cn(
                  "flex shrink-0 items-center gap-2 md:block md:shrink",
                  monthIndex > 0 && "md:mt-4",
                )}
              >
                <p
                  className={cn(
                    "shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    "md:w-full md:py-1",
                  )}
                >
                  <span className="md:hidden">
                    {formatInTimeZone(
                      new Date(`${month.monthKey}-01T12:00:00.000Z`),
                      displayTimezone,
                      "MMM",
                    )}
                  </span>
                  <span className="hidden md:inline">{month.monthLabel}</span>
                </p>
                {month.days.map((day) => {
                  const isSelected = activeDay?.dayKey === day.dayKey;
                  return (
                    <button
                      key={day.dayKey}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleDaySelect(day.dayKey)}
                      className={cn(
                        "min-w-[7.5rem] shrink-0 rounded-lg border px-3 py-2.5 text-left transition-colors md:mb-1.5 md:w-full md:min-w-0",
                        "hover:border-primary/50 hover:bg-primary/5",
                        isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                      )}
                    >
                      <p className="text-sm font-medium md:hidden">{day.shortLabel}</p>
                      <p className="hidden text-sm font-medium md:block">{day.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {day.slots.length} {day.slots.length === 1 ? "time" : "times"}
                      </p>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div ref={timePanelRef} className="space-y-2 md:min-h-[12rem]">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Select a time
            </p>
            {activeDay && (
              <p className="mt-0.5 text-sm font-medium text-foreground">{activeDay.label}</p>
            )}
            <p className="text-xs text-muted-foreground">Times shown in {timezoneLabel}</p>
          </div>

          {activeDay ? (
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="listbox"
              aria-label="Available times"
            >
              {activeDay.slots.map((slot) => {
                const selected = selectedSlot?.startUtc === slot.startUtc;
                return (
                  <button
                    key={slot.startUtc}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onSelect(slot)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
                      selected && "border-primary bg-primary/5 ring-1 ring-primary/20",
                    )}
                  >
                    <p className="font-medium">
                      {formatInTimeZone(
                        new Date(slot.startUtc),
                        slot.displayTimezone,
                        "h:mm a",
                      )}
                      {" – "}
                      {formatInTimeZone(
                        new Date(slot.endUtc),
                        slot.displayTimezone,
                        "h:mm a",
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {showContinue && onContinue && (
        <Button className="w-full sm:w-auto" disabled={!selectedSlot} onClick={onContinue}>
          {continueLabel}
        </Button>
      )}
    </div>
  );
}
