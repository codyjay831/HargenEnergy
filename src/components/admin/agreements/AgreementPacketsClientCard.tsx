import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminAgreementsUrl } from "@/lib/app-url";
import { adminBtnPrimary } from "@/lib/admin-ui/tokens";

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
          <Button asChild size="sm" className={adminBtnPrimary}>
            <Link href={`/admin/agreements/new?clientId=${clientId}`}>
              New packet
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={adminAgreementsUrl(clientId)}>View packets</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
