export function walkthroughScopeMatchesApproved(
  requestedTaskIds: string[],
  approvedTaskIds: string[],
): boolean {
  if (requestedTaskIds.length === 0) {
    return true;
  }

  const requested = new Set(requestedTaskIds);
  const approved = new Set(approvedTaskIds);

  if (requested.size !== approved.size) {
    return false;
  }

  for (const id of requested) {
    if (!approved.has(id)) {
      return false;
    }
  }

  return true;
}

export function flattenApprovedTaskIds(
  supportAreas: Array<{ tasks: Array<{ id: string }> }>,
): string[] {
  return supportAreas.flatMap((area) => area.tasks.map((task) => task.id));
}
