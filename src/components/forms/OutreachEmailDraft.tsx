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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  generateOutreachEmailDraft,
  type OutreachEmailDraftType,
} from "@/app/actions/outreach";
import { openGmailCompose } from "@/lib/outreach-compose";

interface OutreachEmailDraftProps {
  companyId: string;
  contactEmail?: string | null;
}

export function OutreachEmailDraft({ companyId, contactEmail }: OutreachEmailDraftProps) {
  const [templateType, setTemplateType] = useState<OutreachEmailDraftType>("initial");
  const [isGenerating, setIsGenerating] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [draftContactEmail, setDraftContactEmail] = useState<string | null>(
    contactEmail ?? null
  );
  const [copied, setCopied] = useState(false);

  const recipientEmail = draftContactEmail ?? contactEmail ?? null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateOutreachEmailDraft(companyId, templateType);
      if ("success" in result && result.success) {
        setSubject(result.subject);
        setBody(result.body);
        if (result.contactEmail) {
          setDraftContactEmail(result.contactEmail);
        }
        toast.success("Email draft generated — review before sending.");
      } else {
        toast.error("error" in result ? result.error : "Failed to generate draft.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    const text = subject ? `Subject: ${subject}\n\n${body}` : body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Draft copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGmail = () => {
    if (!subject.trim() && !body.trim()) {
      toast.error("Generate or enter a draft first.");
      return;
    }

    const { truncated, fullBody } = openGmailCompose({
      to: recipientEmail,
      subject: subject.trim(),
      body: body.trim(),
    });

    if (truncated) {
      navigator.clipboard.writeText(fullBody);
      toast.info("Full message copied — paste in Gmail if the body was truncated.");
    } else {
      toast.success(
        recipientEmail
          ? "Opening Gmail compose…"
          : "Opening Gmail compose — add a recipient if needed."
      );
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Email Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2 flex-1">
            <Label className="text-xs">Draft type</Label>
            <Select
              value={templateType}
              onValueChange={(val) => val && setTemplateType(val as OutreachEmailDraftType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Initial outreach</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="h-8 text-xs"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 mr-2" />
            )}
            Generate with AI
          </Button>
        </div>

        {recipientEmail && (
          <p className="text-[10px] text-muted-foreground">
            To: {recipientEmail}
          </p>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Subject</Label>
          <Input
            className="h-8 text-xs"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Generate a draft or type a subject"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Body</Label>
          <Textarea
            className="min-h-[120px] text-xs"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Generate a draft or write your message"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs flex-1"
            onClick={handleOpenGmail}
            disabled={!subject.trim() && !body.trim()}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open in Gmail
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleCopy}
            disabled={!subject.trim() && !body.trim()}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
