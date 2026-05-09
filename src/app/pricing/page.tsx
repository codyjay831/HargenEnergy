import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Light Support",
    hours: "2 hours/week",
    description: "Ideal for small contractors or handling a single specific bottleneck.",
    features: [
      "2 hours of dedicated support",
      "Weekly priority review",
      "Private dashboard access",
      "Email & CRM integration",
      "No long-term contract"
    ],
    cta: "Request Light Support",
    popular: false
  },
  {
    name: "Core Support",
    hours: "5 hours/week",
    description: "Our most popular level for growing companies with steady project volume.",
    features: [
      "5 hours of dedicated support",
      "Weekly priority review",
      "Private dashboard access",
      "Email & CRM integration",
      "Direct Slack/Phone access",
      "Priority task handling"
    ],
    cta: "Request Core Support",
    popular: true
  },
  {
    name: "Priority Support",
    hours: "10 hours/week",
    description: "Comprehensive support for active companies with multiple crews and high volume.",
    features: [
      "10 hours of dedicated support",
      "Weekly priority review",
      "Private dashboard access",
      "Email & CRM integration",
      "Direct Slack/Phone access",
      "Same-day response on urgent items",
      "Dedicated account manager"
    ],
    cta: "Request Priority Support",
    popular: false
  }
];

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl text-center mx-auto mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            Simple, Weekly Support Blocks
          </h1>
          <p className="text-xl text-muted-foreground">
            No complex pricing or hidden fees. Choose a weekly capacity that fits your business and adjust as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <Card key={i} className={`flex flex-col ${plan.popular ? 'border-primary shadow-xl scale-105 z-10' : ''}`}>
              <CardHeader>
                {plan.popular && (
                  <div className="px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full w-fit mb-2">
                    Most Popular
                  </div>
                )}
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-slate-900 mt-2">
                  {plan.hours}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link 
                  href="/request-help" 
                  className={cn(buttonVariants({ variant: plan.popular ? 'default' : 'outline' }), "w-full")}
                >
                  {plan.cta}
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-slate-50 rounded-2xl p-8 md:p-12 border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-2xl font-bold mb-4">Overflow & Custom Support</h2>
                <p className="text-muted-foreground mb-6">
                  Need more help than our standard blocks? We offer overflow support for existing clients and custom blocks for larger operations.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Overflow work approved separately</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Custom blocks for 20+ hours/week</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>One-time project cleanup available</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-xl font-bold mb-4 text-center md:text-left">Contact for Availability</h3>
                <p className="text-muted-foreground mb-6 text-center md:text-left">
                  We maintain a high standard of support by limiting the number of clients we take on. Contact us to check our current capacity.
                </p>
                <Link 
                  href="/request-help" 
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
                >
                  Check Current Availability
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          <p className="font-semibold mb-2">The Hargen Energy Guarantee</p>
          <p>
            Clients reserve weekly solar operations support capacity, not unlimited help. If requested work exceeds the support block, Hargen Energy helps prioritize the highest-impact items first. Remaining work can roll over or be approved as overflow time.
          </p>
        </div>
      </div>
    </div>
  );
}
