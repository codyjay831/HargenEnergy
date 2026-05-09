import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ClipboardList, 
  PlusCircle, 
  UserCircle,
  ChevronRight
} from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { cn } from "@/lib/utils";

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

  // Admin can access portal, but we should warn them or handle it
  const isAdmin = session.user.role === "ADMIN";
  
  if (!isAdmin && !session.user.clientId) {
    // If a client user is not tied to a client, they shouldn't be here
    // For now, redirect to a contact page or similar
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg border shadow-sm text-center">
          <h1 className="text-xl font-bold text-slate-900">Account Setup Required</h1>
          <p className="mt-2 text-slate-600">Your user account is not yet linked to a solar company. Please contact Hargen Energy to complete your portal setup.</p>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/portal", icon: LayoutDashboard },
    { name: "My Requests", href: "/portal/requests", icon: ClipboardList },
    { name: "Submit Request", href: "/portal/requests/new", icon: PlusCircle },
    { name: "Account", href: "/portal/account", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0f172a] text-white flex-shrink-0">
        <div className="p-6">
          <Link href="/portal" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded flex items-center justify-center text-[#0f172a] font-bold">H</div>
            <span className="font-bold text-lg tracking-tight">Hargen Portal</span>
          </Link>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged in as</p>
            <p className="text-sm font-medium text-slate-200 truncate">{session.user.name || session.user.email}</p>
            {isAdmin && <Badge variant="secondary" className="mt-1 text-[10px]">ADMIN VIEW</Badge>}
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
            <span>Portal</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-slate-900">Hargen Energy Solar Ops Desk</span>
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

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      variant === "secondary" ? "bg-slate-100 text-slate-800" : "bg-primary/10 text-primary",
      className
    )}>
      {children}
    </span>
  );
}
