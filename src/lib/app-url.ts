const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

function baseUrl(): string {
  return APP_URL.replace(/\/$/, "");
}

// Admin work request (CLIENT_OPS) detail
export function adminRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

// Admin walkthrough (PROSPECT_INTAKE) deep-link to prospect page with drawer
export function adminIntakeRequestUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}?open=walkthrough`;
}

// Alias for clarity - same as adminRequestUrl
export function adminWorkRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

// Alias for clarity - same as adminIntakeRequestUrl
export function adminWalkthroughUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}?open=walkthrough`;
}

// Portal request detail
export function portalRequestUrl(requestId: string): string {
  return `${baseUrl()}/portal/requests/${encodeURIComponent(requestId)}`;
}

// Admin client detail
export function adminClientUrl(clientId: string): string {
  return `${baseUrl()}/admin/clients/${encodeURIComponent(clientId)}`;
}

export function portalAccessUrl(): string {
  return `${baseUrl()}/portal/access`;
}

export function loginUrl(): string {
  return `${baseUrl()}/login`;
}
