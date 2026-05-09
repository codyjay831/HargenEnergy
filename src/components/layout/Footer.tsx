import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12 md:py-16 px-4 mx-auto">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Hargen Energy LLC
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Flexible solar operations support for residential solar companies. We help get your back-office moving so you can focus on growth.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-muted-foreground hover:text-primary">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-muted-foreground hover:text-primary">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider">Support</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/request-help" className="text-muted-foreground hover:text-primary">
                  Request Help
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-primary">
                  Client Login
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Hargen Energy LLC. All rights reserved.</p>
          <p className="mt-2 text-xs">Support for solar companies — not solar sales to homeowners.</p>
        </div>
      </div>
    </footer>
  );
}
