import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            About Hargen Energy
          </h1>
          <p className="text-xl text-muted-foreground">
            We are a specialized solar operations support desk built specifically for residential solar contractors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div className="space-y-6 text-lg leading-relaxed text-slate-700">
            <p>
              Hargen Energy LLC was founded on a simple observation: residential solar companies often have great sales teams and great installation crews, but their back-office operations struggle to keep up.
            </p>
            <p>
              The result is &quot;stuck&quot; jobs, frustrated homeowners, and cash flow bottlenecks. Most companies don&apos;t need a full-time operations manager or another expensive salary—they need flexible, professional support that understands the solar industry.
            </p>
            <p>
              That&apos;s where we come in. We aren&apos;t a generic virtual assistant service. We are solar operations specialists who know how to navigate utility portals, track down permits, and keep a CRM organized.
            </p>
            <h2 className="text-2xl font-bold text-slate-900 pt-4">Our Philosophy</h2>
            <p>
              We believe in transparency, efficiency, and focus. We don&apos;t use hype-heavy language or promise &quot;AI-driven miracles.&quot; We provide real people doing real work to get your projects through the finish line.
            </p>
          </div>
          <div className="bg-slate-50 p-8 rounded-2xl border space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-2">What We Are</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>A specialized solar operations desk</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Flexible back-office support</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>A partner for solar contractors</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2">What We Are Not</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>A homeowner solar installer</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>A solar sales organization</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>A generic virtual assistant firm</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>A software-only product</span>
                </li>
              </ul>
            </div>
            <div className="pt-4">
              <p className="text-sm font-medium text-slate-500 mb-4">
                Based in the United States, supporting residential solar companies nationwide.
              </p>
              <Link 
                href="/request-help" 
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
              >
                Work With Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
