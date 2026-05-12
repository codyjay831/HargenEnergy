"use client";

import { useState } from "react";
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
import { Loader2, AlertCircle, Paperclip } from "lucide-react";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { toast } from "sonner";

export function PortalRequestForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      supportNeeded: formData.get("supportNeeded") as string,
      description: formData.get("description") as string,
      urgency: formData.get("urgency") as UrgencyValue,
      customerName: formData.get("customerName") as string,
      utilityAhj: formData.get("utilityAhj") as string,
      toolsContext: formData.get("toolsContext") as string,
      desiredOutcome: formData.get("desiredOutcome") as string,
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

      <div className="space-y-4">
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

        <div className="space-y-2">
          <Label htmlFor="supportNeeded">Support Needed / Request Type</Label>
          <Input 
            id="supportNeeded" 
            name="supportNeeded" 
            placeholder="e.g. PG&E Interconnection, Permit Follow-up" 
            required 
          />
        </div>

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
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Additional Context (Optional)</h3>
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
            <Label htmlFor="toolsContext">Current Tools / CRM Link</Label>
            <Input id="toolsContext" name="toolsContext" placeholder="e.g. Link to JobNimbus" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desiredOutcome">Desired Outcome</Label>
            <Input id="desiredOutcome" name="desiredOutcome" placeholder="e.g. Application submitted" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Paperclip className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Attachments (Optional)
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          Upload plan sets, utility bills, photos, or other relevant documents (PDF, JPG, PNG - max 8MB each)
        </p>
        <FileUpload
          endpoint="supportAttachment"
          value={attachments}
          onChange={setAttachments}
          maxFiles={5}
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
