"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DiscoveryCard, type DiscoveryCardData } from "@/components/outreach/DiscoveryCard";
import {
  batchSaveDiscoveries,
  saveDiscoveryToCompany,
  updateDiscoveryStatus,
} from "@/app/actions/outreach";
import { OutreachDiscoveryStatus } from "@/generated/prisma/client";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type DiscoveryInboxProps = {
  initialDiscoveries: DiscoveryCardData[];
};

export function DiscoveryInbox({ initialDiscoveries }: DiscoveryInboxProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const filtered = useMemo(() => {
    return initialDiscoveries.filter((d) => {
      if (statusFilter === "active") {
        if (!["NEW", "REVIEWING"].includes(d.status)) return false;
      } else if (statusFilter !== "all" && d.status !== statusFilter) {
        return false;
      }

      if (!query.trim()) return true;
      const haystack = [d.name, d.city, d.state, d.address, d.website]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [initialDiscoveries, query, statusFilter]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = async (id: string) => {
    setLoadingAction(id);
    const result = await saveDiscoveryToCompany(id);
    if (result.success) {
      toast.success(
        "existing" in result && result.existing ? "Already in CRM" : "Saved to prospects"
      );
      router.refresh();
    } else {
      toast.error("error" in result ? result.error || "Could not save" : "Could not save");
    }
    setLoadingAction(null);
  };

  const handleReview = async (id: string) => {
    setLoadingAction(id);
    const result = await updateDiscoveryStatus(id, OutreachDiscoveryStatus.REVIEWING);
    if (result.success) {
      toast.success("Marked for later");
      router.refresh();
    } else {
      toast.error(result.error || "Could not update");
    }
    setLoadingAction(null);
  };

  const handleDismiss = async (id: string) => {
    setLoadingAction(id);
    const result = await updateDiscoveryStatus(id, OutreachDiscoveryStatus.DISMISSED);
    if (result.success) {
      toast.success("Skipped");
      router.refresh();
    } else {
      toast.error(result.error || "Could not update");
    }
    setLoadingAction(null);
  };

  const handleBatchSave = async () => {
    if (selected.size === 0) return;
    setBatchLoading(true);
    const result = await batchSaveDiscoveries([...selected]);
    if (result.success) {
      toast.success(`Saved ${result.saved}, skipped ${result.skipped}`);
      setSelected(new Set());
      router.refresh();
    } else {
      toast.error(result.error || "Batch save failed");
    }
    setBatchLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search discoveries..."
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (New + Later)</SelectItem>
            <SelectItem value="NEW">New only</SelectItem>
            <SelectItem value="REVIEWING">Save for later</SelectItem>
            <SelectItem value="SAVED">Saved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button onClick={handleBatchSave} disabled={batchLoading} className="sm:w-auto">
            {batchLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save selected ({selected.size})
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded-lg p-10 text-center text-muted-foreground text-sm">
          No discoveries match this filter. Run a search or import a CSV to the inbox.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((discovery) => (
            <DiscoveryCard
              key={discovery.id}
              discovery={discovery}
              selected={selected.has(discovery.id)}
              onSelect={handleSelect}
              loadingAction={loadingAction}
              onSave={handleSave}
              onReview={handleReview}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
