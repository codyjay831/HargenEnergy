export function countPortalLoggedInUsers(
  users: Array<{ lastLoginAt: Date | null }>,
): number {
  return users.filter((user) => user.lastLoginAt != null).length;
}
