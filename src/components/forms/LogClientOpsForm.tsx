"use client";

import { useState } from "react";
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
import { logClientOpsRequest } from "@/app/actions/clients";
import {
  SUPPORT_REQUEST_SOURCE_OPTIONS,
  type SupportRequestSourceValue,
} from "@/lib/ui-enums";
import { Loader2 } from "lucide-react";

interface LogClientOpsFormProps {
  clientId: string;
}

export function LogClientOpsForm({ clientId }: LogClientOpsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [source, setSource] = useState<SupportRequestSourceValue>("EMAIL");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const result = await logClientOpsRequest({
        clientId,
        title,
        description,
        source,
        supportNeeded: supportNeeded || undefined,
      });

      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setTitle("");
        setDescription("");
        setSupportNeeded("");
        setMessage("Ops request logged to the queue.");
      }
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to log ops request.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ops-source">Source</Label>
        <Select
          value={source}
          onValueChange={(value) => setSource(value as SupportRequestSourceValue)}
        >
          <SelectTrigger id="ops-source">
            <SelectValue placeholder="How did this come in?" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORT_REQUEST_SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ops-title">Title</Label>
        <Input
          id="ops-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Short summary for the ops queue"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ops-support-needed">Work type (optional)</Label>
        <Input
          id="ops-support-needed"
          value={supportNeeded}
          onChange={(event) => setSupportNeeded(event.target.value)}
          placeholder="Permit follow-up, utility, design, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ops-description">Details</Label>
        <Textarea
          id="ops-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What the client needs and any context from the call or message"
          rows={5}
          required
        />
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging...
          </>
        ) : (
          "Log ops request"
        )}
      </Button>
    </form>
  );
}
