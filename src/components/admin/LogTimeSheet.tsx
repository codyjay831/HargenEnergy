"use client";

import { Clock3 } from "lucide-react";

import { LogTimeForm } from "@/components/forms/LogTimeForm";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EngagementType } from "@/generated/prisma/client";

type LogTimeSheetProps = {
  clientId: string;
  engagementType: EngagementType;
  companyName: string;
};

export function LogTimeSheet({ clientId, engagementType, companyName }: LogTimeSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        <Clock3 className="h-4 w-4" />
        Log time
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Log Time</SheetTitle>
          <SheetDescription>{companyName}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <LogTimeForm
            clientId={clientId}
            engagementType={engagementType}
            supportRequestId={undefined}
            isOverflowApproved={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
