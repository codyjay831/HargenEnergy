"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { importOutreachCSV, type OutreachCsvImportTarget } from "@/app/actions/outreach";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CSVImportButton() {
  const [isUploading, setIsUploading] = useState(false);
  const [target, setTarget] = useState<OutreachCsvImportTarget>("discovery");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const result = await importOutreachCSV(text, target);

      if (result.success) {
        toast.success(
          `Import complete — Created: ${result.stats?.createdCount}, Updated: ${result.stats?.updatedCount}, Inbox: ${result.stats?.discoveryCount}, Skipped: ${result.stats?.skippedCount}`
        );
        router.refresh();
      } else {
        toast.error(result.error || "Import failed");
      }
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
      <p className="text-[11px] text-muted-foreground max-w-[220px] text-right sm:text-left">
        Repeat the same company <span className="font-medium">id</span> on multiple rows to import
        multiple contacts.
      </p>
      <div className="flex items-center gap-2">
      <Select value={target} onValueChange={(val) => val && setTarget(val as OutreachCsvImportTarget)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="discovery">To inbox</SelectItem>
          <SelectItem value="save">Save direct</SelectItem>
        </SelectContent>
      </Select>
      <div className="relative">
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <Button variant="outline" size="sm" disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4 mr-2" />
          )}
          Import CSV
        </Button>
      </div>
      </div>
    </div>
  );
}
