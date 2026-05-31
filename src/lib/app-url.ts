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

// Alias for clarity - same as adminRequestUrl
export function adminWorkRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

/** Admin PROSPECT_INTAKE deep-link to client discovery tab */
export function adminDiscoveryUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}?tab=discovery`;
}

// Portal request detail
export function portalRequestUrl(requestId: string): string {
  return `${baseUrl()}/portal/requests/${encodeURIComponent(requestId)}`;
}

// Admin client detail (active client overview)
export function adminClientUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}?tab=overview`;
}

export function discoverySchedulingUrl(rawToken: string): string {
  return `${baseUrl()}/schedule/discovery/${encodeURIComponent(rawToken)}`;
}

export function discoveryCalendarIcsUrl(rawToken: string): string {
  return `${baseUrl()}/schedule/discovery/${encodeURIComponent(rawToken)}/calendar.ics`;
}

export function discoverySignedCalendarIcsUrl(
  appointmentId: string,
  signature: string,
): string {
  const params = new URLSearchParams({ sig: signature });
  return `${baseUrl()}/api/discovery/appointments/${encodeURIComponent(appointmentId)}/calendar.ics?${params.toString()}`;
}

export function adminCalendarSettingsUrl(): string {
  return `${baseUrl()}/admin/settings/calendar`;
}

export function adminDiscoveryAvailabilityUrl(): string {
  return `${baseUrl()}/admin/settings/discovery-availability`;
}

export function portalAccessUrl(): string {
  return `${baseUrl()}/portal/access`;
}

export function adminAgreementsUrl(clientId?: string): string {
  const base = `${baseUrl()}/admin/agreements`;
  if (clientId) {
    return `${base}?clientId=${encodeURIComponent(clientId)}`;
  }
  return base;
}

export function adminAgreementPacketUrl(packetId: string): string {
  return `${baseUrl()}/admin/agreements/${encodeURIComponent(packetId)}`;
}

export function adminAgreementPdfDownloadUrl(
  packetId: string,
  variant: "unsigned" | "signed" = "unsigned",
): string {
  return `${baseUrl()}/api/admin/agreements/${encodeURIComponent(packetId)}/pdf?variant=${variant}`;
}

export function loginUrl(): string {
  return `${baseUrl()}/login`;
}
