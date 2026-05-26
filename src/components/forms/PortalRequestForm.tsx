"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { URGENCY_OPTIONS, type UrgencyValue } from "@/lib/ui-enums";
import { submitPortalRequest } from "@/app/actions/portal";
import { EngagementType } from "@/generated/prisma/client";
import { Loader2, AlertCircle, Paperclip, Info } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { toast } from "sonner";
import { type CustomField } from "@/app/actions/services";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

interface Task {
  id: string;
  name: string;
  description: string | null;
  requiredFields: unknown;
  requiredDocs: unknown;
}

interface Category {
  id: string;
  name: string;
  tasks: Task[];
}

interface PortalRequestFormProps {
  engagementType: EngagementType;
  categories: Category[];
  canSubmit: boolean;
  blockMessage?: string;
  blockReasonCode?: string;
}

export function PortalRequestForm({
  engagementType,
  categories,
  canSubmit,
  blockMessage,
  blockReasonCode,
}: PortalRequestFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploadSessionId] = useState(() => crypto.randomUUID());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const isRequestBased = engagementType === EngagementType.REQUEST_BASED;

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  const selectedTask = useMemo(
    () => selectedCategory?.tasks.find((t) => t.id === selectedTaskId),
    [selectedCategory, selectedTaskId],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!selectedTaskId) {
      setError("Please select a work type.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const metadata: Record<string, string | number | boolean | null> = {};

    const commonFields = ["customerName", "utilityAhj", "designTool", "desiredOutcome"];
    commonFields.forEach((field) => {
      const val = formData.get(field);
      if (val) metadata[field] = val as string;
    });

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("custom_")) {
        const fieldId = key.replace("custom_", "");
        if (value) metadata[fieldId] = value as string;
      }
    }

    const data = {
      title: formData.get("title") as string,
      workTaskId: selectedTaskId,
      supportNeeded: selectedTask?.name ?? "",
      description: formData.get("description") as string,
      urgency: formData.get("urgency") as UrgencyValue,
      projectUrl: formData.get("projectUrl") as string,
      metadata,
      attachments,
    };

    try {
      const result = await submitPortalRequest(data);

      if ("success" in result && result.success) {
        toast.success("Work sent successfully!");
        router.push(`/portal/requests/${result.requestId}`);
      } else {
        const errorMsg =
          ("error" in result ? result.error : undefined) ??
          "Failed to send work.";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch {
      const errorMsg = "An unexpected error occurred.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canSubmit) {
    const isSupportBlock = engagementType === EngagementType.SUPPORT_BLOCK;
    const paymentBlocked = isSupportBlock && blockReasonCode === "payment_not_made";
    const scopeBlocked = isSupportBlock && blockReasonCode === "scope_not_configured";

    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
        <p className="font-semibold">{PRODUCT_LANGUAGE.supportSetup.blockedSubmitTitle}</p>
        <p className="mt-2">
          {blockMessage ??
            "Your account is still being configured. Hargen will notify you when you can send work."}
        </p>
        {(paymentBlocked || isSupportBlock) && (
          <Link
            href="/portal/account#support-setup"
            className="mt-3 inline-block text-sm font-medium text-amber-900 underline underline-offset-2"
          >
            {paymentBlocked
              ? "Set up payment"
              : PRODUCT_LANGUAGE.supportSetup.viewSetupLink}
          </Link>
        )}
        {scopeBlocked && (
          <p className="mt-4 text-xs text-amber-800/90">
            {PRODUCT_LANGUAGE.supportSetup.changeScopePrompt}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {isRequestBased
          ? "Send a work request. Hargen will review the handoff and confirm pricing before work continues."
          : "Send work inside your approved support areas."}
      </p>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category">Work area</Label>
            <Select
              onValueChange={(val) => {
                setSelectedCategoryId(val || "");
                setSelectedTaskId("");
              }}
              value={selectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a work area" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task">Work type</Label>
            <Select
              onValueChange={(val) => setSelectedTaskId(val || "")}
              value={selectedTaskId}
              disabled={!selectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a work type" />
              </SelectTrigger>
              <SelectContent>
                {selectedCategory?.tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedTask?.description && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-md flex gap-3 text-blue-800 text-xs">
            <Info className="h-4 w-4 shrink-0" />
            <p>{selectedTask.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title">Work title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Utility Application for Smith Job"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select name="urgency" defaultValue="NORMAL">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">What needs to happen?</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Describe the job, what's stuck, and what you need Hargen to do..."
            className="min-h-[120px]"
            required
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
          Project context
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer / job name</Label>
            <Input id="customerName" name="customerName" placeholder="e.g. John Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utilityAhj">Utility / AHJ</Label>
            <Input id="utilityAhj" name="utilityAhj" placeholder="e.g. PG&E, City of San Jose" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectUrl">CRM link / project URL</Label>
            <Input
              id="projectUrl"
              name="projectUrl"
              placeholder="e.g. Link to JobNimbus or Aurora"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desiredOutcome">Desired outcome</Label>
            <Input
              id="desiredOutcome"
              name="desiredOutcome"
              placeholder="e.g. Application submitted"
            />
          </div>

          {selectedTask?.requiredFields &&
            (typeof selectedTask.requiredFields === "string"
              ? JSON.parse(selectedTask.requiredFields)
              : selectedTask.requiredFields
            ).map((field: CustomField) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id={field.id}
                  name={`custom_${field.id}`}
                  type={
                    field.type === "date"
                      ? "date"
                      : field.type === "number"
                        ? "number"
                        : "text"
                  }
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                />
              </div>
            ))}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Attachments
          </h3>
        </div>
        {(() => {
          const docs = selectedTask?.requiredDocs;
          if (!docs) return null;
          const list = (typeof docs === "string" ? JSON.parse(docs) : docs) as string[];
          if (!Array.isArray(list) || list.length === 0) return null;
          return (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-md text-amber-800 text-xs">
              <p className="font-bold mb-1">Suggested documents:</p>
              <ul className="list-disc pl-4">
                {list.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>
          );
        })()}
        <p className="text-xs text-slate-600 mb-4">
          Upload plan sets, utility bills, photos, or other relevant documents (PDF, JPG, PNG -
          max 8MB each)
        </p>
        <FileUpload
          endpoint="supportAttachment"
          value={attachments}
          onChange={setAttachments}
          maxFiles={10}
          uploadSessionId={uploadSessionId}
          onUploadingChange={setIsUploading}
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isLoading || isUploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || isUploading || !selectedTaskId} className="px-8">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            PRODUCT_LANGUAGE.workRequest.action
          )}
        </Button>
      </div>
    </form>
  );
}
