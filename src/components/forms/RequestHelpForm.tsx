"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { submitRequestHelp } from "@/app/actions/requests";
import { RequestHelpInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { marketingAmberCta } from "@/components/marketing/marketing-styles";
import { PRODUCT_LANGUAGE, FORM_COPY } from "@/lib/product-language";

const supportOptions = [
  { id: "quote", label: "Quote building / proposal support" },
  { id: "scheduling", label: "Scheduling support" },
  { id: "customer", label: "Customer communication" },
  { id: "permit", label: "Permit follow-up" },
  { id: "utility", label: "PG&E / utility applications" },
  { id: "enphase", label: "Enphase setup" },
  { id: "plans", label: "Plan set coordination" },
  { id: "parts", label: "Parts ordering" },
  { id: "crm", label: "CRM cleanup" },
  { id: "stuck", label: "Stuck job follow-up" },
  { id: "crew", label: "Crew coordination" },
  { id: "general", label: "General solar back-office support" },
  { id: "not-sure", label: "Not sure yet" },
];

export function RequestHelpForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupport, setSelectedSupport] = useState<string[]>([]);
  const [plan, setPlan] = useState<RequestHelpInput["plan"]>("not-sure");
  const [urgency, setUrgency] = useState<RequestHelpInput["urgency"]>("normal");

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSupport([...selectedSupport, id]);
    } else {
      setSelectedSupport(selectedSupport.filter(item => item !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (selectedSupport.length === 0) {
      setError("Please select at least one support option.");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data: RequestHelpInput = {
      companyName: formData.get("companyName") as string,
      name: formData.get("name") as string,
      role: formData.get("role") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      website: formData.get("website") as string,
      serviceArea: formData.get("serviceArea") as string,
      supportNeeded: selectedSupport.map(id => supportOptions.find(o => o.id === id)?.label || id),
      bottleneck: formData.get("bottleneck") as string,
      plan: plan,
      urgency: urgency,
      tools: formData.get("tools") as string,
      takeOffPlate: formData.get("takeOffPlate") as string,
      websiteUrlHoneypot: String(formData.get("websiteUrlHoneypot") ?? ""),
    };

    const result = await submitRequestHelp(data);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setError(result.error || "An unexpected error occurred.");
    }
    
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <Card className="rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-sm">
        <CardContent className="px-6 py-10 sm:px-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500 mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="font-heading text-2xl font-semibold text-stone-900">
              {FORM_COPY.walkthroughSuccess.title}
            </h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-lg mx-auto">
              {FORM_COPY.walkthroughSuccess.body}
            </p>
          </div>

          <div className="border-t border-amber-200/60 pt-8 mb-8">
            <h4 className="text-sm font-semibold text-stone-900 mb-6 text-center uppercase tracking-wider">
              What Happens Next
            </h4>
            <div className="space-y-6 max-w-md mx-auto">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold">
                    1
                  </div>
                  <div className="w-0.5 h-full bg-amber-200 mt-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h5 className="font-semibold text-sm text-stone-900">Request Received</h5>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    Your walkthrough request has been received. You should see a confirmation email shortly.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold">
                    2
                  </div>
                  <div className="w-0.5 h-full bg-amber-200 mt-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h5 className="font-semibold text-sm text-stone-900">Review & Alignment</h5>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    We&apos;ll reach out within 1 business day to discuss your bottleneck, scope, and support level.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm text-stone-900">Activation</h5>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    After contract and payment setup, you&apos;ll get portal access and we start the work.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              className="border-stone-300 hover:bg-stone-100"
              onClick={() => setIsSubmitted(false)}
            >
              Send another request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-8">
      {/* Honeypot: hidden from view; bots often populate all inputs. */}
      <div
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="websiteUrlHoneypot">Company website URL</label>
        <input
          type="text"
          id="websiteUrlHoneypot"
          name="websiteUrlHoneypot"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input id="companyName" name="companyName" placeholder="Solar Pros LLC" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input id="name" name="name" placeholder="John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role / Title</Label>
          <Input id="role" name="role" placeholder="Operations Manager" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="john@solarpros.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Company Website</Label>
          <Input id="website" name="website" placeholder="https://solarpros.com" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="serviceArea">Service Area (States/Counties)</Label>
          <Input id="serviceArea" name="serviceArea" placeholder="Northern California, Bay Area" />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Support Needed (Select all that apply)</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {supportOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox 
                id={option.id} 
                onCheckedChange={(checked) => handleCheckboxChange(option.id, !!checked)}
              />
              <label
                htmlFor={option.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bottleneck">What is your current biggest bottleneck?</Label>
        <Textarea 
          id="bottleneck" 
          name="bottleneck"
          placeholder="Tell us where your jobs are getting stuck..." 
          className="min-h-[100px]"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="plan">Preferred Support Level</Label>
          <Select name="plan" value={plan} onValueChange={(v) => setPlan(v as RequestHelpInput["plan"])}>
            <SelectTrigger>
              <SelectValue placeholder="Select a support block" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light Support (2 hours per week)</SelectItem>
              <SelectItem value="core">Core Support (5 hours per week)</SelectItem>
              <SelectItem value="priority">Priority Support (10 hours per week)</SelectItem>
              <SelectItem value="not-sure">Not sure yet</SelectItem>
              <SelectItem value="request-based">Request-based work</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="urgency">Urgency</Label>
          <Select name="urgency" value={urgency} onValueChange={(v) => setUrgency(v as RequestHelpInput["urgency"])}>
            <SelectTrigger>
              <SelectValue placeholder="How soon do you need help?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal support</SelectItem>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="urgent">Urgent / stuck job issue</SelectItem>
              <SelectItem value="ongoing">Ongoing recurring support</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tools">Current Tools (CRM, Proposal software, etc.)</Label>
        <Textarea 
          id="tools" 
          name="tools"
          placeholder="e.g. Aurora, Solo, HubSpot, Sighten..." 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="takeOffPlate">What would be most helpful to take off your plate first?</Label>
        <Textarea 
          id="takeOffPlate" 
          name="takeOffPlate"
          placeholder="If we could solve one thing this week, what would it be?" 
        />
      </div>

      <Button
        type="submit"
        className={cn(buttonVariants(), "h-12 w-full text-base font-medium", marketingAmberCta)}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : PRODUCT_LANGUAGE.walkthrough.action}
      </Button>
      
      <p className="text-center text-xs text-muted-foreground">
        By submitting this form, you agree to be contacted by Hargen Energy LLC regarding your support request.
      </p>
    </form>
  );
}
