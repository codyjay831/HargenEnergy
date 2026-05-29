"use client";

import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProofOfWorkForm } from "@/components/admin/client-work/ProofOfWorkForm";
import type { BlockWorkTaskOption } from "@/lib/block-work";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

type LogProofOfWorkSheetProps = {
  companyName: string;
  taskOptions: BlockWorkTaskOption[];
};

export function LogProofOfWorkSheet({ companyName, taskOptions }: LogProofOfWorkSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="default" />}>
        <ClipboardCheck className="h-4 w-4" />
        {PRODUCT_LANGUAGE.proofOfWork}
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{PRODUCT_LANGUAGE.proofOfWork}</SheetTitle>
          <SheetDescription>{companyName}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <ProofOfWorkForm taskOptions={taskOptions} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
