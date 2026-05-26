"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { setupSheetTitle } from "@/lib/setup-sheet-keys";
import { useSetupGuide } from "./SetupGuideProvider";

type SetupStepSheetProps = {
  children: React.ReactNode;
};

export function SetupStepSheet({ children }: SetupStepSheetProps) {
  const { activeSheet, closeSheet, variant } = useSetupGuide();

  return (
    <Sheet open={activeSheet != null} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {activeSheet && (
          <>
            <SheetHeader>
              <SheetTitle>{setupSheetTitle(activeSheet, variant)}</SheetTitle>
              <SheetDescription className="sr-only">
                Setup step details and actions
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">{children}</div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
