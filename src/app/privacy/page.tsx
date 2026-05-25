export const metadata = {
  title: "Privacy Policy | Hargen Energy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      <p>
        Hargen Energy collects business contact and project-support information required to
        operate client support services. We use this information to deliver requested work,
        provide status updates, and maintain account security.
      </p>
      <p>
        We do not sell personal information. Data is shared only with operational subprocessors
        used for core service delivery, including authentication, email delivery, file storage,
        and billing providers.
      </p>
      <p>
        Access to client data is restricted by role-based permissions. Sensitive operational
        fields are encrypted at rest. If you need access, correction, or deletion for account
        information, contact support at support@hargenenergy.com.
      </p>
    </main>
  );
}
