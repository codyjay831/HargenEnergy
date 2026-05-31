"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, FileText } from "lucide-react";
import {
  exportOutreachCSV,
  getOutreachCsvTemplate,
  type OutreachCsvExportMode,
} from "@/app/actions/outreach";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CSVExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [mode, setMode] = useState<OutreachCsvExportMode>("saved");

  const handleExport = async () => {
    setIsExporting(true);
    const result = await exportOutreachCSV(mode);

    if (result.success && result.csv) {
      const prefix =
        mode === "discovery"
          ? "outreach_discoveries"
          : mode === "run"
            ? "outreach_search_run"
            : "outreach_prospects";
      downloadCsv(result.csv, `${prefix}_${new Date().toISOString().split("T")[0]}.csv`);
      toast.success("CSV downloaded");
    } else {
      toast.error(result.error || "Export failed");
    }
    setIsExporting(false);
  };

  const handleTemplate = async () => {
    const result = await getOutreachCsvTemplate();
    if (result.success && result.csv) {
      downloadCsv(result.csv, "outreach_template.csv");
      toast.success("Template downloaded");
    } else {
      toast.error(result.error || "Could not download template");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={mode} onValueChange={(val) => val && setMode(val as OutreachCsvExportMode)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="saved">Saved CRM</SelectItem>
          <SelectItem value="discovery">Discovery inbox</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={handleTemplate}>
        <FileText className="h-4 w-4 mr-2" />
        Template
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4 mr-2" />
        )}
        Export CSV
      </Button>
    </div>
  );
}
