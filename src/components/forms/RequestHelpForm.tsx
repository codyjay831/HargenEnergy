"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { submitRequestHelp, type WalkthroughSubmissionSummary } from "@/app/actions/requests";
import { RequestHelpInput, requestHelpSchema, validateRequestHelpStep1 } from "@/lib/validations";
import type { WalkthroughCatalogCategory } from "@/lib/walkthrough-catalog";
import { cn } from "@/lib/utils";
import { marketingAmberCta } from "@/components/marketing/marketing-styles";
import { FORM_COPY } from "@/lib/product-language";

const COPY = FORM_COPY.walkthrough;

type FieldErrors = Partial<Record<keyof RequestHelpInput | "requestedWorkTaskIds", string>>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600 mt-1">{message}</p>;
}

interface RequestHelpFormProps {
  catalog: WalkthroughCatalogCategory[];
}

export function RequestHelpForm({ catalog }: RequestHelpFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState<WalkthroughSubmissionSummary | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedSupport, setSelectedSupport] = useState<string[]>([]);
  const [plan, setPlan] = useState<RequestHelpInput["plan"]>("not-sure");
  const [urgency, setUrgency] = useState<RequestHelpInput["urgency"]>("normal");

  const [step1Values, setStep1Values] = useState({
    companyName: "",
    name: "",
    email: "",
    phone: "",
    bottleneck: "",
  });

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setSelectedSupport((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id),
    );
    setFieldErrors((prev) => ({ ...prev, requestedWorkTaskIds: undefined }));
  };

  const handleContinue = () => {
    setError(null);
    const result = validateRequestHelpStep1({
      ...step1Values,
      requestedWorkTaskIds: selectedSupport,
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const [key, messages] of Object.entries(result.error.flatten().fieldErrors)) {
        if (messages?.[0]) {
          errors[key as keyof FieldErrors] = messages[0];
        }
      }
      if (selectedSupport.length === 0) {
        errors.requestedWorkTaskIds = "Please select at least one support option.";
      }
      setFieldErrors(errors);
      return;
    }

    if (selectedSupport.length === 0) {
      setFieldErrors({
        requestedWorkTaskIds: "Please select at least one support option.",
      });
      return;
    }

    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data: RequestHelpInput = {
      ...step1Values,
      role: (formData.get("role") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      serviceArea: (formData.get("serviceArea") as string) || undefined,
      requestedWorkTaskIds: selectedSupport,
      bottleneck: step1Values.bottleneck,
      plan,
      urgency,
      tools: (formData.get("tools") as string) || undefined,
      takeOffPlate: (formData.get("takeOffPlate") as string) || undefined,
      websiteUrlHoneypot: String(formData.get("websiteUrlHoneypot") ?? ""),
    };

    const validated = requestHelpSchema.safeParse(data);
    if (!validated.success) {
      const errors: FieldErrors = {};
      for (const [key, messages] of Object.entries(validated.error.flatten().fieldErrors)) {
        if (messages?.[0]) {
          errors[key as keyof FieldErrors] = messages[0];
        }
      }
      setFieldErrors(errors);
      const step1Keys = [
        "companyName",
        "name",
        "email",
        "phone",
        "bottleneck",
        "requestedWorkTaskIds",
      ];
      if (step1Keys.some((k) => k in errors)) {
        setStep(1);
      }
      setIsSubmitting(false);
      return;
    }

    const result = await submitRequestHelp(data);

    if (result.success) {
      if ("summary" in result && result.summary) {
        setSubmissionSummary(result.summary);
      }
      setIsSubmitted(true);
    } else {
      const msg = result.error || "An unexpected error occurred.";
      setError(msg);
      toast.error(msg);
      if ("details" in result && result.details) {
        const errors: FieldErrors = {};
        for (const [key, messages] of Object.entries(result.details)) {
          if (Array.isArray(messages) && messages[0]) {
            errors[key as keyof FieldErrors] = messages[0];
          }
        }
        setFieldErrors(errors);
      }
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setSubmissionSummary(null);
    setStep(1);
    setStep1Values({ companyName: "", name: "", email: "", phone: "", bottleneck: "" });
    setSelectedSupport([]);
    setPlan("not-sure");
    setUrgency("normal");
    setFieldErrors({});
    setError(null);
  };

  const handleAnotherRequest = () => {
    if (window.confirm(COPY.anotherRequestConfirm)) {
      resetForm();
    }
  };

  if (isSubmitted) {
    const changeMailto = submissionSummary
      ? `mailto:support@hargenenergy.com?subject=${encodeURIComponent(
          `Walkthrough request update (${submissionSummary.requestId.slice(0, 8)})`,
        )}&body=${encodeURIComponent(
          `Hi Hargen Energy,\n\nI'd like to update my walkthrough request.\n\nReference: ${submissionSummary.requestId}\n\nChanges needed:\n`,
        )}`
      : "mailto:support@hargenenergy.com?subject=Walkthrough%20request%20update";

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

          {submissionSummary && (
            <div className="mb-8 rounded-lg border border-amber-200/80 bg-white/70 p-5 space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  What you submitted
                </h4>
                <p className="mt-1 text-xs text-stone-500">
                  Submitted {format(new Date(submissionSummary.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Support areas
                </p>
                <div className="space-y-2">
                  {submissionSummary.tasks.map((task) => (
                    <div key={task.id} className="rounded-md border border-stone-200 px-3 py-2">
                      <p className="text-sm font-medium text-stone-900">{task.name}</p>
                      {task.description ? (
                        <p className="mt-1 text-xs text-stone-600">{task.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Bottleneck
                  </p>
                  <p className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                    {submissionSummary.bottleneck}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Plan interest
                    </p>
                    <p className="mt-1 text-sm text-stone-900">{submissionSummary.planLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Urgency
                    </p>
                    <p className="mt-1 text-sm text-stone-900">{submissionSummary.urgencyLabel}</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-stone-600">
                Need to change something?{" "}
                <a href={changeMailto} className="font-medium text-amber-800 underline underline-offset-2">
                  Email us with your reference ID
                </a>
              </p>
            </div>
          )}

          <div className="border-t border-amber-200/60 pt-8 mb-8">
            <h4 className="text-sm font-semibold text-stone-900 mb-6 text-center uppercase tracking-wider">
              What happens next
            </h4>
            <div className="space-y-6 max-w-md mx-auto">
              {[
                COPY.successSteps.received,
                COPY.successSteps.review,
                COPY.successSteps.activation,
              ].map((item, index, arr) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    {index < arr.length - 1 && (
                      <div className="w-0.5 h-full bg-amber-200 mt-2" />
                    )}
                  </div>
                  <div className={cn("flex-1", index < arr.length - 1 && "pb-6")}>
                    <h5 className="font-semibold text-sm text-stone-900">{item.title}</h5>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="outline"
              className="border-stone-300 hover:bg-stone-100"
              onClick={handleAnotherRequest}
            >
              {COPY.anotherRequest}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (catalog.length === 0) {
    return (
      <Card className="rounded-xl border border-stone-200 bg-stone-50 shadow-sm">
        <CardContent className="px-6 py-10 sm:px-10 text-center space-y-4">
          <h3 className="font-heading text-xl font-semibold text-stone-900">
            Walkthrough requests are temporarily unavailable
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed max-w-lg mx-auto">
            Our service list is being updated. Please email us directly and we&apos;ll schedule your
            walkthrough.
          </p>
          <a
            href="mailto:hello@hargenenergy.com?subject=Walkthrough%20request"
            className={cn(buttonVariants(), marketingAmberCta, "inline-flex h-11 px-6")}
          >
            Email Hargen Energy
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()} className="relative space-y-8">
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

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-stone-600">{COPY.stepIndicator(step)}</p>
        <div className="flex gap-2">
          <div
            className={cn("h-1.5 w-8 rounded-full", step >= 1 ? "bg-amber-500" : "bg-stone-200")}
          />
          <div
            className={cn("h-1.5 w-8 rounded-full", step >= 2 ? "bg-amber-500" : "bg-stone-200")}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      {step === 1 ? (
        <>
          <div>
            <h2 className="font-heading text-lg font-semibold text-stone-900">{COPY.step1Title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">{COPY.companyName}</Label>
              <Input
                id="companyName"
                value={step1Values.companyName}
                onChange={(e) =>
                  setStep1Values((v) => ({ ...v, companyName: e.target.value }))
                }
                placeholder="Solar Pros LLC"
                required
              />
              <FieldError message={fieldErrors.companyName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{COPY.yourName}</Label>
              <Input
                id="name"
                value={step1Values.name}
                onChange={(e) => setStep1Values((v) => ({ ...v, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{COPY.email}</Label>
              <Input
                id="email"
                type="email"
                value={step1Values.email}
                onChange={(e) => setStep1Values((v) => ({ ...v, email: e.target.value }))}
                placeholder="john@solarpros.com"
                required
              />
              <FieldError message={fieldErrors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{COPY.phone}</Label>
              <Input
                id="phone"
                type="tel"
                value={step1Values.phone}
                onChange={(e) => setStep1Values((v) => ({ ...v, phone: e.target.value }))}
                placeholder="(555) 000-0000"
              />
              <p className="text-xs text-muted-foreground">{COPY.phoneHelper}</p>
              <FieldError message={fieldErrors.phone} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bottleneck">{COPY.bottleneck}</Label>
            <Textarea
              id="bottleneck"
              value={step1Values.bottleneck}
              onChange={(e) =>
                setStep1Values((v) => ({ ...v, bottleneck: e.target.value }))
              }
              placeholder={COPY.bottleneckPlaceholder}
              className="min-h-[100px]"
              required
            />
            <FieldError message={fieldErrors.bottleneck} />
          </div>

          <div className="space-y-4">
            <div>
              <Label>{COPY.supportAreas}</Label>
              <p className="text-sm text-muted-foreground mt-1">{COPY.supportAreasHelper}</p>
            </div>
            <div className="space-y-5">
              {catalog.map((group) => (
                <div key={group.id}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    {group.name}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {group.tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 rounded-md border border-stone-200/80 p-3">
                        <Checkbox
                          id={task.id}
                          checked={selectedSupport.includes(task.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(task.id, !!checked)}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <label htmlFor={task.id} className="text-sm font-medium leading-snug">
                            {task.name}
                          </label>
                          {task.description ? (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {task.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <FieldError message={fieldErrors.requestedWorkTaskIds} />
          </div>

          <Button
            type="button"
            className={cn(buttonVariants(), "h-12 w-full text-base font-medium", marketingAmberCta)}
            onClick={handleContinue}
          >
            {COPY.continue}
          </Button>
        </>
      ) : (
        <>
          <div>
            <h2 className="font-heading text-lg font-semibold text-stone-900">{COPY.step2Title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="role">{COPY.role}</Label>
              <Input id="role" name="role" placeholder="Operations Manager" />
              <FieldError message={fieldErrors.role} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">{COPY.website}</Label>
              <Input id="website" name="website" placeholder="https://solarpros.com" />
              <p className="text-xs text-muted-foreground">{COPY.websiteHelper}</p>
              <FieldError message={fieldErrors.website} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="serviceArea">{COPY.serviceArea}</Label>
              <Input
                id="serviceArea"
                name="serviceArea"
                placeholder="Northern California, Bay Area"
              />
              <FieldError message={fieldErrors.serviceArea} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="takeOffPlate">{COPY.firstPriority}</Label>
            <Textarea
              id="takeOffPlate"
              name="takeOffPlate"
              placeholder={COPY.firstPriorityPlaceholder}
            />
            <FieldError message={fieldErrors.takeOffPlate} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tools">{COPY.tools}</Label>
            <Textarea id="tools" name="tools" placeholder={COPY.toolsPlaceholder} />
            <FieldError message={fieldErrors.tools} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="plan">{COPY.plan}</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as RequestHelpInput["plan"])}>
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
              <Label htmlFor="urgency">{COPY.urgency}</Label>
              <Select
                value={urgency}
                onValueChange={(v) => setUrgency(v as RequestHelpInput["urgency"])}
              >
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 sm:flex-1"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              {COPY.back}
            </Button>
            <Button
              type="submit"
              className={cn(
                buttonVariants(),
                "h-12 sm:flex-1 text-base font-medium",
                marketingAmberCta,
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {COPY.sending}
                </>
              ) : (
                COPY.submit
              )}
            </Button>
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">{COPY.legal}</p>
    </form>
  );
}
