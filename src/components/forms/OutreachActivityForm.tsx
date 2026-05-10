"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const activitySchema = z.object({
  channel: z.string().min(1, "Channel is required"),
  activityType: z.string().min(1, "Activity type is required"),
  contactId: z.string().optional(),
  notes: z.string().optional(),
  responseSummary: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface OutreachActivityFormProps {
  companyId: string;
  contacts: any[];
}

export function OutreachActivityForm({ companyId, contacts }: OutreachActivityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      channel: "EMAIL",
      activityType: "MESSAGE_SENT",
      notes: "",
      responseSummary: "",
    },
  });

  async function onSubmit(values: ActivityFormValues) {
    setIsSubmitting(true);
    const result = await logOutreachActivity({
      companyId,
      ...values,
      nextFollowUpAt: values.nextFollowUpAt ? new Date(values.nextFollowUpAt) : undefined,
    });

    if (result.success) {
      form.reset();
      router.refresh();
    } else {
      alert(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Channel</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                  </FormControl>
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MESSAGE_SENT">Message Sent</SelectItem>
                    <SelectItem value="REPLY_RECEIVED">Reply Received</SelectItem>
                    <SelectItem value="FOLLOW_UP_SENT">Follow-up Sent</SelectItem>
                    <SelectItem value="CALL_BOOKED">Call Booked</SelectItem>
                    <SelectItem value="NOTE">Internal Note</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="contactId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Contact (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select contact" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.roleTitle || "Contact"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="What happened?" 
                  className="min-h-[60px] text-xs" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nextFollowUpAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Next Follow-up (Optional)</FormLabel>
              <FormControl>
                <Input type="date" className="h-8 text-xs" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full h-8 text-xs" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : null}
          Log Activity
        </Button>
      </form>
    </Form>
  );
}
