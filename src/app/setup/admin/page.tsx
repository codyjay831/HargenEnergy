import Link from "next/link";

import { adminSetupAvailable } from "@/app/actions/admin-setup";
import { AdminSetupForm } from "@/components/forms/AdminSetupForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set Up Hargen Energy Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage() {
  const status = await adminSetupAvailable();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Set Up Hargen Energy Admin
          </CardTitle>
          <CardDescription className="text-center">
            Create the first admin account for Hargen Energy Solar Ops Desk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.available ? (
            <AdminSetupForm />
          ) : status.reason === "already-complete" ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-md p-3">
                Admin setup is already complete. Use the sign-in page to
                continue.
              </div>
              <Link
                href="/login"
                className="block w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <div className="text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-md p-3">
              Admin setup is not available right now. Please contact your
              administrator.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
