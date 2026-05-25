import { formatIntakePlanLabel } from "@/lib/intake-plan";
import { formatUrgencyLabel } from "@/lib/ui-enums";
import { escapeHtml } from "@/lib/html-escape";

export type IntakeSnapshotClient = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  website?: string | null;
  serviceArea?: string | null;
  currentTools?: string | null;
};

export type IntakeSnapshotRequest = {
  supportNeeded?: string | null;
  description: string;
  mostHelpful?: string | null;
  urgency: string;
};

export type IntakeSnapshotMetadata = {
  intakePlan?: string;
};

export type IntakeSnapshotField = {
  label: string;
  value: string;
  multiline?: boolean;
};

export function buildIntakeSnapshotFields(data: {
  client: IntakeSnapshotClient;
  request: IntakeSnapshotRequest;
  metadata?: IntakeSnapshotMetadata | null;
}): IntakeSnapshotField[] {
  const { client, request, metadata } = data;
  const fields: IntakeSnapshotField[] = [];

  const contactParts = [
    client.contactName,
    client.role ? `(${client.role})` : null,
    client.email,
    client.phone ?? null,
  ].filter(Boolean);
  if (contactParts.length > 0) {
    fields.push({ label: "Contact", value: contactParts.join(" · ") });
  }

  if (client.companyName) {
    fields.push({ label: "Company", value: client.companyName });
  }
  if (client.website) {
    fields.push({ label: "Website", value: client.website });
  }
  if (client.serviceArea) {
    fields.push({ label: "Service area", value: client.serviceArea });
  }
  if (request.supportNeeded) {
    fields.push({ label: "Support areas", value: request.supportNeeded });
  }
  if (request.description) {
    fields.push({ label: "Bottleneck", value: request.description, multiline: true });
  }
  if (request.mostHelpful) {
    fields.push({
      label: "First priority this week",
      value: request.mostHelpful,
      multiline: true,
    });
  }
  if (client.currentTools) {
    fields.push({ label: "Current tools", value: client.currentTools, multiline: true });
  }
  if (metadata?.intakePlan) {
    fields.push({
      label: "Plan interest",
      value: formatIntakePlanLabel(metadata.intakePlan),
    });
  }
  if (request.urgency) {
    fields.push({ label: "Urgency", value: formatUrgencyLabel(request.urgency) });
  }

  return fields;
}

export function renderIntakeAlertHtml(data: {
  client: IntakeSnapshotClient;
  request: IntakeSnapshotRequest;
  metadata?: IntakeSnapshotMetadata | null;
  adminUrl: string;
}): string {
  const fields = buildIntakeSnapshotFields(data);
  const fieldBlocks = fields
    .map((field) => {
      const safeLabel = escapeHtml(field.label);
      const safeValue = escapeHtml(field.value);
      if (field.multiline) {
        return `
          <p><strong>${safeLabel}:</strong></p>
          <p style="background: #f8fafc; padding: 12px; border-radius: 4px; border-left: 4px solid #e2e8f0; margin-top: 4px;">${safeValue}</p>
        `;
      }
      return `<p><strong>${safeLabel}:</strong> ${safeValue}</p>`;
    })
    .join("");

  const safeUrl = escapeHtml(data.adminUrl);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
      <h2 style="color: #0f172a;">New Walkthrough Request</h2>
      ${fieldBlocks}
      <p style="margin-top: 20px;">
        <a href="${safeUrl}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Admin</a>
      </p>
    </div>
  `;
}
