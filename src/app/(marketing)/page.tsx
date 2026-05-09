import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Zap, ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-slate-50">
        <div className="container px-4 mx-auto relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900">
              Flexible Solar Operations Support Without Hiring Full-Time
            </h1>
            <p className="mt-6 text-xl text-slate-600 leading-8">
              Hargen Energy Solar Ops Desk helps residential solar companies handle the back-office work that keeps jobs moving.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link 
                href="/request-help" 
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Request Solar Ops Support
              </Link>
              <Link 
                href="#problem" 
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Tell Us Where You&apos;re Stuck
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Utility Applications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Permit Follow-up</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>CRM Cleanup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Enphase Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Plan Set Coordination</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Stuck Job Follow-up</span>
              </div>
            </div>
            <p className="mt-8 text-sm font-medium text-primary">
              Support for solar companies — not solar sales to homeowners.
            </p>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The Solar Operations Gap
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Most solar companies reach a point where they need professional back-office support, but they aren&apos;t ready for another full-time salary, benefits, and overhead.
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            Jobs get stuck in &quot;Permit Pending&quot; or &quot;Waiting for Utility&quot; because your team is too busy selling and installing. We bridge that gap.
          </p>
        </div>
      </section>

      {/* Services Overview */}
      <section className="bg-slate-50 py-20">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Specialized Solar Support
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We handle the specific tasks that keep residential solar projects moving.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Quote & Proposal Building", desc: "Fast, accurate quotes to keep your sales team moving." },
              { title: "Permit & Utility Follow-up", desc: "Proactive tracking to ensure applications don't sit idle." },
              { title: "Customer Communication", desc: "Professional updates to keep homeowners informed and happy." },
              { title: "CRM Cleanup & Management", desc: "Organizing your data so you know exactly where every job stands." },
              { title: "Enphase & Equipment Setup", desc: "Handling the technical backend setup for monitoring and commissioning." },
              { title: "Stuck Job Resolution", desc: "Identifying why a job is stalled and doing the work to get it moving." },
            ].map((service, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link 
              href="/services" 
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      {/* Support Blocks */}
      <section className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Flexible Support Blocks
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the level of support that fits your current volume.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: "Light Support", hours: "2 hours/week", desc: "Perfect for smaller contractors needing help with specific bottlenecks." },
            { name: "Core Support", hours: "5 hours/week", desc: "Our most popular block for growing companies with steady volume." },
            { name: "Priority Support", hours: "10 hours/week", desc: "Comprehensive support for active companies with multiple crews." },
          ].map((plan, i) => (
            <Card key={i} className={i === 1 ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="text-2xl font-bold text-primary">{plan.hours}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">{plan.desc}</p>
                <Link 
                  href="/request-help" 
                  className={cn(buttonVariants({ variant: i === 1 ? "default" : "outline" }), "w-full")}
                >
                  Request This Block
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-12 max-w-2xl mx-auto p-6 bg-slate-50 rounded-lg border text-sm text-slate-600">
          <p className="font-semibold mb-2">Capacity-Based Support</p>
          <p>
            Clients reserve weekly solar operations support capacity, not unlimited help. If requested work exceeds the support block, Hargen Energy helps prioritize the highest-impact items first. Remaining work can roll over or be approved as overflow time.
          </p>
        </div>
      </section>

      {/* How It Works Preview */}
      <section className="bg-slate-900 text-white py-20">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: 1, title: "Submit Request", icon: Zap },
              { step: 2, title: "Choose Block", icon: Clock },
              { step: 3, title: "Prioritize Work", icon: BarChart3 },
              { step: 4, title: "Track Status", icon: ShieldCheck },
              { step: 5, title: "Keep Moving", icon: ArrowRight },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <span className="text-xs text-slate-400 uppercase tracking-widest">Step {item.step}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link 
              href="/how-it-works" 
              className={cn(buttonVariants({ size: "lg" }))}
            >
              See the Full Process
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container px-4 mx-auto text-center py-10">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          Tell us where your solar operations are getting stuck.
        </h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          We help get it moving. No long-term contracts, just flexible support when you need it.
        </p>
        <Link 
          href="/request-help" 
          className={cn(buttonVariants({ size: "lg" }), "px-12")}
        >
          Request Solar Ops Support
        </Link>
      </section>
    </div>
  );
}
