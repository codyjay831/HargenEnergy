import Link from "next/link";

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "How It Works", href: "/how-it-works" },
];

const supportLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Request Help", href: "/request-help" },
  { label: "Client Login", href: "/login" },
];

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-[1fr_auto_auto]">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="text-sm font-semibold">
              Hargen Energy LLC
            </Link>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[240px]">
              Flexible solar operations support for residential companies. We help keep office work moving so your team can stay focused on sales, installs, and customers.
            </p>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-foreground">
              Company
            </p>
            <ul className="flex flex-col gap-2">
              {companyLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-foreground">
              Support
            </p>
            <ul className="flex flex-col gap-2">
              {supportLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Hargen Energy LLC. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for solar companies, not solar sales to homeowners.
          </p>
        </div>

      </div>
    </footer>
  );
}
