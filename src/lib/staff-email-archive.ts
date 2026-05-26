export const ARCHIVED_STAFF_EMAIL_DOMAIN = "@deleted.local";

export function archivedStaffEmail(userId: string): string {
  return `archived-${userId}${ARCHIVED_STAFF_EMAIL_DOMAIN}`;
}
