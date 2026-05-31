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
  return `Hi ${getContactFirstName(contactName)},\n\n`;
}
