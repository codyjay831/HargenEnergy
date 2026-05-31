import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptPortalTermsForm } from "@/components/forms/AcceptPortalTermsForm";
import { LogoutButton } from "@/components/layout/LogoutButton";

export const metadata = {
  title: "Accept Terms | Hargen Energy",
};

export default async function AcceptTermsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  if (!session.user.clientId) {
    redirect("/portal/access");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <Card className="mx-auto max-w-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Confirm legal terms</CardTitle>
          <p className="text-sm text-muted-foreground">
            Before continuing to the portal, review and accept the Terms of Service and
            Privacy Policy.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcceptPortalTermsForm />
          <div className="pt-2">
            <LogoutButton className="max-w-48" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
