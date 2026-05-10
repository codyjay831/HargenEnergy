"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from "lucide-react";
import { importOutreachCSV } from "@/app/actions/outreach";
import { useRouter } from "next/navigation";

export function CSVImportButton() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const result = await importOutreachCSV(text);
      
      if (result.success) {
        alert(`Import successful!\nCreated: ${result.stats?.createdCount}\nUpdated: ${result.stats?.updatedCount}\nSkipped: ${result.stats?.skippedCount}`);
        router.refresh();
      } else {
        alert(`Import failed: ${result.error}`);
      }
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative">
      <input
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
  );
}
