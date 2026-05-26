const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

export function getAppBaseUrl(): string {
  return APP_URL.replace(/\/$/, "");
}

function baseUrl(): string {
  return getAppBaseUrl();
}

// Admin work request (CLIENT_OPS) detail
export function adminRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

// Admin walkthrough (PROSPECT_INTAKE) deep-link to prospect walkthrough tab
export function adminIntakeRequestUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}?tab=walkthrough&open=walkthrough`;
}

// Alias for clarity - same as adminRequestUrl
export function adminWorkRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

// Alias for clarity - same as adminIntakeRequestUrl
export function adminWalkthroughUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}?tab=walkthrough&open=walkthrough`;
}

// Portal request detail
export function portalRequestUrl(requestId: string): string {
  return `${baseUrl()}/portal/requests/${encodeURIComponent(requestId)}`;
}

// Admin client detail
export function adminClientUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}`;
}

export function walkthroughSchedulingUrl(rawToken: string): string {
  return `${baseUrl()}/schedule/walkthrough/${encodeURIComponent(rawToken)}`;
}

export function walkthroughCalendarIcsUrl(rawToken: string): string {
  return `${baseUrl()}/schedule/walkthrough/${encodeURIComponent(rawToken)}/calendar.ics`;
}

export function walkthroughSignedCalendarIcsUrl(
  appointmentId: string,
  signature: string,
): string {
  const params = new URLSearchParams({ sig: signature });
  return `${baseUrl()}/api/walkthrough/appointments/${encodeURIComponent(appointmentId)}/calendar.ics?${params.toString()}`;
}

export function adminCalendarSettingsUrl(): string {
  return `${baseUrl()}/admin/settings/calendar`;
}

export function adminWalkthroughAvailabilityUrl(): string {
  return `${baseUrl()}/admin/settings/walkthrough-availability`;
}

export function portalAccessUrl(): string {
  return `${baseUrl()}/portal/access`;
}

export function loginUrl(): string {
  return `${baseUrl()}/login`;
}
