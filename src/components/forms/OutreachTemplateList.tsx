"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OutreachTemplateCompany {
  name: string;
  city: string | null;
  state: string | null;
  contacts: Array<{
    name: string | null;
    isPrimary: boolean;
  }>;
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
    body: "Hi {{contactName}}, just following up on my previous note. I'd love to show you how we can take the permit and utility backlog off your plate. Do you have 10 minutes on Tuesday?",
  }
];

export function OutreachTemplateList({ company }: OutreachTemplateListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const primaryContact =
    company.contacts.find((contact) => contact.isPrimary) || company.contacts[0];
  const contactName = primaryContact?.name?.split(" ")[0] || "there";

  const replaceVariables = (text: string) => {
    return text
      .replace(/{{companyName}}/g, company.name)
      .replace(/{{contactName}}/g, contactName)
      .replace(/{{city}}/g, company.city || "your area")
      .replace(/{{state}}/g, company.state || "your state");
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(replaceVariables(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {DEFAULT_TEMPLATES.map((template) => (
        <div key={template.id} className="p-3 border rounded-lg space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold">{template.name}</p>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {template.channel}
              </Badge>
            </div>
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
          
          {template.subject && (
            <div className="text-[10px] text-muted-foreground border-b pb-1">
              <span className="font-semibold">Subject:</span> {replaceVariables(template.subject)}
            </div>
          )}
          
          <p className="text-[11px] text-slate-600 line-clamp-3 whitespace-pre-wrap italic">
            {replaceVariables(template.body)}
          </p>
        </div>
      ))}
    </div>
  );
}
