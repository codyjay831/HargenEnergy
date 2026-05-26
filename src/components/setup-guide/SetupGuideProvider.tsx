"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SetupSheetKey } from "@/lib/setup-sheet-keys";
import { ADMIN_RAIL_SHEET, CUSTOMER_RAIL_SHEET } from "@/lib/setup-sheet-keys";

type SetupGuideVariant = "admin" | "customer";

type SetupGuideContextValue = {
  variant: SetupGuideVariant;
  activeSheet: SetupSheetKey | null;
  openSheet: (key: SetupSheetKey) => void;
  openRailNode: (railId: string) => void;
  closeSheet: () => void;
  onOpenWalkthrough?: () => void;
};

const SetupGuideContext = createContext<SetupGuideContextValue | null>(null);

export function useSetupGuide() {
  const context = useContext(SetupGuideContext);
  if (!context) {
    throw new Error("useSetupGuide must be used within SetupGuideProvider");
  }
  return context;
}

export function useSetupGuideOptional() {
  return useContext(SetupGuideContext);
}

type SetupGuideProviderProps = {
  variant: SetupGuideVariant;
  children: ReactNode;
  onOpenWalkthrough?: () => void;
};

export function SetupGuideProvider({
  variant,
  children,
  onOpenWalkthrough,
}: SetupGuideProviderProps) {
  const [activeSheet, setActiveSheet] = useState<SetupSheetKey | null>(null);

  const openSheet = useCallback(
    (key: SetupSheetKey) => {
      if (key === "walkthrough" && onOpenWalkthrough) {
        onOpenWalkthrough();
        return;
      }
      setActiveSheet(key);
    },
    [onOpenWalkthrough],
  );

  const openRailNode = useCallback(
    (railId: string) => {
      const map = variant === "admin" ? ADMIN_RAIL_SHEET : CUSTOMER_RAIL_SHEET;
      const key = map[railId];
      if (key) {
        openSheet(key);
      }
    },
    [openSheet, variant],
  );

  const closeSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);

  const value = useMemo(
    () => ({
      variant,
      activeSheet,
      openSheet,
      openRailNode,
      closeSheet,
      onOpenWalkthrough,
    }),
    [activeSheet, closeSheet, onOpenWalkthrough, openRailNode, openSheet, variant],
  );

  return (
    <SetupGuideContext.Provider value={value}>{children}</SetupGuideContext.Provider>
  );
}
