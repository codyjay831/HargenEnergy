/**
 * Escape text for safe insertion into HTML email bodies and attributes.
 * Does not produce full URL encoding; use for HTML text/attribute contexts.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip control characters that can affect email headers or SMTP. */
export function sanitizeEmailSubjectFragment(text: string, maxLen: number): string {
  const cleaned = text.replace(/[\r\n\u0000\u000b]/g, " ").trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}
