import Link from "next/link";

import { isResetTokenValid } from "@/app/actions/password-reset";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset password – Hargen Energy",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const tokenValid = token ? await isResetTokenValid(token) : false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset your password
          </CardTitle>
          <CardDescription className="text-center">
            Choose a new password for your Hargen Energy account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenValid && token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-md p-3">
                This reset link is invalid or has expired. Request a new one to
                continue.
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Request new link
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
