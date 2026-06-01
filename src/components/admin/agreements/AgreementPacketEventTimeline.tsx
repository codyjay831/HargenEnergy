import { format } from "date-fns";
import type { AgreementPacketEvent } from "@/generated/prisma/client";

type AgreementPacketEventTimelineProps = {
  events: AgreementPacketEvent[];
};

function formatEventLabel(eventType: string): string {
  switch (eventType) {
    case "packet.created":
      return "Packet created";
    case "packet.updated":
      return "Draft updated";
    case "packet.snapshot_created":
      return "Legal snapshot frozen";
    case "packet.pdf_generated":
      return "PDF generated";
    case "packet.returned_to_draft":
      return "Returned to draft";
    case "packet.sent_manually":
      return "Sent Manually / Outside App";
    case "packet.voided":
      return "Voided";
    case "packet.superseded":
      return "Superseded";
    case "packet.signed":
      return "Agreement signed";
    case "packet.manually_signed":
      return "Manually signed (outside app)";
    case "packet.sent_via_email":
      return "Sent via app email";
    case "signing_link.created":
      return "Signing link created";
    case "signing_link.email_resent":
      return "Signing link email resent";
    case "signing_link.revoked":
      return "Signing link revoked";
    case "signing_link.opened":
      return "Signing link opened";
    case "signing_link.used":
      return "Signing link used";
    case "signing_link.expired":
      return "Signing link expired";
    default:
      return eventType.replace(/\./g, " · ");
  }
}

export function AgreementPacketEventTimeline({
  events,
}: AgreementPacketEventTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No events recorded yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const metadata = event.metadataJson as Record<string, unknown> | null;
        const note =
          typeof metadata?.note === "string"
            ? metadata.note
            : typeof metadata?.reason === "string"
              ? metadata.reason
              : null;

        return (
          <li
            key={event.id}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-900">
                {formatEventLabel(event.eventType)}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(event.createdAt), "MMM d, yyyy h:mm a")}
              </span>
            </div>
            {event.actorEmail && (
              <p className="text-xs text-muted-foreground mt-1">{event.actorEmail}</p>
            )}
            {event.eventType === "packet.sent_manually" && (
              <p className="text-xs text-purple-800 mt-1">
                Not verified in-app email delivery
              </p>
            )}
            {event.eventType === "packet.sent_via_email" && (
              <p className="text-xs text-emerald-800 mt-1">
                Delivery attempted via in-app email
              </p>
            )}
            {note && (
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{note}</p>
            )}
            {typeof metadata?.sha256Hash === "string" && (
              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                SHA-256: {metadata.sha256Hash}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
