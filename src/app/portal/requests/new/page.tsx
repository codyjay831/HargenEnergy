import { PortalRequestForm } from "@/components/forms/PortalRequestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getActiveServices } from "@/app/actions/services";

export const dynamic = "force-dynamic";

export default async function NewPortalRequest() {
  const services = await getActiveServices();

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
          <h1 className="text-2xl font-bold tracking-tight">Submit work</h1>
          <p className="text-muted-foreground">Tell us where you&apos;re getting stuck and we&apos;ll help get it moving.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PortalRequestForm initialServices={services} />
        </CardContent>
      </Card>
    </div>
  );
}
