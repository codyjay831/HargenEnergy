import "server-only";

import { Resend } from "resend";

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

const FROM_EMAIL = process.env.SUPPORT_FROM_EMAIL || "Hargen Energy Solar Ops Desk <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.SUPPORT_NOTIFICATION_EMAIL;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Validates that the required email configuration is present.
 */
function validateEmailConfig() {
  const resend = getResend();
  if (!resend) return { error: "Email provider not configured (RESEND_API_KEY missing)." };
  if (!FROM_EMAIL) return { error: "Sender email not configured (SUPPORT_FROM_EMAIL missing)." };
  return { resend };
}

export async function sendRequestConfirmation(to: string, companyName: string) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend } = config;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Hargen Energy received your solar operations support request",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Thank you for reaching out.</h2>
          <p>Hargen Energy has received your solar operations support request for <strong>${companyName}</strong>.</p>
          <p>We will review the bottleneck and support needs you've shared. If we need more details to understand the scope, we will follow up with you directly.</p>
          <p>Please note that support availability depends on the fit of the work, your reserved support block, and our current capacity.</p>
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
  supportNeeded?: string | null;
  plan?: string;
  urgency?: string;
  description: string;
  requestId: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  if (!ADMIN_EMAIL) {
    console.warn("SUPPORT_NOTIFICATION_EMAIL is missing. Internal alert not sent.");
    return { error: "Internal notification email not configured." };
  }
  const { resend } = config;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Hargen Energy support request: ${data.companyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">New Support Request</h2>
          <p><strong>Company:</strong> ${data.companyName}</p>
          <p><strong>Contact:</strong> ${data.contactName} (${data.email})</p>
          <p><strong>Phone:</strong> ${data.phone || "N/A"}</p>
          <p><strong>Support Needed:</strong> ${data.supportNeeded || "N/A"}</p>
          <p><strong>Preferred Level:</strong> ${data.plan || "N/A"}</p>
          <p><strong>Urgency:</strong> ${data.urgency || "N/A"}</p>
          <p><strong>Bottleneck:</strong></p>
          <p style="background: #f8fafc; padding: 15px; border-radius: 4px; border-left: 4px solid #e2e8f0;">${data.description}</p>
          <p style="margin-top: 20px;">
            <a href="${APP_URL}/admin/requests/${data.requestId}" style="background: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Admin</a>
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending internal alert email:", error);
    return { error: "Failed to send internal alert email." };
  }
}

export async function sendClientUpdateEmail(data: {
  to: string;
  requestTitle: string;
  status: string;
  needsInfo: boolean;
  clientVisibleUpdate: string;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend } = config;

  let subject = "Update on your Hargen Energy support request";
  let title = "Support Request Update";
  let extraMessage = "";

  if (data.status === "COMPLETE") {
    subject = `Support request completed: ${data.requestTitle}`;
    title = "Request Completed";
  } else if (data.status === "NEEDS_INFO" || data.needsInfo) {
    subject = `More information needed for your Hargen Energy support request`;
    title = "Information Needed";
    extraMessage = `<p style="color: #b91c1c; font-weight: bold;">Work on this request may pause until the needed details are provided. Please reply to this email with the requested information.</p>`;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">${title}</h2>
          <p><strong>Request:</strong> ${data.requestTitle}</p>
          <p><strong>Status:</strong> ${data.status.replace("_", " ")}</p>
          <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Update from Hargen Energy:</p>
            <p style="margin-top: 10px; color: #0f172a; line-height: 1.6;">${data.clientVisibleUpdate}</p>
          </div>
          ${extraMessage}
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
  const { resend } = config;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: "Overflow approval needed for your Hargen Energy support request",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Overflow Approval Needed</h2>
          <p>Your support request <strong>${data.requestTitle}</strong> may exceed your weekly reserved support block.</p>
          <p>Hargen Energy can prioritize the highest-impact items first within your current block. Remaining work can either roll over to next week or be approved as overflow time.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #fff7ed; border-radius: 8px; border: 1px solid #ffedd5;">
            <p style="margin: 0; font-weight: bold; color: #9a3412; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Reason / Update:</p>
            <p style="margin-top: 10px; color: #7c2d12; line-height: 1.6;">${data.overflowReason || data.clientVisibleUpdate || "This request requires more time than remains in your weekly block."}</p>
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
  const { resend } = config;

  const dateStr = data.deferredUntil ? ` until ${data.deferredUntil.toLocaleDateString()}` : " to a later support block";

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `Support request deferred: ${data.requestTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Request Deferred</h2>
          <p>Your support request <strong>${data.requestTitle}</strong> has been deferred${dateStr} to stay within your weekly support block.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Update from Hargen Energy:</p>
            <p style="margin-top: 10px; color: #0f172a; line-height: 1.6;">${data.clientVisibleUpdate || "This work has been scheduled for a future support block to optimize your current weekly capacity."}</p>
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

export async function sendOverflowApprovedEmail(data: {
  to: string;
  requestTitle: string;
  clientVisibleUpdate?: string | null;
}) {
  const config = validateEmailConfig();
  if ("error" in config) return { error: config.error };
  const { resend } = config;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `Overflow approved: ${data.requestTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
          <h2 style="color: #0f172a;">Overflow Approved</h2>
          <p>Overflow time has been approved for your request: <strong>${data.requestTitle}</strong>.</p>
          
          <div style="margin: 20px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7;">
            <p style="margin: 0; font-weight: bold; color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Update from Hargen Energy:</p>
            <p style="margin-top: 10px; color: #14532d; line-height: 1.6;">${data.clientVisibleUpdate || "We are proceeding with the overflow work as requested."}</p>
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
