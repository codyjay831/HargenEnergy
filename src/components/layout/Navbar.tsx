import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Services", href: "/services" },
  { name: "How It Works", href: "/how-it-works" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-6 flex h-14 items-center justify-between">

        {/* Brand + desktop nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-[0.9375rem] font-semibold tracking-tight">Hargen Energy</span>
            <span className="hidden text-xs text-muted-foreground/60 border-l border-border pl-2.5 sm:block">
              Solar Ops Desk
            </span>
          </Link>
          <nav className="hidden md:flex items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop actions */}
        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className="hidden md:block px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/request-help"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus-visible:ring-amber-300"
            )}
          >
            Request Support
          </Link>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden ml-1" />}>
              <Menu className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-1 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm font-medium px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
                <hr className="my-3" />
                <Link
                  href="/login"
                  className="text-sm font-medium px-3 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/request-help"
                  className={cn(buttonVariants(), "mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white border-transparent")}
                >
                  Request Support
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
