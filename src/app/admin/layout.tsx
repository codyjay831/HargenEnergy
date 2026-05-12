import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  CreditCard,
  UserCog,
  Megaphone,
} from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NAV_LABELS } from "@/lib/product-language";

export const dynamic = "force-dynamic";

const sidebarItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Outreach", href: "/admin/outreach", icon: Megaphone },
  { name: NAV_LABELS.adminClients, href: "/admin/clients", icon: Users },
  { name: NAV_LABELS.adminWorkRequests, href: "/admin/requests", icon: ClipboardList },
  { name: "Time Tracking", href: "/admin/time", icon: Clock },
  { name: "Billing", href: "/admin/billing", icon: CreditCard },
  { name: "Account", href: "/admin/account", icon: UserCog },
];

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
    ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : session.user.email?.substring(0, 2).toUpperCase() || "AD";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white hidden md:flex flex-col">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-primary">
              Hargen Admin
            </span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-100 transition-colors"
            >
              <item.icon className="h-4 w-4 text-slate-500" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-white flex items-center justify-between px-8">
          <h2 className="text-lg font-semibold">Solar Ops Desk</h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-medium">{session.user.name || "Admin"}</span>
              <span className="text-xs text-muted-foreground">{session.user.email}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
              {userInitials}
            </div>
          </div>
        </header>
        <main className="p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
