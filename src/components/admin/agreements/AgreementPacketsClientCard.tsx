import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { adminAgreementsUrl } from "@/lib/app-url";
import { adminBtnPrimary } from "@/lib/admin-ui/tokens";
import { cn } from "@/lib/utils";

type AgreementPacketsClientCardProps = {
  clientId: string;
  companyName: string;
  packetCount?: number;
};

export function AgreementPacketsClientCard({
  clientId,
  companyName,
  packetCount = 0,
}: AgreementPacketsClientCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Agreement packets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Generate Client Services Agreement + Work Authorization packets for{" "}
          <span className="font-medium text-slate-800">{companyName}</span>.
        </p>
        {packetCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {packetCount} packet{packetCount === 1 ? "" : "s"} on file
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/agreements/new?clientId=${clientId}`}
            className={cn(buttonVariants({ size: "sm" }), adminBtnPrimary)}
          >
            New packet
          </Link>
          <Link
            href={adminAgreementsUrl(clientId)}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            View packets
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
