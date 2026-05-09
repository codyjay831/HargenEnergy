import Link from "next/link";
import { 
  Search, 
  Layers, 
  BarChart2, 
  Eye, 
  RefreshCw 
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Tell us where you’re stuck",
    icon: Search,
    description: "Submit a request and tell us about your current back-office bottlenecks. Whether it's a pile of utility applications or a messy CRM, we want to know what's slowing you down."
  },
  {
    title: "Choose a weekly support block",
    icon: Layers,
    description: "Select the level of support that matches your needs: 2, 5, or 10 hours per week. No long-term contracts—you can adjust your support level as your volume changes."
  },
  {
    title: "We prioritize the highest-impact work",
    icon: BarChart2,
    description: "We don't just work through a list; we focus on the tasks that will get jobs moving the fastest. If you have a job stuck at a specific stage, that's where we start."
  },
  {
    title: "Work is tracked clearly",
    icon: Eye,
    description: "You'll have access to a private dashboard where you can see exactly what we're working on, the status of every request, and how your weekly hours are being used."
  },
  {
    title: "Review, adjust, and keep moving",
    icon: RefreshCw,
    description: "As we clear your backlog, we'll work with you to identify the next set of priorities. Our goal is to keep your operations fluid and your crews busy."
  }
];

export default function HowItWorksPage() {
  return (
    <div className="py-20">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            A Simple, Professional Process
          </h1>
          <p className="text-xl text-muted-foreground">
            We designed our operations desk to be easy to start and easy to manage. No complex software to learn, just professional support when you need it.
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold">
                {i + 1}
              </div>
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-4 mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">{step.title}</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 border-t pt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Capacity-Based Support</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Unlike a generic VA service, we operate on a capacity model. You reserve a block of time each week, ensuring that we are available to handle your highest-priority tasks.
              </p>
              <div className="bg-slate-50 p-6 rounded-xl border italic text-slate-600">
                &quot;Clients reserve weekly solar operations support capacity, not unlimited help. If requested work exceeds the support block, Hargen Energy helps prioritize the highest-impact items first.&quot;
              </div>
            </div>
            <div className="bg-slate-900 text-white p-8 rounded-2xl">
              <h3 className="text-xl font-bold mb-4">Ready to get started?</h3>
              <p className="text-slate-300 mb-8">
                The first step is a simple request. Tell us where you&apos;re stuck and we&apos;ll help you find the right support level.
              </p>
              <Link 
                href="/request-help" 
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Request Solar Ops Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
