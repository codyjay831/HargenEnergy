import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  LayoutDashboard,
  ClipboardList,
  KanbanSquare,
  PlusCircle,
  KeyRound,
  Users,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { prisma } from "@/lib/prisma";
import { resolveClientLogoUrl } from "@/lib/storage/logo-url";
import { PORTAL_NAV_ITEMS, type PortalNavIconKey } from "@/lib/portal-nav";
import { PortalMobileNav } from "@/components/portal/PortalMobileNav";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Redirect admins to admin panel
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }
  
  // Client users must have a clientId
  if (!session.user.clientId) {
    redirect("/portal/access");
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    select: {
      companyName: true,
      logoUrl: true,
      brandAccent: true,
    },
  });

  const icons: Record<PortalNavIconKey, LucideIcon> = {
    dashboard: LayoutDashboard,
    work: ClipboardList,
    blockWork: KanbanSquare,
    submit: PlusCircle,
    access: KeyRound,
    team: Users,
    account: UserCircle,
  };

  const logoDisplayUrl = client
    ? resolveClientLogoUrl(client.logoUrl)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 bg-[#0f172a] text-white md:flex md:flex-col">
        <div className="p-6">
          <Link href="/portal" className="flex items-center gap-2">
            {logoDisplayUrl ? (
              <Image
                src={logoDisplayUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded object-contain bg-white/10"
                unoptimized
              />
            ) : (
              <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-[#0f172a] font-bold">
                H
              </div>
            )}
            <span className="font-bold text-lg tracking-tight">
              {client?.companyName ?? "Hargen Portal"}
            </span>
          </Link>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {PORTAL_NAV_ITEMS.map((item) => {
            const Icon = icons[item.icon];
            return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged in as</p>
            <p className="text-sm font-medium text-slate-200 truncate">{session.user.name || session.user.email}</p>
          </div>
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PortalMobileNav
              companyName={client?.companyName ?? "Hargen Portal"}
              logoDisplayUrl={logoDisplayUrl}
              userLabel={session.user.name ?? session.user.email ?? "User"}
            />
            <span>Portal</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-900">
              {client?.companyName ?? "Hargen Energy Solar Ops Desk"}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
