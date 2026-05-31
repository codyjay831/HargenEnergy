"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AgreementServiceType } from "@/generated/prisma/client";
import {
  createAgreementPacket,
  updateAgreementPacketDraft,
} from "@/app/actions/agreement-packet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminBtnPrimary } from "@/lib/admin-ui/tokens";
import type {
  CustomScope,
  RequestBasedScope,
  SupportBlockScope,
} from "@/lib/agreements/types";
import { Loader2 } from "lucide-react";

type TemplateOption = {
  id: string;
  version: string;
  title: string;
};

type ClientOption = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  role: string | null;
};

type AgreementPacketEditorFormProps = {
  mode: "create" | "edit";
  packetId?: string;
  clients: ClientOption[];
  csaTemplates: TemplateOption[];
  workAuthTemplates: TemplateOption[];
  initialClientId?: string;
  initialValues?: {
    clientId: string;
    clientServicesTemplateId: string;
    workAuthorizationTemplateId: string;
    companyLegalName: string;
    companyDba: string;
    companyAddress: string;
    signerName: string;
    signerTitle: string;
    signerEmail: string;
    serviceType: AgreementServiceType;
    scope: SupportBlockScope | RequestBasedScope | CustomScope;
  };
};

const DEFAULT_SUPPORT_SCOPE: SupportBlockScope = {
  planName: "Core Support",
  hoursPerPeriod: 5,
  period: "WEEKLY",
  priceCents: 0,
  billingCadence: "Monthly via Stripe",
  startDate: new Date().toISOString().slice(0, 10),
  renewalTerms: "Renews monthly until cancelled per Work Authorization terms.",
  cancellationTerms: "Either party may cancel with 14 days written notice.",
  unusedTimePolicy: "Unused reserved time does not roll over unless stated in writing.",
  includedCategories: ["Permit follow-up", "Utility coordination", "CRM updates"],
  excludedCategories: ["Engineering stamps", "On-site work", "Legal advice"],
  accessRequired: "CRM and utility portal access as needed for included work.",
  approvalRules: "Client approval required before client-facing or third-party submissions.",
  specialNotes: "",
};

const DEFAULT_REQUEST_SCOPE: RequestBasedScope = {
  requestTitle: "",
  deliverables: "",
  assumptions: "",
  exclusions: "",
  requiredClientInfo: "",
  approvalRules: "Client approval required before work begins.",
  specialNotes: "",
};

const DEFAULT_CUSTOM_SCOPE: CustomScope = {
  description: "",
  specialNotes: "",
};

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

export function AgreementPacketEditorForm({
  mode,
  packetId,
  clients,
  csaTemplates,
  workAuthTemplates,
  initialClientId,
  initialValues,
}: AgreementPacketEditorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultClient = useMemo(() => {
    const id = initialValues?.clientId ?? initialClientId ?? clients[0]?.id ?? "";
    return clients.find((c) => c.id === id) ?? clients[0];
  }, [clients, initialClientId, initialValues?.clientId]);

  const [clientId, setClientId] = useState(defaultClient?.id ?? "");
  const [clientServicesTemplateId, setClientServicesTemplateId] = useState(
    initialValues?.clientServicesTemplateId ?? csaTemplates[0]?.id ?? "",
  );
  const [workAuthorizationTemplateId, setWorkAuthorizationTemplateId] = useState(
    initialValues?.workAuthorizationTemplateId ?? workAuthTemplates[0]?.id ?? "",
  );
  const [companyLegalName, setCompanyLegalName] = useState(
    initialValues?.companyLegalName ?? defaultClient?.companyName ?? "",
  );
  const [companyDba, setCompanyDba] = useState(initialValues?.companyDba ?? "");
  const [companyAddress, setCompanyAddress] = useState(
    initialValues?.companyAddress ?? "",
  );
  const [signerName, setSignerName] = useState(
    initialValues?.signerName ?? defaultClient?.contactName ?? "",
  );
  const [signerTitle, setSignerTitle] = useState(
    initialValues?.signerTitle ?? defaultClient?.role ?? "Authorized Representative",
  );
  const [signerEmail, setSignerEmail] = useState(
    initialValues?.signerEmail ?? defaultClient?.email ?? "",
  );
  const [serviceType, setServiceType] = useState<AgreementServiceType>(
    initialValues?.serviceType ?? AgreementServiceType.SUPPORT_BLOCK,
  );

  const initialScope = initialValues?.scope;
  const [supportScope, setSupportScope] = useState<SupportBlockScope>(
    initialScope && "planName" in initialScope
      ? (initialScope as SupportBlockScope)
      : DEFAULT_SUPPORT_SCOPE,
  );
  const [requestScope, setRequestScope] = useState<RequestBasedScope>(
    initialScope && "requestTitle" in initialScope
      ? (initialScope as RequestBasedScope)
      : DEFAULT_REQUEST_SCOPE,
  );
  const [customScope, setCustomScope] = useState<CustomScope>(
    initialScope && "description" in initialScope && !("planName" in initialScope) && !("requestTitle" in initialScope)
      ? (initialScope as CustomScope)
      : DEFAULT_CUSTOM_SCOPE,
  );

  const onClientChange = (nextClientId: string) => {
    setClientId(nextClientId);
    const client = clients.find((c) => c.id === nextClientId);
    if (!client || mode === "edit") {
      return;
    }
    setCompanyLegalName(client.companyName);
    setSignerName(client.contactName);
    setSignerTitle(client.role || "Authorized Representative");
    setSignerEmail(client.email);
  };

  const selectedScopeJson =
    serviceType === AgreementServiceType.SUPPORT_BLOCK
      ? supportScope
      : serviceType === AgreementServiceType.REQUEST_BASED
        ? requestScope
        : customScope;

  const submit = () => {
    setError(null);
    const payload = {
      clientId,
      clientServicesTemplateId,
      workAuthorizationTemplateId,
      companyLegalName,
      companyDba: companyDba || null,
      companyAddress: companyAddress || null,
      signerName,
      signerTitle,
      signerEmail,
      serviceType,
      selectedScopeJson,
      pricingJson: null,
      billingJson: null,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAgreementPacket(payload)
          : await updateAgreementPacketDraft({
              packetId: packetId!,
              data: {
                clientServicesTemplateId,
                workAuthorizationTemplateId,
                companyLegalName,
                companyDba: companyDba || null,
                companyAddress: companyAddress || null,
                signerName,
                signerTitle,
                signerEmail,
                serviceType,
                selectedScopeJson,
                pricingJson: null,
                billingJson: null,
              },
            });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (mode === "create" && "packetId" in result && result.packetId) {
        router.push(`/admin/agreements/${result.packetId}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Client & signer</h2>
        {mode === "create" ? (
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={onClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Client: {clients.find((c) => c.id === clientId)?.companyName ?? clientId}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyLegalName">Company legal name</Label>
            <Input id="companyLegalName" value={companyLegalName} onChange={(e) => setCompanyLegalName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyDba">DBA (optional)</Label>
            <Input id="companyDba" value={companyDba} onChange={(e) => setCompanyDba(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="companyAddress">Company address (optional)</Label>
            <Input id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signerName">Signer name</Label>
            <Input id="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signerTitle">Signer title</Label>
            <Input id="signerTitle" value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="signerEmail">Signer email</Label>
            <Input id="signerEmail" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Agreement versions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Client Services Agreement</Label>
            <Select value={clientServicesTemplateId} onValueChange={setClientServicesTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {csaTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.version} — {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Work Authorization</Label>
            <Select value={workAuthorizationTemplateId} onValueChange={setWorkAuthorizationTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workAuthTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.version} — {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Service type & scope</h2>
        <Select
          value={serviceType}
          onValueChange={(value) => setServiceType(value as AgreementServiceType)}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AgreementServiceType.SUPPORT_BLOCK}>Support block</SelectItem>
            <SelectItem value={AgreementServiceType.REQUEST_BASED}>Request-based</SelectItem>
            <SelectItem value={AgreementServiceType.CUSTOM}>Custom</SelectItem>
          </SelectContent>
        </Select>

        {serviceType === AgreementServiceType.SUPPORT_BLOCK && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan name</Label>
              <Input
                value={supportScope.planName}
                onChange={(e) => setSupportScope({ ...supportScope, planName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hours per period</Label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={supportScope.hoursPerPeriod}
                onChange={(e) =>
                  setSupportScope({
                    ...supportScope,
                    hoursPerPeriod: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={supportScope.period}
                onValueChange={(value) =>
                  setSupportScope({
                    ...supportScope,
                    period: value as "WEEKLY" | "MONTHLY",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price (USD cents)</Label>
              <Input
                type="number"
                min={0}
                value={supportScope.priceCents}
                onChange={(e) =>
                  setSupportScope({
                    ...supportScope,
                    priceCents: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Billing cadence</Label>
              <Input
                value={supportScope.billingCadence}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, billingCadence: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={supportScope.startDate}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Included categories (one per line)</Label>
              <Textarea
                rows={4}
                value={listToLines(supportScope.includedCategories)}
                onChange={(e) =>
                  setSupportScope({
                    ...supportScope,
                    includedCategories: linesToList(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Excluded categories (one per line)</Label>
              <Textarea
                rows={3}
                value={listToLines(supportScope.excludedCategories)}
                onChange={(e) =>
                  setSupportScope({
                    ...supportScope,
                    excludedCategories: linesToList(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Access required</Label>
              <Textarea
                rows={2}
                value={supportScope.accessRequired}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, accessRequired: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Approval rules</Label>
              <Textarea
                rows={2}
                value={supportScope.approvalRules}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, approvalRules: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Renewal terms</Label>
              <Textarea
                rows={2}
                value={supportScope.renewalTerms}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, renewalTerms: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Cancellation terms</Label>
              <Textarea
                rows={2}
                value={supportScope.cancellationTerms}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, cancellationTerms: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Unused time policy</Label>
              <Textarea
                rows={2}
                value={supportScope.unusedTimePolicy}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, unusedTimePolicy: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Special notes</Label>
              <Textarea
                rows={2}
                value={supportScope.specialNotes ?? ""}
                onChange={(e) =>
                  setSupportScope({ ...supportScope, specialNotes: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {serviceType === AgreementServiceType.REQUEST_BASED && (
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Request title</Label>
              <Input
                value={requestScope.requestTitle}
                onChange={(e) =>
                  setRequestScope({ ...requestScope, requestTitle: e.target.value })
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Flat fee (USD cents)</Label>
                <Input
                  type="number"
                  min={0}
                  value={requestScope.flatFeeCents ?? ""}
                  onChange={(e) =>
                    setRequestScope({
                      ...requestScope,
                      flatFeeCents: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Or estimate range</Label>
                <Input
                  value={requestScope.estimateRange ?? ""}
                  onChange={(e) =>
                    setRequestScope({ ...requestScope, estimateRange: e.target.value })
                  }
                />
              </div>
            </div>
            {(
              [
                ["deliverables", "Deliverables"],
                ["assumptions", "Assumptions"],
                ["exclusions", "Exclusions"],
                ["requiredClientInfo", "Required client info"],
                ["approvalRules", "Approval rules"],
                ["targetTurnaround", "Target turnaround (optional)"],
                ["specialNotes", "Special notes"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Textarea
                  rows={2}
                  value={requestScope[key] ?? ""}
                  onChange={(e) =>
                    setRequestScope({ ...requestScope, [key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {serviceType === AgreementServiceType.CUSTOM && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Custom scope description</Label>
              <Textarea
                rows={5}
                value={customScope.description}
                onChange={(e) =>
                  setCustomScope({ ...customScope, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Special notes</Label>
              <Textarea
                rows={2}
                value={customScope.specialNotes ?? ""}
                onChange={(e) =>
                  setCustomScope({ ...customScope, specialNotes: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <Button className={adminBtnPrimary} disabled={isPending} onClick={submit}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "Save draft" : "Save changes"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
