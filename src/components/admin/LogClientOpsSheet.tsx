"use client";

import { Plus } from "lucide-react";

import { LogClientOpsForm } from "@/components/forms/LogClientOpsForm";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type LogClientOpsSheetProps = {
  clientId: string;
  companyName: string;
};

export function LogClientOpsSheet({ clientId, companyName }: LogClientOpsSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="h-4 w-4" />
        Log request
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Work Request</SheetTitle>
          <SheetDescription>{companyName}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <LogClientOpsForm clientId={clientId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
