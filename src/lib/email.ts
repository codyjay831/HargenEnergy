import "server-only";

import { Resend } from "resend";

import {
  adminDiscoveryUrl,
  adminRequestUrl,
  portalRequestUrl,
  discoveryCalendarIcsUrl,
  discoverySchedulingUrl,
  discoverySignedCalendarIcsUrl,
} from "@/lib/app-url";
import { SupportRequestKind } from "@/generated/prisma/client";
import { escapeHtml, sanitizeEmailSubjectFragment } from "@/lib/html-escape";
import { resolveClientLogoUrl } from "@/lib/storage/logo-url";
import { renderIntakeAlertHtml } from "@/lib/intake-snapshot";
import { EMAIL_SUBJECTS } from "@/lib/product-language";
import {
  buildCancelIcsForAppointment,
  buildDiscoveryCalendarArtifacts,
} from "@/lib/discovery-scheduling/calendar-ics-server";
import { signDiscoveryAppointmentCalendar } from "@/lib/discovery-scheduling/calendar-signature";

/**
 * Returns a Resend instance or null if the API key is missing.
 * This is used server-side only.
 */
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is missing. Email notifications are disabled.");
    return null;
  }
  return new Resend(apiKey);
}

const ADMIN_EMAIL = process.env.SUPPORT_NOTIFICATION_EMAIL;

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function clientEmailHeader(data: {
  companyName?: string;
  logoUrl?: string | null;
  clientId?: string;
}) {
  const safeCompany = escapeHtml(data.companyName || "Your company");
  const resolvedLogo = resolveClientLogoUrl(data.logoUrl);
  const logo = resolvedLogo
    ? `<img src="${escapeHtml(resolvedLogo)}" alt="" width="48" height="48" style="object-fit:contain;border-radius:8px;" />`
    : "";

  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      ${logo}
      <div>
        <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Client portal</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0f172a;">${safeCompany}</p>
      </div>
    </div>
  `;
}

/**
 * Validates that the required email configuration is present.
 */
function validateEmailConfig() {
  const resend = getResend();
  if (!resend) return { error: "Email provider not configured (RESEND_API_KEY missing)." };

  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const resendFromName = process.env.RESEND_FROM_NAME || "Hargen Energy Solar Ops Desk";
  const legacyFromEmail = process.env.SUPPORT_FROM_EMAIL;

  let from: string | undefined;

  if (resendFromEmail) {
    from = `${resendFromName} <${resendFromEmail}>`;
  } else if (legacyFromEmail) {
    from = legacyFromEmail;
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (!from) {
    if (isProduction) {
      console.error("[Email] RESEND_FROM_EMAIL is not configured. Verify a domain in Resend and set RESEND_FROM_EMAIL.");
      return { error: "Resend sender domain is not configured. Verify a domain in Resend and set RESEND_FROM_EMAIL." };
    }
    return { error: "Sender email not configured (RESEND_FROM_EMAIL missing)." };
  }

  if (isProduction && from.includes("@resend.dev")) {
    console.error(`[Email] Production email cannot be sent from ${from}. Resend.dev is for testing only.`);
    return { error: "Production email cannot be sent from a resend.dev address. Please use a verified domain." };
  }

  return { resend, fromEmail: from };
}

export async function sendRequestConfirmation(
  to: string,
  companyName: string,
  options?: { taskCount?: number; requestId?: string; schedulingUrl?: string },
) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeCompany = escapeHtml(companyName);
  const taskSummary =
    options?.taskCount && options.taskCount > 0
      ? `<p>You selected <strong>${options.taskCount}</strong> support area${options.taskCount === 1 ? "" : "s"}. Reply to this email if anything needs to change.</p>`
      : "";

  const schedulingUrl = options?.schedulingUrl?.trim();
  const scheduleCta = schedulingUrl
    ? `<p style="margin: 24px 0;">
            <a href="${escapeHtml(schedulingUrl)}" style="background: #0f172a; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Choose your discovery time</a>
          </p>
          <p style="font-size: 14px; color: #64748b;">This scheduling link expires in 14 days.</p>`
    : "";

  const followUpCopy = schedulingUrl
    ? `<p>Pick a time for your discovery discovery using the button above. We will review what you shared and come prepared for the conversation.</p>`
    : `<p>We will review the bottleneck and support needs you shared. If we need more details to understand scope, we will follow up with you directly.</p>`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: EMAIL_SUBJECTS.discoveryConfirmation(companyName),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Discovery request received</h2>
          <p>Hargen Energy has received your discovery request for <strong>${safeCompany}</strong>.</p>
          ${taskSummary}
          ${scheduleCta}
          ${followUpCopy}
          <p>We will start with a discovery to understand your backlog and where you are stuck. Portal access and ongoing client work begin after onboarding, contract, and payment are in place.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return { error: "Failed to send confirmation email." };
  }
}

export async function sendInternalRequestAlert(data: {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  website?: string | null;
  serviceArea?: string | null;
  tools?: string | null;
  takeOffPlate?: string | null;
  supportNeeded?: string | null;
  plan?: string;
  urgency?: string;
  description: string;
  requestId: string;
  clientId?: string;
  kind?: SupportRequestKind;
  subjectPrefix?: string;
  intakePlan?: string;
  schedulingUrl?: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  if (!ADMIN_EMAIL) {
    const message = "SUPPORT_NOTIFICATION_EMAIL is missing. Internal alert not sent.";
    console.error(`[Email] ${message}`);
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureMessage(message, "warning");
    } catch {
      // Sentry optional when DSN not configured
    }
    return { error: "Internal notification email not configured." };
  }
  const { resend, fromEmail } = config;

  const isInboundLead = data.kind === SupportRequestKind.PROSPECT_INTAKE;
  const adminUrl =
    isInboundLead && data.clientId
      ? adminDiscoveryUrl(data.clientId)
      : adminRequestUrl(data.requestId);

  const subjectBase = isInboundLead
    ? EMAIL_SUBJECTS.discoveryAdminAlert(data.companyName)
    : `New client ops request: ${data.companyName}`;
  const subject = sanitizeEmailSubjectFragment(
    data.subjectPrefix ? `${data.subjectPrefix} ${subjectBase}` : subjectBase,
    200,
  );

  const html =
    isInboundLead && data.clientId
      ? renderIntakeAlertHtml({
          client: {
            companyName: data.companyName,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            role: data.role,
            website: data.website,
            serviceArea: data.serviceArea,
            currentTools: data.tools,
          },
          request: {
            supportNeeded: data.supportNeeded,
            description: data.description,
            mostHelpful: data.takeOffPlate,
            urgency: data.urgency ?? "NORMAL",
          },
          metadata: data.intakePlan ? { intakePlan: data.intakePlan } : undefined,
          adminUrl,
          schedulingUrl: data.schedulingUrl,
        })
      : buildOpsAlertHtml(data, adminUrl);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending internal alert email:", error);
    return { error: "Failed to send internal alert email." };
  }
}

function buildOpsAlertHtml(
  data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string | null;
    supportNeeded?: string | null;
    plan?: string;
    urgency?: string;
    description: string;
  },
  adminUrl: string,
): string {
  const safeCompany = escapeHtml(data.companyName);
  const safeContact = escapeHtml(data.contactName);
  const safeEmail = escapeHtml(data.email);
  const safePhone = escapeHtml(data.phone || "N/A");
  const safeSupport = escapeHtml(data.supportNeeded || "N/A");
  const safePlan = escapeHtml(data.plan || "N/A");
  const safeUrgency = escapeHtml(data.urgency || "N/A");
  const safeDescription = escapeHtml(data.description);
  const safeUrl = escapeHtml(adminUrl);

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
      <h2 style="color: #0f172a;">New Client Ops Request</h2>
      <p><strong>Company:</strong> ${safeCompany}</p>
      <p><strong>Contact:</strong> ${safeContact} (${safeEmail})</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <p><strong>Support Needed:</strong> ${safeSupport}</p>
      <p><strong>Preferred Level:</strong> ${safePlan}</p>
      <p><strong>Urgency:</strong> ${safeUrgency}</p>
      <p><strong>Bottleneck:</strong></p>
      <p style="background: #f8fafc; padding: 15px; border-radius: 4px; border-left: 4px solid #e2e8f0;">${safeDescription}</p>
      <p style="margin-top: 20px;">
        <a href="${safeUrl}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Admin</a>
      </p>
    </div>
  `;
}

export async function sendClientUpdateEmail(data: {
  to: string;
  requestTitle: string;
  requestId: string;
  status: string;
  needsInfo: boolean;
  clientVisibleUpdate: string;
  companyName?: string;
  logoUrl?: string | null;
  clientId?: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeTitle = escapeHtml(data.requestTitle);
  const safeStatus = escapeHtml(data.status.replace(/_/g, " "));
  const safeUpdate = escapeHtml(data.clientVisibleUpdate);

  let subject = "Update on your Hargen Energy support request";
  let title = "Support Request Update";
  let extraMessage = "";

  if (data.status === "COMPLETE") {
    subject = sanitizeEmailSubjectFragment(
      `Support request completed: ${data.requestTitle}`,
      200,
    );
    title = "Request Completed";
  } else if (data.status === "NEEDS_INFO" || data.needsInfo) {
    subject = "More information needed for your Hargen Energy support request";
    title = "Information Needed";
    extraMessage = `<p style="color: #b91c1c; font-weight: bold;">Work on this request may pause until the needed details are provided. Open the portal to reply on this request.</p>`;
  }

  const safeHeading = escapeHtml(title);
  const portalUrl = escapeHtml(portalRequestUrl(data.requestId));

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          ${clientEmailHeader({
            companyName: data.companyName,
            logoUrl: data.logoUrl,
            clientId: data.clientId,
          })}
          <h2 style="color: #0f172a;">${safeHeading}</h2>
          <p><strong>Request:</strong> ${safeTitle}</p>
          <p><strong>Status:</strong> ${safeStatus}</p>
          <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Update from Hargen Energy:</p>
            <p style="margin-top: 10px; color: #0f172a; line-height: 1.6;">${safeUpdate}</p>
          </div>
          ${extraMessage}
          <p style="margin: 24px 0;">
            <a href="${portalUrl}" style="background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in portal</a>
          </p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending client update email:", error);
    return { error: "Failed to send client update email." };
  }
}

export async function sendOverflowApprovalEmail(data: {
  to: string;
  requestTitle: string;
  overflowReason?: string | null;
  clientVisibleUpdate?: string | null;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeTitle = escapeHtml(data.requestTitle);
  const overflowBlock = escapeHtml(
    data.overflowReason ??
      data.clientVisibleUpdate ??
      "This request requires more time than remains in your weekly block.",
  );

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: "Overflow approval needed for your Hargen Energy support request",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Overflow Approval Needed</h2>
          <p>Your support request <strong>${safeTitle}</strong> may exceed your weekly reserved support block.</p>
          <p>Hargen Energy can prioritize the highest-impact items first within your current block. Remaining work can either roll over to next week or be approved as overflow time.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #fff7ed; border-radius: 8px; border: 1px solid #ffedd5;">
            <p style="margin: 0; font-weight: bold; color: #9a3412; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Reason / Update:</p>
            <p style="margin-top: 10px; color: #7c2d12; line-height: 1.6;">${overflowBlock}</p>
          </div>

          <p><strong>Please reply to this email</strong> to let us know if you would like to approve overflow time or if we should defer this work to your next support block.</p>
          
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending overflow approval email:", error);
    return { error: "Failed to send overflow approval email." };
  }
}

export async function sendDeferredUpdateEmail(data: {
  to: string;
  requestTitle: string;
  deferredUntil?: Date | null;
  clientVisibleUpdate?: string | null;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeTitle = escapeHtml(data.requestTitle);
  const dateStr = data.deferredUntil
    ? ` until ${escapeHtml(data.deferredUntil.toLocaleDateString())}`
    : " to a later support block";
  const safeUpdate = escapeHtml(
    data.clientVisibleUpdate ??
      "This work has been scheduled for a future support block to optimize your current weekly capacity.",
  );
  const subject = sanitizeEmailSubjectFragment(
    `Support request deferred: ${data.requestTitle}`,
    200,
  );

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Request Deferred</h2>
          <p>Your support request <strong>${safeTitle}</strong> has been deferred${dateStr} to stay within your weekly support block.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Update from Hargen Energy:</p>
            <p style="margin-top: 10px; color: #0f172a; line-height: 1.6;">${safeUpdate}</p>
          </div>

          <p>We will resume work on this request as soon as your next support block begins or as capacity allows.</p>
          
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending deferred update email:", error);
    return { error: "Failed to send deferred update email." };
  }
}

export async function sendPasswordResetEmail(data: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeHref = escapeHtml(data.resetUrl);
  const expires = escapeHtml(String(data.expiresInMinutes));

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: "Reset your Hargen Energy password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Reset your password</h2>
          <p>We received a request to reset the password for your Hargen Energy account.</p>
          <p>Click the button below to choose a new password.</p>
          <p style="margin: 28px 0;">
            <a href="${safeHref}" style="background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset password</a>
          </p>
          <p style="font-size: 14px; color: #64748b;">This link expires in ${expires} minutes and can only be used once.</p>
          <p style="font-size: 14px; color: #64748b;">If you did not request a password reset, you can safely ignore this email.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error sending password reset email:", error);
    } else {
      console.warn("[Email] Password reset email could not be delivered.");
    }
    return { error: "Failed to send password reset email." };
  }
}

/** Best-effort security notice when the account password was changed (in-app or via reset). */
export async function sendPasswordChangedNotificationEmail(data: { to: string }) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: "Your Hargen Energy password was changed",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Password changed</h2>
          <p>The password for your Hargen Energy account was just updated.</p>
          <p>If you made this change, no further action is needed.</p>
          <p style="font-size: 14px; color: #b91c1c;">If you did not change your password, contact your administrator or support immediately so your account can be secured.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error sending password-changed notification:", error);
    } else {
      console.warn("[Email] Password-changed notification could not be delivered.");
    }
    return { error: "Failed to send password-changed notification." };
  }
}

export async function sendOverflowApprovedEmail(data: {
  to: string;
  requestTitle: string;
  clientVisibleUpdate?: string | null;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeTitle = escapeHtml(data.requestTitle);
  const safeUpdate = escapeHtml(
    data.clientVisibleUpdate ?? "We are proceeding with the overflow work as requested.",
  );
  const subject = sanitizeEmailSubjectFragment(
    `Overflow approved: ${data.requestTitle}`,
    200,
  );

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Overflow Approved</h2>
          <p>Overflow time has been approved for your request: <strong>${safeTitle}</strong>.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7;">
            <p style="margin: 0; font-weight: bold; color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Update from Hargen Energy:</p>
            <p style="margin-top: 10px; color: #14532d; line-height: 1.6;">${safeUpdate}</p>
          </div>

          <p>We will continue work on this request and track the additional time as overflow.</p>
          
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending overflow approved email:", error);
    return { error: "Failed to send overflow approved email." };
  }
}

export async function sendPortalInviteEmail(data: {
  to: string;
  companyName: string;
  resetUrl: string;
  logoUrl?: string | null;
  clientId?: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeHref = escapeHtml(data.resetUrl);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: "Your Hargen Energy client portal is ready",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          ${clientEmailHeader({
            companyName: data.companyName,
            logoUrl: data.logoUrl,
            clientId: data.clientId,
          })}
          <h2 style="color: #0f172a;">Set up your portal access</h2>
          <p>Your private client portal is ready for <strong>${escapeHtml(data.companyName)}</strong>.</p>
          <p>Use the button below to choose a password, then sign in to view open requests, approvals, and weekly support usage.</p>
          <p style="margin: 28px 0;">
            <a href="${safeHref}" style="background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set password and open portal</a>
          </p>
          <p style="font-size: 14px; color: #64748b;">This link expires in 30 minutes and can only be used once.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk
          </p>
        </div>
      `,
    });
    console.log(`[Email] Portal invite sent to ${data.to}. Resend ID: ${result.data?.id}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending portal invite email:", error);
    return { error: "Failed to send portal invite email." };
  }
}

export async function sendStaffInviteEmail(data: {
  to: string;
  resetUrl: string;
  name?: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeHref = escapeHtml(data.resetUrl);
  const safeName = escapeHtml(data.name || "there");

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: "Your Hargen staff account is ready",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Set up your Hargen admin access</h2>
          <p>Hi ${safeName},</p>
          <p>You have been invited to the Hargen admin workspace. Use the button below to set your password and sign in.</p>
          <p style="margin: 28px 0;">
            <a href="${safeHref}" style="background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set password and sign in</a>
          </p>
          <p style="font-size: 14px; color: #64748b;">This link expires in 30 minutes and can only be used once.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending staff invite email:", error);
    return { error: "Failed to send staff invite email." };
  }
}

export async function sendInternalClientCommentAlert(data: {
  companyName: string;
  requestTitle: string;
  requestId: string;
  commentBody: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  if (!ADMIN_EMAIL) {
    return { error: "Internal notification email not configured." };
  }
  const { resend, fromEmail } = config;

  const safeCompany = escapeHtml(data.companyName);
  const safeTitle = escapeHtml(data.requestTitle);
  const safeComment = escapeHtml(data.commentBody);
  const adminUrl = escapeHtml(adminRequestUrl(data.requestId));

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectFragment(
        `Client reply: ${data.companyName} — ${data.requestTitle}`,
        200,
      ),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">New client comment</h2>
          <p><strong>Company:</strong> ${safeCompany}</p>
          <p><strong>Request:</strong> ${safeTitle}</p>
          <p style="background: #f8fafc; padding: 15px; border-radius: 4px; border-left: 4px solid #e2e8f0;">${safeComment}</p>
          <p style="margin-top: 20px;">
            <a href="${adminUrl}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in admin</a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending client comment alert:", error);
    return { error: "Failed to send client comment alert." };
  }
}

export async function sendDisbursementApprovalRequestEmail(data: {
  to: string;
  companyName: string;
  requestTitle: string;
  requestId: string;
  vendor: string;
  purpose: string;
  amountCents: number;
  currency: string;
  logoUrl?: string | null;
  clientId?: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const portalUrl = escapeHtml(portalRequestUrl(data.requestId));
  const amount = escapeHtml(formatMoney(data.amountCents, data.currency));

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: sanitizeEmailSubjectFragment(
        `Approval needed: ${data.vendor} fee for ${data.requestTitle}`,
        200,
      ),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          ${clientEmailHeader({
            companyName: data.companyName,
            logoUrl: data.logoUrl,
            clientId: data.clientId,
          })}
          <h2 style="color: #0f172a;">Payment approval needed</h2>
          <p><strong>Request:</strong> ${escapeHtml(data.requestTitle)}</p>
          <p><strong>Vendor:</strong> ${escapeHtml(data.vendor)}</p>
          <p><strong>Amount:</strong> ${amount}</p>
          <p><strong>Purpose:</strong> ${escapeHtml(data.purpose)}</p>
          <p>Approve or decline this pass-through fee in your portal before Hargen pays it on your behalf.</p>
          <p style="margin: 24px 0;">
            <a href="${portalUrl}" style="background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review in portal</a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending disbursement approval email:", error);
    return { error: "Failed to send disbursement approval email." };
  }
}

export async function sendDisbursementStatusEmail(data: {
  to: string;
  companyName: string;
  requestTitle: string;
  requestId: string;
  status: string;
  vendor: string;
  amountCents: number;
  currency: string;
  logoUrl?: string | null;
  receiptUrl?: string | null;
  clientId?: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const portalUrl = escapeHtml(portalRequestUrl(data.requestId));
  const amount = escapeHtml(formatMoney(data.amountCents, data.currency));
  const statusLabel = escapeHtml(data.status.replace(/_/g, " "));
  const receiptBlock = data.receiptUrl
    ? `<p><strong>Receipt:</strong> <a href="${escapeHtml(data.receiptUrl)}">${escapeHtml(data.receiptUrl)}</a></p>`
    : "";

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: sanitizeEmailSubjectFragment(
        `Payment update: ${data.vendor} — ${data.requestTitle}`,
        200,
      ),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          ${clientEmailHeader({
            companyName: data.companyName,
            logoUrl: data.logoUrl,
            clientId: data.clientId,
          })}
          <h2 style="color: #0f172a;">Pass-through payment update</h2>
          <p><strong>Request:</strong> ${escapeHtml(data.requestTitle)}</p>
          <p><strong>Vendor:</strong> ${escapeHtml(data.vendor)}</p>
          <p><strong>Amount:</strong> ${amount}</p>
          <p><strong>Status:</strong> ${statusLabel}</p>
          ${receiptBlock}
          <p style="margin: 24px 0;">
            <a href="${portalUrl}" style="background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in portal</a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending disbursement status email:", error);
    return { error: "Failed to send disbursement status email." };
  }
}

export async function sendInternalDisbursementDecisionAlert(data: {
  companyName: string;
  requestTitle: string;
  requestId: string;
  vendor: string;
  amountCents: number;
  currency: string;
  status: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  if (!ADMIN_EMAIL) {
    return { error: "Internal notification email not configured." };
  }
  const { resend, fromEmail } = config;

  const adminUrl = escapeHtml(adminRequestUrl(data.requestId));
  const amount = escapeHtml(formatMoney(data.amountCents, data.currency));

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectFragment(
        `Disbursement ${data.status}: ${data.companyName}`,
        200,
      ),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Client disbursement decision</h2>
          <p><strong>Company:</strong> ${escapeHtml(data.companyName)}</p>
          <p><strong>Request:</strong> ${escapeHtml(data.requestTitle)}</p>
          <p><strong>Vendor:</strong> ${escapeHtml(data.vendor)}</p>
          <p><strong>Amount:</strong> ${amount}</p>
          <p><strong>Status:</strong> ${escapeHtml(data.status.replace(/_/g, " "))}</p>
          <p style="margin-top: 20px;">
            <a href="${adminUrl}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in admin</a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending internal disbursement alert:", error);
    return { error: "Failed to send internal disbursement alert." };
  }
}

function formatDiscoveryWhen(startUtc: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(startUtc);
}

type DiscoveryCalendarEmailContext = {
  appointmentId: string;
  companyName: string;
  startUtc: Date;
  endUtc: Date;
  meetingUrl: string | null;
  schedulingLinkId: string | null;
  schedulingToken?: string;
  manageUrl?: string | null;
};

function getDiscoveryCalendarLinks(input: DiscoveryCalendarEmailContext) {
  const artifacts = buildDiscoveryCalendarArtifacts({
    appointmentId: input.appointmentId,
    companyName: input.companyName,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    meetingUrl: input.meetingUrl,
    schedulingLinkId: input.schedulingLinkId,
    manageUrl: input.manageUrl,
  });

  const icsUrl = input.schedulingToken
    ? discoveryCalendarIcsUrl(input.schedulingToken)
    : discoverySignedCalendarIcsUrl(
        input.appointmentId,
        signDiscoveryAppointmentCalendar(input.appointmentId),
      );

  return {
    ...artifacts,
    icsUrl,
  };
}

function renderDiscoveryCalendarLinks(input: { googleUrl: string; icsUrl: string }): string {
  const googleUrl = escapeHtml(input.googleUrl);
  const icsUrl = escapeHtml(input.icsUrl);

  return `
    <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">
      Add to calendar:
      <a href="${googleUrl}" style="color: #334155; text-decoration: underline;">Google Calendar</a>
      ·
      <a href="${icsUrl}" style="color: #334155; text-decoration: underline;">Apple Calendar</a>
      ·
      <a href="${icsUrl}" style="color: #334155; text-decoration: underline;">Outlook</a>
    </p>
  `;
}

export async function sendDiscoveryNeedsInfoEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  message: string;
  replyTo: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      replyTo: input.replyTo,
      subject: EMAIL_SUBJECTS.discoveryNeedsInfo(input.companyName),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">More information needed</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <p>Thanks for your discovery request for <strong>${escapeHtml(input.companyName)}</strong>. We need a few more details before we can move forward.</p>
          <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">What we need:</p>
            <p style="margin-top: 10px; color: #0f172a; line-height: 1.6;">${safeMessage}</p>
          </div>
          <p>Reply to this email with the details we need and we'll follow up shortly.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;">
            Hargen Energy Solar Ops Desk<br />
            Flexible Solar Operations Support
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery needs info email:", error);
    return { error: "Failed to send needs info email." };
  }
}

export async function sendDiscoverySchedulingLinkEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  schedulingUrl: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: EMAIL_SUBJECTS.discoverySchedulingLink(input.companyName),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Schedule your discovery</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <p>Thanks for your interest in Hargen Energy. Pick a time that works for a discovery discovery for <strong>${escapeHtml(input.companyName)}</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${escapeHtml(input.schedulingUrl)}" style="background: #0f172a; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Choose a time</a>
          </p>
          <p style="font-size: 14px; color: #64748b;">This link expires in 14 days.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery scheduling link email:", error);
    return { error: "Failed to send scheduling link email." };
  }
}

export async function sendDiscoveryBookingConfirmationEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  appointmentId: string;
  schedulingLinkId: string;
  startUtc: Date;
  endUtc: Date;
  timezone: string;
  meetingUrl: string | null;
  schedulingToken: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;
  const when = formatDiscoveryWhen(input.startUtc, input.timezone);
  const manageUrl = discoverySchedulingUrl(input.schedulingToken);
  const calendar = getDiscoveryCalendarLinks({
    appointmentId: input.appointmentId,
    companyName: input.companyName,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    meetingUrl: input.meetingUrl,
    schedulingLinkId: input.schedulingLinkId,
    schedulingToken: input.schedulingToken,
    manageUrl,
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: EMAIL_SUBJECTS.discoveryBookingConfirmation(input.companyName),
      attachments: [
        {
          filename: "hargen-discovery.ics",
          content: Buffer.from(calendar.publishIcs).toString("base64"),
        },
      ],
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Discovery scheduled</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <p>Your Hargen discovery for <strong>${escapeHtml(input.companyName)}</strong> is confirmed.</p>
          <p><strong>When:</strong> ${escapeHtml(when)} (${escapeHtml(input.timezone)})</p>
          ${input.meetingUrl ? `<p><strong>Google Meet:</strong> <a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a></p>` : ""}
          <p style="margin: 24px 0;">
            <a href="${escapeHtml(manageUrl)}" style="background: #0f172a; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">View or cancel</a>
          </p>
          ${renderDiscoveryCalendarLinks(calendar)}
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery booking confirmation:", error);
    return { error: "Failed to send booking confirmation email." };
  }
}

export async function sendDiscoveryRescheduleEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  appointmentId: string;
  schedulingLinkId: string;
  startUtc: Date;
  endUtc: Date;
  timezone: string;
  meetingUrl: string | null;
  schedulingToken: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;
  const when = formatDiscoveryWhen(input.startUtc, input.timezone);
  const manageUrl = discoverySchedulingUrl(input.schedulingToken);
  const calendar = getDiscoveryCalendarLinks({
    appointmentId: input.appointmentId,
    companyName: input.companyName,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    meetingUrl: input.meetingUrl,
    schedulingLinkId: input.schedulingLinkId,
    schedulingToken: input.schedulingToken,
    manageUrl,
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: EMAIL_SUBJECTS.discoveryReschedule(input.companyName),
      attachments: [
        {
          filename: "hargen-discovery.ics",
          content: Buffer.from(calendar.publishIcs).toString("base64"),
        },
      ],
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Discovery rescheduled</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <p>Your Hargen discovery for <strong>${escapeHtml(input.companyName)}</strong> has a new time.</p>
          <p><strong>When:</strong> ${escapeHtml(when)} (${escapeHtml(input.timezone)})</p>
          ${input.meetingUrl ? `<p><strong>Google Meet:</strong> <a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a></p>` : ""}
          <p style="margin: 24px 0;">
            <a href="${escapeHtml(manageUrl)}" style="background: #0f172a; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">View appointment</a>
          </p>
          ${renderDiscoveryCalendarLinks(calendar)}
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery reschedule email:", error);
    return { error: "Failed to send reschedule confirmation email." };
  }
}

export async function sendDiscoveryReminderEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  appointmentId: string;
  schedulingLinkId: string;
  startUtc: Date;
  endUtc: Date;
  timezone: string;
  meetingUrl: string | null;
  reminderLabel: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;
  const when = formatDiscoveryWhen(input.startUtc, input.timezone);
  const calendar = getDiscoveryCalendarLinks({
    appointmentId: input.appointmentId,
    companyName: input.companyName,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    meetingUrl: input.meetingUrl,
    schedulingLinkId: input.schedulingLinkId,
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: EMAIL_SUBJECTS.discoveryReminder(input.companyName),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">${escapeHtml(input.reminderLabel)}</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <p>Reminder for your Hargen discovery with <strong>${escapeHtml(input.companyName)}</strong>.</p>
          <p><strong>When:</strong> ${escapeHtml(when)} (${escapeHtml(input.timezone)})</p>
          ${input.meetingUrl ? `<p><strong>Google Meet:</strong> <a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a></p>` : ""}
          ${renderDiscoveryCalendarLinks(calendar)}
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery reminder email:", error);
    return { error: "Failed to send reminder email." };
  }
}

export async function sendDiscoveryCancelAdminNotification(input: {
  companyName: string;
  clientId: string;
  startUtc: Date;
  timezone: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  if (!ADMIN_EMAIL) {
    return { error: "Internal notification email not configured." };
  }
  const { resend, fromEmail } = config;
  const when = formatDiscoveryWhen(input.startUtc, input.timezone);
  const adminUrl = escapeHtml(adminDiscoveryUrl(input.clientId));

  try {
    await resend.emails.send({
      from: fromEmail,
      to: ADMIN_EMAIL,
      subject: sanitizeEmailSubjectFragment(
        `Discovery canceled: ${input.companyName}`,
        200,
      ),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Prospect canceled discovery</h2>
          <p><strong>Company:</strong> ${escapeHtml(input.companyName)}</p>
          <p><strong>Was scheduled for:</strong> ${escapeHtml(when)} (${escapeHtml(input.timezone)})</p>
          <p style="margin-top: 20px;">
            <a href="${adminUrl}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in admin</a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery cancel admin notification:", error);
    return { error: "Failed to send admin notification." };
  }
}

export async function sendDiscoveryCancelEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  appointmentId: string;
  schedulingLinkId: string;
  startUtc: Date;
  endUtc: Date;
  timezone: string;
  meetingUrl: string | null;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;
  const when = formatDiscoveryWhen(input.startUtc, input.timezone);
  const cancelIcs = buildCancelIcsForAppointment({
    appointmentId: input.appointmentId,
    companyName: input.companyName,
    startUtc: input.startUtc,
    endUtc: input.endUtc,
    meetingUrl: input.meetingUrl,
    schedulingLinkId: input.schedulingLinkId,
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: EMAIL_SUBJECTS.discoveryCancel(input.companyName),
      attachments: [
        {
          filename: "hargen-discovery-cancel.ics",
          content: Buffer.from(cancelIcs).toString("base64"),
        },
      ],
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Discovery canceled</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <p>Your discovery for <strong>${escapeHtml(input.companyName)}</strong> scheduled for ${escapeHtml(when)} has been canceled.</p>
          <p>Reply to this email if you'd like to reschedule.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery cancel email:", error);
    return { error: "Failed to send cancel email." };
  }
}

export async function sendDiscoveryRecapEmail(input: {
  to: string;
  contactName: string;
  companyName: string;
  recapContent: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend, fromEmail } = config;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: EMAIL_SUBJECTS.discoveryRecap(input.companyName),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Discovery recap</h2>
          <p>Hi ${escapeHtml(input.contactName)},</p>
          <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(input.recapContent)}</div>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending discovery recap email:", error);
    return { error: "Failed to send recap email." };
  }
}
