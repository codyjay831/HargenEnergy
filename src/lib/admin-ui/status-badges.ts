import { RequestStatus } from "@/generated/prisma/client";

export type ClientHealth = "Healthy" | "Needs info" | "Near limit" | "Over limit";

/** Maps a Prisma RequestStatus to Tailwind badge classes (outline variant). */
export function requestStatusBadgeClass(status: RequestStatus): string {
  switch (status) {
    case RequestStatus.NEW:
      return "border-slate-200 bg-slate-50 text-slate-700";
    case RequestStatus.REVIEWED:
      return "border-purple-200 bg-purple-50 text-purple-800";
    case RequestStatus.IN_PROGRESS:
      return "border-blue-200 bg-blue-50 text-blue-800";
    case RequestStatus.NEEDS_INFO:
    case RequestStatus.WAITING_ON_CUSTOMER:
      return "border-amber-200 bg-amber-50 text-amber-900";
    case RequestStatus.WAITING_ON_THIRD_PARTY:
      return "border-sky-200 bg-sky-50 text-sky-800";
    case RequestStatus.COMPLETE:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case RequestStatus.CANCELLED:
      return "border-slate-200 bg-slate-100 text-slate-400";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

/** Maps a client health label to Tailwind badge classes (outline variant). */
export function clientHealthBadgeClass(health: ClientHealth): string {
  switch (health) {
    case "Healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Needs info":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Near limit":
      return "border-orange-200 bg-orange-50/80 text-orange-900";
    case "Over limit":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

/** Maps a numeric priority rank to a display label (P1/P2/P3). */
export function rankToPriorityLabel(rank: number | null): string {
  if (!rank) return "—";
  if (rank <= 2) return "P1";
  if (rank <= 5) return "P2";
  return "P3";
}

/** Maps a numeric priority rank to Tailwind badge classes. */
export function priorityRankBadgeClass(rank: number | null): string {
  if (!rank) return "border-slate-200 bg-slate-50 text-slate-500";
  if (rank <= 2) return "border-red-200 bg-red-50 text-red-800";
  if (rank <= 5) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

/** Formats seconds of elapsed timer time as MM:SS or HH:MM:SS. */
export function formatElapsedTimer(startedAt: Date): string {
  const secs = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Compact age display: 3m, 2h, 1d. */
export function formatAge(date: Date): string {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
