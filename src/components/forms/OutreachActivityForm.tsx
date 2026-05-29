"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { logOutreachActivity } from "@/app/actions/outreach";
import type { OutreachContact } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface OutreachActivityFormProps {
  companyId: string;
  contacts: OutreachContact[];
}

export function OutreachActivityForm({ companyId, contacts }: OutreachActivityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [channel, setChannel] = useState("EMAIL");
  const [activityType, setActivityType] = useState("MESSAGE_SENT");
  const [contactId, setContactId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const result = await logOutreachActivity({
      companyId,
      channel,
      activityType,
      contactId: contactId === "none" ? undefined : contactId,
      notes,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : undefined,
    });

    if (result.success) {
      setNotes("");
      setNextFollowUpAt("");
      router.refresh();
    } else {
      alert(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Channel</Label>
          <Select value={channel} onValueChange={(val) => val && setChannel(val)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="WEBSITE_FORM">Website Form</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
              <SelectItem value="FACEBOOK">Facebook</SelectItem>
              <SelectItem value="PHONE">Phone</SelectItem>
              <SelectItem value="TEXT">Text</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Type</Label>
          <Select value={activityType} onValueChange={(val) => val && setActivityType(val)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MESSAGE_SENT">Message Sent</SelectItem>
              <SelectItem value="REPLY_RECEIVED">Reply Received</SelectItem>
              <SelectItem value="FOLLOW_UP_SENT">Follow-up Sent</SelectItem>
              <SelectItem value="CALL_BOOKED">Call Booked</SelectItem>
              <SelectItem value="NOTE">Internal Note</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Contact (Optional)</Label>
        <Select value={contactId} onValueChange={(val) => val && setContactId(val)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name} ({contact.roleTitle || "Contact"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Notes</Label>
        <Textarea 
          placeholder="What happened?" 
          className="min-h-[60px] text-xs" 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Next Follow-up (Optional)</Label>
        <Input 
          type="date" 
          className="h-8 text-xs" 
          value={nextFollowUpAt}
          onChange={(e) => setNextFollowUpAt(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
        ) : null}
        Log Activity
      </Button>
    </form>
  );
}
