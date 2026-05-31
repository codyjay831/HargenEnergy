"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload, type UploadedFile } from "@/components/ui/file-upload";
import { submitInfoResponse } from "@/app/actions/portal";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ProvideInfoFormProps {
  requestId: string;
  clientId: string;
  staffMessage?: string | null;
}

export function ProvideInfoForm({
  requestId,
  clientId,
  staffMessage,
}: ProvideInfoFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const canSubmit =
    !isLoading && !isUploading && (body.trim().length > 0 || attachments.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please add a message or at least one file.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await submitInfoResponse({
        requestId,
        body: body.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (result.success) {
        setBody("");
        setAttachments([]);
        toast.success(
          "We received your information — we'll continue work on this request.",
        );
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit your response.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {staffMessage && (
        <p className="text-sm text-orange-900/80 italic border-l-2 border-orange-300 pl-3">
          {staffMessage}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="info-response">Your response</Label>
        <Textarea
          id="info-response"
          placeholder="Add notes to explain your files…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Attachments</Label>
        <p className="text-xs text-muted-foreground">
          Upload plan sets, utility bills, photos, or other relevant documents (PDF,
          JPG, PNG — max 8MB each)
        </p>
        <FileUpload
          endpoint="supportAttachment"
          value={attachments}
          onChange={setAttachments}
          maxFiles={10}
          requestId={requestId}
          clientId={clientId}
          onUploadingChange={setIsUploading}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Response
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
