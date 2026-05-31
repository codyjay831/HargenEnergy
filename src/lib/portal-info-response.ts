import { RequestStatus } from "@/lib/enums";
import { canTransitionOpsStatus } from "@/lib/delivery/lifecycle";

export function isNeedsInfoActive(request: {
  needsInfo: boolean;
  status: RequestStatus;
}): boolean {
  return request.needsInfo || request.status === RequestStatus.NEEDS_INFO;
}

export function resolveStatusAfterInfoResponse(status: RequestStatus): RequestStatus {
  if (
    status === RequestStatus.NEEDS_INFO &&
    canTransitionOpsStatus(status, RequestStatus.IN_PROGRESS)
  ) {
    return RequestStatus.IN_PROGRESS;
  }
  return status;
}

export function buildInfoResponseCommentBody(
  body: string | undefined,
  fileNames: string[],
): string {
  const trimmed = body?.trim();
  if (trimmed) {
    return trimmed;
  }

  const count = fileNames.length;
  const label = count === 1 ? "1 file" : `${count} files`;
  const names = fileNames.join(", ");
  const summary = `Attached ${label}: ${names}`;

  if (summary.length <= 10_000) {
    return summary;
  }

  return `${summary.slice(0, 9997)}...`;
}
