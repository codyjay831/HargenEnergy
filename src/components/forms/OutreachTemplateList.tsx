"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  openGmailCompose,
  renderOutreachTemplate,
  type OutreachTemplateContext,
} from "@/lib/outreach-compose";
import {
  OUTREACH_MESSAGE_TEMPLATES,
  OUTREACH_TEMPLATE_CATEGORIES,
} from "@/lib/outreach-templates";

interface OutreachTemplateCompany {
  name: string;
  city: string | null;
  state: string | null;
  contacts: Array<{
    name: string | null;
    email: string | null;
    isPrimary: boolean;
  }>;
  outreachAngle?: string | null;
}

interface OutreachTemplateListProps {
  company: OutreachTemplateCompany;
}

export function OutreachTemplateList({ company }: OutreachTemplateListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const primaryContact =
    company.contacts.find((contact) => contact.isPrimary) || company.contacts[0];

  const templateContext: OutreachTemplateContext = {
    companyName: company.name,
    city: company.city,
    state: company.state,
    contactName: primaryContact?.name,
    contactEmail: primaryContact?.email,
    outreachAngle: company.outreachAngle,
  };

  const resolveTemplate = (subject?: string, body?: string) => ({
    subject: subject ? renderOutreachTemplate(subject, templateContext) : "",
    body: body ? renderOutreachTemplate(body, templateContext) : "",
  });

  const handleCopy = (id: string, body: string) => {
    navigator.clipboard.writeText(renderOutreachTemplate(body, templateContext));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenGmail = (subject: string, body: string) => {
    const { truncated, fullBody } = openGmailCompose({
      to: primaryContact?.email,
      subject,
      body,
    });

    if (truncated) {
      navigator.clipboard.writeText(fullBody);
      toast.info("Full message copied — paste in Gmail if the body was truncated.");
    } else {
      toast.success(
        primaryContact?.email
          ? "Opening Gmail compose…"
          : "Opening Gmail compose — add a recipient if needed."
      );
    }
  };

  const channelBadgeLabel: Record<string, string> = {
    EMAIL: "Email",
    WEBSITE_FORM: "Web Form",
    LINKEDIN: "LinkedIn",
  };

  return (
    <div className="space-y-6">
      {OUTREACH_TEMPLATE_CATEGORIES.map(({ category, label }) => {
        const templates = OUTREACH_MESSAGE_TEMPLATES.filter(
          (t) => t.category === category
        );
        if (templates.length === 0) return null;

        return (
          <div key={category}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {label}
            </p>
            <div className="space-y-3">
              {templates.map((template) => {
                const resolved = resolveTemplate(template.subject, template.body);
                const isEmail = template.channel === "EMAIL";

                return (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg space-y-3 bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {template.versionLabel}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 shrink-0"
                        >
                          {channelBadgeLabel[template.channel] ?? template.channel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isEmail && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            onClick={() =>
                              handleOpenGmail(resolved.subject, resolved.body)
                            }
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Gmail
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(template.id, template.body)}
                        >
                          {copiedId === template.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {template.subject && (
                      <div className="text-[10px] text-muted-foreground border-b pb-1">
                        <span className="font-semibold">Subject:</span>{" "}
                        {resolved.subject}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-600 line-clamp-4 whitespace-pre-wrap italic">
                      {resolved.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
