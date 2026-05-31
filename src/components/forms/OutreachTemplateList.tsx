"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  openGmailCompose,
  replaceTemplateVariables,
  type OutreachTemplateContext,
} from "@/lib/outreach-compose";

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

const DEFAULT_TEMPLATES = [
  {
    id: "1",
    name: "Initial Outreach (Email)",
    channel: "EMAIL",
    subject: "Helping {{companyName}} with back-office solar ops",
    body: "Hi {{contactName}},\n\nI've been following {{companyName}} and noticed you're doing great work in {{city}}. I help solar companies like yours with quote building, permitting, and utility apps so you can focus on installs.\n\nYou don't need to teach me solar, only your company. Would you be open to a quick chat next week?\n\nBest,\n[Your Name]",
  },
  {
    id: "2",
    name: "Website Contact Form",
    channel: "WEBSITE_FORM",
    body: "Hi team, I'm reaching out to see if {{companyName}} needs help with solar back-office operations (permits, utility apps, Enphase setup). We specialize in helping solar contractors in {{state}} clear their backlog. No training needed on solar basics. Check us out at hargenenergy.com.",
  },
  {
    id: "3",
    name: "LinkedIn Connection",
    channel: "LINKEDIN",
    body: "Hi {{contactName}}, I noticed your work with {{companyName}} in the solar space. I help solar installers with their back-office ops (permits/utility/scheduling). Would love to connect!",
  },
  {
    id: "4",
    name: "Follow-up (3 days)",
    channel: "EMAIL",
    subject: "Quick follow up / {{companyName}}",
    body: "Hi {{contactName}}, just following up on my previous note. I'd love to show you how we can take {{outreachAngle}} off your plate. Do you have 10 minutes on Tuesday?",
  },
];

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
    subject: subject ? replaceTemplateVariables(subject, templateContext) : "",
    body: body ? replaceTemplateVariables(body, templateContext) : "",
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(replaceTemplateVariables(text, templateContext));
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

  return (
    <div className="space-y-4">
      {DEFAULT_TEMPLATES.map((template) => {
        const resolved = resolveTemplate(template.subject, template.body);
        const isEmail = template.channel === "EMAIL";

        return (
          <div key={template.id} className="p-3 border rounded-lg space-y-3 bg-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-xs font-bold truncate">{template.name}</p>
                <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                  {template.channel}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] px-2"
                    onClick={() => handleOpenGmail(resolved.subject, resolved.body)}
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
                <span className="font-semibold">Subject:</span> {resolved.subject}
              </div>
            )}

            <p className="text-[11px] text-slate-600 line-clamp-3 whitespace-pre-wrap italic">
              {resolved.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
