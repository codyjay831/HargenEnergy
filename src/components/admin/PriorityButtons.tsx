"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { updateRequestPriority } from "@/app/actions/requests";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PriorityButtonsProps {
  requestId: string;
  currentPriority: number | null;
}

export function PriorityButtons({ requestId, currentPriority }: PriorityButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleUpdate = async (newPriority: number | null) => {
    setIsUpdating(true);
    try {
      const result = await updateRequestPriority(requestId, newPriority);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Priority updated");
        router.refresh();
      }
    } catch {
      toast.error("Failed to update priority");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={isUpdating}
        onClick={() => handleUpdate((currentPriority || 0) - 1)}
        title="Increase Priority"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        disabled={isUpdating}
        onClick={() => handleUpdate((currentPriority || 0) + 1)}
        title="Decrease Priority"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
      {isUpdating && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
    </div>
  );
}
