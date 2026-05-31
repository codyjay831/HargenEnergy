export const GMAIL_COMPOSE_BASE = "https://mail.google.com/mail/?view=cm&fs=1";

/** Conservative limit — browsers vary; stay under ~2k chars total. */
export const GMAIL_URL_MAX_LENGTH = 2000;

export const GMAIL_URL_BODY_TRUNCATION_NOTE =
  "\n\n[Full message copied to clipboard — paste if truncated in Gmail]";

export interface OutreachTemplateContext {
  companyName: string;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  outreachAngle?: string | null;
}

/** Returns the first token of a name, or null if empty/unknown. */
export function getFirstName(name?: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || first.toLowerCase() === "unknown") return null;
  return first;
}

/** Safe greeting — "Hi {firstName}," when known, "Hi team," otherwise. */
export function getGreeting(contact?: { name?: string | null } | null): string {
  const firstName = getFirstName(contact?.name);
  return firstName ? `Hi ${firstName},` : "Hi team,";
}

/** Fixed sender signature for all outreach. */
export function getSignature(): string {
  return "Best,\nCody Barbour\nHargen Energy";
}

/**
 * Resolves single-brace merge variables used in new message templates.
 *
 * Supported variables:
 *   {companyName}  — company name, fallback "your company"
 *   {firstName}    — first token of contact name, fallback ""
 *   {greeting}     — getGreeting(contact)
 *   {signature}    — getSignature()
 */
export function renderOutreachTemplate(
  text: string,
  context: OutreachTemplateContext
): string {
  const firstName = getFirstName(context.contactName) ?? "";
  const greeting = getGreeting({ name: context.contactName });
  const signature = getSignature();
  const companyName = context.companyName || "your company";

  return text
    .replace(/\{companyName\}/g, companyName)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{greeting\}/g, greeting)
    .replace(/\{signature\}/g, signature);
}

/**
 * Legacy variable replacer for old double-brace templates.
 * Kept for backward compatibility; new templates use renderOutreachTemplate.
 */
export function getContactFirstName(name?: string | null): string {
  if (!name?.trim()) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

export function replaceTemplateVariables(
  text: string,
  context: OutreachTemplateContext
): string {
  const contactName = getContactFirstName(context.contactName);
  return text
    .replace(/{{companyName}}/g, context.companyName)
    .replace(/{{contactName}}/g, contactName)
    .replace(/{{city}}/g, context.city || "your area")
    .replace(/{{state}}/g, context.state || "your state")
    .replace(
      /{{outreachAngle}}/g,
      context.outreachAngle || "back-office solar operations"
    );
}

export function buildGmailComposeUrl(options: {
  to?: string | null;
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("fs", "1");
  if (options.to?.trim()) {
    params.set("to", options.to.trim());
  }
  if (options.subject) {
    params.set("su", options.subject);
  }
  if (options.body) {
    params.set("body", options.body);
  }
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function fitBodyForGmailUrl(
  subject: string,
  body: string,
  to?: string | null
): { urlBody: string; truncated: boolean; fullBody: string } {
  const fullBody = body;
  if (buildGmailComposeUrl({ to, subject, body }).length <= GMAIL_URL_MAX_LENGTH) {
    return { urlBody: body, truncated: false, fullBody };
  }

  const note = GMAIL_URL_BODY_TRUNCATION_NOTE;
  let low = 0;
  let high = body.length;
  let best = "";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = body.slice(0, mid).trimEnd() + note;
    if (buildGmailComposeUrl({ to, subject, body: candidate }).length <= GMAIL_URL_MAX_LENGTH) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (!best) {
    return { urlBody: note.trim(), truncated: true, fullBody };
  }

  return { urlBody: best, truncated: true, fullBody };
}

export function openGmailCompose(options: {
  to?: string | null;
  subject?: string;
  body?: string;
}): { truncated: boolean; fullBody: string } {
  const subject = options.subject ?? "";
  const body = options.body ?? "";
  const { urlBody, truncated, fullBody } = fitBodyForGmailUrl(subject, body, options.to);
  const url = buildGmailComposeUrl({ to: options.to, subject, body: urlBody });
  window.open(url, "_blank", "noopener,noreferrer");
  return { truncated, fullBody };
}

export function buildMinimalContactGreeting(contactName?: string | null): string {
  return `${getGreeting({ name: contactName })}\n\n`;
}
