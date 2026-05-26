export type DiscoveryIcsMethod = "PUBLISH" | "CANCEL";

export function discoveryEventUid(appointmentId: string): string {
  return `discovery-${appointmentId}@hargenenergy.com`;
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildDiscoveryEventSummary(companyName: string): string {
  return `Hargen discovery — ${companyName}`;
}

export function buildDiscoveryEventDescription(input: {
  companyName: string;
  meetingUrl?: string | null;
  manageUrl?: string | null;
}): string {
  const parts = [`Discovery with Hargen Energy for ${input.companyName}.`];
  if (input.meetingUrl?.trim()) {
    parts.push(`Join: ${input.meetingUrl.trim()}`);
  }
  if (input.manageUrl?.trim()) {
    parts.push(`Manage booking: ${input.manageUrl.trim()}`);
  }
  return parts.join("\n\n");
}

export function buildDiscoveryIcs(input: {
  uid: string;
  sequence?: number;
  method?: DiscoveryIcsMethod;
  summary: string;
  description: string;
  startUtc: Date;
  endUtc: Date;
  location?: string | null;
  status?: "CANCELLED";
}): string {
  const method = input.method ?? "PUBLISH";
  const sequence = input.sequence ?? 0;
  const now = formatIcsUtc(new Date());
  const dtStart = formatIcsUtc(input.startUtc);
  const dtEnd = formatIcsUtc(input.endUtc);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hargen Energy//Discovery Scheduling//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${now}`,
    `SEQUENCE:${sequence}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
  ];

  if (input.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(input.location.trim())}`);
  }

  if (input.status === "CANCELLED") {
    lines.push("STATUS:CANCELLED");
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}

function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(input: {
  summary: string;
  description: string;
  startUtc: Date;
  endUtc: Date;
  location?: string | null;
}): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.summary,
    dates: `${formatGoogleCalendarDate(input.startUtc)}/${formatGoogleCalendarDate(input.endUtc)}`,
    details: input.description,
  });
  if (input.location?.trim()) {
    params.set("location", input.location.trim());
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
