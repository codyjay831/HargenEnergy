import { handleSignOut } from "@/app/actions/auth";
import { LogoutSubmitButton } from "@/components/layout/LogoutSubmitButton";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  compact?: boolean;
  className?: string;
};

export function LogoutButton({ compact = false, className }: LogoutButtonProps) {
  return (
    <form action={handleSignOut} className={cn("w-full", className)}>
      <LogoutSubmitButton compact={compact} />
    </form>
  );
}
