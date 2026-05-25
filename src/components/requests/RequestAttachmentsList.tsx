import { FileText, Paperclip } from "lucide-react";
import { buildFileReadUrl } from "@/lib/storage/paths";
import { isVercelBlobUrl } from "@/lib/storage/blob-ref";
import { safeExternalHref } from "@/lib/utils";

export type RequestAttachmentItem = {
  fileName: string;
  fileUrl: string;
  fileType: string;
};

type RequestAttachmentsListProps = {
  attachments: RequestAttachmentItem[];
};

function resolveAttachmentHref(fileUrl: string): string | null {
  if (isVercelBlobUrl(fileUrl)) {
    return buildFileReadUrl(fileUrl);
  }
  return safeExternalHref(fileUrl);
}

export function RequestAttachmentsList({ attachments }: RequestAttachmentsListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="pt-6 border-t space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-slate-600" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Attachments
        </span>
      </div>
      <ul className="space-y-2">
        {attachments.map((attachment) => {
          const href = resolveAttachmentHref(attachment.fileUrl);
          return (
            <li
              key={`${attachment.fileUrl}-${attachment.fileName}`}
              className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded bg-slate-200 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline truncate block"
                  >
                    {attachment.fileName}
                  </a>
                ) : (
                  <span className="text-sm font-medium text-slate-900 truncate block">
                    {attachment.fileName}
                  </span>
                )}
                <p className="text-xs text-muted-foreground">{attachment.fileType}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
