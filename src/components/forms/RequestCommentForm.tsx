"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addRequestComment } from "@/app/actions/portal";
import { Loader2, Send } from "lucide-react";

interface RequestCommentFormProps {
  requestId: string;
  onSuccess?: () => void;
}

export function RequestCommentForm({ requestId, onSuccess }: RequestCommentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsLoading(true);

    try {
      const result = await addRequestComment({
        requestId,
        body,
      });

      if (result.success) {
        setBody("");
        if (onSuccess) onSuccess();
      } else {
        alert(result.error || "Failed to add comment.");
      }
    } catch {
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="comment">Your Message / Response</Label>
        <Textarea 
          id="comment" 
          placeholder="Type your message here..." 
          value={body} 
          onChange={(e) => setBody(e.target.value)} 
          className="min-h-[100px]"
          required 
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !body.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
