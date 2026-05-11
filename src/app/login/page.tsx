import { LoginForm } from "@/components/forms/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_MESSAGES: Record<string, string> = {
  "setup-complete":
    "Admin account created. Sign in with your new credentials.",
  "password-updated":
    "Your password has been updated. Sign in with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const successMessage = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Hargen Energy Sign In
          </CardTitle>
          <CardDescription className="text-center">
            Client portal access is by invitation after onboarding. Sign in with the email your account manager enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3">
              {successMessage}
            </div>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
