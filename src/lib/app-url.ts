const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

function baseUrl(): string {
  return APP_URL.replace(/\/$/, "");
}

export function adminRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

export function adminIntakeRequestUrl(requestId: string): string {
  return `${baseUrl()}/admin/requests/${encodeURIComponent(requestId)}`;
}

export function portalRequestUrl(requestId: string): string {
  return `${baseUrl()}/portal/requests/${encodeURIComponent(requestId)}`;
}

export function portalAccessUrl(): string {
  return `${baseUrl()}/portal/access`;
}

export function loginUrl(): string {
  return `${baseUrl()}/login`;
}
