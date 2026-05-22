"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { URGENCY_OPTIONS, type UrgencyValue } from "@/lib/ui-enums";
import { submitPortalRequest } from "@/app/actions/portal";
import { Loader2, AlertCircle, Paperclip, Info } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { toast } from "sonner";

import { type CustomField } from "@/app/actions/services";

interface Task {
  id: string;
  name: string;
  description: string | null;
  maxMinutes: number | null;
  requiredFields: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requiredDocs: any;
}

interface Category {
  id: string;
  name: string;
  tasks: Task[];
}

interface PortalRequestFormProps {
  initialServices: Category[];
}

export function PortalRequestForm({ initialServices }: PortalRequestFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const selectedCategory = useMemo(() => 
    initialServices.find(c => c.id === selectedCategoryId),
    [initialServices, selectedCategoryId]
  );

  const selectedTask = useMemo(() => 
    selectedCategory?.tasks.find(t => t.id === selectedTaskId),
    [selectedCategory, selectedTaskId]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    // Collect metadata from dynamic fields
    const metadata: Record<string, string | number | boolean | null> = {};
    
    // 1. Collect legacy/common fields
    const commonFields = ["customerName", "utilityAhj", "designTool", "desiredOutcome"];
    commonFields.forEach(field => {
      const val = formData.get(field);
      if (val) metadata[field] = val as string;
    });

    // 2. Collect dynamic fields (prefixed with custom_)
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("custom_")) {
        const fieldId = key.replace("custom_", "");
        if (value) metadata[fieldId] = value as string;
      }
    }

    const data = {
      title: formData.get("title") as string,
      workTaskId: selectedTaskId || undefined,
      supportNeeded: selectedTask?.name || formData.get("supportNeeded") as string,
      description: formData.get("description") as string,
      urgency: formData.get("urgency") as UrgencyValue,
      projectUrl: formData.get("projectUrl") as string,
      metadata,
      attachments,
    };

    try {
      const result = await submitPortalRequest(data);

      if ("success" in result && result.success) {
        toast.success("Request submitted successfully!");
        router.push(`/portal/requests/${result.requestId}`);
      } else {
        const errorMsg = "error" in result ? result.error : "Failed to submit request.";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category">Service Category</Label>
            <Select 
              onValueChange={(val) => {
                setSelectedCategoryId(val || "");
                setSelectedTaskId("");
              }}
              value={selectedCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {initialServices.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value="OTHER">Other / General Support</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task">Work Task</Label>
            <Select 
              onValueChange={(val) => setSelectedTaskId(val || "")}
              value={selectedTaskId}
              disabled={!selectedCategoryId || selectedCategoryId === "OTHER"}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCategoryId === "OTHER" ? "N/A" : "Select a task"} />
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
            <Label htmlFor="title">Request Title</Label>
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

        {selectedCategoryId === "OTHER" && (
          <div className="space-y-2">
            <Label htmlFor="supportNeeded">Support Needed / Request Type</Label>
            <Input 
              id="supportNeeded" 
              name="supportNeeded" 
              placeholder="e.g. PG&E Interconnection, Permit Follow-up" 
              required 
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Current Bottleneck / Details</Label>
          <Textarea 
            id="description" 
            name="description" 
            placeholder="Describe what's getting stuck and what you need help with..." 
            className="min-h-[120px]"
            required 
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Project Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer / Job Name</Label>
            <Input id="customerName" name="customerName" placeholder="e.g. John Smith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="utilityAhj">Utility / AHJ</Label>
            <Input id="utilityAhj" name="utilityAhj" placeholder="e.g. PG&E, City of San Jose" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectUrl">CRM Link / Project URL</Label>
            <Input id="projectUrl" name="projectUrl" placeholder="e.g. Link to JobNimbus or Aurora" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desiredOutcome">Desired Outcome</Label>
            <Input id="desiredOutcome" name="desiredOutcome" placeholder="e.g. Application submitted" />
          </div>
          
          {/* Dynamic Fields */}
          {selectedTask?.requiredFields && (
            (typeof selectedTask.requiredFields === 'string' 
              ? JSON.parse(selectedTask.requiredFields) 
              : selectedTask.requiredFields).map((field: CustomField) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                <Input 
                  id={field.id} 
                  name={`custom_${field.id}`} 
                  type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Attachments
          </h3>
        </div>
        {selectedTask?.requiredDocs && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-md text-amber-800 text-xs">
            <p className="font-bold mb-1">Required Documents:</p>
            <ul className="list-disc pl-4">
              {(typeof selectedTask.requiredDocs === 'string' 
                ? JSON.parse(selectedTask.requiredDocs) 
                : selectedTask.requiredDocs).map((doc: string, i: number) => (
                <li key={i}>{doc}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-slate-600 mb-4">
          Upload plan sets, utility bills, photos, or other relevant documents (PDF, JPG, PNG - max 8MB each)
        </p>
        <FileUpload
          endpoint="supportAttachment"
          value={attachments}
          onChange={setAttachments}
          maxFiles={10}
        />
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="px-8">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Support Request"
          )}
        </Button>
      </div>
    </form>
  );
}
