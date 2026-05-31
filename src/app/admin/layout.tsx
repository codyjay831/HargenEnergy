import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { CatalogHealthBanner } from "@/components/admin/CatalogHealthBanner";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { getUnreadNotificationCount } from "@/lib/admin-notifications";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const userInitials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : session.user.email?.substring(0, 2).toUpperCase() || "AD";

  const attentionUnreadCount = await getUnreadNotificationCount();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <Link href="/" className="block">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Hargen
            </span>
            <span className="ml-1 text-lg font-bold tracking-tight text-orange-500">
              Admin
            </span>
          </Link>
        </div>

        <AdminNav attentionUnreadCount={attentionUnreadCount} />

        <div className="border-t border-slate-200 p-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <AdminMobileNav attentionUnreadCount={attentionUnreadCount} />
            <p className="text-sm font-semibold text-slate-700">Solar Ops Desk</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium text-slate-800">
                {session.user.name || "Admin"}
              </span>
              <span className="text-xs text-slate-500">{session.user.email}</span>
            </div>
            <div className="md:hidden">
              <LogoutButton compact className="w-auto" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-xs font-bold text-orange-700">
              {userInitials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <CatalogHealthBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
