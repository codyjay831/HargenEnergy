import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PortalRequestForm } from "@/components/forms/PortalRequestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPortalSubmitOptions } from "@/app/actions/portal";
import { PRODUCT_LANGUAGE } from "@/lib/product-language";

export const dynamic = "force-dynamic";

export default async function NewPortalRequest() {
  const session = await auth();
  const clientId = session?.user?.clientId;
  if (!clientId) {
    redirect("/portal");
  }

  const options = await getPortalSubmitOptions(clientId);
  if ("error" in options) {
    redirect("/portal");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/portal/requests" 
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {PRODUCT_LANGUAGE.workRequest.newTitle}
          </h1>
          <p className="text-muted-foreground">
            {PRODUCT_LANGUAGE.workRequest.newSubtitle}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work details</CardTitle>
        </CardHeader>
        <CardContent>
          <PortalRequestForm
            engagementType={options.engagementType}
            categories={options.categories}
            canSubmit={options.canSubmit}
            blockMessage={options.blockMessage}
            blockReasonCode={options.blockReasonCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
