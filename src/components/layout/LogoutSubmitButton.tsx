"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoutSubmitButtonProps = {
  className?: string;
  compact?: boolean;
};

export function LogoutSubmitButton({
  className,
  compact = false,
}: LogoutSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex items-center gap-3 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:pointer-events-none",
        compact
          ? "px-2 py-1.5"
          : "w-full px-3 py-2",
        className,
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {pending ? "Logging out…" : compact ? "Log out" : "Logout"}
    </button>
  );
}
